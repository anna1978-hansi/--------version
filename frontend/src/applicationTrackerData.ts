export type ApplicationStageKey =
  | "submitted"
  | "resume"
  | "assessment"
  | "hr"
  | "firstInterview"
  | "secondInterview"
  | "finalInterview"
  | "offer";

export type ApplicationStatusKey =
  | "waitingPickup"
  | "submitted"
  | "assessmentDone"
  | "interviewing"
  | "waitingResult"
  | "firstRoundPassed"
  | "secondRoundPassed"
  | "finalRoundPassed"
  | "offer"
  | "resumeRejected"
  | "firstRoundRejected"
  | "secondRoundRejected"
  | "finalRoundRejected";

export type ApplicationStatusGroup = "active" | "waiting" | "success" | "ended";
export type ApplicationStatusTone = "scheduled" | "active" | "waiting" | "passed" | "rejected";

export type ApplicationStageOption = {
  key: ApplicationStageKey;
  label: string;
  description: string;
};

export type ApplicationStatusOption = {
  key: ApplicationStatusKey;
  label: string;
  description: string;
  group: ApplicationStatusGroup;
  tone: ApplicationStatusTone;
};

export type ApplicationRecordDraft = {
  company: string;
  roleTitle: string;
  department: string;
  sourceChannel: string;
  city: string;
  stageKey: ApplicationStageKey;
  statusKey: ApplicationStatusKey;
  nextStep: string;
  submissionDate: string;
  applicationUrl: string;
  notes: string;
};

export type ApplicationRecord = ApplicationRecordDraft & {
  id: string;
  updatedDate: string;
  stageLabel: string;
  statusLabel: string;
  statusDescription: string;
  statusGroup: ApplicationStatusGroup;
  statusTone: ApplicationStatusTone;
  isClosed: boolean;
};

export type ApplicationSummary = {
  total: number;
  active: number;
  waiting: number;
  success: number;
  ended: number;
};

export const applicationStageOptions: ApplicationStageOption[] = [
  {
    key: "submitted",
    label: "已投递",
    description: "刚建立投递记录，还没有进入筛选或面试。",
  },
  {
    key: "resume",
    label: "简历筛选",
    description: "岗位已经进入初筛或捞取阶段。",
  },
  {
    key: "assessment",
    label: "在线测评",
    description: "需要完成笔试、测评或机考。",
  },
  {
    key: "hr",
    label: "HR 面",
    description: "处于 HR 沟通或初步了解阶段。",
  },
  {
    key: "firstInterview",
    label: "技术一面",
    description: "当前流程聚焦在第一轮技术面试。",
  },
  {
    key: "secondInterview",
    label: "技术二面",
    description: "当前流程聚焦在第二轮技术面试。",
  },
  {
    key: "finalInterview",
    label: "终面 / 主管面",
    description: "流程已经走到终面、主管面或交叉面。",
  },
  {
    key: "offer",
    label: "Offer",
    description: "进入谈薪、审批或 offer 确认阶段。",
  },
];

export const applicationStatusOptions: ApplicationStatusOption[] = [
  {
    key: "waitingPickup",
    label: "待捞取",
    description: "记录已经建立，但招聘侧还没有明显动作。",
    group: "active",
    tone: "scheduled",
  },
  {
    key: "submitted",
    label: "已投递",
    description: "适合刚完成投递、等待进入下一步的记录。",
    group: "active",
    tone: "scheduled",
  },
  {
    key: "assessmentDone",
    label: "已测评",
    description: "已经完成测评或笔试，等待下一步安排。",
    group: "waiting",
    tone: "waiting",
  },
  {
    key: "interviewing",
    label: "面试中",
    description: "已经进入具体面试轮次，仍在持续推进。",
    group: "active",
    tone: "active",
  },
  {
    key: "waitingResult",
    label: "待结果",
    description: "当前轮次已经结束，正在等待反馈。",
    group: "waiting",
    tone: "waiting",
  },
  {
    key: "firstRoundPassed",
    label: "一面通过",
    description: "第一轮已经通过，继续推进到后续轮次。",
    group: "active",
    tone: "active",
  },
  {
    key: "secondRoundPassed",
    label: "二面通过",
    description: "第二轮已经通过，继续推进到后续轮次。",
    group: "active",
    tone: "active",
  },
  {
    key: "finalRoundPassed",
    label: "终面通过",
    description: "终面已经通过，通常进入 offer 或审批流程。",
    group: "success",
    tone: "passed",
  },
  {
    key: "offer",
    label: "Offer",
    description: "已经拿到明确正向结果或进入 offer 环节。",
    group: "success",
    tone: "passed",
  },
  {
    key: "resumeRejected",
    label: "简历未通过",
    description: "简历阶段已结束，不再继续推进。",
    group: "ended",
    tone: "rejected",
  },
  {
    key: "firstRoundRejected",
    label: "一面失败",
    description: "第一轮技术面已结束，结果为未通过。",
    group: "ended",
    tone: "rejected",
  },
  {
    key: "secondRoundRejected",
    label: "二面失败",
    description: "第二轮技术面已结束，结果为未通过。",
    group: "ended",
    tone: "rejected",
  },
  {
    key: "finalRoundRejected",
    label: "终面失败",
    description: "终面或主管面已结束，结果为未通过。",
    group: "ended",
    tone: "rejected",
  },
];

