import { rounds as mockRounds, sessionSummary as fallbackSessionSummary } from "./mockData";
import type {
  ApiSession,
  ApiTurn,
  ReviewMetric,
  RoundItem,
  RoundReview,
  SessionSummary,
} from "./types";

function formatDate(isoText: string) {
  const date = new Date(isoText);

  if (Number.isNaN(date.getTime())) {
    return isoText;
  }

  return date.toISOString().slice(0, 10);
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function summarizeTurnTitle(turn: ApiTurn) {
  const source = turn.interviewerText || turn.candidateText || `第 ${turn.roundNumber} 轮`;
  return truncateText(source.replace(/\s+/g, " ").trim(), 34);
}

function buildMetrics(turn: ApiTurn): ReviewMetric[] {
  const answerLength = turn.candidateText.trim().length;
  const reviewFlag = turn.interviewerNeedsReview || turn.candidateNeedsReview;

  return [
    {
      label: "轮次",
      value: `第 ${turn.roundNumber} 轮`,
    },
    {
      label: "回答密度",
      value: answerLength > 240 ? "高" : answerLength > 80 ? "中" : "低",
    },
    {
      label: "待确认",
      value: reviewFlag ? "是" : "否",
    },
  ];
}

function buildFallbackReview(turn: ApiTurn): RoundReview {
  const answerLength = turn.candidateText.trim().length;
  const reviewFlag = turn.interviewerNeedsReview || turn.candidateNeedsReview;
  const baseScore = answerLength > 280 ? 86 : answerLength > 120 ? 80 : answerLength > 20 ? 73 : 66;
  const score = reviewFlag ? Math.max(58, baseScore - 8) : baseScore;

  return {
    headline: reviewFlag ? "这一轮存在待确认内容，建议人工复核" : "这一轮已经完成结构化拆分，可继续细化复盘",
    diagnosis: reviewFlag
      ? "当前轮次里有内容被 AI 标记为“待确认”，说明说话人归属或上下文边界还存在不确定性。前端展示时可以保留提醒，但不影响先阅读问答主干。"
      : "这一轮的面试官提问和候选人回答已经可以稳定展示。下一步如果要做更深的复盘，可以继续补充 AI 评分、改写建议和追问策略。",
    score,
    scoreLabel: "当前轮次",
    observations: [],
    suggestions: [],
    followUpPrompts: [
      "请帮我把这轮回答压缩成更利于面试表达的版本",
      "请判断这轮回答里最值得继续追问的点",
      "请基于这轮内容给我生成下一轮可能的问题",
    ],
    metrics: buildMetrics(turn),
  };
}

function buildNotes(turn: ApiTurn) {
  if (turn.interviewerNeedsReview || turn.candidateNeedsReview) {
    return "这一轮存在待确认标记，说明角色划分或上下文归属还有一定不确定性，阅读时建议结合相邻轮次一起看。";
  }

  if (!turn.candidateText.trim()) {
    return "这一轮目前只识别到了单边说话内容，更像是过渡轮次或追问引导轮次。";
  }

  if (turn.candidateText.trim().length > 280) {
    return "这一轮回答信息量很足，但也可能显得偏长。后续接 AI 复盘时，适合先做结论前置和结构压缩。";
  }

  return "这一轮已经适合直接作为目录项与问答详情展示，后续可以继续叠加评分和追问逻辑。";
}

export function buildSessionSummary(session: ApiSession): SessionSummary {
  return {
    sessionKey: session.sessionKey,
    title: session.title,
    model: session.model || fallbackSessionSummary.model,
    totalRounds: session.totalRounds,
    createdDate: formatDate(session.createdAt),
    roleFocus: fallbackSessionSummary.roleFocus,
  };
}

export function buildRoundItem(turn: ApiTurn): RoundItem {
  const sourceRoundNumbers = turn.sourceRoundNumbers?.length
    ? turn.sourceRoundNumbers
    : [turn.roundNumber];
  const mockRound = mockRounds.find((item) => sourceRoundNumbers.includes(item.roundNumber));

  return {
    roundNumber: turn.roundNumber,
    sourceRoundNumbers,
    cueTime: mockRound?.cueTime,
    title: mockRound?.title || summarizeTurnTitle(turn),
    interviewerText: turn.interviewerText || "这轮暂未识别到面试官提问。",
    candidateText: turn.candidateText || "这轮暂未识别到候选人回答。",
    needsReview: turn.interviewerNeedsReview || turn.candidateNeedsReview,
    notes: mockRound?.notes || buildNotes(turn),
    review: mockRound?.review || buildFallbackReview(turn),
  };
}
