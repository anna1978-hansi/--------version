import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";

const apiKey =
  process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || "https://ai.love-gwen.top/openai";
const model = process.env.OPENAI_MODEL || "gpt-5.4";
const inputFile = process.env.INPUT_FILE || "标准录音 6.mp3.txt";
const chunkCharLimit = Number(process.env.CHUNK_CHAR_LIMIT || 2000);

function extractTextFromResponse(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return "";
  }

  return data.output
    .flatMap((item) => item.content || [])
    .map((content) => {
      if (typeof content.text === "string") {
        return content.text;
      }
      if (typeof content.output_text === "string") {
        return content.output_text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function main() {
  if (!apiKey) {
    console.error("缺少 OPENAI_API_KEY。请在项目根目录的 .env 文件中配置。");
    process.exit(1);
  }

  const transcript = await fs.readFile(inputFile, "utf8");
  const chunks = splitTranscriptIntoChunks(transcript, chunkCharLimit);
  const outputDir = path.join(process.cwd(), "output");

  await fs.mkdir(outputDir, { recursive: true });

  try {
    const allResponses = [];
    const allReplies = [];

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const prompt = buildPrompt(chunk, i + 1, chunks.length);
      const res = await axios.post(
        `${baseURL}/responses`,
        {
          model,
          input: prompt,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 120000,
        }
      );

      const data = res.data;
      const reply = extractTextFromResponse(data);
      const suffix = String(i + 1).padStart(2, "0");
      const partJsonPath = path.join(outputDir, `interview-structured.part-${suffix}.response.json`);
      const partTextPath = path.join(outputDir, `interview-structured.part-${suffix}.reply.txt`);

      allResponses.push(data);
      allReplies.push(`===== 第 ${i + 1}/${chunks.length} 段 =====\n${reply}`);

      await fs.writeFile(partJsonPath, JSON.stringify(data, null, 2), "utf8");
      await fs.writeFile(partTextPath, reply, "utf8");

      console.log(`第 ${i + 1}/${chunks.length} 段完成`);
    }

    const jsonPath = path.join(outputDir, "interview-structured.responses.json");
    const textPath = path.join(outputDir, "interview-structured.reply.txt");
    const fullReply = allReplies.join("\n\n");

    await fs.writeFile(jsonPath, JSON.stringify(allResponses, null, 2), "utf8");
    await fs.writeFile(textPath, fullReply, "utf8");

    console.log("输入文件:", inputFile);
    console.log("模型:", allResponses[0]?.model || model);
    console.log("分段数:", chunks.length);
    console.log("原始响应已保存到:", jsonPath);
    console.log("提取文本已保存到:", textPath);
    console.log("\n===== 提取出的回复 =====\n");
    console.log(fullReply || "[未能从 response 中提取到文本，请查看 JSON 文件]");
    console.log("\n===== 第一段原始 response 预览 =====\n");
    console.log(JSON.stringify(allResponses[0], null, 2).slice(0, 4000));
  } catch (e) {
    console.error("请求失败:", e.response?.status ?? e.message);
    if (e.response?.data) {
      console.error(JSON.stringify(e.response.data, null, 2));
    }
    process.exit(1);
  }
}

function splitTranscriptIntoChunks(transcript, maxChars) {
  const blocks = transcript
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const chunks = [];
  let currentChunk = "";

  for (const block of blocks) {
    const nextChunk = currentChunk ? `${currentChunk}\n\n${block}` : block;
    if (currentChunk && nextChunk.length > maxChars) {
      chunks.push(currentChunk);
      currentChunk = block;
    } else {
      currentChunk = nextChunk;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function buildPrompt(chunk, index, total) {
  return `
你阅读这个文件片段，判断哪些话更可能是面试官说的，哪些话更可能是面试者说的。

重点要求：
1. 不要把内容整理成“面试官一大段 + 面试者一大段”。
2. 请尽量按真实对话往返拆成多轮，呈现成“面试官 -> 面试者 -> 面试官 -> 面试者”这种形式。
3. 每一轮尽量细分；如果一句是提问，下一句是回答，就单独成一轮。
4. 可以基于上下文修正少量口语或转写错字，但不要编造不存在的内容。
5. 如果某句话的角色判断没有把握，请标记为“待确认”。
6. 输出时请保持中文。
7. 这是整份转录的第 ${index} / ${total} 段，请只处理这一段，不要编造前后文。

请按下面格式输出：
第1轮
面试官：...
面试者：...

第2轮
面试官：...
面试者：...

如果某一轮里一方连续说了两句，也请仍然按这一轮内的真实顺序展示。

下面是原始转录文本片段：
${chunk}
`.trim();
}

main();
