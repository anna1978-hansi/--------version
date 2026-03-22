import { useEffect, useState } from "react";
import { buildRoundItem, buildSessionSummary } from "./adapters";
import {
  deleteSessionTurn,
  fetchSessions,
  fetchSessionTurns,
  getApiBase,
  mergeSessionTurns,
} from "./api";
import type { RoundItem, SessionSummary, TurnsResponse } from "./types";

type MergeModalState = {
  rounds: [RoundItem, RoundItem];
  mergedInterviewerText: string;
  mergedCandidateText: string;
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

export default function App() {
  const [sessionSummary, setSessionSummary] = useState<SessionSummary>(defaultSessionSummary);
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [activeRoundNumber, setActiveRoundNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedRoundNumbers, setSelectedRoundNumbers] = useState<number[]>([]);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mergeModal, setMergeModal] = useState<MergeModalState | null>(null);

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

  async function loadSessionData({
    preferredRoundNumber,
    showLoading = true,
  }: {
    preferredRoundNumber?: number | null;
    showLoading?: boolean;
  } = {}) {
    if (showLoading) {
      setLoading(true);
    }

    setError(null);

    try {
      let targetSessionKey = sessionSummary.sessionKey;

      if (!targetSessionKey) {
        const sessionResponse = await fetchSessions();
        const firstSession = sessionResponse.items[0];

        if (!firstSession) {
          throw new Error("后端里还没有可用的面试会话，请先执行导入。");
        }

        targetSessionKey = firstSession.sessionKey;
      }

      const turnsResponse = await fetchSessionTurns(targetSessionKey);
      applyTurnsResponse(turnsResponse, preferredRoundNumber);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadSessionData();
  }, []);

  const activeRound =
    rounds.find((item) => item.roundNumber === activeRoundNumber) || rounds[0] || null;
  const reviewFlagCount = rounds.filter((item) => item.needsReview).length;
  const highValueCount = rounds.filter((item) => item.review.score >= 80).length;
  const selectedRounds = rounds
    .filter((round) => selectedRoundNumbers.includes(round.roundNumber))
    .sort((left, right) => left.roundNumber - right.roundNumber);
  const canMerge =
    selectedRounds.length === 2 &&
    selectedRounds[1].roundNumber === selectedRounds[0].roundNumber + 1;
  const canDelete = selectedRounds.length === 1;

  function toggleEditMode() {
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
    if (!mergeModal || !sessionSummary.sessionKey) {
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
    if (!canDelete || !sessionSummary.sessionKey) {
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

      <header className="page-header">
        <div className="page-header__copy">
          <span className="eyebrow">Interview Review Workspace</span>
          <h1 className="serif-title">{sessionSummary.title}</h1>
          <div className="page-meta">
            <span>Model: {sessionSummary.model}</span>
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
          <button className="btn btn-secondary" type="button">
            导出完整文档
          </button>
          <button className="btn btn-primary" type="button">
            上传新语音片段
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="nav-rail glass-card">
          <div className="rail-section">
            <div className="rail-section__header">
              <div className="rail-section__topline">
                <span className="badge">复盘目录</span>
                <button className="btn btn-secondary btn-compact" type="button" onClick={toggleEditMode}>
                  {editMode ? "退出编辑" : "整理目录"}
                </button>
              </div>
              <p>切换轮次后，主舞台与右侧洞察同步更新。</p>
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
                  {selectedRounds.length ? ` · ${selectedRounds.map((round) => round.roundNumber).join(", ")}` : ""}
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