const applicationStageMeta = Object.fromEntries(
  applicationStageOptions.map((option) => [option.key, option])
) as Record<ApplicationStageKey, ApplicationStageOption>;

const applicationStatusMeta = Object.fromEntries(
  applicationStatusOptions.map((option) => [option.key, option])
) as Record<ApplicationStatusKey, ApplicationStatusOption>;

type ApplicationRecordSeed = ApplicationRecordDraft & {
  id: string;
  updatedDate: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value: string) {
  const normalized = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  return todayIsoDate();
}

function normalizeText(value: string) {
  return value.trim();
}

function sortApplicationRecords(records: ApplicationRecord[]) {
  return [...records].sort((left, right) => {
    if (right.submissionDate !== left.submissionDate) {
      return right.submissionDate.localeCompare(left.submissionDate);
    }

    if (right.updatedDate !== left.updatedDate) {
      return right.updatedDate.localeCompare(left.updatedDate);
    }

    return left.company.localeCompare(right.company, "zh-Hans-CN");
  });
}

const applicationRecordSeeds: ApplicationRecordSeed[] = [
  {
    id: "app-tencent-pcg-rn",
    company: "腾讯",
    roleTitle: "RN 前端开发工程师",
    department: "PCG",
    sourceChannel: "内推",
    city: "深圳",
    stageKey: "secondInterview",
    statusKey: "firstRoundPassed",
    nextStep: "准备二面，重点补充性能治理和跨端协作案例。",
    submissionDate: "2026-03-24",
    applicationUrl: "https://join.qq.com",
    notes: "同公司不同岗位需要独立跟进，这条线当前推进最深。",
    updatedDate: "2026-03-29",
  },
  {
    id: "app-meituan-store-frontend",
    company: "美团",
    roleTitle: "前端开发工程师",
    department: "到店前端",
    sourceChannel: "内推",
    city: "上海",
    stageKey: "secondInterview",
    statusKey: "waitingResult",
    nextStep: "二面已结束，周三前确认是否有下一轮安排。",
    submissionDate: "2026-03-18",
    applicationUrl: "https://zhaopin.meituan.com",
    notes: "先跟进反馈，不在首页混入复盘内容。",
    updatedDate: "2026-03-28",
  },
  {
    id: "app-vivo-campus-frontend",
    company: "vivo",
    roleTitle: "前端开发工程师",
    department: "互联网前端",
    sourceChannel: "校招官网",
    city: "东莞",
    stageKey: "assessment",
    statusKey: "assessmentDone",
    nextStep: "测评已完成，等待约面或进一步通知。",
    submissionDate: "2026-03-10",
    applicationUrl: "https://hr-campus.vivo.com",
    notes: "暂无进一步动作，先保留在默认视图里。",
    updatedDate: "2026-03-25",
  },
  {
    id: "app-tencent-ieg-frontend",
    company: "腾讯",
    roleTitle: "前端开发工程师",
    department: "IEG",
    sourceChannel: "官网投递",
    city: "深圳",
    stageKey: "firstInterview",
    statusKey: "firstRoundRejected",
    nextStep: "流程已结束，后续只保留记录用于统计。",
    submissionDate: "2026-03-12",
    applicationUrl: "https://join.qq.com",
    notes: "和 PCG 岗位分开记录，避免同公司状态互相覆盖。",
    updatedDate: "2026-03-22",
  },
  {
    id: "app-xiaohongshu-content",
    company: "小红书",
    roleTitle: "前端开发工程师",
    department: "内容体验",
    sourceChannel: "官网投递",
    city: "上海",
    stageKey: "resume",
    statusKey: "resumeRejected",
    nextStep: "已结束，后续不需要再追加动作。",
    submissionDate: "2026-03-13",
    applicationUrl: "https://job.xiaohongshu.com",
    notes: "简历阶段终止，默认继续展示在表格中。",
    updatedDate: "2026-03-20",
  },
  {
    id: "app-kuaishou-commerce",
    company: "快手",
    roleTitle: "前端开发工程师",
    department: "商业化平台",
    sourceChannel: "Boss 直聘",
    city: "北京",
    stageKey: "submitted",
    statusKey: "waitingPickup",
    nextStep: "先观察是否被捞起，再决定是否补投其他团队。",
    submissionDate: "2026-03-27",
    applicationUrl: "",
    notes: "只有投递记录，没有链接也允许先建档。",
    updatedDate: "2026-03-27",
  },
  {
    id: "app-baidu-ai-client",
    company: "百度",
    roleTitle: "前端开发工程师",
    department: "AI 客户端",
    sourceChannel: "校园官网",
    city: "北京",
    stageKey: "finalInterview",
    statusKey: "secondRoundPassed",
    nextStep: "准备终面，把项目主线压缩成 3 分钟版本。",
    submissionDate: "2026-03-13",
    applicationUrl: "https://talent.baidu.com",
    notes: "目前是推进中的重点线之一。",
    updatedDate: "2026-03-29",
  },
  {
    id: "app-ant-infra-front-end",
    company: "蚂蚁集团",
    roleTitle: "前端开发工程师",
    department: "工程基础设施",
    sourceChannel: "猎聘",
    city: "杭州",
    stageKey: "firstInterview",
    statusKey: "waitingResult",
    nextStep: "等待一面反馈，暂时不追加新的准备动作。",
    submissionDate: "2026-03-14",
    applicationUrl: "https://talent.antgroup.com",
    notes: "记录流程即可，复盘另走独立页面。",
    updatedDate: "2026-03-27",
  },
  {
    id: "app-alibaba-cloud-ai",
    company: "阿里云",
    roleTitle: "前端工程师",
    department: "智能平台",
    sourceChannel: "官网投递",
    city: "杭州",
    stageKey: "offer",
    statusKey: "offer",
    nextStep: "进入谈薪与决策阶段，等待最终确认。",
    submissionDate: "2026-03-08",
    applicationUrl: "https://campus.alibaba.com",
    notes: "正向结果也保留在默认表格里参与总体统计。",
    updatedDate: "2026-03-26",
  },
];

