import type { ApplicationRecord } from "./applicationTrackerData";

export type InterviewRecordSourceType = "manual" | "text" | "audio";
export type InterviewRecordProcessingState = "manual" | "uploaded" | "parsing" | "ready" | "failed";
export type InterviewRecordTone = "archived" | "scheduled" | "waiting" | "passed" | "alert";

export type InterviewRecordDraft = {
  applicationRecordId: string;
  roundLabel: string;
  interviewDate: string;
  sourceType: InterviewRecordSourceType;
  sourceName: string;
  notes: string;
};

export type InterviewRecord = InterviewRecordDraft & {
  id: string;
  createdDate: string;
  processingState: InterviewRecordProcessingState;
  processingLabel: string;
  processingDescription: string;
  processingTone: InterviewRecordTone;
  actionLabel: string;
  canOpenWorkspace: boolean;
  sessionKey: string | null;
};

export type InterviewRecordGroup = {
  applicationRecord: ApplicationRecord;
  records: InterviewRecord[];
  readyCount: number;
  pendingCount: number;
};

type InterviewRecordSeed = InterviewRecordDraft & {
  id: string;
  createdDate?: string;
  processingState: InterviewRecordProcessingState;
  sessionKey?: string | null;
};

type InterviewRecordSourceMeta = {
  label: string;
  description: string;
};

type InterviewRecordStateMeta = {
  label: string;
  description: string;
  tone: InterviewRecordTone;
  actionLabel: string;
  canOpenWorkspace: boolean;
};

const interviewRecordSourceMeta: Record<InterviewRecordSourceType, InterviewRecordSourceMeta> = {
  manual: {
    label: "手动记录",
    description: "没有原始文件也可以先记下轮次、日期和关键结论。",
  },
  text: {
    label: "文字上传",
    description: "适合逐字稿、转写文本或人工整理后的面试记录。",
  },
  audio: {
    label: "音频上传",
    description: "适合长录音文件，后续再切分轮次并生成复盘内容。",
  },
};

const interviewRecordStateMeta: Record<InterviewRecordProcessingState, InterviewRecordStateMeta> = {
  manual: {
    label: "手记待补充",
    description: "当前只有手动记录，后续可以补文字版或音频文件。",
    tone: "archived",
    actionLabel: "仅手记",
    canOpenWorkspace: false,
  },
  uploaded: {
    label: "文本待解析",
    description: "文字内容已接入，等待整理成可复盘的问答会话。",
    tone: "scheduled",
    actionLabel: "等待解析",
    canOpenWorkspace: false,
  },
  parsing: {
    label: "解析中",
    description: "系统正在处理录音并切分轮次，暂时不能进入复盘。",
    tone: "waiting",
    actionLabel: "解析中",
    canOpenWorkspace: false,
  },
  ready: {
    label: "可进入复盘",
    description: "已经生成可进入 workspace 的具体问答会话。",
    tone: "passed",
    actionLabel: "进入复盘",
    canOpenWorkspace: true,
  },
  failed: {
    label: "解析失败",
    description: "需要重新上传文件或改用手动记录补齐这条经验。",
    tone: "alert",
    actionLabel: "待重传",
    canOpenWorkspace: false,
  },
};

const defaultProcessingStateBySourceType: Record<
  InterviewRecordSourceType,
  InterviewRecordProcessingState
> = {
  manual: "manual",
  text: "uploaded",
  audio: "parsing",
};

