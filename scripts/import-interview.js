import fs from "node:fs/promises";
import path from "node:path";
import {
  defaultSessionTitleFromFile,
  normalizeInterviewTurns,
  parseInterviewTurns,
  saveInterviewSession,
} from "../backend/interview-store.js";

const sourceFilePath = process.env.SOURCE_FILE || path.join(process.cwd(), "标准录音 6.mp3.txt");
const replyFilePath = process.env.REPLY_FILE || path.join(process.cwd(), "output", "deepseek-test.reply.txt");
const turnsFilePath =
  process.env.TURNS_FILE ||
  path.join(path.dirname(replyFilePath), path.basename(replyFilePath).replace(/\.reply\.txt$/i, ".turns.json"));
const sessionTitle = process.env.SESSION_TITLE || defaultSessionTitleFromFile(sourceFilePath);
const sessionKey = process.env.SESSION_KEY;
const model = process.env.MODEL || process.env.DEEPSEEK_MODEL || "deepseek-chat";

async function main() {
  const rawReply = await fs.readFile(replyFilePath, "utf8");
  const turns = normalizeInterviewTurns(parseInterviewTurns(rawReply));
  const result = saveInterviewSession({
    sessionKey,
    title: sessionTitle,
    sourceFilePath,
    replyFilePath,
    rawReply,
    model,
  });
  await fs.writeFile(turnsFilePath, JSON.stringify(turns, null, 2), "utf8");

  console.log("导入完成");
  console.log("sessionKey:", result.sessionKey);
  console.log("title:", result.title);
  console.log("rawTotalRounds:", result.totalRounds);
  console.log("normalizedTotalRounds:", turns.length);
  console.log("dbFile:", result.dbFile);
  console.log("turnsFile:", turnsFilePath);
}

main().catch((error) => {
  console.error("导入失败:", error.message);
  process.exit(1);
});
