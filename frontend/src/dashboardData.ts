import { sessionSummary as mockSessionSummary } from "./mockData";
import type { ApiSession } from "./types";

export type InterviewStatusKey =
  | "scheduled"
  | "active"
  | "waiting"
  | "passed"
  | "rejected"
  | "archived";

export type InterviewStatusTone = InterviewStatusKey;

export type InterviewRoundPlan = {
  name: string;
  schedule: string;
  outcome: string;
  statusTone: InterviewStatusTone;
  note: string;
};

export type InterviewTask = {
  title: string;
  description: string;
};

export type InterviewHistoryItem = {
  dateLabel: string;
  title: string;
  description: string;
};

export type InterviewResource = {
  label: string;
  description: string;
  actionLabel: string;
  actionType: "workspace" | "note" | "result";
};

export type DashboardSessionCard = {
  sessionKey: string;
  title: string;
  company: string;
  department: string;
  roleTitle: string;
  roleFocus: string;
  sourceChannel: string;
  city: string;
  recruiterName: string;
  salaryRange: string;
  stageTrail: string[];
  currentStage: number;
  statusKey: InterviewStatusKey;
  statusLabel: string;
  statusTone: InterviewStatusTone;
  nextInterviewAt: string;
  updatedDate: string;
  totalRounds: number;
  model: string;
  isSample: boolean;
  summary: string;
  weaknessTitle: string;
  weaknessSummary: string;
  improvementNote: string;
  nextActionLabel: string;
  resultSummary: string;
  decisionNote: string;
  roundPlans: InterviewRoundPlan[];
  tasks: InterviewTask[];
  history: InterviewHistoryItem[];
  resources: InterviewResource[];
};

export type PlatformDigest = {
  name: string;
  totalSessions: number;
  activeSessions: number;
  note: string;
};

export type HomeActivityItem = {
  dateLabel: string;
  title: string;
  description: string;
};

export type StatusOption = {
  key: InterviewStatusKey;
  label: string;
  description: string;
};

export type MemoTaskItem = {
  id: string;
  title: string;
  detail: string;
  dueLabel: string;
  completed: boolean;
  tone: "critical" | "focus" | "steady";
};

export type MemoTaskGroup = {
  id: string;
  title: string;
  description: string;
  items: MemoTaskItem[];
};

export type MemoSidebarItem = {
  label: string;
  value: string;
  note: string;
};

export const interviewStatusMeta: Record<
  InterviewStatusKey,
  {
    label: string;
    tone: InterviewStatusTone;
  }
> = {
  scheduled: {
    label: "已安排",
    tone: "scheduled",
  },
  active: {
    label: "进行中",
    tone: "active",
  },
  waiting: {
    label: "待结果",
    tone: "waiting",
  },
  passed: {
    label: "已通过",
    tone: "passed",
  },
  rejected: {
    label: "未通过",
    tone: "rejected",
  },
  archived: {
    label: "已归档",
    tone: "archived",
  },
};

export const statusUpdateOptions: StatusOption[] = [
  {
    key: "scheduled",
    label: "标记为已安排",
    description: "适合刚拿到面试时间、还没进入正式轮次的状态。",
  },
  {
    key: "active",
    label: "标记为进行中",
    description: "适合已经开始面试流程，当前还在继续推进的档案。",
  },
  {
    key: "waiting",
    label: "标记为待结果",
    description: "适合本轮已面完，正在等反馈或等下一步安排。",
  },
  {
    key: "passed",
    label: "标记为已通过",
    description: "适合某一轮明确通过，准备进入下一轮或进入 offer 流程。",
  },
  {
    key: "rejected",
    label: "标记为未通过",
    description: "适合已经明确挂掉，准备做归因和复盘归档。",
  },
  {
    key: "archived",
    label: "标记为已归档",
    description: "适合这条线已经整理完，不再作为当前重点推进。",
  },
];

const sourceChannelNotes: Record<string, string> = {
  内推: "内推来的线通常反馈更快，适合优先维护状态变更和下一轮准备。",
  "Boss 直聘": "Boss 直聘的机会量大，首页更适合先看时间和状态，不要让档案散掉。",
  猎聘: "猎聘更适合沉淀结果记录和薪资区间，方便后续横向比较。",
  官网投递: "官网投递节奏会慢一些，适合在平台里长期跟踪进度，不用频繁打断复盘。 ",
};

function formatIsoDate(isoText: string) {
  const date = new Date(isoText);

  if (Number.isNaN(date.getTime())) {
    return isoText;
  }

  return date.toISOString().slice(0, 10);
}

