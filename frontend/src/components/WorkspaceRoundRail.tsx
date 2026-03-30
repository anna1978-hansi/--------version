import { roundLabel, sourceRoundLabel } from "../workspace-utils";
import type { RoundItem, SessionSummary } from "../types";

type WorkspaceRoundRailProps = {
  sessionSummary: SessionSummary;
  highValueCount: number;
  reviewFlagCount: number;
  editMode: boolean;
  isMockWorkspace: boolean;
  selectedRounds: RoundItem[];
  mutationBusy: boolean;
  canDelete: boolean;
  canMerge: boolean;
  loading: boolean;
  error: string | null;
  rounds: RoundItem[];
  activeRoundNumber: number | null;
  selectedRoundNumbers: number[];
  onToggleEditMode: () => void;
  onDeleteRound: () => void;
  onOpenMergeModal: () => void;
  onRoundCardClick: (roundNumber: number) => void;
};

export function WorkspaceRoundRail({
  sessionSummary,
  highValueCount,
  reviewFlagCount,
  editMode,
  isMockWorkspace,
  selectedRounds,
  mutationBusy,
  canDelete,
  canMerge,
  loading,
  error,
  rounds,
  activeRoundNumber,
  selectedRoundNumbers,
  onToggleEditMode,
  onDeleteRound,
  onOpenMergeModal,
  onRoundCardClick,
}: WorkspaceRoundRailProps) {
  return (
    <aside className="nav-rail glass-card">
      <div className="rail-section">
        <div className="rail-section__header">
          <div className="rail-section__topline">
            <span className="badge">复盘目录</span>
            <button
              className="btn btn-secondary btn-compact"
              type="button"
              disabled={isMockWorkspace}
              onClick={onToggleEditMode}
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
                onClick={onDeleteRound}
              >
                删除所选
              </button>
              <button
                className="btn btn-primary btn-compact"
                type="button"
                disabled={!canMerge || mutationBusy}
                onClick={onOpenMergeModal}
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
            const active = round.roundNumber === activeRoundNumber;
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
                onClick={() => onRoundCardClick(round.roundNumber)}
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
  );
}
