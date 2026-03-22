import fs from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import {
  defaultSessionTitleFromFile,
  normalizeInterviewTurns,
  parseInterviewTurns,
  saveInterviewSession,
} from "./backend/interview-store.js";

const apiKey =
  process.env.DEEPSEEK_API_KEY;
const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const inputFile = process.env.INPUT_FILE || "标准录音 6.mp3.txt";
const outputDir = path.join(process.cwd(), "output");
const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 660000);
const maxOutputTokens = Number(process.env.MAX_OUTPUT_TOKENS || 8000);
const temperature = process.env.TEMPERATURE ? Number(process.env.TEMPERATURE) : undefined;
const topP = process.env.TOP_P ? Number(process.env.TOP_P) : undefined;
const sessionTitle = process.env.SESSION_TITLE || defaultSessionTitleFromFile(inputFile);
const sessionKey = process.env.SESSION_KEY;

function buildPrompt(transcript) {
  return `
请你阅读下面这份面试录音转写文本，并按真实对话顺序整理内容。

要求：
1. 判断每句话更可能是面试官还是面试者说的。
2. 尽量按对话往返拆成多轮，保持“面试官 -> 面试者 -> 面试官 -> 面试者”的顺序。
3. 可以基于上下文修正少量明显的口语错误或转写错字，但不要编造内容。
4. 如果某句话的角色判断不确定，请标注“待确认”。
5. 不要把“好的 / 嗯 / 行”这种简短承接词机械地单独拆成一轮；如果后面紧跟着同一说话人的提问，请合并在同一轮里。
6. 如果某一轮只有单边说话，优先检查是否应该和前后轮合并，尽量输出完整的“一问一答”。
7. 输出保持中文。

请按下面格式输出：
第1轮
面试官：...
面试者：...

第2轮
面试官：...
面试者：...

下面是原始转写文本：
${transcript}
`.trim();
}