export function applyInterviewStatus(
  card: DashboardSessionCard,
  statusKey: InterviewStatusKey
): DashboardSessionCard {
  const statusMeta = interviewStatusMeta[statusKey];

  return {
    ...card,
    statusKey,
    statusLabel: statusMeta.label,
    statusTone: statusMeta.tone,
  };
}

const sessionBlueprints: DashboardSessionCard[] = [
  applyInterviewStatus(
    {
      sessionKey: mockSessionSummary.sessionKey,
      title: mockSessionSummary.title,
      company: "美团",
      department: "到店前端",
      roleTitle: "前端开发工程师",
      roleFocus: "RN 故障排查 / AI 编程",
      sourceChannel: "内推",
      city: "上海",
      recruiterName: "业务 HR",
      salaryRange: "25k - 35k x 16",
      stageTrail: ["已投递", "一面通过", "二面待面", "主管面"],
      currentStage: 2,
      statusKey: "active",
      statusLabel: "",
      statusTone: "active",
      nextInterviewAt: "03/25 周三 19:30 · 技术二面",
      updatedDate: mockSessionSummary.createdDate,
      totalRounds: mockSessionSummary.totalRounds,
      model: mockSessionSummary.model,
      isSample: true,
      summary:
        "这是目前最值得投入的一条线。真实事故和 AI 编程经验都能打，但二面前需要把结论前置和治理闭环补齐。",
      weaknessTitle: "结论后置",
      weaknessSummary:
        "事故排查链路是真实的，但关键根因说得太晚，面试官需要自己从长段口语里捞重点。",
      improvementNote: "二面前重点把“根因、回溯、治理”压成一套更利落的表达。",
      nextActionLabel: "今晚先补一版 90 秒事故排查答案",
      resultSummary: "一面反馈偏正面，问题主要集中在表达收束和治理动作不够具体。",
      decisionNote:
        "如果二面能把治理方案说实，这条线很有机会继续推进到主管面。当前不需要换案例，只需要把表达打磨得更工程化。",
      roundPlans: [
        {
          name: "HR 沟通",
          schedule: "03/18 周三 14:00",
          outcome: "已完成",
          statusTone: "passed",
          note: "确认岗位方向和项目经历，整体匹配度较高。",
        },
        {
          name: "技术一面",
          schedule: "03/21 周六 20:00",
          outcome: "已通过",
          statusTone: "passed",
          note: "事故排查案例真实，但治理闭环被继续追问。",
        },
        {
          name: "技术二面",
          schedule: "03/25 周三 19:30",
          outcome: "待准备",
          statusTone: "scheduled",
          note: "重点准备治理措施、追问承接和表达压缩。",
        },
        {
          name: "主管面",
          schedule: "待排期",
          outcome: "未开始",
          statusTone: "archived",
          note: "先把二面打稳，再决定是否继续补项目治理案例。",
        },
      ],
      tasks: [
        {
          title: "压缩 RN 故障排查表达",
          description: "把根因前置，减少口语连接词，控制在 90 秒左右。",
        },
        {
          title: "补一条团队治理动作",
          description: "统一 alias、lint 规则和 review checklist，形成真实工程闭环。",
        },
        {
          title: "准备 AI 编程追问",
          description: "把规则配置、任务拆分和验证方式整理成三步法。",
        },
      ],
      history: [
        {
          dateLabel: "03 / 22",
          title: "确认二面时间",
          description: "时间已经落到 03/25 周三晚上，优先级升到本周第一位。",
        },
        {
          dateLabel: "03 / 21",
          title: "一面结束并进入复盘",
          description: "技术一面整体通过，但“治理”相关追问还不够扎实。",
        },
        {
          dateLabel: "03 / 18",
          title: "内推线建立",
          description: "HR 已确认团队方向偏 RN 和工程效率，案例匹配度不错。",
        },
      ],
      resources: [
        {
          label: "录音复盘工作台",
          description: "继续整理轮次、改写答案、保留面试原声片段。",
          actionLabel: "进入工作台",
          actionType: "workspace",
        },
        {
          label: "结果记录草稿",
          description: "后面接数据库时，这里会接状态变化、反馈原文和时间戳。",
          actionLabel: "查看结果位",
          actionType: "result",
        },
        {
          label: "表达改写笔记",
          description: "沉淀每轮最适合记忆的版本，避免下次又从零组织。",
          actionLabel: "打开笔记位",
          actionType: "note",
        },
      ],
    },
    "active"
  ),
  applyInterviewStatus(
    {
      sessionKey: "sample-bilibili-growth",
      title: "商业增长前端一面",
      company: "哔哩哔哩",
      department: "商业增长前端",
      roleTitle: "前端开发工程师",
      roleFocus: "埋点治理 / 投放链路",
      sourceChannel: "Boss 直聘",
      city: "上海",
      recruiterName: "招聘 HR",
      salaryRange: "24k - 32k x 15",
      stageTrail: ["约面完成", "技术一面", "二面待定", "结果确认"],
      currentStage: 1,
      statusKey: "scheduled",
      statusLabel: "",
      statusTone: "scheduled",
      nextInterviewAt: "03/24 周二 18:30 · 技术一面",
      updatedDate: "2026-03-21",
      totalRounds: 18,
      model: "deepseek-chat",
      isSample: true,
      summary:
        "这条线还没进入深度复盘，更像一个即将发生的档案。首页里应该先看时间和准备动作，而不是看长内容。",
      weaknessTitle: "追问承接偏弱",
      weaknessSummary:
        "主问题能答，但容易在追问阶段回到泛泛描述，缺少实验判断和指标权衡。",
      improvementNote: "一面前把“现象、判断、验证、结论”练顺，不然第一轮就会暴露。",
      nextActionLabel: "把投放链路案例拆成一版 3 分钟答案",
      resultSummary: "还没正式开始面试，当前最重要的是准备第一轮的结构和例子顺序。",
      decisionNote:
        "这条线的关键不是先做大复盘，而是把案例表达准备好，避免面试后再回头修补基础结构。",
      roundPlans: [
        {
          name: "简历筛选",
          schedule: "03/20 周五",
          outcome: "已通过",
          statusTone: "passed",
          note: "HR 已确认约面，岗位偏增长与数据联动。",
        },
        {
          name: "技术一面",
          schedule: "03/24 周二 18:30",
          outcome: "待进行",
          statusTone: "scheduled",
          note: "重点准备埋点治理、实验判断和跨团队协作案例。",
        },
        {
          name: "技术二面",
          schedule: "待安排",
          outcome: "未开始",
          statusTone: "archived",
          note: "先看一面反馈，再决定是否补更多增长策略表达。",
        },
      ],
      tasks: [
        {
          title: "准备增长案例主线",
          description: "从目标、指标、方案选择、结果复盘四段切开，避免答得散。",
        },
        {
          title: "补一条实验权衡",
          description: "要能说明为什么选这个方案，而不是只说最后做了什么。",
        },
      ],
      history: [
        {
          dateLabel: "03 / 21",
          title: "收到约面时间",
          description: "已经锁定周二晚上的技术一面，优先级次于美团二面。",
        },
        {
          dateLabel: "03 / 20",
          title: "Boss 直聘沟通建立",
          description: "JD 更看重增长实验和业务配合，不是纯组件开发方向。",
        },
      ],
      resources: [
        {
          label: "面经整理位",
          description: "后面可以放和商业增长相关的高频追问。",
          actionLabel: "查看占位",
          actionType: "note",
        },
        {
          label: "结果记录草稿",
          description: "一面结束后可以直接在档案页补状态和反馈。",
          actionLabel: "查看结果位",
          actionType: "result",
        },
      ],
    },
    "scheduled"
  ),
  applyInterviewStatus(
    {
      sessionKey: "sample-ai-platform",
      title: "AI 工程效率二面",
      company: "某 AI 应用团队",
      department: "AI 工程效率",
      roleTitle: "前端 / AI 工程效率",
      roleFocus: "规则治理 / 任务拆分",
      sourceChannel: "猎聘",
      city: "杭州",
      recruiterName: "技术招聘",
      salaryRange: "30k - 40k x 16",
      stageTrail: ["一面通过", "二面结束", "结果待回", "结论归档"],
      currentStage: 2,
      statusKey: "waiting",
      statusLabel: "",
      statusTone: "waiting",
      nextInterviewAt: "等待结果反馈",
      updatedDate: "2026-03-20",
      totalRounds: 22,
      model: "deepseek-chat",
      isSample: true,
      summary:
        "这条线已经面到比较深的轮次了，重点不是排时间，而是把结果、挂点和后续是否继续投入整理清楚。",
      weaknessTitle: "治理闭环不足",
      weaknessSummary:
        "知道 AI 编程和规则治理的方向，但没有落到工具、流程与团队机制，所以回答仍然偏虚。",
      improvementNote: "如果拿到拒绝反馈，优先把挂点归到治理动作不落地这类问题里。",
      nextActionLabel: "等反馈时先整理一版“AI 规则治理”标准答案",
      resultSummary: "二面已经结束，目前在等团队反馈。无论结果如何，这条线都值得沉淀成方法论。",
      decisionNote:
        "这一条线的价值很高，因为它暴露的是方法论表达问题，不是具体项目经历不足。后续很适合作为模板档案保留。",
      roundPlans: [
        {
          name: "技术一面",
          schedule: "03/15 周日",
          outcome: "已通过",
          statusTone: "passed",
          note: "AI 编程经验有辨识度，整体印象较好。",
        },
        {
          name: "技术二面",
          schedule: "03/20 周五 19:00",
          outcome: "已完成",
          statusTone: "waiting",
          note: "治理型问题被追问得更深，缺的是落地动作和团队机制。",
        },
        {
          name: "最终结果",
          schedule: "待回信",
          outcome: "等待中",
          statusTone: "waiting",
          note: "无论是否通过，都要把挂点整理进复盘模板里。",
        },
      ],
      tasks: [
        {
          title: "补齐工具链表达",
          description: "把 lint、脚手架、模板和 review 机制都补到答案里。",
        },
        {
          title: "整理拒绝原因模板",
          description: "后面接数据库时，这条档案可以直接写入被挂原因分类。",
        },
      ],
      history: [
        {
          dateLabel: "03 / 20",
          title: "二面完成",
          description: "回答里方法论方向对，但团队治理动作还不够具体。",
        },
        {
          dateLabel: "03 / 16",
          title: "进入二面准备",
          description: "把 Cursor rules、跨仓库协作和验证闭环作为主要亮点。",
        },
      ],
      resources: [
        {
          label: "治理问题模板",
          description: "适合沉淀一版后续多个岗位都能复用的答案骨架。",
          actionLabel: "打开模板位",
          actionType: "note",
        },
        {
          label: "结果记录草稿",
          description: "反馈一到，就可以直接把是否通过和挂点补进这里。",
          actionLabel: "查看结果位",
          actionType: "result",
        },
      ],
    },
    "waiting"
  ),
  applyInterviewStatus(
    {
      sessionKey: "sample-xiaohongshu-content",
      title: "内容体验前端复盘档案",
      company: "小红书",
      department: "内容体验前端",
      roleTitle: "前端开发工程师",
      roleFocus: "交互表达 / 项目复盘",
      sourceChannel: "官网投递",
      city: "上海",
      recruiterName: "招聘同学",
      salaryRange: "26k - 34k x 15",
      stageTrail: ["一面结束", "二面结束", "结果已回", "归档整理"],
      currentStage: 3,
      statusKey: "rejected",
      statusLabel: "",
      statusTone: "rejected",
      nextInterviewAt: "本轮已结束",
      updatedDate: "2026-03-18",
      totalRounds: 16,
      model: "deepseek-chat",
      isSample: true,
      summary:
        "这是一条已经结束的档案，更适合记录被挂原因、提炼经验，而不是继续堆新的待办。",
      weaknessTitle: "案例辨识度不足",
      weaknessSummary:
        "整体表达平稳，但几个项目亮点没有形成让人记得住的钩子，导致面试结束后记忆点偏弱。",
      improvementNote: "适合沉淀成“高识别度开场句”模板，供其他岗位复用。",
      nextActionLabel: "把挂点归到“亮点不够鲜明”这一类模板里",
      resultSummary: "团队已明确结束当前流程，这条档案的重点转为归因和经验回收。",
      decisionNote:
        "不建议继续追加准备动作，更适合把表达节奏与项目亮点问题归档，作为后续所有内容体验类岗位的参考。",
      roundPlans: [
        {
          name: "技术一面",
          schedule: "03/10 周二",
          outcome: "已完成",
          statusTone: "passed",
          note: "整体表达平稳，没有明显失误。",
        },
        {
          name: "技术二面",
          schedule: "03/17 周二",
          outcome: "已结束",
          statusTone: "rejected",
          note: "案例亮点不够聚焦，缺少能被面试官快速记住的表达钩子。",
        },
        {
          name: "结果归档",
          schedule: "03/18 周三",
          outcome: "已记录",
          statusTone: "archived",
          note: "后续只保留经验摘要，不继续投入面试准备时间。",
        },
      ],
      tasks: [
        {
          title: "提炼项目开场句",
          description: "为每个项目写一句更能被记住的开场表达，用于下一次类似岗位。",
        },
      ],
      history: [
        {
          dateLabel: "03 / 18",
          title: "收到未通过反馈",
          description: "问题不在基础能力，而在案例辨识度和记忆点不足。",
        },
        {
          dateLabel: "03 / 17",
          title: "二面结束",
          description: "整体交流顺畅，但没有形成足够鲜明的项目印象。",
        },
      ],
      resources: [
        {
          label: "挂点归档位",
          description: "后面接库后，这里可以关联统一的失败原因分类。",
          actionLabel: "查看归档位",
          actionType: "result",
        },
      ],
    },
    "rejected"
  ),
  applyInterviewStatus(
    {
      sessionKey: "sample-dewu-commerce",
      title: "电商前端主管面准备",
      company: "得物",
      department: "电商交易前端",
      roleTitle: "高级前端工程师",
      roleFocus: "性能治理 / 业务稳定性",
      sourceChannel: "Boss 直聘",
      city: "上海",
      recruiterName: "HRBP",
      salaryRange: "32k - 42k x 16",
      stageTrail: ["一面通过", "二面通过", "主管面待排", "结果确认"],
      currentStage: 2,
      statusKey: "passed",
      statusLabel: "",
      statusTone: "passed",
      nextInterviewAt: "等待主管面排期",
      updatedDate: "2026-03-19",
      totalRounds: 20,
      model: "deepseek-chat",
      isSample: true,
      summary:
        "这条线目前推进最顺，说明工程稳定性和性能治理方向是有竞争力的。平台首页里适合把它放在“已推进”区域。",
      weaknessTitle: "业务故事还可以再压缩",
      weaknessSummary:
        "回答已经够稳，但如果想在主管面更有说服力，还需要把业务影响和团队协同讲得更简洁。",
      improvementNote: "主管面前不用大改技术内容，更重要的是强化业务价值和协作判断。",
      nextActionLabel: "补一版“性能治理带来什么业务收益”的开场句",
      resultSummary: "前两轮反馈不错，目前只是等待主管面时间，不需要再做重型复盘。",
      decisionNote:
        "这条线更像稳定推进型机会，建议保持节奏，不用额外投入太多修补时间，重点是别临场失去简洁度。",
      roundPlans: [
        {
          name: "技术一面",
          schedule: "03/11 周三",
          outcome: "已通过",
          statusTone: "passed",
          note: "性能治理和问题排查得到较多正向反馈。",
        },
        {
          name: "技术二面",
          schedule: "03/18 周三",
          outcome: "已通过",
          statusTone: "passed",
          note: "整体稳定，后续会进入主管面。",
        },
        {
          name: "主管面",
          schedule: "待排期",
          outcome: "待安排",
          statusTone: "passed",
          note: "重点讲业务收益、跨团队推动和取舍判断。",
        },
      ],
      tasks: [
        {
          title: "压缩业务价值表达",
          description: "把性能治理的收益说成 2 到 3 个清晰结论，不要展开过长。",
        },
      ],
      history: [
        {
          dateLabel: "03 / 19",
          title: "二面后反馈正向",
          description: "团队方向和经历匹配度不错，目前只缺最后一轮的综合沟通。",
        },
        {
          dateLabel: "03 / 18",
          title: "进入主管面准备",
          description: "后续不需要大改技术内容，更关注表达气质和业务判断。",
        },
      ],
      resources: [
        {
          label: "主管面准备笔记",
          description: "可放业务价值、协同案例和判断题答案。",
          actionLabel: "打开笔记位",
          actionType: "note",
        },
      ],
    },
    "passed"
  ),
];

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