export function getApplicationStageMeta(stageKey: ApplicationStageKey) {
  return applicationStageMeta[stageKey];
}

export function getApplicationStatusMeta(statusKey: ApplicationStatusKey) {
  return applicationStatusMeta[statusKey];
}

export function createEmptyApplicationDraft(): ApplicationRecordDraft {
  return {
    company: "",
    roleTitle: "",
    department: "",
    sourceChannel: "",
    city: "",
    stageKey: "submitted",
    statusKey: "submitted",
    nextStep: "",
    submissionDate: todayIsoDate(),
    applicationUrl: "",
    notes: "",
  };
}

export function toApplicationDraft(record: ApplicationRecord): ApplicationRecordDraft {
  return {
    company: record.company,
    roleTitle: record.roleTitle,
    department: record.department,
    sourceChannel: record.sourceChannel,
    city: record.city,
    stageKey: record.stageKey,
    statusKey: record.statusKey,
    nextStep: record.nextStep,
    submissionDate: record.submissionDate,
    applicationUrl: record.applicationUrl,
    notes: record.notes,
  };
}

export function buildApplicationRecord(
  seed: ApplicationRecordSeed | (ApplicationRecordDraft & { id: string; updatedDate?: string })
): ApplicationRecord {
  const stageMeta = getApplicationStageMeta(seed.stageKey);
  const statusMeta = getApplicationStatusMeta(seed.statusKey);
  const updatedDate = normalizeDate(seed.updatedDate || seed.submissionDate);
  const normalizedCompany = normalizeText(seed.company);
  const normalizedRoleTitle = normalizeText(seed.roleTitle);

  return {
    ...seed,
    company: normalizedCompany || "未命名公司",
    roleTitle: normalizedRoleTitle || "未命名岗位",
    department: normalizeText(seed.department),
    sourceChannel: normalizeText(seed.sourceChannel),
    city: normalizeText(seed.city),
    nextStep: normalizeText(seed.nextStep),
    submissionDate: normalizeDate(seed.submissionDate),
    applicationUrl: normalizeText(seed.applicationUrl),
    notes: normalizeText(seed.notes),
    updatedDate,
    stageLabel: stageMeta.label,
    statusLabel: statusMeta.label,
    statusDescription: statusMeta.description,
    statusGroup: statusMeta.group,
    statusTone: statusMeta.tone,
    isClosed: ["success", "ended"].includes(statusMeta.group),
  };
}

export function createApplicationRecord(
  id: string,
  draft: ApplicationRecordDraft,
  updatedDate = todayIsoDate()
) {
  return buildApplicationRecord({
    ...draft,
    id,
    updatedDate,
  });
}

export function buildInitialApplicationRecords() {
  return sortApplicationRecords(applicationRecordSeeds.map((seed) => buildApplicationRecord(seed)));
}

export function buildApplicationSummary(records: ApplicationRecord[]): ApplicationSummary {
  return records.reduce<ApplicationSummary>(
    (summary, record) => {
      summary.total += 1;
      summary[record.statusGroup] += 1;
      return summary;
    },
    {
      total: 0,
      active: 0,
      waiting: 0,
      success: 0,
      ended: 0,
    }
  );
}

export function sortTrackedApplications(records: ApplicationRecord[]) {
  return sortApplicationRecords(records);
}