function extractDeltaText(delta) {
  if (!delta) {
    return "";
  }

  if (typeof delta.content === "string") {
    return delta.content;
  }

  if (Array.isArray(delta.content)) {
    return delta.content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (typeof item?.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("");
  }

  if (typeof delta.reasoning_content === "string") {
    return delta.reasoning_content;
  }

  return "";
}

function parseSseEvents(buffer) {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  const completeEvents = parts.slice(0, -1);
  const rest = parts.at(-1) || "";

  return {
    completeEvents,
    rest,
  };
}

function parseSseEventBlock(block) {
  const lines = block.split("\n");
  const dataLines = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }
    if (line.startsWith(":")) {
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return dataLines.join("\n");
}

function nowIso() {
  return new Date().toISOString();
}

function formatMs(ms) {
  if (!Number.isFinite(ms)) {
    return "unknown";
  }
  return `${ms}ms`;
}

function createDiagnostics(transcript, prompt, requestBody, endpoint) {
  return {
    startedAt: nowIso(),
    inputFile,
    model,
    endpoint,
    transcriptChars: transcript.length,
    promptChars: prompt.length,
    requestTimeoutMs,
    maxOutputTokens,
    stream: Boolean(requestBody.stream),
    temperature: Number.isFinite(temperature) ? temperature : null,
    topP: Number.isFinite(topP) ? topP : null,
    requestBytes: Buffer.byteLength(JSON.stringify(requestBody)),
    phase: "initialized",
    lastEventAt: nowIso(),
    elapsedMs: 0,
    streamEventCount: 0,
    streamedTextChars: 0,
    timeline: [],
  };
}

function pushTimeline(diagnostics, phase, detail = {}) {
  const event = {
    at: nowIso(),
    elapsedMs: Date.now() - Date.parse(diagnostics.startedAt),
    phase,
    ...detail,
  };

  diagnostics.phase = phase;
  diagnostics.lastEventAt = event.at;
  diagnostics.elapsedMs = event.elapsedMs;
  diagnostics.timeline.push(event);

  const preview = Object.keys(detail).length ? ` ${JSON.stringify(detail)}` : "";
  console.log(`[diag] ${phase}${preview}`);
}

function buildErrorSummary(error, diagnostics) {
  const lines = [
    `请求失败: ${error.message}`,
    `失败阶段: ${diagnostics.phase}`,
    `总耗时: ${formatMs(diagnostics.elapsedMs)}`,
    `最近事件时间: ${diagnostics.lastEventAt}`,
  ];

  if (error.code) {
    lines.push(`错误代码: ${error.code}`);
  }

  if (diagnostics.httpStatus) {
    lines.push(`HTTP 状态码: ${diagnostics.httpStatus}`);
  }

  if (diagnostics.firstResponseByteAt) {
    lines.push(`首个响应字节时间: ${diagnostics.firstResponseByteAt}`);
  } else {
    lines.push("首个响应字节时间: 未收到任何响应体数据");
  }

  if (diagnostics.responseBytes != null) {
    lines.push(`已接收响应字节: ${diagnostics.responseBytes}`);
  }

  if (diagnostics.socketInfo) {
    lines.push(`连接信息: ${diagnostics.socketInfo}`);
  }

  if (diagnostics.lastNetworkEvent) {
    lines.push(`最后网络事件: ${diagnostics.lastNetworkEvent}`);
  }

  if (error.responseBodyPreview) {
    lines.push(`服务端响应预览: ${error.responseBodyPreview}`);
  }

  if (error.cause?.message) {
    lines.push(`底层 cause: ${error.cause.message}`);
  }

  return lines.join("\n");
}

async function writeDiagnosticsFile(filename, payload) {
  const filepath = path.join(outputDir, filename);
  await fs.writeFile(filepath, JSON.stringify(payload, null, 2), "utf8");
  return filepath;
}

function requestChatCompletion(endpoint, requestBody, diagnostics) {
  const target = new URL(endpoint);
  const transport = target.protocol === "https:" ? https : http;
  const payload = JSON.stringify(requestBody);

  return new Promise((resolve, reject) => {
    let settled = false;
    let responseBytes = 0;
    const responseChunks = [];
    let currentPhase = "creating_request";
    let timeoutHandle = null;

    const finish = (error, value) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      diagnostics.phase = currentPhase;
      diagnostics.elapsedMs = Date.now() - Date.parse(diagnostics.startedAt);
      diagnostics.responseBytes = responseBytes;

      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    };

    const req = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Accept: "application/json",
        },
      },
      (res) => {
        currentPhase = "response_headers_received";
        diagnostics.httpStatus = res.statusCode ?? null;
        diagnostics.responseHeaders = res.headers;
        pushTimeline(diagnostics, currentPhase, {
          statusCode: res.statusCode ?? null,
          contentType: res.headers["content-type"] || null,
        });

        res.setEncoding("utf8");
        let sseBuffer = "";
        let printedStreamHeader = false;
        const streamTexts = [];
        const streamMessages = [];
        let sawStreamDone = false;
        const rawStreamChunks = [];

        res.on("aborted", () => {
          currentPhase = "response_aborted";
          diagnostics.lastNetworkEvent = "response.aborted";
          pushTimeline(diagnostics, currentPhase, {
            receivedBytes: responseBytes,
          });

          const error = new Error(
            "服务端在响应体传输过程中中断了连接，客户端只收到了部分或零字节响应。"
          );
          error.code = "RESPONSE_ABORTED";
          finish(error);
        });

        res.on("data", (chunk) => {
          if (!diagnostics.firstResponseByteAt) {
            diagnostics.firstResponseByteAt = nowIso();
            pushTimeline(diagnostics, "first_response_chunk", {
              chunkBytes: Buffer.byteLength(chunk),
            });
          }

          currentPhase = "reading_response_body";
          diagnostics.lastNetworkEvent = "response.data";
          responseBytes += Buffer.byteLength(chunk);

          if (requestBody.stream) {
            rawStreamChunks.push(chunk);
            sseBuffer += chunk;
            const { completeEvents, rest } = parseSseEvents(sseBuffer);
            sseBuffer = rest;

            for (const block of completeEvents) {
              const eventData = parseSseEventBlock(block);
              if (!eventData) {
                continue;
              }

              diagnostics.streamEventCount += 1;

              if (eventData === "[DONE]") {
                sawStreamDone = true;
                pushTimeline(diagnostics, "stream_done_event", {
                  streamEventCount: diagnostics.streamEventCount,
                });
                continue;
              }

              let parsedEvent;
              try {
                parsedEvent = JSON.parse(eventData);
              } catch (cause) {
                const error = new Error("收到的 SSE data 不是合法 JSON。");
                error.code = "INVALID_SSE_JSON";
                error.responseBodyPreview = eventData.slice(0, 1000);
                error.cause = cause;
                finish(error);
                return;
              }

              streamMessages.push(parsedEvent);
              const deltaText = parsedEvent.choices
                ?.map((choice) => extractDeltaText(choice.delta))
                .join("") || "";

              if (deltaText) {
                diagnostics.streamedTextChars += deltaText.length;
                if (!printedStreamHeader) {
                  printedStreamHeader = true;
                  console.log("\n===== 流式输出 =====\n");
                }
                process.stdout.write(deltaText);
                streamTexts.push(deltaText);
              }
            }
          } else {
            responseChunks.push(chunk);
          }
        });

        res.on("end", () => {
          currentPhase = "response_complete";
          diagnostics.lastNetworkEvent = "response.end";
          pushTimeline(diagnostics, currentPhase, {
            receivedBytes: responseBytes,
          });

          if (requestBody.stream) {
            const rawStreamBody = rawStreamChunks.join("");

            if ((res.statusCode ?? 500) >= 400) {
              const error = new Error(`服务端返回 HTTP ${res.statusCode}`);
              error.code = `HTTP_${res.statusCode}`;
              error.responseBodyPreview = rawStreamBody.slice(0, 1000);
              finish(error);
              return;
            }

            if (sseBuffer.trim()) {
              const eventData = parseSseEventBlock(sseBuffer);
              if (eventData && eventData !== "[DONE]") {
                let parsedEvent;
                try {
                  parsedEvent = JSON.parse(eventData);
                } catch (cause) {
                  const error = new Error("响应结束时残留的 SSE data 不是合法 JSON。");
                  error.code = "INVALID_SSE_JSON_AT_END";
                  error.responseBodyPreview = eventData.slice(0, 1000);
                  error.cause = cause;
                  finish(error);
                  return;
                }

                streamMessages.push(parsedEvent);
                const deltaText = parsedEvent.choices
                  ?.map((choice) => extractDeltaText(choice.delta))
                  .join("") || "";

                if (deltaText) {
                  diagnostics.streamedTextChars += deltaText.length;
                  if (!printedStreamHeader) {
                    printedStreamHeader = true;
                    console.log("\n===== 流式输出 =====\n");
                  }
                  process.stdout.write(deltaText);
                  streamTexts.push(deltaText);
                }
              }
            }

            if (printedStreamHeader) {
              process.stdout.write("\n");
            }

            diagnostics.responseBodyPreview = (
              JSON.stringify(streamMessages[0] || null) || rawStreamBody
            ).slice(0, 500);

            const lastMessage = streamMessages.at(-1) || {};
            const completion = {
              id: lastMessage.id || null,
              object: "chat.completion.stream_assembled",
              created: lastMessage.created || null,
              model: lastMessage.model || requestBody.model,
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: streamTexts.join(""),
                  },
                  finish_reason:
                    lastMessage.choices?.[0]?.finish_reason || (sawStreamDone ? "stop" : null),
                },
              ],
              usage: lastMessage.usage || null,
              stream_messages: streamMessages,
            };

            finish(null, completion);
            return;
          }

          const rawBody = responseChunks.join("");
          diagnostics.responseBodyPreview = rawBody.slice(0, 500);

          if ((res.statusCode ?? 500) >= 400) {
            const error = new Error(`服务端返回 HTTP ${res.statusCode}`);
            error.code = `HTTP_${res.statusCode}`;
            error.responseBodyPreview = rawBody.slice(0, 1000);
            finish(error);
            return;
          }

          try {
            const parsed = JSON.parse(rawBody);
            finish(null, parsed);
          } catch (cause) {
            const error = new Error("响应体不是合法的 JSON。");
            error.code = "INVALID_JSON_RESPONSE";
            error.responseBodyPreview = rawBody.slice(0, 1000);
            error.cause = cause;
            finish(error);
          }
        });

        res.on("error", (cause) => {
          currentPhase = "response_stream_error";
          diagnostics.lastNetworkEvent = "response.error";
          pushTimeline(diagnostics, currentPhase, {
            message: cause.message,
          });

          const error = new Error("读取响应流时出错。");
          error.code = cause.code || "RESPONSE_STREAM_ERROR";
          error.cause = cause;
          finish(error);
        });
      }
    );

    timeoutHandle = setTimeout(() => {
      currentPhase = diagnostics.firstResponseByteAt
        ? "client_timeout_while_reading_response_body"
        : diagnostics.httpStatus
          ? "client_timeout_after_response_headers_before_first_chunk"
          : "client_timeout_while_waiting_for_response_headers";
      diagnostics.lastNetworkEvent = "client.timeout";
      pushTimeline(diagnostics, currentPhase, {
        timeoutMs: requestTimeoutMs,
      });

      const error = new Error(
        diagnostics.firstResponseByteAt
          ? `客户端在读取响应体时超过等待时间 ${requestTimeoutMs}ms。`
          : diagnostics.httpStatus
            ? `客户端已收到响应头，但在等待响应体首个数据块时超过等待时间 ${requestTimeoutMs}ms。`
            : `客户端在等待响应头时超过等待时间 ${requestTimeoutMs}ms。`
      );
      error.code = "CLIENT_TIMEOUT";
      req.destroy(error);
      finish(error);
    }, requestTimeoutMs);

    req.on("socket", (socket) => {
      currentPhase = "socket_assigned";
      diagnostics.socketInfo = `${target.protocol}//${target.hostname}:${target.port || (target.protocol === "https:" ? "443" : "80")}`;
      diagnostics.lastNetworkEvent = "request.socket";
      pushTimeline(diagnostics, currentPhase, {
        reusedSocket: req.reusedSocket || false,
      });

      socket.on("lookup", (err, address, family, host) => {
        diagnostics.lastNetworkEvent = "socket.lookup";
        pushTimeline(diagnostics, "dns_lookup", {
          host,
          address: err ? null : address,
          family: err ? null : family,
          error: err ? err.message : null,
        });
      });

      socket.on("connect", () => {
        diagnostics.lastNetworkEvent = "socket.connect";
        pushTimeline(diagnostics, "tcp_connected");
      });

      socket.on("secureConnect", () => {
        diagnostics.lastNetworkEvent = "socket.secureConnect";
        pushTimeline(diagnostics, "tls_connected");
      });

      socket.on("close", (hadError) => {
        diagnostics.lastNetworkEvent = "socket.close";
        pushTimeline(diagnostics, "socket_closed", {
          hadError,
        });
      });

      socket.on("error", (cause) => {
        diagnostics.lastNetworkEvent = "socket.error";
        pushTimeline(diagnostics, "socket_error", {
          message: cause.message,
        });
      });
    });

    req.on("finish", () => {
      currentPhase = "request_body_sent";
      diagnostics.lastNetworkEvent = "request.finish";
      pushTimeline(diagnostics, currentPhase, {
        requestBytes: Buffer.byteLength(payload),
      });
    });

    req.on("error", (cause) => {
      if (settled) {
        return;
      }

      currentPhase = currentPhase === "creating_request" ? "request_error" : currentPhase;
      diagnostics.lastNetworkEvent = "request.error";
      pushTimeline(diagnostics, currentPhase, {
        message: cause.message,
      });

      const error =
        cause.code === "CLIENT_TIMEOUT"
          ? cause
          : new Error("底层请求在完成前被中断。");

      error.code = cause.code || error.code || "REQUEST_ERROR";
      error.cause = cause;
      finish(error);
    });

    currentPhase = "sending_request_body";
    diagnostics.lastNetworkEvent = "request.write";
    pushTimeline(diagnostics, currentPhase, {
      requestBytes: Buffer.byteLength(payload),
    });
    req.write(payload);
    req.end();
  });
}

