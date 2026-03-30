import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  buildApplicationSummary,
  buildInitialApplicationRecords,
  createApplicationRecord,
  sortTrackedApplications,
  type ApplicationRecord,
  type ApplicationRecordDraft,
} from "../applicationTrackerData";
import {
  applyInterviewStatus,
  buildDashboardSessions,
  buildPlatformDigests,
  memoTaskGroups,
  type DashboardSessionCard,
  type InterviewStatusKey,
} from "../dashboardData";
import { fetchSessions } from "../api";
import type { ApiSession } from "../types";

type DashboardContextValue = {
  applicationRecords: ApplicationRecord[];
  applicationSummary: ReturnType<typeof buildApplicationSummary>;
  applicationNotice: string | null;
  sessionCatalog: ApiSession[];
  catalogLoading: boolean;
  catalogNotice: string | null;
  dashboardSessions: DashboardSessionCard[];
  platformDigests: ReturnType<typeof buildPlatformDigests>;
  homeLeadSession: DashboardSessionCard | null;
  activeInterviewCount: number;
  scheduledCount: number;
  waitingCount: number;
  passedCount: number;
  upcomingSessions: DashboardSessionCard[];
  needsUpdateSessions: DashboardSessionCard[];
  memoGroups: typeof memoTaskGroups;
  totalMemoTaskCount: number;
  completedMemoTaskCount: number;
  pendingMemoTaskCount: number;
  criticalMemoTaskCount: number;
  upsertApplicationRecord: (recordId: string | null, draft: ApplicationRecordDraft) => void;
  updateInterviewStatus: (sessionKey: string, statusKey: InterviewStatusKey) => void;
  toggleMemoTask: (taskId: string) => void;
  refreshSessionCatalog: () => Promise<ApiSession[]>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [applicationRecords, setApplicationRecords] = useState<ApplicationRecord[]>(() =>
    buildInitialApplicationRecords()
  );
  const [sessionCatalog, setSessionCatalog] = useState<ApiSession[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<
    Partial<Record<string, InterviewStatusKey>>
  >({});
  const [memoTaskState, setMemoTaskState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      memoTaskGroups.flatMap((group) => group.items.map((item) => [item.id, item.completed]))
    )
  );

  async function refreshSessionCatalog() {
    setCatalogLoading(true);

    try {
      const response = await fetchSessions();

      setSessionCatalog(response.items);
      setCatalogNotice(
        response.items.length
          ? null
          : "后端里还没有导入真实会话，首页先用静态样例来承接平台结构。"
      );

      return response.items;
    } catch (catalogError) {
      setSessionCatalog([]);
      setCatalogNotice(
        `当前未连上后端接口，页面先展示静态样例。底层原因：${
          catalogError instanceof Error ? catalogError.message : "未知错误"
        }`
      );

      return [];
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    void refreshSessionCatalog();
  }, []);

  function upsertApplicationRecord(recordId: string | null, draft: ApplicationRecordDraft) {
    setApplicationRecords((current) => {
      const nextId = recordId || `app-${Date.now()}`;
      const nextRecord = createApplicationRecord(nextId, draft);
      const nextRecords = recordId
        ? current.map((record) => (record.id === recordId ? nextRecord : record))
        : [nextRecord, ...current];

      return sortTrackedApplications(nextRecords);
    });
  }

  function updateInterviewStatus(sessionKey: string, statusKey: InterviewStatusKey) {
    setStatusOverrides((current) => ({
      ...current,
      [sessionKey]: statusKey,
    }));
  }

  function toggleMemoTask(taskId: string) {
    setMemoTaskState((current) => ({
      ...current,
      [taskId]: !current[taskId],
    }));
  }

  const baseDashboardSessions = buildDashboardSessions(sessionCatalog);
  const dashboardSessions = baseDashboardSessions.map((item) => {
    const override = statusOverrides[item.sessionKey];
    return override ? applyInterviewStatus(item, override) : item;
  });
  const platformDigests = buildPlatformDigests(dashboardSessions);
  const homeLeadSession = dashboardSessions[0] || null;
  const activeInterviewCount = dashboardSessions.filter((item) =>
    ["scheduled", "active", "waiting", "passed"].includes(item.statusKey)
  ).length;
  const scheduledCount = dashboardSessions.filter((item) => item.statusKey === "scheduled").length;
  const waitingCount = dashboardSessions.filter((item) => item.statusKey === "waiting").length;
  const passedCount = dashboardSessions.filter((item) => item.statusKey === "passed").length;
  const upcomingSessions = dashboardSessions
    .filter((item) => !["rejected", "archived"].includes(item.statusKey))
    .slice(0, 4);
  const needsUpdateSessions = dashboardSessions
    .filter((item) => ["waiting", "passed", "rejected"].includes(item.statusKey))
    .slice(0, 3);
  const memoGroups = memoTaskGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      completed: memoTaskState[item.id] ?? item.completed,
    })),
  }));
  const totalMemoTaskCount = memoGroups.reduce((sum, group) => sum + group.items.length, 0);
  const completedMemoTaskCount = memoGroups.reduce(
    (sum, group) => sum + group.items.filter((item) => item.completed).length,
    0
  );
  const pendingMemoTaskCount = totalMemoTaskCount - completedMemoTaskCount;
  const criticalMemoTaskCount = memoGroups.reduce(
    (sum, group) =>
      sum + group.items.filter((item) => item.tone === "critical" && !item.completed).length,
    0
  );
  const applicationSummary = buildApplicationSummary(applicationRecords);
  const applicationNotice =
    "当前首页使用前端样例投递记录，和录音复盘工作台已经解耦；后续可以再接真实持久化数据。";

  return (
    <DashboardContext.Provider
      value={{
        applicationRecords,
        applicationSummary,
        applicationNotice,
        sessionCatalog,
        catalogLoading,
        catalogNotice,
        dashboardSessions,
        platformDigests,
        homeLeadSession,
        activeInterviewCount,
        scheduledCount,
        waitingCount,
        passedCount,
        upcomingSessions,
        needsUpdateSessions,
        memoGroups,
        totalMemoTaskCount,
        completedMemoTaskCount,
        pendingMemoTaskCount,
        criticalMemoTaskCount,
        upsertApplicationRecord,
        updateInterviewStatus,
        toggleMemoTask,
        refreshSessionCatalog,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboard 必须在 DashboardProvider 内部使用。");
  }

  return context;
}
