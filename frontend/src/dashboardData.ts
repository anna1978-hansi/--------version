import { sessionSummary as mockSessionSummary } from "./mockData";
import type { ApiSession } from "./types";

export type DashboardSessionCard = {
  sessionKey: string;
  title: string;
  company: string;
  department: string;
  roleFocus: string;
  stageTrail: string[];
  currentStage: number;
  statusLabel: string;
  statusTone: "active" | "alert" | "archived";
  outcomeLabel: string;
  weaknessTitle: string;
  weaknessSummary: string;
  improvementNote: string;
  updatedDate: string;
  totalRounds: number;
  model: string;
  isSample: boolean;
};

export type DepartmentDigest = {
  name: string;
  totalSessions: number;
  activeSessions: number;
  mainGap: string;
  note: string;
};

export type FailureCluster = {
  title: string;
  countLabel: string;
  description: string;
};

export type DispatchMemo = {
  label: string;
  title: string;
  description: string;
};

export type ReviewTimelineItem = {
  dateLabel: string;
  title: string;
  description: string;
};

const sessionBlueprints: DashboardSessionCard[] = [
  {
    sessionKey: mockSessionSummary.sessionKey,
    title: mockSessionSummary.title,
    company: "美团",
    department: "到店前端",
    roleFocus: "RN 故障排查 / AI 编程",
    stageTrail: ["一面录音", "问题整理", "二面准备"],
    currentStage: 1,
    statusLabel: "复盘中",
    statusTone: "active",
    outcomeLabel: "二面前补表达",
    weaknessTitle: "结论后置",
    weaknessSummary:
      "事故排查链路是真实的，但关键根因说得太晚，面试官需要自己从长段口语里捞重点。",
    improvementNote: "先说根因，再讲回溯路径和治理动作，整轮会更像高级工程师表达。",
    updatedDate: mockSessionSummary.createdDate,
    totalRounds: mockSessionSummary.totalRounds,
    model: mockSessionSummary.model,
    isSample: true,
  },
  {
    sessionKey: "sample-bilibili-growth",
    title: "商业增长前端一面",
    company: "哔哩哔哩",
    department: "商业增长前端",
    roleFocus: "埋点治理 / 投放链路",
    stageTrail: ["一面结束", "二面待排", "主管面待定"],
    currentStage: 0,
    statusLabel: "待复盘",
    statusTone: "active",
    outcomeLabel: "需补问题拆解",
    weaknessTitle: "承接追问不稳",
    weaknessSummary:
      "能回答主问题，但一到追问就容易回到泛泛描述，缺少拆解顺序和判断依据。",
    improvementNote: "先练“现象、判断、验证、结论”四步，再进入二面准备会更稳。",
    updatedDate: "2026-03-21",
    totalRounds: 18,
    model: "deepseek-chat",
    isSample: true,
  },
  {
    sessionKey: "sample-ai-platform",
    title: "AI 工程效率二面",
    company: "某 AI 应用团队",
    department: "AI 工程效率",
    roleFocus: "规则治理 / 任务拆分",
    stageTrail: ["一面通过", "二面挂点", "归因整理"],
    currentStage: 2,
    statusLabel: "需归因",
    statusTone: "alert",
    outcomeLabel: "治理方案偏虚",
    weaknessTitle: "闭环不足",
    weaknessSummary:
      "知道方向，但没有落到 lint、脚手架、review checklist 这类团队动作，面试官很难继续追问。",
    improvementNote: "所有治理题都补一条制度化动作和一条工具化动作，答案会更扎实。",
    updatedDate: "2026-03-20",
    totalRounds: 22,
    model: "deepseek-chat",
    isSample: true,
  },
  {
    sessionKey: "sample-xiaohongshu-content",
    title: "内容体验前端复盘档案",
    company: "小红书",
    department: "内容体验前端",
    roleFocus: "交互表达 / 项目复盘",
    stageTrail: ["一面结束", "复盘完成", "表达归档"],
    currentStage: 2,
    statusLabel: "已归档",
    statusTone: "archived",
    outcomeLabel: "表达节奏稳定",
    weaknessTitle: "案例辨识度可再提炼",
    weaknessSummary:
      "整体答题平稳，但几个项目亮点还可以再压缩成更容易被记住的表达钩子。",
    improvementNote: "为每个项目准备一句高识别度开场，能让下一轮更快进入深挖。",
    updatedDate: "2026-03-18",
    totalRounds: 16,
    model: "deepseek-chat",
    isSample: true,
  },
];