async function main() {
  if (!apiKey) {
    console.error("缺少 DEEPSEEK_API_KEY。请在项目根目录的 .env 文件中配置。");
    process.exit(1);
  }

  const transcript = await fs.readFile(inputFile, "utf8");
  const prompt = buildPrompt(transcript);
  const endpoint = `${baseURL.replace(/\/$/, "")}/chat/completions`;
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that organizes interview transcripts into speaker turns.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: maxOutputTokens,
    stream: true,
  };

  if (Number.isFinite(temperature)) {
    requestBody.temperature = temperature;
  }

  if (Number.isFinite(topP)) {
    requestBody.top_p = topP;
  }

  await fs.mkdir(outputDir, { recursive: true });

  const diagnostics = createDiagnostics(transcript, prompt, requestBody, endpoint);
  pushTimeline(diagnostics, "request_prepared");

  try {
    const completion = await requestChatCompletion(endpoint, requestBody, diagnostics);
    const reply = completion.choices?.[0]?.message?.content?.trim() || "";
    const replyPath = path.join(outputDir, "deepseek-test.reply.txt");
    const jsonPath = path.join(outputDir, "deepseek-test.response.json");
    const turnsPath = path.join(outputDir, "deepseek-test.turns.json");
    const diagnosticsPath = await writeDiagnosticsFile(
      "deepseek-test.diagnostics.json",
      diagnostics
    );

    await fs.writeFile(replyPath, reply, "utf8");
    await fs.writeFile(jsonPath, JSON.stringify(completion, null, 2), "utf8");

    const turns = normalizeInterviewTurns(parseInterviewTurns(reply));
    await fs.writeFile(turnsPath, JSON.stringify(turns, null, 2), "utf8");

    const storeResult = saveInterviewSession({
      sessionKey,
      title: sessionTitle,
      sourceFilePath: inputFile,
      replyFilePath: replyPath,
      rawReply: reply,
      model: completion.model || model,
    });

    console.log("输入文件:", inputFile);
    console.log("模型:", completion.model || model);
    console.log("请求超时(ms):", requestTimeoutMs);
    console.log("最大输出 tokens:", maxOutputTokens);
    console.log("回复已保存到:", replyPath);
    console.log("原始响应已保存到:", jsonPath);
    console.log("轮次 JSON 已保存到:", turnsPath);
    console.log("诊断信息已保存到:", diagnosticsPath);
    console.log("数据库已写入:", storeResult.dbFile);
    console.log("sessionKey:", storeResult.sessionKey);
    console.log("原始轮数:", storeResult.totalRounds);
    console.log("归一化后轮数:", turns.length);
    console.log("\n===== 模型回复 =====\n");
    console.log(reply || "[模型返回为空，请查看 JSON 文件]");
  } catch (error) {
    diagnostics.error = {
      message: error.message,
      code: error.code || null,
      responseBodyPreview: error.responseBodyPreview || null,
      cause: error.cause?.message || null,
    };

    const diagnosticsPath = await writeDiagnosticsFile(
      "deepseek-test.error.diagnostics.json",
      diagnostics
    );

    console.error(buildErrorSummary(error, diagnostics));
    console.error(`诊断信息已保存到: ${diagnosticsPath}`);
    process.exit(1);
  }
}

main();
