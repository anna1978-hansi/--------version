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
  buildDashboardSessions,
  buildDepartmentDigests,
  dispatchMemos,
  failureClusters,
  reviewTimeline,
} from "./dashboardData";
import { rounds as mockRounds, sessionSummary as mockSessionSummary } from "./mockData";
import type { ApiSession, RoundItem, SessionSummary, TurnsResponse } from "./types";

type MergeModalState = {
  rounds: [RoundItem, RoundItem];
  mergedInterviewerText: string;
  mergedCandidateText: string;
};

type PageState =
  | {
      mode: "overview";
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
    return { mode: "overview" };
  }

  const hash = window.location.hash.replace(/^#/, "");

  if (hash.startsWith("workspace/")) {
    const sessionKey = decodeURIComponent(hash.slice("workspace/".length));
    return {
      mode: "workspace",
      sessionKey: sessionKey || undefined,
    };
  }

  return { mode: "overview" };
}

function openOverview() {
  if (typeof window !== "undefined") {
    window.location.hash = "overview";
  }
}

function openWorkspace(sessionKey: string) {
  if (typeof window !== "undefined") {
    window.location.hash = `workspace/${encodeURIComponent(sessionKey)}`;
  }
}

function scrollToSection(sectionId: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function App() {
  const [pageState, setPageState] = useState<PageState>(() => parseHash());
  const [sessionCatalog, setSessionCatalog] = useState<ApiSession[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);
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

  const dashboardSessions = buildDashboardSessions(sessionCatalog);
  const departmentDigests = buildDepartmentDigests(dashboardSessions);
  const recentSession = dashboardSessions[0];
  const requestedSessionKey = pageState.mode === "workspace" ? pageState.sessionKey : undefined;
  const currentSessionCard =
    dashboardSessions.find((item) => item.sessionKey === sessionSummary.sessionKey) ||
    dashboardSessions.find((item) => item.sessionKey === requestedSessionKey) ||
    recentSession;
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
  const totalRoundCount = dashboardSessions.reduce((sum, item) => sum + item.totalRounds, 0);
  const departmentCount = new Set(dashboardSessions.map((item) => item.department)).size;
  const activeTrackCount = dashboardSessions.filter((item) => item.statusTone !== "archived").length;

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
      dashboardSessions.find((item) => item.sessionKey === sessionKey) || currentSessionCard || recentSession;

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
          : "后端里还没有导入真实会话，管理页先用静态样例来承接整体结构。"
      );
    } catch (catalogError) {
      setSessionCatalog([]);
      setCatalogNotice(
        `当前未连上后端接口，管理页先展示静态样例。底层原因：${
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
      targetSessionKey: requestedSessionKey,
    });
  }, [pageState.mode, requestedSessionKey]);

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

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      {pageState.mode === "overview" ? (
        <div className="overview-flow">
          <header className="overview-hero glass-card">
            <div className="overview-hero__copy">
              <span className="badge">Interview Dispatch Desk</span>
              <h1 className="serif-title">面试复盘总台</h1>
              <p>
                先在这里看部门、轮次和挂点归因，再进入单次工作台细修问答。页面先做静态管理层，
                后面接数据库时，我们可以直接把每份面试档案挂进来。
              </p>

              <div className="hero-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => openWorkspace(recentSession.sessionKey)}
                >
                  进入最近复盘
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => scrollToSection("failure-clusters")}
                >
                  查看挂点归因
                </button>
              </div>

              <div className="hero-caption">当前接口地址：{getApiBase()}</div>
            </div>

            <div className="overview-hero__aside">
              <div className="hero-stat-grid">
                <div className="hero-stat">
                  <span className="hero-stat__value">{dashboardSessions.length}</span>
                  <span className="hero-stat__label">复盘档案</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat__value">{departmentCount}</span>
                  <span className="hero-stat__label">目标部门</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat__value">{activeTrackCount}</span>
                  <span className="hero-stat__label">进行中流程</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat__value">{totalRoundCount}</span>
                  <span className="hero-stat__label">累计轮次</span>
                </div>
              </div>

              <div className="hero-note">
                <span className="hero-note__label">{dispatchMemos[0].label}</span>
                <h2 className="serif-title">{dispatchMemos[0].title}</h2>
                <p>{dispatchMemos[0].description}</p>
              </div>
            </div>
          </header>

          {catalogNotice ? <div className="notice-strip glass-card">{catalogNotice}</div> : null}
          {catalogLoading ? <div className="state-block">正在读取会话目录...</div> : null}

          <div className="overview-grid">
            <section className="section-shell glass-card">
              <div className="section-heading">
                <span className="badge">部门视角</span>
                <h2 className="serif-title">部门进度簿</h2>
                <p>先按部门聚合，再决定这一轮优先补表达、补治理还是补追问承接。</p>
              </div>

              <div className="department-grid">
                {departmentDigests.map((item) => (
                  <article className="department-card" key={item.name}>
                    <div className="department-card__topline">
                      <h3 className="serif-title">{item.name}</h3>
                      <span className="department-card__count">{item.totalSessions} 份档案</span>
                    </div>
                    <p className="department-card__meta">活跃流程 {item.activeSessions} 条</p>
                    <div className="accent-strip">
                      <strong>当前最常见的挂点：{item.mainGap}</strong>
                    </div>
                    <p className="department-card__note">{item.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="section-shell glass-card" id="failure-clusters">
              <div className="section-heading">
                <span className="badge">挂点归因</span>
                <h2 className="serif-title">为什么会被挂</h2>
                <p>先别急着改所有回答，优先把重复出现的失败模式归成几类，再集中修。</p>
              </div>

              <div className="reason-list">
                {failureClusters.map((item) => (
                  <article className="reason-card" key={item.title}>
                    <div className="reason-card__topline">
                      <h3>{item.title}</h3>
                      <span>{item.countLabel}</span>
                    </div>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>

              <div className="context-strip overview-context">
                <div className="context-strip__title">本轮判断</div>
                <p>
                  现在最值得优先补的是“治理闭环”和“结论前置”两类问题，因为它们会影响多个部门的
                  追问表现，不只是某一场面试里的偶发失误。
                </p>
              </div>
            </section>
          </div>

          <section className="section-shell glass-card" id="archive-section">
            <div className="section-heading">
              <span className="badge">复盘档案</span>
              <h2 className="serif-title">从管理页进入单次工作台</h2>
              <p>每份档案先记录部门、轮次进展和挂点，再下钻到当前的问答工作台继续整理。</p>
            </div>

            <div className="archive-grid">
              {dashboardSessions.map((item) => (
                <article className="archive-card" key={item.sessionKey}>
                  <div className="archive-card__eyebrow">
                    <span className="badge">{item.company}</span>
                    <span className={`status-pill status-pill--${item.statusTone}`}>{item.statusLabel}</span>
                    {item.isSample ? <span className="badge badge-muted">静态样例</span> : null}
                  </div>

                  <h3 className="serif-title">{item.title}</h3>
                  <p className="archive-card__subhead">
                    {item.department} · {item.roleFocus}
                  </p>

                  <div className="archive-card__facts">
                    <span>{item.totalRounds} 轮内容</span>
                    <span className="dot" />
                    <span>{item.updatedDate}</span>
                    <span className="dot" />
                    <span>{item.model}</span>
                  </div>

                  <div className="stage-list">
                    {item.stageTrail.map((stage, index) => (
                      <span
                        className={[
                          "stage-pill",
                          index < item.currentStage ? "is-complete" : "",
                          index === item.currentStage ? "is-current" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={`${item.sessionKey}-${stage}`}
                      >
                        {stage}
                      </span>
                    ))}
                  </div>

                  <div className="accent-strip">
                    <strong>{item.weaknessTitle}</strong>
                    <p>{item.weaknessSummary}</p>
                  </div>

                  <p className="archive-card__summary">{item.improvementNote}</p>

                  <div className="archive-actions">
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => openWorkspace(item.sessionKey)}
                    >
                      进入复盘工作台
                    </button>
                    <span className="archive-actions__hint">{item.outcomeLabel}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="overview-footer-grid">
            <section className="section-shell glass-card">
              <div className="section-heading">
                <span className="badge">复盘节奏</span>
                <h2 className="serif-title">最近整理记录</h2>
                <p>这里适合放本周做过的补稿、归因和二面准备动作。</p>
              </div>

              <div className="timeline-list">
                {reviewTimeline.map((item) => (
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

            <section className="section-shell glass-card">
              <div className="section-heading">
                <span className="badge">调度建议</span>
                <h2 className="serif-title">下一步该做什么</h2>
                <p>不需要一次把所有问题都修完，先按复用价值最高的模块推进。</p>
              </div>

              <div className="memo-list">
                {dispatchMemos.map((item) => (
                  <article className="memo-card" key={`${item.label}-${item.title}`}>
                    <span className="memo-card__label">{item.label}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="workspace-flow">
          <header className="page-header workspace-header glass-card">
            <div className="page-header__copy">
              <button className="link-button" type="button" onClick={openOverview}>
                返回管理页
              </button>

              <div className="workspace-header__badges">
                <span className="badge">单次复盘工作台</span>
                {isMockWorkspace ? <span className="badge badge-muted">静态样例</span> : null}
                {currentSessionCard ? (
                  <span className={`status-pill status-pill--${currentSessionCard.statusTone}`}>
                    {currentSessionCard.department}
                  </span>
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
                <span className="header-aside__label">本次重点</span>
                <strong>{currentSessionCard?.weaknessTitle || "轮次整理"}</strong>
                <p>{currentSessionCard?.outcomeLabel || "继续补齐被挂原因与改进方向。"}</p>
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
      )}

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
