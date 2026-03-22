import { useEffect, useState } from "react";
import { buildRoundItem, buildSessionSummary } from "./adapters";
import {
  deleteSessionTurn,
  fetchSessions,
  fetchSessionTurns,
  getApiBase,
  mergeSessionTurns,
} from "./api";
import {
  applyInterviewStatus,
  buildDashboardSessions,
  buildPlatformDigests,
  homeActivityFeed,
  statusUpdateOptions,
} from "./dashboardData";
import { rounds as mockRounds, sessionSummary as mockSessionSummary } from "./mockData";
import type {
  DashboardSessionCard,
  InterviewStatusKey,
} from "./dashboardData";
import type { ApiSession, RoundItem, SessionSummary, TurnsResponse } from "./types";

type MergeModalState = {
  rounds: [RoundItem, RoundItem];
  mergedInterviewerText: string;
  mergedCandidateText: string;
};

type PageState =
  | {
      mode: "home";
    }
  | {
      mode: "detail";
      sessionKey?: string;
    }
  | {
      mode: "workspace";
      sessionKey?: string;
    };

const defaultSessionSummary: SessionSummary = {
  sessionKey: "",
  title: "面试复盘",
  model: "deepseek-chat",
  totalRounds: 0,
  createdDate: "--",
  roleFocus: "面试复盘",
};

function roundLabel(round: RoundItem) {
  return round.cueTime
    ? `Round ${round.roundNumber} • ${round.cueTime}`
    : `Round ${round.roundNumber}`;
}

function appendText(currentText: string, nextText: string) {
  const normalized = nextText.trim();

  if (!normalized) {
    return currentText;
  }

  return currentText ? `${currentText}\n\n${normalized}` : normalized;
}

function sourceRoundLabel(round: RoundItem) {
  if (!round.sourceRoundNumbers?.length) {
    return `来源轮次 ${round.roundNumber}`;
  }

  return `来源轮次 ${round.sourceRoundNumbers.join(", ")}`;
}