export function buildPlatformDigests(cards: DashboardSessionCard[]): PlatformDigest[] {
  const grouped = new Map<string, DashboardSessionCard[]>();

  cards.forEach((card) => {
    const items = grouped.get(card.sourceChannel) || [];
    items.push(card);
    grouped.set(card.sourceChannel, items);
  });

  return Array.from(grouped.entries()).map(([name, items]) => ({
    name,
    totalSessions: items.length,
    activeSessions: items.filter((item) =>
      ["scheduled", "active", "waiting", "passed"].includes(item.statusKey)
    ).length,
    note: sourceChannelNotes[name] || "这组来源适合继续补充状态变化和结果记录。",
  }));
}

export const homeActivityFeed: HomeActivityItem[] = [
  {
    dateLabel: "03 / 22",
    title: "美团二面已锁定时间",
    description: "优先级升到本周第一位，平台首页要先承接时间和准备动作。",
  },
  {
    dateLabel: "03 / 21",
    title: "哔哩哔哩一面刚排上",
    description: "还不需要进入深度复盘，先把案例结构打磨清楚。",
  },
  {
    dateLabel: "03 / 20",
    title: "AI 工程效率二面结束待反馈",
    description: "结果一回来，就可以直接在档案页更新状态和挂点。",
  },
  {
    dateLabel: "03 / 18",
    title: "小红书档案已进入归档",
    description: "这条线后续主要负责沉淀失败原因，不再继续投入大量准备时间。",
  },
];