const departmentNotes: Record<string, string> = {
  到店前端: "更适合重点看真实事故和治理表达，避免答成碎片化排查流水账。",
  商业增长前端: "这类岗位更吃问题拆解、指标意识和实验判断，建议每轮都补充权衡过程。",
  "AI 工程效率": "要把“会用 AI”升级成“怎么建立规则、拆任务、做验证”的方法论表达。",
  内容体验前端: "表达节奏通常不是短板，重点是案例辨识度和用户体验判断是否足够鲜明。",
};

function formatIsoDate(isoText: string) {
  const date = new Date(isoText);

  if (Number.isNaN(date.getTime())) {
    return isoText;
  }

  return date.toISOString().slice(0, 10);
}

export function buildDashboardSessions(sessions: ApiSession[]) {
  const realCards = sessions.map((session, index) => {
    const blueprint = sessionBlueprints[index % sessionBlueprints.length];

    return {
      ...blueprint,
      sessionKey: session.sessionKey,
      title: session.title || blueprint.title,
      updatedDate: formatIsoDate(session.updatedAt),
      totalRounds: session.totalRounds || blueprint.totalRounds,
      model: session.model || blueprint.model,
      isSample: false,
    };
  });

  if (realCards.length >= sessionBlueprints.length) {
    return realCards;
  }

  const usedKeys = new Set(realCards.map((item) => item.sessionKey));
  const fallbackCards = sessionBlueprints
    .filter((item) => !usedKeys.has(item.sessionKey))
    .slice(0, sessionBlueprints.length - realCards.length);

  return realCards.length ? [...realCards, ...fallbackCards] : sessionBlueprints;
}

export function buildDepartmentDigests(cards: DashboardSessionCard[]): DepartmentDigest[] {
  const grouped = new Map<string, DashboardSessionCard[]>();

  cards.forEach((card) => {
    const items = grouped.get(card.department) || [];
    items.push(card);
    grouped.set(card.department, items);
  });

  return Array.from(grouped.entries())
    .slice(0, 3)
    .map(([name, items]) => ({
      name,
      totalSessions: items.length,
      activeSessions: items.filter((item) => item.statusTone !== "archived").length,
      mainGap: items[0]?.weaknessTitle || "待补充",
      note: departmentNotes[name] || "这一组更适合把每轮挂点整理成统一模板，避免复盘信息散落。",
    }));
}

export const failureClusters: FailureCluster[] = [
  {
    title: "结论后置",
    countLabel: "重复出现 3 次",
    description: "故事是真实的，但核心判断说得太慢，导致亮点埋在口语细节里。",
  },
  {
    title: "治理闭环不足",
    countLabel: "集中在 2 份档案",
    description: "知道方向却没有落到工具、流程和团队约束，容易被判断为“只有概念”。",
  },
  {
    title: "追问承接偏弱",
    countLabel: "4 轮明显暴露",
    description: "主问题答得过去，但一到继续深挖就容易失去结构，缺少拆解顺序。",
  },
];

export const dispatchMemos: DispatchMemo[] = [
  {
    label: "本周优先",
    title: "先补治理型答案，再做表达压缩",
    description: "最近被追问最多的是“如何防止再次发生”，这块一旦补强，多个部门都能复用。",
  },
  {
    label: "共用模板",
    title: "为每个部门沉淀一份标准追问框架",
    description: "建议统一成“问题现象、判断路径、最终根因、治理动作、复盘反思”五段式。",
  },
  {
    label: "调度提醒",
    title: "把挂点归因为少数几类，减少散点修补",
    description: "先归到表达、治理、拆解三大类，再决定是改案例还是改回答方式。",
  },
];

export const reviewTimeline: ReviewTimelineItem[] = [
  {
    dateLabel: "03 / 22",
    title: "补齐美团录音的二面表达稿",
    description: "重点压缩 RN 故障排查这一轮，把根因和治理动作提前。",
  },
  {
    dateLabel: "03 / 21",
    title: "商业增长一面的追问节奏偏弱",
    description: "需要把实验判断和指标权衡补成完整话术，不然二面容易继续失速。",
  },
  {
    dateLabel: "03 / 20",
    title: "AI 工程效率二面已整理出挂点",
    description: "核心问题不是不会做，而是治理答案没落到团队机制，已经进入归因阶段。",
  },
];