function parseHash(): PageState {
  if (typeof window === "undefined") {
    return { mode: "home" };
  }

  const hash = window.location.hash.replace(/^#/, "");

  if (hash.startsWith("detail/")) {
    const sessionKey = decodeURIComponent(hash.slice("detail/".length));

    return {
      mode: "detail",
      sessionKey: sessionKey || undefined,
    };
  }

  if (hash.startsWith("workspace/")) {
    const sessionKey = decodeURIComponent(hash.slice("workspace/".length));

    return {
      mode: "workspace",
      sessionKey: sessionKey || undefined,
    };
  }

  return { mode: "home" };
}

function openHome() {
  if (typeof window !== "undefined") {
    window.location.hash = "home";
  }
}

function openDetail(sessionKey: string) {
  if (typeof window !== "undefined") {
    window.location.hash = `detail/${encodeURIComponent(sessionKey)}`;
  }
}

function openWorkspace(sessionKey: string) {
  if (typeof window !== "undefined") {
    window.location.hash = `workspace/${encodeURIComponent(sessionKey)}`;
  }
}

function renderStageTrail(session: DashboardSessionCard) {
  return (
    <div className="stage-list">
      {session.stageTrail.map((stage, index) => (
        <span
          className={[
            "stage-pill",
            index < session.currentStage ? "is-complete" : "",
            index === session.currentStage ? "is-current" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={`${session.sessionKey}-${stage}`}
        >
          {stage}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const [pageState, setPageState] = useState<PageState>(() => parseHash());
  const [sessionCatalog, setSessionCatalog] = useState<ApiSession[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<
    Partial<Record<string, InterviewStatusKey>>
  >({});
  const [sessionSummary, setSessionSummary] = useState<SessionSummary>(defaultSessionSummary);
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [activeRoundNumber, setActiveRoundNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(pageState.mode === "workspace");
  const [error, setError] = useState<string | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedRoundNumbers, setSelectedRoundNumbers] = useState<number[]>([]);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mergeModal, setMergeModal] = useState<MergeModalState | null>(null);
  const [isMockWorkspace, setIsMockWorkspace] = useState(false);

  const baseDashboardSessions = buildDashboardSessions(sessionCatalog);
  const dashboardSessions = baseDashboardSessions.map((item) => {
    const override = statusOverrides[item.sessionKey];
    return override ? applyInterviewStatus(item, override) : item;
  });
  const platformDigests = buildPlatformDigests(dashboardSessions);
  const homeLeadSession = dashboardSessions[0] || null;
  const detailRequestedSessionKey = pageState.mode === "detail" ? pageState.sessionKey : undefined;
  const workspaceRequestedSessionKey =
    pageState.mode === "workspace" ? pageState.sessionKey : undefined;
  const detailSession =
    dashboardSessions.find((item) => item.sessionKey === detailRequestedSessionKey) ||
    homeLeadSession;
  const currentSessionCard =
    dashboardSessions.find((item) => item.sessionKey === sessionSummary.sessionKey) ||
    dashboardSessions.find((item) => item.sessionKey === workspaceRequestedSessionKey) ||
    detailSession ||
    homeLeadSession;
  const activeRound =
    rounds.find((item) => item.roundNumber === activeRoundNumber) || rounds[0] || null;
  const reviewFlagCount = rounds.filter((item) => item.needsReview).length;
  const highValueCount = rounds.filter((item) => item.review.score >= 80).length;
  const selectedRounds = rounds
    .filter((round) => selectedRoundNumbers.includes(round.roundNumber))
    .sort((left, right) => left.roundNumber - right.roundNumber);
  const canMerge =
    selectedRounds.length === 2 &&
    selectedRounds[1].roundNumber === selectedRounds[0].roundNumber + 1 &&
    !isMockWorkspace;
  const canDelete = selectedRounds.length === 1 && !isMockWorkspace;
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

  function applyTurnsResponse(turnsResponse: TurnsResponse, preferredRoundNumber?: number | null) {
    const nextRounds = turnsResponse.items.map(buildRoundItem);

    if (!nextRounds.length) {
      throw new Error("当前会话没有轮次数据，暂时无法展示目录。");
    }

    setSessionSummary(buildSessionSummary(turnsResponse.session));
    setRounds(nextRounds);
    setActiveRoundNumber((current) => {
      const candidateRoundNumber = preferredRoundNumber ?? current;
      return candidateRoundNumber && nextRounds.some((item) => item.roundNumber === candidateRoundNumber)
        ? candidateRoundNumber
        : nextRounds[0].roundNumber;
    });
  }

  function applyMockSessionData(preferredRoundNumber?: number | null, sessionKey?: string) {
    const matchedCard =
      dashboardSessions.find((item) => item.sessionKey === sessionKey) ||
      currentSessionCard ||
      homeLeadSession;

    setSessionSummary({
      sessionKey: matchedCard?.sessionKey || mockSessionSummary.sessionKey,
      title: matchedCard?.title || mockSessionSummary.title,
      model: matchedCard?.model || mockSessionSummary.model,
      totalRounds: matchedCard?.totalRounds || mockSessionSummary.totalRounds,
      createdDate: matchedCard?.updatedDate || mockSessionSummary.createdDate,
      roleFocus: matchedCard?.roleFocus || mockSessionSummary.roleFocus,
    });
    setRounds(mockRounds);
    setActiveRoundNumber((current) => {
      const candidateRoundNumber = preferredRoundNumber ?? current;
      return candidateRoundNumber && mockRounds.some((item) => item.roundNumber === candidateRoundNumber)
        ? candidateRoundNumber
        : mockRounds[0]?.roundNumber || null;
    });
  }

  async function loadSessionCatalog() {
    setCatalogLoading(true);

    try {
      const response = await fetchSessions();

      setSessionCatalog(response.items);
      setCatalogNotice(
        response.items.length
          ? null
          : "后端里还没有导入真实会话，首页先用静态样例来承接平台结构。"
      );
    } catch (catalogError) {
      setSessionCatalog([]);
      setCatalogNotice(
        `当前未连上后端接口，页面先展示静态样例。底层原因：${
          catalogError instanceof Error ? catalogError.message : "未知错误"
        }`
      );
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadSessionData({
    targetSessionKey,
    preferredRoundNumber,
    showLoading = true,
  }: {
    targetSessionKey?: string;
    preferredRoundNumber?: number | null;
    showLoading?: boolean;
  } = {}) {
    if (showLoading) {
      setLoading(true);
    }

    setError(null);
    setWorkspaceNotice(null);

    try {
      let resolvedSessionKey = targetSessionKey;
      let availableItems = sessionCatalog;

      if (!availableItems.length && !resolvedSessionKey) {
        const sessionResponse = await fetchSessions();
        availableItems = sessionResponse.items;
        setSessionCatalog(sessionResponse.items);
      }

      if (!resolvedSessionKey) {
        const firstSession = availableItems[0];
        resolvedSessionKey = firstSession?.sessionKey;
      }

      if (!resolvedSessionKey) {
        applyMockSessionData(preferredRoundNumber, mockSessionSummary.sessionKey);
        setIsMockWorkspace(true);
        setWorkspaceNotice("数据库里还没有真实会话，当前先展示静态样例工作台。");
        return;
      }

      const turnsResponse = await fetchSessionTurns(resolvedSessionKey);
      applyTurnsResponse(turnsResponse, preferredRoundNumber);
      setIsMockWorkspace(false);
    } catch (loadError) {
      applyMockSessionData(preferredRoundNumber, targetSessionKey);
      setIsMockWorkspace(true);
      setWorkspaceNotice(
        `当前先展示静态样例工作台，等我们接数据库后就会切回真实数据。底层原因：${
          loadError instanceof Error ? loadError.message : "未知错误"
        }`
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const syncPageState = () => setPageState(parseHash());

    syncPageState();
    window.addEventListener("hashchange", syncPageState);

    return () => {
      window.removeEventListener("hashchange", syncPageState);
    };
  }, []);

  useEffect(() => {
    void loadSessionCatalog();
  }, []);

  useEffect(() => {
    if (pageState.mode !== "workspace") {
      setEditMode(false);
      setSelectedRoundNumbers([]);
      setMergeModal(null);
      setMutationBusy(false);
      return;
    }

    void loadSessionData({
      targetSessionKey: workspaceRequestedSessionKey,
    });
  }, [pageState.mode, workspaceRequestedSessionKey]);

  function handleStatusChange(sessionKey: string, statusKey: InterviewStatusKey) {
    setStatusOverrides((current) => ({
      ...current,
      [sessionKey]: statusKey,
    }));
  }

  function toggleEditMode() {
    if (isMockWorkspace) {
      return;
    }

    setEditMode((current) => !current);
    setSelectedRoundNumbers([]);
    setMergeModal(null);
  }

  function toggleRoundSelection(roundNumber: number) {
    setSelectedRoundNumbers((current) =>
      current.includes(roundNumber)
        ? current.filter((value) => value !== roundNumber)
        : [...current, roundNumber].sort((left, right) => left - right)
    );
  }

  function handleRoundCardClick(roundNumber: number) {
    setActiveRoundNumber(roundNumber);

    if (editMode) {
      toggleRoundSelection(roundNumber);
    }
  }

  function openMergeModal() {
    if (!canMerge) {
      return;
    }

    setMergeModal({
      rounds: [selectedRounds[0], selectedRounds[1]],
      mergedInterviewerText: "",
      mergedCandidateText: "",
    });
  }

  function closeMergeModal() {
    if (mutationBusy) {
      return;
    }

    setMergeModal(null);
  }

  function appendMergeFragment(target: "interviewer" | "candidate", fragmentText: string) {
    if (!mergeModal) {
      return;
    }

    if (target === "interviewer") {
      setMergeModal({
        ...mergeModal,
        mergedInterviewerText: appendText(mergeModal.mergedInterviewerText, fragmentText),
      });
      return;
    }

    setMergeModal({
      ...mergeModal,
      mergedCandidateText: appendText(mergeModal.mergedCandidateText, fragmentText),
    });
  }

  async function handleConfirmMerge() {
    if (!mergeModal || !sessionSummary.sessionKey || isMockWorkspace) {
      return;
    }

    setMutationBusy(true);

    try {
      await mergeSessionTurns(sessionSummary.sessionKey, {
        roundNumbers: mergeModal.rounds.map((round) => round.roundNumber),
        mergedInterviewerText: mergeModal.mergedInterviewerText,
        mergedCandidateText: mergeModal.mergedCandidateText,
      });

      const preferredRoundNumber = mergeModal.rounds[0].roundNumber;
      setMergeModal(null);
      setSelectedRoundNumbers([]);
      await loadSessionData({
        targetSessionKey: sessionSummary.sessionKey,
        preferredRoundNumber,
        showLoading: false,
      });
    } catch (mutationError) {
      window.alert(mutationError instanceof Error ? mutationError.message : "合并失败");
    } finally {
      setMutationBusy(false);
    }
  }

  async function handleDeleteRound() {
    if (!canDelete || !sessionSummary.sessionKey || isMockWorkspace) {
      return;
    }

    const targetRound = selectedRounds[0];
    const confirmed = window.confirm(
      `确定删除 ${roundLabel(targetRound)} 吗？\n\n${sourceRoundLabel(targetRound)}`
    );

    if (!confirmed) {
      return;
    }

    setMutationBusy(true);

    try {
      await deleteSessionTurn(sessionSummary.sessionKey, {
        roundNumber: targetRound.roundNumber,
      });

      setSelectedRoundNumbers([]);
      await loadSessionData({
        targetSessionKey: sessionSummary.sessionKey,
        showLoading: false,
      });
    } catch (mutationError) {
      window.alert(mutationError instanceof Error ? mutationError.message : "删除失败");
    } finally {
      setMutationBusy(false);
    }
  }

  function renderHomePage() {
    if (!homeLeadSession) {
      return (
        <div className="state-panel">
          <span className="badge">面试平台</span>
          <h2 className="serif-title">暂无可展示的档案</h2>
          <p>等我们把静态样例或真实数据库接进来后，这里会展示首页总台。</p>
        </div>
      );
    }

    return (
      <div className="home-flow">
        <header className="home-hero glass-card">
          <div className="home-hero__copy">
            <span className="badge">Interview Home Desk</span>
            <h1 className="serif-title">个人面试平台</h1>
            <p>
              先在这里看公司、部门、面试时间和状态变化，再进入单个档案页处理结果，最后才下钻到录音复盘工作台。
            </p>

            <div className="hero-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => openDetail(homeLeadSession.sessionKey)}
              >
                打开当前重点档案
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => openWorkspace(homeLeadSession.sessionKey)}
              >
                直接进入复盘工作台
              </button>
            </div>

            <div className="hero-caption">当前接口地址：{getApiBase()}</div>
          </div>

          <div className="home-hero__aside">
            <div className="hero-stat-grid">
              <div className="hero-stat">
                <span className="hero-stat__value">{dashboardSessions.length}</span>
                <span className="hero-stat__label">跟进中的档案</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat__value">{activeInterviewCount}</span>
                <span className="hero-stat__label">仍在推进</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat__value">{scheduledCount}</span>
                <span className="hero-stat__label">已排面试</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat__value">{waitingCount + passedCount}</span>
                <span className="hero-stat__label">待处理状态</span>
              </div>
            </div>

            <div className="hero-note">
              <span className="hero-note__label">本周重点</span>
              <h2 className="serif-title">{homeLeadSession.company}</h2>
              <p>{homeLeadSession.nextActionLabel}</p>
            </div>
          </div>
        </header>

        {catalogNotice ? <div className="notice-strip glass-card">{catalogNotice}</div> : null}
        {catalogLoading ? <div className="state-block">正在读取档案目录...</div> : null}

        <div className="home-grid">
          <section className="section-shell glass-card">
            <div className="section-heading">
              <span className="badge">面试日程</span>
              <h2 className="serif-title">接下来要处理的时间点</h2>
              <p>首页先看时间和下一步，不要一开始就陷进长内容里。</p>
            </div>

            <div className="agenda-list">
              {upcomingSessions.map((item) => (
                <button
                  className="agenda-item"
                  key={item.sessionKey}
                  type="button"
                  onClick={() => openDetail(item.sessionKey)}
                >
                  <div className="agenda-item__time">{item.nextInterviewAt}</div>
                  <div className="agenda-item__body">
                    <h3>
                      {item.company} · {item.department}
                    </h3>
                    <p>{item.nextActionLabel}</p>
                  </div>
                  <span className={`status-pill status-pill--${item.statusTone}`}>{item.statusLabel}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="section-shell glass-card">
            <div className="section-heading">
              <span className="badge">状态变化</span>
              <h2 className="serif-title">需要尽快处理结果的档案</h2>
              <p>等后面接数据库后，这一块就会承接真实的状态更新与结果记录。</p>
            </div>

            <div className="update-list">
              {needsUpdateSessions.map((item) => (
                <article className="update-card" key={item.sessionKey}>
                  <div className="update-card__topline">
                    <div>
                      <h3>
                        {item.company} · {item.department}
                      </h3>
                      <p>{item.resultSummary}</p>
                    </div>
                    <span className={`status-pill status-pill--${item.statusTone}`}>{item.statusLabel}</span>
                  </div>

                  <div className="update-card__meta">
                    <span>{item.sourceChannel}</span>
                    <span className="dot" />
                    <span>{item.updatedDate}</span>
                    <span className="dot" />
                    <span>{item.roleTitle}</span>
                  </div>

                  <div className="update-card__actions">
                    <button className="btn btn-secondary" type="button" onClick={() => openDetail(item.sessionKey)}>
                      打开档案页
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="section-shell glass-card">
          <div className="section-heading">
            <span className="badge">所有档案</span>
            <h2 className="serif-title">公司、部门与当前状态</h2>
            <p>这一层更像你日常会打开的面试平台首页，先处理状态和时间，再决定是否进入复盘。</p>
          </div>

          <div className="interview-grid">
            {dashboardSessions.map((item) => (
              <article className="interview-card" key={item.sessionKey}>
                <div className="interview-card__eyebrow">
                  <span className="badge">{item.company}</span>
                  <span className={`status-pill status-pill--${item.statusTone}`}>{item.statusLabel}</span>
                  {item.isSample ? <span className="badge badge-muted">静态样例</span> : null}
                </div>

                <h3 className="serif-title">{item.department}</h3>
                <p className="interview-card__subhead">
                  {item.roleTitle} · {item.roleFocus}
                </p>

                <div className="interview-card__facts">
                  <span>{item.nextInterviewAt}</span>
                  <span className="dot" />
                  <span>{item.sourceChannel}</span>
                  <span className="dot" />
                  <span>{item.city}</span>
                </div>

                {renderStageTrail(item)}

                <div className="accent-strip">
                  <strong>{item.weaknessTitle}</strong>
                  <p>{item.weaknessSummary}</p>
                </div>

                <p className="interview-card__summary">{item.improvementNote}</p>

                <div className="interview-card__footer">
                  <button className="btn btn-secondary" type="button" onClick={() => openDetail(item.sessionKey)}>
                    查看档案
                  </button>
                  <button className="btn btn-primary" type="button" onClick={() => openWorkspace(item.sessionKey)}>
                    进入复盘
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="home-footer-grid">
          <section className="section-shell glass-card">
            <div className="section-heading">
              <span className="badge">来源渠道</span>
              <h2 className="serif-title">平台来源分布</h2>
              <p>以后接数据库时，这里可以继续接来源渠道、投递时间和转化率。</p>
            </div>

            <div className="channel-grid">
              {platformDigests.map((item) => (
                <article className="channel-card" key={item.name}>
                  <div className="channel-card__topline">
                    <h3>{item.name}</h3>
                    <span>{item.totalSessions} 条</span>
                  </div>
                  <p className="channel-card__meta">仍在推进 {item.activeSessions} 条</p>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section-shell glass-card">
            <div className="section-heading">
              <span className="badge">最近变动</span>
              <h2 className="serif-title">平台动态记录</h2>
              <p>首页底部先承接时间线，后面可以再接通知、结果更新和备注历史。</p>
            </div>

            <div className="timeline-list">
              {homeActivityFeed.map((item) => (
                <article className="timeline-item" key={`${item.dateLabel}-${item.title}`}>
                  <div className="timeline-item__date">{item.dateLabel}</div>
                  <div className="timeline-item__body">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderDetailPage() {
    if (!detailSession) {
      return (
        <div className="state-panel">
          <span className="badge">面试档案页</span>
          <h2 className="serif-title">暂无可展示的档案</h2>
          <p>请先回到首页确认当前是否已有静态样例或真实数据。</p>
        </div>
      );
    }

    return (
      <div className="detail-flow">
        <header className="detail-hero glass-card">
          <div className="detail-hero__copy">
            <button className="link-button" type="button" onClick={openHome}>
              返回平台首页
            </button>

            <div className="detail-hero__badges">
              <span className="badge">Interview Record</span>
              <span className={`status-pill status-pill--${detailSession.statusTone}`}>
                {detailSession.statusLabel}
              </span>
              {detailSession.isSample ? <span className="badge badge-muted">静态样例</span> : null}
            </div>

            <h1 className="serif-title">
              {detailSession.company} · {detailSession.department}
            </h1>
            <p>{detailSession.summary}</p>

            <div className="page-meta">
              <span>{detailSession.roleTitle}</span>
              <span className="dot" />
              <span>{detailSession.nextInterviewAt}</span>
              <span className="dot" />
              <span>{detailSession.sourceChannel}</span>
              <span className="dot" />
              <span>{detailSession.city}</span>
            </div>

            {renderStageTrail(detailSession)}
          </div>

          <div className="detail-hero__aside">
            <div className="hero-note">
              <span className="hero-note__label">当前重点</span>
              <h2 className="serif-title">{detailSession.nextActionLabel}</h2>
              <p>{detailSession.resultSummary}</p>
            </div>

            <div className="detail-hero__actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => openWorkspace(detailSession.sessionKey)}
              >
                进入复盘工作台
              </button>
              <button className="btn btn-secondary" type="button" onClick={openHome}>
                回到平台首页
              </button>
            </div>
          </div>
        </header>

        {catalogNotice ? <div className="notice-strip glass-card">{catalogNotice}</div> : null}

        <div className="detail-layout">
          <main className="detail-main">
            <section className="section-shell glass-card">
              <div className="section-heading">
                <span className="badge">基础信息</span>
                <h2 className="serif-title">这条面试线的静态档案</h2>
                <p>这里承接公司、部门、时间、招聘同学和薪资区间，后面接库时直接映射即可。</p>
              </div>

              <div className="fact-grid">
                <article className="fact-card">
                  <span className="fact-card__label">公司</span>
                  <strong>{detailSession.company}</strong>
                </article>
                <article className="fact-card">
                  <span className="fact-card__label">部门</span>
                  <strong>{detailSession.department}</strong>
                </article>
                <article className="fact-card">
                  <span className="fact-card__label">下一时间点</span>
                  <strong>{detailSession.nextInterviewAt}</strong>
                </article>
                <article className="fact-card">
                  <span className="fact-card__label">招聘渠道</span>
                  <strong>{detailSession.sourceChannel}</strong>
                </article>
                <article className="fact-card">
                  <span className="fact-card__label">招聘同学</span>
                  <strong>{detailSession.recruiterName}</strong>
                </article>
                <article className="fact-card">
                  <span className="fact-card__label">预期区间</span>
                  <strong>{detailSession.salaryRange}</strong>
                </article>
              </div>
            </section>

            <section className="section-shell glass-card">
              <div className="section-heading">
                <span className="badge">轮次安排</span>
                <h2 className="serif-title">每一轮现在走到哪里</h2>
                <p>这个区块先静态承接面试时间、轮次结果和备注，之后直接接数据库就行。</p>
              </div>

              <div className="round-plan-list">
                {detailSession.roundPlans.map((item) => (
                  <article className="round-plan-card" key={`${detailSession.sessionKey}-${item.name}`}>
                    <div className="round-plan-card__topline">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.schedule}</p>
                      </div>
                      <span className={`status-pill status-pill--${item.statusTone}`}>{item.outcome}</span>
                    </div>
                    <p className="round-plan-card__note">{item.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="section-shell glass-card">
              <div className="section-heading">
                <span className="badge">结果处理</span>
                <h2 className="serif-title">面试状态变化后就在这里更新</h2>
                <p>这一版先做前端本地交互。后面接数据库时，这组按钮直接改成真实写库动作。</p>
              </div>

              <div className="status-control">
                <div className="status-control__topline">
                  <span className={`status-pill status-pill--${detailSession.statusTone}`}>
                    当前状态：{detailSession.statusLabel}
                  </span>
                  <span className="status-control__hint">最近更新时间：{detailSession.updatedDate}</span>
                </div>

                <div className="status-action-grid">
                  {statusUpdateOptions.map((item) => (
                    <button
                      className={[
                        "status-action-card",
                        detailSession.statusKey === item.key ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={item.key}
                      type="button"
                      onClick={() => handleStatusChange(detailSession.sessionKey, item.key)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </button>
                  ))}
                </div>

                <div className="context-strip">
                  <div className="context-strip__title">当前说明</div>
                  <p>
                    现在点击状态按钮会立刻更新首页和档案页的展示，但只保存在前端本地，用来先确认交互和信息结构。
                  </p>
                </div>
              </div>
            </section>

            <section className="section-shell glass-card">
              <div className="section-heading">
                <span className="badge">待办动作</span>
                <h2 className="serif-title">这条线接下来具体做什么</h2>
                <p>这里以后可以直接挂你的 Todo、提醒和下一轮准备动作。</p>
              </div>

              <div className="task-list">
                {detailSession.tasks.map((item) => (
                  <article className="task-card" key={`${detailSession.sessionKey}-${item.title}`}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          </main>

          <aside className="detail-side">
            <section className="glass-card detail-side-card">
              <div className="card-heading">
                <span className="badge">挂点摘要</span>
                <h3 className="serif-title">{detailSession.weaknessTitle}</h3>
              </div>

              <div className="accent-strip">
                <strong>当前暴露的问题</strong>
                <p>{detailSession.weaknessSummary}</p>
              </div>

              <p className="detail-side-card__copy">{detailSession.improvementNote}</p>
            </section>

            <section className="glass-card detail-side-card">
              <div className="card-heading">
                <span className="badge">入口区</span>
                <h3 className="serif-title">继续处理这条档案</h3>
              </div>

              <div className="resource-list">
                {detailSession.resources.map((item) => (
                  <article className="resource-card" key={`${detailSession.sessionKey}-${item.label}`}>
                    <div>
                      <h3>{item.label}</h3>
                      <p>{item.description}</p>
                    </div>
                    <button
                      className="btn btn-secondary btn-compact"
                      type="button"
                      onClick={
                        item.actionType === "workspace"
                          ? () => openWorkspace(detailSession.sessionKey)
                          : undefined
                      }
                    >
                      {item.actionLabel}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="detail-history-grid">
          <section className="section-shell glass-card">
            <div className="section-heading">
              <span className="badge">状态记录</span>
              <h2 className="serif-title">这条线最近发生了什么</h2>
              <p>这里适合记录时间点、结果变化和你做过的处理动作。</p>
            </div>

            <div className="timeline-list">
              {detailSession.history.map((item) => (
                <article className="timeline-item" key={`${detailSession.sessionKey}-${item.dateLabel}-${item.title}`}>
                  <div className="timeline-item__date">{item.dateLabel}</div>
                  <div className="timeline-item__body">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="section-shell glass-card">
            <div className="section-heading">
              <span className="badge">当前判断</span>
              <h2 className="serif-title">继续投入还是先归档</h2>
              <p>这个位置很适合后面接“被挂原因”“是否继续跟进”“需要补什么”的真实字段。</p>
            </div>

            <div className="accent-strip">
              <strong>当前结论</strong>
              <p>{detailSession.decisionNote}</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderWorkspacePage() {
    return (
      <div className="workspace-flow">
        <header className="page-header workspace-header glass-card">
          <div className="page-header__copy">
            <button
              className="link-button"
              type="button"
              onClick={() =>
                openDetail(
                  currentSessionCard?.sessionKey || workspaceRequestedSessionKey || mockSessionSummary.sessionKey
                )
              }
            >
              返回面试档案页
            </button>

            <div className="workspace-header__badges">
              <span className="badge">录音复盘工作台</span>
              {isMockWorkspace ? <span className="badge badge-muted">静态样例</span> : null}
              {currentSessionCard ? (
                <>
                  <span className="badge badge-muted">{currentSessionCard.company}</span>
                  <span className={`status-pill status-pill--${currentSessionCard.statusTone}`}>
                    {currentSessionCard.statusLabel}
                  </span>
                </>
              ) : null}
            </div>

            <h1 className="serif-title">{sessionSummary.title}</h1>
            <p className="workspace-header__summary">
              {currentSessionCard?.improvementNote ||
                "这里继续承接单次面试的问答整理、轮次修正和复盘细化。"}
            </p>

            <div className="page-meta">
              <span>{currentSessionCard?.company || "面试档案"}</span>
              <span className="dot" />
              <span>{sessionSummary.totalRounds} 轮对话</span>
              <span className="dot" />
              <span>{sessionSummary.createdDate}</span>
              <span className="dot" />
              <span>{sessionSummary.roleFocus}</span>
              <span className="dot" />
              <span>API: {getApiBase()}</span>
            </div>
          </div>

          <div className="page-header__actions">
            <div className="header-aside">
              <span className="header-aside__label">当前重点</span>
              <strong>{currentSessionCard?.weaknessTitle || "轮次整理"}</strong>
              <p>{currentSessionCard?.nextActionLabel || "继续补齐被挂原因与改进方向。"}</p>
            </div>

            <div className="page-header__buttons">
              <button className="btn btn-secondary" type="button">
                导出完整文档
              </button>
              <button className="btn btn-primary" type="button">
                上传新语音片段
              </button>
            </div>
          </div>
        </header>

        {workspaceNotice ? <div className="notice-strip glass-card">{workspaceNotice}</div> : null}

        <div className="workspace">
          <aside className="nav-rail glass-card">
            <div className="rail-section">
              <div className="rail-section__header">
                <div className="rail-section__topline">
                  <span className="badge">复盘目录</span>
                  <button
                    className="btn btn-secondary btn-compact"
                    type="button"
                    disabled={isMockWorkspace}
                    onClick={toggleEditMode}
                  >
                    {editMode ? "退出编辑" : "整理目录"}
                  </button>
                </div>
                <p>切换轮次后，主舞台与右侧洞察会同步更新。</p>
              </div>

              <div className="rail-stat-grid">
                <div className="rail-stat">
                  <span className="rail-stat__value">{sessionSummary.totalRounds}</span>
                  <span className="rail-stat__label">总轮数</span>
                </div>
                <div className="rail-stat">
                  <span className="rail-stat__value">{highValueCount}</span>
                  <span className="rail-stat__label">高价值轮次</span>
                </div>
                <div className="rail-stat">
                  <span className="rail-stat__value">{reviewFlagCount}</span>
                  <span className="rail-stat__label">待确认</span>
                </div>
              </div>

              {editMode ? (
                <div className="edit-toolbar">
                  <div className="edit-toolbar__meta">
                    已选 {selectedRounds.length} 项
                    {selectedRounds.length
                      ? ` · ${selectedRounds.map((round) => round.roundNumber).join(", ")}`
                      : ""}
                  </div>
                  <div className="edit-toolbar__actions">
                    <button
                      className="btn btn-secondary btn-compact"
                      type="button"
                      disabled={!canDelete || mutationBusy}
                      onClick={handleDeleteRound}
                    >
                      删除所选
                    </button>
                    <button
                      className="btn btn-primary btn-compact"
                      type="button"
                      disabled={!canMerge || mutationBusy}
                      onClick={openMergeModal}
                    >
                      合并所选
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="round-list">
              {loading ? <div className="state-block">正在加载目录...</div> : null}
              {error ? <div className="state-block state-block--error">{error}</div> : null}

              {!loading &&
                !error &&
                rounds.map((round) => {
                  const active = round.roundNumber === activeRound?.roundNumber;
                  const selected = selectedRoundNumbers.includes(round.roundNumber);

                  return (
                    <button
                      key={round.roundNumber}
                      className={[
                        "round-card",
                        active ? "is-active" : "",
                        editMode ? "is-editing" : "",
                        selected ? "is-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      type="button"
                      onClick={() => handleRoundCardClick(round.roundNumber)}
                    >
                      <div className="round-card__meta">
                        <span>{roundLabel(round)}</span>
                        {editMode ? (
                          <span className={`selection-pill${selected ? " is-selected" : ""}`}>
                            {selected ? "已选" : "可选"}
                          </span>
                        ) : round.needsReview ? (
                          <span className="badge badge-warning">待确认</span>
                        ) : null}
                      </div>
                      <div className="round-card__title">{round.title}</div>
                      <div className="round-card__preview">{round.interviewerText}</div>
                      {round.sourceRoundNumbers && round.sourceRoundNumbers.length > 1 ? (
                        <div className="round-card__source">{sourceRoundLabel(round)}</div>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          </aside>

          <main className="center-stage">
            <section className="hero-card glass-card">
              {activeRound ? (
                <>
                  <div className="hero-card__intro">
                    <span className="badge">当前聚焦轮次</span>
                    <div className="hero-card__heading">
                      <div>
                        <div className="hero-card__kicker">{roundLabel(activeRound)}</div>
                        <h2 className="serif-title">{activeRound.title}</h2>
                      </div>
                      <div className="hero-card__pillset">
                        <span className="soft-pill">技术问答</span>
                        <span className="soft-pill">结构化复盘</span>
                        {activeRound.sourceRoundNumbers && activeRound.sourceRoundNumbers.length > 1 ? (
                          <span className="soft-pill">{sourceRoundLabel(activeRound)}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="focus-layout">
                    <article className="speaker-panel speaker-panel--interviewer">
                      <div className="speaker-panel__label">面试官原声转录</div>
                      <p>{activeRound.interviewerText}</p>
                    </article>

                    <article className="speaker-panel speaker-panel--candidate">
                      <div className="speaker-panel__label">候选人回答</div>
                      <p>{activeRound.candidateText}</p>
                    </article>

                    <div className="context-strip">
                      <div className="context-strip__title">复盘视角</div>
                      <p>
                        {activeRound.notes ||
                          "这一轮适合拆成“问题理解、回答结构、技术亮点、可追问点”四个维度去看。"}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="state-panel">
                  <span className="badge">当前聚焦轮次</span>
                  <h2 className="serif-title">暂无可展示的轮次</h2>
                  <p>请先确认后端服务已启动，并且当前数据库中已经导入面试会话。</p>
                </div>
              )}
            </section>
          </main>

          <aside className="insight-rail">
            <section className="glass-card score-card">
              {activeRound ? (
                <>
                  <div className="score-card__header">
                    <div>
                      <span className="badge">AI 诊断</span>
                      <h3 className="serif-title">{activeRound.review.headline}</h3>
                    </div>
                    <div className="score-display">
                      <span className="score-display__value">{activeRound.review.score}</span>
                      <span className="score-display__label">{activeRound.review.scoreLabel}</span>
                    </div>
                  </div>

                  <div className="diagnosis-banner">{activeRound.review.diagnosis}</div>

                  <div className="metric-grid">
                    {activeRound.review.metrics.map((metric) => (
                      <div className="metric-box" key={metric.label}>
                        <span className="metric-box__label">{metric.label}</span>
                        <span className="metric-box__value">{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="state-panel state-panel--compact">
                  <span className="badge">AI 诊断</span>
                  <p>等轮次数据加载完成后，这里会展示当前目录项的诊断信息。</p>
                </div>
              )}
            </section>

            <section className="glass-card followup-card">
              <div className="card-heading">
                <span className="badge">继续深挖</span>
                <h3 className="serif-title">追问工作台</h3>
              </div>

              <div className="prompt-list">
                {activeRound
                  ? activeRound.review.followUpPrompts.map((prompt) => (
                      <button className="prompt-chip" key={prompt} type="button">
                        {prompt}
                      </button>
                    ))
                  : null}
              </div>

              <label className="ask-box">
                <span>对这轮继续追问</span>
                <textarea
                  placeholder={
                    activeRound
                      ? `例如：请基于第 ${activeRound.roundNumber} 轮，帮我把这段回答压缩成更利于面试表达的版本。`
                      : "请先加载轮次数据，再继续追问。"
                  }
                />
              </label>

              <div className="followup-actions">
                <button className="btn btn-secondary" type="button">
                  生成改写版
                </button>
                <button className="btn btn-primary" type="button">
                  发送探讨
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      {pageState.mode === "home"
        ? renderHomePage()
        : pageState.mode === "detail"
          ? renderDetailPage()
          : renderWorkspacePage()}

      {mergeModal ? (
        <div className="modal-backdrop" role="presentation" onClick={closeMergeModal}>
          <div
            className="modal-card glass-card"
            role="dialog"
            aria-modal="true"
            aria-label="合并轮次"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="badge">智能合并</span>
                <h3 className="serif-title">手动确认合并后的说话人内容</h3>
              </div>
              <button className="btn btn-secondary btn-compact" type="button" onClick={closeMergeModal}>
                关闭
              </button>
            </div>

            <p className="modal-copy">
              先从下方原始片段里挑内容，再确认最终要写入数据库的面试官和面试者文本。
            </p>

            <div className="merge-source-grid">
              {mergeModal.rounds.map((round) => (
                <section className="merge-turn-card" key={round.roundNumber}>
                  <div className="merge-turn-card__meta">
                    <strong>{roundLabel(round)}</strong>
                    <span>{sourceRoundLabel(round)}</span>
                  </div>

                  <div className="merge-fragment">
                    <div className="merge-fragment__label">当前面试官内容</div>
                    <p>{round.interviewerText || "[空]"}</p>
                    <div className="merge-fragment__actions">
                      <button
                        className="inline-btn"
                        type="button"
                        onClick={() => appendMergeFragment("interviewer", round.interviewerText)}
                      >
                        加入面试官
                      </button>
                      <button
                        className="inline-btn"
                        type="button"
                        onClick={() => appendMergeFragment("candidate", round.interviewerText)}
                      >
                        加入面试者
                      </button>
                    </div>
                  </div>

                  <div className="merge-fragment">
                    <div className="merge-fragment__label">当前面试者内容</div>
                    <p>{round.candidateText || "[空]"}</p>
                    <div className="merge-fragment__actions">
                      <button
                        className="inline-btn"
                        type="button"
                        onClick={() => appendMergeFragment("interviewer", round.candidateText)}
                      >
                        加入面试官
                      </button>
                      <button
                        className="inline-btn"
                        type="button"
                        onClick={() => appendMergeFragment("candidate", round.candidateText)}
                      >
                        加入面试者
                      </button>
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="merge-target-grid">
              <label className="merge-target">
                <span>合并后的面试官内容</span>
                <textarea
                  value={mergeModal.mergedInterviewerText}
                  onChange={(event) =>
                    setMergeModal({
                      ...mergeModal,
                      mergedInterviewerText: event.target.value,
                    })
                  }
                  placeholder="从上面的原始片段中整理出最终的面试官内容"
                />
              </label>

              <label className="merge-target">
                <span>合并后的面试者内容</span>
                <textarea
                  value={mergeModal.mergedCandidateText}
                  onChange={(event) =>
                    setMergeModal({
                      ...mergeModal,
                      mergedCandidateText: event.target.value,
                    })
                  }
                  placeholder="从上面的原始片段中整理出最终的面试者内容"
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary btn-compact"
                type="button"
                onClick={() =>
                  setMergeModal({
                    ...mergeModal,
                    mergedInterviewerText: "",
                    mergedCandidateText: "",
                  })
                }
              >
                清空
              </button>
              <button className="btn btn-primary" type="button" disabled={mutationBusy} onClick={handleConfirmMerge}>
                {mutationBusy ? "提交中..." : "确认合并"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