export const memoSidebarItems: MemoSidebarItem[] = [
  {
    label: "今日重点",
    value: "3 项",
    note: "优先处理有明确时间点的准备动作，不要让临近面试的任务继续漂着。",
  },
  {
    label: "待回结果",
    value: "2 条",
    note: "本周最适合补齐状态变化和结果归档，避免档案页和真实进度脱节。",
  },
  {
    label: "已完成",
    value: "6 项",
    note: "做完的动作要保留，这样后面接数据库时更容易映射成操作历史。",
  },
];

export const memoTaskGroups: MemoTaskGroup[] = [
  {
    id: "today-focus",
    title: "今日面试待办",
    description: "这些是今天最值得优先处理的动作，先保证时间敏感任务不掉线。",
    items: [
      {
        id: "memo-mt-second-round",
        title: "把美团二面的事故排查答案压缩成 90 秒版",
        detail: "先说根因，再讲回溯与治理，避免继续用长口语拖慢判断。",
        dueLabel: "今天 19:00 前",
        completed: false,
        tone: "critical",
      },
      {
        id: "memo-bili-growth-case",
        title: "整理商业增长一面的投放链路案例",
        detail: "补齐实验判断、指标权衡和最后结果，不要只停留在执行过程。",
        dueLabel: "今天晚些时候",
        completed: false,
        tone: "focus",
      },
      {
        id: "memo-interview-calendar",
        title: "确认本周所有面试时间是否已同步到平台首页",
        detail: "静态页阶段先做展示一致性检查，后面接数据库时再映射到真实日历。",
        dueLabel: "今晚收尾",
        completed: true,
        tone: "steady",
      },
    ],
  },
  {
    id: "result-followup",
    title: "结果与状态跟进",
    description: "更像运营动作，重点是及时更新状态和记录反馈，而不是继续堆内容。",
    items: [
      {
        id: "memo-ai-followup",
        title: "给 AI 工程效率二面补一条待结果提醒",
        detail: "等反馈回来后，直接在档案页标记通过或未通过，并补一条结果说明。",
        dueLabel: "明天上午",
        completed: false,
        tone: "focus",
      },
      {
        id: "memo-xhs-archive",
        title: "把小红书这条线转入归档模板",
        detail: "重点保留被挂原因、可复用表达和后续不再继续投入的判断。",
        dueLabel: "本周内",
        completed: true,
        tone: "steady",
      },
      {
        id: "memo-dewu-manager",
        title: "等待得物主管面排期并预留准备窗口",
        detail: "不需要大改技术内容，但要保留一段业务价值和协同判断的简洁表达。",
        dueLabel: "排期未定",
        completed: false,
        tone: "focus",
      },
    ],
  },
  {
    id: "weekly-notes",
    title: "本周整理备忘",
    description: "这组更像苹果备忘录里的长期清单，适合放平台级别的小动作。",
    items: [
      {
        id: "memo-db-fields",
        title: "确认后面接库要落哪些字段",
        detail: "至少需要公司、部门、岗位、轮次、时间、状态、结果说明、复盘入口。",
        dueLabel: "静态页确认后",
        completed: false,
        tone: "steady",
      },
      {
        id: "memo-platform-copy",
        title: "统一首页与档案页的文案气质",
        detail: "平台页偏调度，档案页偏处理，复盘页偏内容深挖，语气要各自明确。",
        dueLabel: "本周内",
        completed: true,
        tone: "steady",
      },
      {
        id: "memo-shortcuts",
        title: "想一下是否需要做快捷入口",
        detail: "比如“进入档案页”“进入复盘页”“更新状态”三种高频动作是否要固定在页面顶部。",
        dueLabel: "后续迭代",
        completed: false,
        tone: "focus",
      },
    ],
  },
];