const interviewRecordSeeds: InterviewRecordSeed[] = [
  {
    id: "record-meituan-first-round",
    applicationRecordId: "app-meituan-store-frontend",
    roundLabel: "技术一面",
    interviewDate: "2026-03-21",
    sourceType: "text",
    sourceName: "meituan-first-round-transcript.txt",
    notes: "已经整理出完整问答，可直接进入复盘工作台继续拆解回答质量。",
    processingState: "ready",
    sessionKey: "mock-session-standard-6",
    createdDate: "2026-03-22",
  },
  {
    id: "record-meituan-second-round",
    applicationRecordId: "app-meituan-store-frontend",
    roundLabel: "技术二面",
    interviewDate: "2026-03-25",
    sourceType: "audio",
    sourceName: "meituan-second-round-long-audio.m4a",
    notes: "长录音已经上传，正在等待切分轮次和文本清洗结果。",
    processingState: "parsing",
    createdDate: "2026-03-25",
  },
  {
    id: "record-baidu-final-note",
    applicationRecordId: "app-baidu-ai-client",
    roundLabel: "终面手记",
    interviewDate: "2026-03-29",
    sourceType: "manual",
    sourceName: "",
    notes: "先保留问题列表和主管追问点，后面再决定是否补正式文本版。",
    processingState: "manual",
    createdDate: "2026-03-29",
  },
  {
    id: "record-ant-first-round",
    applicationRecordId: "app-ant-infra-front-end",
    roundLabel: "技术一面",
    interviewDate: "2026-03-27",
    sourceType: "text",
    sourceName: "ant-first-round-notes.md",
    notes: "文字版已经提交，但还没进入可复盘的结构化问答阶段。",
    processingState: "uploaded",
    createdDate: "2026-03-27",
  },
  {
    id: "record-xiaohongshu-second-round",
    applicationRecordId: "app-xiaohongshu-content",
    roundLabel: "技术二面",
    interviewDate: "2026-03-17",
    sourceType: "audio",
    sourceName: "xiaohongshu-second-round.m4a",
    notes: "旧录音导入失败，当前先保留失败状态，后续可换文本补录。",
    processingState: "failed",
    createdDate: "2026-03-18",
  },
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeDate(value: string) {
  const normalized = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  return todayIsoDate();
}

function getRoundRank(roundLabel: string) {
  const normalized = roundLabel.toLowerCase();
  const orderedMatchers: Array<[RegExp, number]> = [
    [/简历|筛选/, 1],
    [/hr|沟通/, 2],
    [/一面|1面|第一轮/, 3],
    [/二面|2面|第二轮/, 4],
    [/三面|3面|第三轮/, 5],
    [/主管|终面|final|最终/, 6],
    [/结果|归档|offer/, 7],
  ];

  const matched = orderedMatchers.find(([pattern]) => pattern.test(normalized));
  return matched ? matched[1] : 99;
}

function sortInterviewRecords(records: InterviewRecord[]) {
  return [...records].sort((left, right) => {
    const leftRank = getRoundRank(left.roundLabel);
    const rightRank = getRoundRank(right.roundLabel);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    if (left.interviewDate !== right.interviewDate) {
      return left.interviewDate.localeCompare(right.interviewDate);
    }

    return left.createdDate.localeCompare(right.createdDate);
  });
}

export function getInterviewRecordSourceMeta(sourceType: InterviewRecordSourceType) {
  return interviewRecordSourceMeta[sourceType];
}

export function getInterviewRecordStateMeta(processingState: InterviewRecordProcessingState) {
  return interviewRecordStateMeta[processingState];
}

export const interviewRecordSourceOptions = (
  Object.entries(interviewRecordSourceMeta) as Array<[InterviewRecordSourceType, InterviewRecordSourceMeta]>
).map(([key, meta]) => ({
  key,
  label: meta.label,
  description: meta.description,
}));

export function createEmptyInterviewRecordDraft(
  applicationRecordId = ""
): InterviewRecordDraft {
  return {
    applicationRecordId,
    roundLabel: "",
    interviewDate: todayIsoDate(),
    sourceType: "manual",
    sourceName: "",
    notes: "",
  };
}

export function buildInterviewRecord(seed: InterviewRecordSeed): InterviewRecord {
  const stateMeta = getInterviewRecordStateMeta(seed.processingState);

  return {
    ...seed,
    applicationRecordId: normalizeText(seed.applicationRecordId),
    roundLabel: normalizeText(seed.roundLabel) || "未命名轮次",
    interviewDate: normalizeDate(seed.interviewDate),
    sourceName: normalizeText(seed.sourceName),
    notes: normalizeText(seed.notes),
    createdDate: normalizeDate(seed.createdDate || seed.interviewDate),
    processingLabel: stateMeta.label,
    processingDescription: stateMeta.description,
    processingTone: stateMeta.tone,
    actionLabel: stateMeta.actionLabel,
    canOpenWorkspace: stateMeta.canOpenWorkspace && Boolean(seed.sessionKey),
    sessionKey: seed.sessionKey || null,
  };
}

export function createInterviewRecordItem(
  id: string,
  draft: InterviewRecordDraft,
  createdDate = todayIsoDate()
) {
  return buildInterviewRecord({
    ...draft,
    id,
    createdDate,
    processingState: defaultProcessingStateBySourceType[draft.sourceType],
  });
}

export function buildInitialInterviewRecords() {
  return sortInterviewRecords(interviewRecordSeeds.map((seed) => buildInterviewRecord(seed)));
}

export function buildInterviewRecordGroups(
  applicationRecords: ApplicationRecord[],
  interviewRecords: InterviewRecord[]
) {
  return applicationRecords
    .map<InterviewRecordGroup | null>((applicationRecord) => {
      const records = sortInterviewRecords(
        interviewRecords.filter((record) => record.applicationRecordId === applicationRecord.id)
      );

      if (!records.length) {
        return null;
      }

      return {
        applicationRecord,
        records,
        readyCount: records.filter((record) => record.canOpenWorkspace).length,
        pendingCount: records.filter((record) => !record.canOpenWorkspace).length,
      };
    })
    .filter((group): group is InterviewRecordGroup => group !== null);
}
