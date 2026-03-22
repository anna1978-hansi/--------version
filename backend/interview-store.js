import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const defaultDbFile = process.env.INTERVIEW_DB_FILE || path.join(process.cwd(), "data", "interviews.sqlite");

function ensureParentDir(filepath) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
}

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, "\n");
}

function trimSpeakerPrefix(text) {
  const normalized = text.trim();
  const matched = normalized.match(/^待确认[:：]\s*(.*)$/s);

  if (!matched) {
    return {
      content: normalized,
      needsReview: false,
    };
  }

  return {
    content: matched[1].trim(),
    needsReview: true,
  };
}

function squeezeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function joinUtterances(...parts) {
  return parts
    .map((part) => squeezeText(part))
    .filter(Boolean)
    .join(" ");
}

function isShortAcknowledgement(text) {
  const normalized = squeezeText(text).replace(/[，。！？、,.!?]/g, "");
  return /^(好|好的|嗯|哦|行|可以|ok|OK|收到)$/.test(normalized);
}

function looksLikeQuestion(text) {
  const normalized = squeezeText(text);

  if (!normalized) {
    return false;
  }

  if (/[？?]$/.test(normalized)) {
    return true;
  }

  return /(吗|么|呢|如何|怎么|为什么|哪些|哪个|什么|多少|是不是|是否|能不能|可不可以|方便|介绍一下|讲一下|说一下|聊一下|了解一下|有没有)/.test(
    normalized
  );
}

function looksLikeAnswer(text) {
  const normalized = squeezeText(text);

  if (!normalized) {
    return false;
  }

  if (normalized.length < 20) {
    return false;
  }

  if (/^(我|因为|对|其实|首先|主要|当时|后面|然后|嗯|是这样|这个)/.test(normalized)) {
    return true;
  }

  return /(发现|觉得|理解|排查|加密|传输|处理|优化|实现)/.test(normalized);
}

function looksLikeInterviewerPromptFragment(text) {
  const normalized = squeezeText(text);

  if (!normalized) {
    return false;
  }

  return (
    looksLikeQuestion(normalized) ||
    /(看前面|我看|看到|有写到|想了解|想问|讲一下|介绍一下|聊一下|这边|然后还有|还有看到|我针对)/.test(
      normalized
    )
  );
}

function looksLikeClarification(text) {
  const normalized = squeezeText(text);
  return /(有点卡|没听清|再说一遍|能再说一遍|重复一遍)/.test(normalized);
}

function appendNormalizationMeta(turn, roundNumbers, note) {
  return {
    ...turn,
    sourceRoundNumbers: roundNumbers,
    normalizationNote: note,
  };
}

