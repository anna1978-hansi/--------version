import http from "node:http";
import {
  deleteInterviewTurn,
  getInterviewDbFile,
  getSession,
  listMessages,
  listSessions,
  listTurns,
  mergeInterviewTurns,
  saveInterviewSession,
} from "./backend/interview-store.js";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function notFound(res, message = "Not Found") {
  sendJson(res, 404, {
    error: message,
  });
}

function parseNumber(value) {
  if (value == null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();

  if (!text) {
    return {};
  }

  return JSON.parse(text);
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    notFound(res);
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 200, {
      ok: true,
    });
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        dbFile: getInterviewDbFile(),
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/sessions") {
      sendJson(res, 200, {
        items: listSessions(),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/sessions/import") {
      const body = await readJsonBody(req);
      const result = saveInterviewSession({
        sessionKey: body.sessionKey,
        title: body.title,
        sourceFilePath: body.sourceFilePath,
        replyFilePath: body.replyFilePath,
        rawReply: body.rawReply,
        model: body.model,
      });

      sendJson(res, 200, {
        ok: true,
        ...result,
      });
      return;
    }

    const sessionDetailMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (req.method === "GET" && sessionDetailMatch) {
      const sessionKey = decodeURIComponent(sessionDetailMatch[1]);
      const session = getSession(undefined, sessionKey);

      if (!session) {
        notFound(res, "Session not found");
        return;
      }

      sendJson(res, 200, session);
      return;
    }

    const turnsMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/turns$/);
    if (req.method === "GET" && turnsMatch) {
      const sessionKey = decodeURIComponent(turnsMatch[1]);
      const session = getSession(undefined, sessionKey);

      if (!session) {
        notFound(res, "Session not found");
        return;
      }

      const turns = listTurns(undefined, sessionKey, {
        fromRound: parseNumber(url.searchParams.get("fromRound")),
        toRound: parseNumber(url.searchParams.get("toRound")),
        limit: parseNumber(url.searchParams.get("limit")),
        offset: parseNumber(url.searchParams.get("offset")),
      });

      sendJson(res, 200, {
        session: {
          ...session,
          totalRounds: turns.length,
        },
        items: turns,
      });
      return;
    }

    const mergeTurnsMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/turns\/merge$/);
    if (req.method === "POST" && mergeTurnsMatch) {
      const sessionKey = decodeURIComponent(mergeTurnsMatch[1]);
      const session = getSession(undefined, sessionKey);

      if (!session) {
        notFound(res, "Session not found");
        return;
      }

      const body = await readJsonBody(req);
      mergeInterviewTurns(undefined, sessionKey, {
        roundNumbers: body.roundNumbers,
        mergedInterviewerText: body.mergedInterviewerText,
        mergedCandidateText: body.mergedCandidateText,
      });

      const turns = listTurns(undefined, sessionKey);

      sendJson(res, 200, {
        ok: true,
        session: {
          ...getSession(undefined, sessionKey),
          totalRounds: turns.length,
        },
        items: turns,
      });
      return;
    }

    const deleteTurnMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/turns\/delete$/);
    if (req.method === "POST" && deleteTurnMatch) {
      const sessionKey = decodeURIComponent(deleteTurnMatch[1]);
      const session = getSession(undefined, sessionKey);

      if (!session) {
        notFound(res, "Session not found");
        return;
      }

      const body = await readJsonBody(req);
      deleteInterviewTurn(undefined, sessionKey, body.roundNumber);

      const turns = listTurns(undefined, sessionKey);

      sendJson(res, 200, {
        ok: true,
        session: {
          ...getSession(undefined, sessionKey),
          totalRounds: turns.length,
        },
        items: turns,
      });
      return;
    }

    const messagesMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/messages$/);
    if (req.method === "GET" && messagesMatch) {
      const sessionKey = decodeURIComponent(messagesMatch[1]);
      const session = getSession(undefined, sessionKey);

      if (!session) {
        notFound(res, "Session not found");
        return;
      }

      sendJson(res, 200, {
        session,
        items: listMessages(undefined, sessionKey, {
          fromRound: parseNumber(url.searchParams.get("fromRound")),
          toRound: parseNumber(url.searchParams.get("toRound")),
          limit: parseNumber(url.searchParams.get("limit")),
          offset: parseNumber(url.searchParams.get("offset")),
        }),
      });
      return;
    }

    notFound(res);
  } catch (error) {
    sendJson(res, 500, {
      error: error.message,
      stack: error.stack,
    });
  }
});

server.listen(port, host, () => {
  console.log(`Interview backend listening on http://${host}:${port}`);
  console.log(`SQLite DB: ${getInterviewDbFile()}`);
});