function mergeRawBlocks(...blocks) {
  return blocks
    .map((block) => String(block || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function shouldMergeSplitQaPair(current, next) {
  return (
    current &&
    next &&
    isShortAcknowledgement(current.interviewerText) &&
    current.candidateNeedsReview &&
    looksLikeQuestion(current.candidateText) &&
    !next.candidateText &&
    next.interviewerNeedsReview &&
    looksLikeAnswer(next.interviewerText)
  );
}

function shouldMergeQuestionContinuation(current, next) {
  return (
    current &&
    next &&
    isShortAcknowledgement(current.interviewerText) &&
    current.candidateNeedsReview &&
    looksLikeInterviewerPromptFragment(current.candidateText) &&
    looksLikeQuestion(next.interviewerText) &&
    next.candidateText &&
    looksLikeClarification(next.candidateText)
  );
}

export function normalizeInterviewTurns(turns) {
  const normalized = [];

  for (let index = 0; index < turns.length; index += 1) {
    const current = turns[index];
    const next = turns[index + 1];

    if (shouldMergeSplitQaPair(current, next)) {
      normalized.push(
        appendNormalizationMeta(
          {
            ...current,
            interviewerText: joinUtterances(current.interviewerText, current.candidateText),
            interviewerNeedsReview:
              Boolean(current.interviewerNeedsReview) || Boolean(current.candidateNeedsReview),
            candidateText: squeezeText(next.interviewerText),
            candidateNeedsReview:
              Boolean(next.interviewerNeedsReview) || Boolean(next.candidateNeedsReview),
            rawBlock: mergeRawBlocks(current.rawBlock, next.rawBlock),
            updatedAt: next.updatedAt || current.updatedAt,
          },
          [current.roundNumber, next.roundNumber],
          "merged_split_qa_pair"
        )
      );
      index += 1;
      continue;
    }

    if (shouldMergeQuestionContinuation(current, next)) {
      normalized.push(
        appendNormalizationMeta(
          {
            ...current,
            interviewerText: joinUtterances(
              current.interviewerText,
              current.candidateText,
              next.interviewerText
            ),
            interviewerNeedsReview:
              Boolean(current.interviewerNeedsReview) ||
              Boolean(current.candidateNeedsReview) ||
              Boolean(next.interviewerNeedsReview),
            candidateText: squeezeText(next.candidateText),
            candidateNeedsReview: Boolean(next.candidateNeedsReview),
            rawBlock: mergeRawBlocks(current.rawBlock, next.rawBlock),
            updatedAt: next.updatedAt || current.updatedAt,
          },
          [current.roundNumber, next.roundNumber],
          "merged_question_continuation"
        )
      );
      index += 1;
      continue;
    }

    normalized.push(
      appendNormalizationMeta(
        {
          ...current,
          interviewerText: squeezeText(current.interviewerText),
          candidateText: squeezeText(current.candidateText),
        },
        [current.roundNumber],
        "kept_as_is"
      )
    );
  }

  return normalized.map((turn, index) => ({
    ...turn,
    roundNumber: index + 1,
  }));
}

function normalizeStoredTurnRow(turn) {
  return {
    ...turn,
    interviewerNeedsReview: Boolean(turn.interviewerNeedsReview),
    candidateNeedsReview: Boolean(turn.candidateNeedsReview),
  };
}

function buildRoundNumberParams(roundNumbers, prefix = "round") {
  const placeholders = [];
  const params = {};

  roundNumbers.forEach((roundNumber, index) => {
    const key = `${prefix}${index}`;
    placeholders.push(`:${key}`);
    params[key] = roundNumber;
  });

  return {
    placeholders: placeholders.join(", "),
    params,
  };
}

function buildManualRawBlock(operationLabel, sourceRoundNumbers, interviewerText, candidateText) {
  const sourceLabel = sourceRoundNumbers.join(", ");

  return [
    `人工${operationLabel}（来源轮次: ${sourceLabel}）`,
    `面试官：${interviewerText || "[空]"}`,
    `面试者：${candidateText || "[空]"}`,
  ].join("\n");
}

function insertMessagesForTurn(db, { sessionKey, turnId, roundNumber, interviewerText, candidateText, createdAt }) {
  const insertMessage = db.prepare(`
    INSERT INTO interview_messages (
      session_key,
      turn_id,
      round_number,
      role,
      speaker_label,
      content,
      needs_review,
      sequence_in_round,
      created_at
    ) VALUES (
      :sessionKey,
      :turnId,
      :roundNumber,
      :role,
      :speakerLabel,
      :content,
      :needsReview,
      :sequenceInRound,
      :createdAt
    )
  `);

  if (interviewerText) {
    insertMessage.run({
      sessionKey,
      turnId,
      roundNumber,
      role: "interviewer",
      speakerLabel: "面试官",
      content: interviewerText,
      needsReview: 0,
      sequenceInRound: 1,
      createdAt,
    });
  }

  if (candidateText) {
    insertMessage.run({
      sessionKey,
      turnId,
      roundNumber,
      role: "candidate",
      speakerLabel: "面试者",
      content: candidateText,
      needsReview: 0,
      sequenceInRound: 2,
      createdAt,
    });
  }
}

function updateSessionRoundStats(db, sessionKey, updatedAt) {
  const row = db
    .prepare(`
      SELECT COUNT(*) AS totalRounds
      FROM interview_turns
      WHERE session_key = :sessionKey
    `)
    .get({ sessionKey });

  const totalRounds = Number(row?.totalRounds || 0);

  db.prepare(`
    UPDATE interview_sessions
    SET total_rounds = :totalRounds,
        updated_at = :updatedAt
    WHERE session_key = :sessionKey
  `).run({
    sessionKey,
    totalRounds,
    updatedAt,
  });

  return totalRounds;
}

function getStoredTurnsByRoundNumbers(db, sessionKey, roundNumbers) {
  if (!roundNumbers.length) {
    return [];
  }

  const { placeholders, params } = buildRoundNumberParams(roundNumbers, "round");

  return db
    .prepare(`
      SELECT
        id,
        round_number AS roundNumber,
        interviewer_text AS interviewerText,
        interviewer_needs_review AS interviewerNeedsReview,
        candidate_text AS candidateText,
        candidate_needs_review AS candidateNeedsReview,
        raw_block AS rawBlock,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM interview_turns
      WHERE session_key = :sessionKey
        AND round_number IN (${placeholders})
      ORDER BY round_number ASC
    `)
    .all({
      sessionKey,
      ...params,
    })
    .map(normalizeStoredTurnRow);
}

function stableSessionKey(sourceFilePath, replyFilePath, model) {
  const raw = `${sourceFilePath || ""}::${replyFilePath || ""}::${model || ""}`;
  return `session-${createHash("sha1").update(raw).digest("hex").slice(0, 16)}`;
}

export function defaultSessionTitleFromFile(sourceFilePath) {
  const filename = path.basename(sourceFilePath || "interview");
  return filename.replace(/(\.[^.]+)+$/, "");
}

export function parseInterviewTurns(rawReply) {
  const normalized = normalizeLineEndings(rawReply || "").trim();
  const roundMatches = [...normalized.matchAll(/^第\s*(\d+)\s*轮.*$/gm)];

  if (!roundMatches.length) {
    throw new Error("AI 回复中没有识别到“第 N 轮”的结构，无法按轮次切割。");
  }

  const turns = [];

  for (let index = 0; index < roundMatches.length; index += 1) {
    const match = roundMatches[index];
    const roundNumber = Number(match[1]);
    const blockStart = match.index;
    const blockEnd = index + 1 < roundMatches.length ? roundMatches[index + 1].index : normalized.length;
    const rawBlock = normalized.slice(blockStart, blockEnd).trim();
    const lines = rawBlock.split("\n");
    const interviewerParts = [];
    const candidateParts = [];
    let currentRole = null;

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex].trim();

      if (!line) {
        continue;
      }

      if (line.startsWith("面试官：")) {
        currentRole = "interviewer";
        interviewerParts.push(line.slice("面试官：".length).trim());
        continue;
      }

      if (line.startsWith("面试者：")) {
        currentRole = "candidate";
        candidateParts.push(line.slice("面试者：".length).trim());
        continue;
      }

      if (currentRole === "interviewer") {
        interviewerParts.push(line);
      } else if (currentRole === "candidate") {
        candidateParts.push(line);
      }
    }

    const interviewer = trimSpeakerPrefix(interviewerParts.join("\n"));
    const candidate = trimSpeakerPrefix(candidateParts.join("\n"));

    turns.push({
      roundNumber,
      interviewerText: interviewer.content,
      interviewerNeedsReview: interviewer.needsReview,
      candidateText: candidate.content,
      candidateNeedsReview: candidate.needsReview,
      rawBlock,
    });
  }

  return turns;
}

export function openInterviewDb(dbFile = defaultDbFile) {
  ensureParentDir(dbFile);
  const db = new DatabaseSync(dbFile);

  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS interview_sessions (
      session_key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source_file_path TEXT,
      reply_file_path TEXT,
      model TEXT,
      total_rounds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interview_turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_key TEXT NOT NULL REFERENCES interview_sessions(session_key) ON DELETE CASCADE,
      round_number INTEGER NOT NULL,
      interviewer_text TEXT,
      interviewer_needs_review INTEGER NOT NULL DEFAULT 0,
      candidate_text TEXT,
      candidate_needs_review INTEGER NOT NULL DEFAULT 0,
      raw_block TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(session_key, round_number)
    );

    CREATE TABLE IF NOT EXISTS interview_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_key TEXT NOT NULL REFERENCES interview_sessions(session_key) ON DELETE CASCADE,
      turn_id INTEGER NOT NULL REFERENCES interview_turns(id) ON DELETE CASCADE,
      round_number INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('interviewer', 'candidate')),
      speaker_label TEXT NOT NULL,
      content TEXT NOT NULL,
      needs_review INTEGER NOT NULL DEFAULT 0,
      sequence_in_round INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(session_key, round_number, role)
    );

    CREATE INDEX IF NOT EXISTS idx_interview_turns_session_round
      ON interview_turns(session_key, round_number);

    CREATE INDEX IF NOT EXISTS idx_interview_messages_session_round
      ON interview_messages(session_key, round_number, sequence_in_round);
  `);

  return db;
}

export function saveInterviewSession({
  dbFile = defaultDbFile,
  sessionKey,
  title,
  sourceFilePath,
  replyFilePath,
  rawReply,
  model,
}) {
  const turns = parseInterviewTurns(rawReply);
  const db = openInterviewDb(dbFile);
  const now = new Date().toISOString();
  const resolvedSessionKey =
    sessionKey || stableSessionKey(sourceFilePath, replyFilePath, model);
  const resolvedTitle = title || defaultSessionTitleFromFile(sourceFilePath);

  const upsertSession = db.prepare(`
    INSERT INTO interview_sessions (
      session_key,
      title,
      source_file_path,
      reply_file_path,
      model,
      total_rounds,
      created_at,
      updated_at
    ) VALUES (
      :sessionKey,
      :title,
      :sourceFilePath,
      :replyFilePath,
      :model,
      :totalRounds,
      :createdAt,
      :updatedAt
    )
    ON CONFLICT(session_key) DO UPDATE SET
      title = excluded.title,
      source_file_path = excluded.source_file_path,
      reply_file_path = excluded.reply_file_path,
      model = excluded.model,
      total_rounds = excluded.total_rounds,
      updated_at = excluded.updated_at
  `);
  const deleteMessages = db.prepare("DELETE FROM interview_messages WHERE session_key = :sessionKey");
  const deleteTurns = db.prepare("DELETE FROM interview_turns WHERE session_key = :sessionKey");
  const insertTurn = db.prepare(`
    INSERT INTO interview_turns (
      session_key,
      round_number,
      interviewer_text,
      interviewer_needs_review,
      candidate_text,
      candidate_needs_review,
      raw_block,
      created_at,
      updated_at
    ) VALUES (
      :sessionKey,
      :roundNumber,
      :interviewerText,
      :interviewerNeedsReview,
      :candidateText,
      :candidateNeedsReview,
      :rawBlock,
      :createdAt,
      :updatedAt
    )
  `);
  const insertMessage = db.prepare(`
    INSERT INTO interview_messages (
      session_key,
      turn_id,
      round_number,
      role,
      speaker_label,
      content,
      needs_review,
      sequence_in_round,
      created_at
    ) VALUES (
      :sessionKey,
      :turnId,
      :roundNumber,
      :role,
      :speakerLabel,
      :content,
      :needsReview,
      :sequenceInRound,
      :createdAt
    )
  `);

  try {
    db.exec("BEGIN");

    upsertSession.run({
      sessionKey: resolvedSessionKey,
      title: resolvedTitle,
      sourceFilePath: sourceFilePath || null,
      replyFilePath: replyFilePath || null,
      model: model || null,
      totalRounds: turns.length,
      createdAt: now,
      updatedAt: now,
    });

    deleteMessages.run({ sessionKey: resolvedSessionKey });
    deleteTurns.run({ sessionKey: resolvedSessionKey });

    for (const turn of turns) {
      const inserted = insertTurn.run({
        sessionKey: resolvedSessionKey,
        roundNumber: turn.roundNumber,
        interviewerText: turn.interviewerText || "",
        interviewerNeedsReview: turn.interviewerNeedsReview ? 1 : 0,
        candidateText: turn.candidateText || "",
        candidateNeedsReview: turn.candidateNeedsReview ? 1 : 0,
        rawBlock: turn.rawBlock,
        createdAt: now,
        updatedAt: now,
      });

      const turnId = Number(inserted.lastInsertRowid);

      if (turn.interviewerText) {
        insertMessage.run({
          sessionKey: resolvedSessionKey,
          turnId,
          roundNumber: turn.roundNumber,
          role: "interviewer",
          speakerLabel: "面试官",
          content: turn.interviewerText,
          needsReview: turn.interviewerNeedsReview ? 1 : 0,
          sequenceInRound: 1,
          createdAt: now,
        });
      }

      if (turn.candidateText) {
        insertMessage.run({
          sessionKey: resolvedSessionKey,
          turnId,
          roundNumber: turn.roundNumber,
          role: "candidate",
          speakerLabel: "面试者",
          content: turn.candidateText,
          needsReview: turn.candidateNeedsReview ? 1 : 0,
          sequenceInRound: 2,
          createdAt: now,
        });
      }
    }

    db.exec("COMMIT");

    return {
      dbFile,
      sessionKey: resolvedSessionKey,
      title: resolvedTitle,
      totalRounds: turns.length,
      turns,
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export function listSessions(dbFile = defaultDbFile) {
  const db = openInterviewDb(dbFile);

  try {
    return db
      .prepare(`
        SELECT
          session_key AS sessionKey,
          title,
          source_file_path AS sourceFilePath,
          reply_file_path AS replyFilePath,
          model,
          total_rounds AS totalRounds,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM interview_sessions
        ORDER BY updated_at DESC
      `)
      .all();
  } finally {
    db.close();
  }
}

export function getSession(dbFile = defaultDbFile, sessionKey) {
  const db = openInterviewDb(dbFile);

  try {
    return (
      db
        .prepare(`
          SELECT
            session_key AS sessionKey,
            title,
            source_file_path AS sourceFilePath,
            reply_file_path AS replyFilePath,
            model,
            total_rounds AS totalRounds,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM interview_sessions
          WHERE session_key = :sessionKey
        `)
        .get({ sessionKey }) || null
    );
  } finally {
    db.close();
  }
}

export function listTurns(dbFile = defaultDbFile, sessionKey, { fromRound, toRound, limit, offset } = {}) {
  const db = openInterviewDb(dbFile);
  const whereClauses = ["session_key = :sessionKey"];
  const params = {
    sessionKey,
  };

  if (Number.isFinite(fromRound)) {
    whereClauses.push("round_number >= :fromRound");
    params.fromRound = fromRound;
  }

  if (Number.isFinite(toRound)) {
    whereClauses.push("round_number <= :toRound");
    params.toRound = toRound;
  }

  let sql = `
    SELECT
      round_number AS roundNumber,
      interviewer_text AS interviewerText,
      interviewer_needs_review AS interviewerNeedsReview,
      candidate_text AS candidateText,
      candidate_needs_review AS candidateNeedsReview,
      raw_block AS rawBlock,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM interview_turns
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY round_number ASC
  `;

  if (Number.isFinite(limit)) {
    sql += " LIMIT :limit";
    params.limit = limit;
  }

  if (Number.isFinite(offset)) {
    sql += " OFFSET :offset";
    params.offset = offset;
  }

  try {
    const rawTurns = db.prepare(sql).all(params).map(normalizeStoredTurnRow);

    return normalizeInterviewTurns(rawTurns);
  } finally {
    db.close();
  }
}

export function mergeInterviewTurns(
  dbFile = defaultDbFile,
  sessionKey,
  { roundNumbers, mergedInterviewerText, mergedCandidateText }
) {
  const normalizedRoundNumbers = [...new Set((roundNumbers || []).map((value) => Number(value)))]
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((left, right) => left - right);

  if (normalizedRoundNumbers.length !== 2) {
    throw new Error("合并接口只接受 2 个轮次。");
  }

  if (normalizedRoundNumbers[1] !== normalizedRoundNumbers[0] + 1) {
    throw new Error("只允许合并相邻的两轮。");
  }

  const displayTurns = listTurns(dbFile, sessionKey);
  const selectedTurns = normalizedRoundNumbers.map((roundNumber) =>
    displayTurns.find((turn) => turn.roundNumber === roundNumber)
  );

  if (selectedTurns.some((turn) => !turn)) {
    throw new Error("存在未找到的轮次，无法执行合并。");
  }

  const sourceRoundNumbers = [...new Set(
    selectedTurns.flatMap((turn) =>
      turn.sourceRoundNumbers?.length ? turn.sourceRoundNumbers : [turn.roundNumber]
    )
  )].sort((left, right) => left - right);

  if (sourceRoundNumbers.length < 2) {
    throw new Error("当前所选内容不足以执行合并。");
  }

  const interviewerText = squeezeText(mergedInterviewerText);
  const candidateText = squeezeText(mergedCandidateText);

  if (!interviewerText && !candidateText) {
    throw new Error("合并后的面试官和面试者内容不能同时为空。");
  }

  const db = openInterviewDb(dbFile);
  const now = new Date().toISOString();
  const sourceTurns = getStoredTurnsByRoundNumbers(db, sessionKey, sourceRoundNumbers);

  if (sourceTurns.length !== sourceRoundNumbers.length) {
    db.close();
    throw new Error("数据库中的原始轮次和当前展示轮次不一致，请刷新页面后重试。");
  }

  const keepTurn = sourceTurns[0];
  const deleteRoundNumbers = sourceTurns.slice(1).map((turn) => turn.roundNumber);
  const { placeholders, params } = buildRoundNumberParams(sourceRoundNumbers, "round");

  try {
    db.exec("BEGIN");

    db.prepare(`
      DELETE FROM interview_messages
      WHERE session_key = :sessionKey
        AND round_number IN (${placeholders})
    `).run({
      sessionKey,
      ...params,
    });

    if (deleteRoundNumbers.length) {
      const deleteInfo = buildRoundNumberParams(deleteRoundNumbers, "deleteRound");
      db.prepare(`
        DELETE FROM interview_turns
        WHERE session_key = :sessionKey
          AND round_number IN (${deleteInfo.placeholders})
      `).run({
        sessionKey,
        ...deleteInfo.params,
      });
    }

    db.prepare(`
      UPDATE interview_turns
      SET interviewer_text = :interviewerText,
          interviewer_needs_review = 0,
          candidate_text = :candidateText,
          candidate_needs_review = 0,
          raw_block = :rawBlock,
          updated_at = :updatedAt
      WHERE id = :turnId
    `).run({
      turnId: keepTurn.id,
      interviewerText,
      candidateText,
      rawBlock: buildManualRawBlock("合并", sourceRoundNumbers, interviewerText, candidateText),
      updatedAt: now,
    });

    insertMessagesForTurn(db, {
      sessionKey,
      turnId: keepTurn.id,
      roundNumber: keepTurn.roundNumber,
      interviewerText,
      candidateText,
      createdAt: now,
    });

    updateSessionRoundStats(db, sessionKey, now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export function deleteInterviewTurn(dbFile = defaultDbFile, sessionKey, roundNumber) {
  const normalizedRoundNumber = Number(roundNumber);

  if (!Number.isInteger(normalizedRoundNumber) || normalizedRoundNumber <= 0) {
    throw new Error("删除接口需要合法的轮次编号。");
  }

  const displayTurns = listTurns(dbFile, sessionKey);
  const selectedTurn = displayTurns.find((turn) => turn.roundNumber === normalizedRoundNumber);

  if (!selectedTurn) {
    throw new Error("当前轮次不存在，无法删除。");
  }

  const sourceRoundNumbers =
    selectedTurn.sourceRoundNumbers?.length ? selectedTurn.sourceRoundNumbers : [selectedTurn.roundNumber];
  const db = openInterviewDb(dbFile);
  const now = new Date().toISOString();
  const { placeholders, params } = buildRoundNumberParams(sourceRoundNumbers, "round");

  try {
    db.exec("BEGIN");

    db.prepare(`
      DELETE FROM interview_messages
      WHERE session_key = :sessionKey
        AND round_number IN (${placeholders})
    `).run({
      sessionKey,
      ...params,
    });

    db.prepare(`
      DELETE FROM interview_turns
      WHERE session_key = :sessionKey
        AND round_number IN (${placeholders})
    `).run({
      sessionKey,
      ...params,
    });

    updateSessionRoundStats(db, sessionKey, now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export function listMessages(dbFile = defaultDbFile, sessionKey, { fromRound, toRound, limit, offset } = {}) {
  const db = openInterviewDb(dbFile);
  const whereClauses = ["session_key = :sessionKey"];
  const params = {
    sessionKey,
  };

  if (Number.isFinite(fromRound)) {
    whereClauses.push("round_number >= :fromRound");
    params.fromRound = fromRound;
  }

  if (Number.isFinite(toRound)) {
    whereClauses.push("round_number <= :toRound");
    params.toRound = toRound;
  }

  let sql = `
    SELECT
      round_number AS roundNumber,
      role,
      speaker_label AS speakerLabel,
      content,
      needs_review AS needsReview,
      sequence_in_round AS sequenceInRound,
      created_at AS createdAt
    FROM interview_messages
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY round_number ASC, sequence_in_round ASC
  `;

  if (Number.isFinite(limit)) {
    sql += " LIMIT :limit";
    params.limit = limit;
  }

  if (Number.isFinite(offset)) {
    sql += " OFFSET :offset";
    params.offset = offset;
  }

  try {
    return db
      .prepare(sql)
      .all(params)
      .map((message) => ({
        ...message,
        needsReview: Boolean(message.needsReview),
      }));
  } finally {
    db.close();
  }
}

export function getInterviewDbFile() {
  return defaultDbFile;
}
