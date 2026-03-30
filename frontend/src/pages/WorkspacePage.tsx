import { useParams } from "react-router-dom";
import { MergeRoundsModal } from "../components/MergeRoundsModal";
import { WorkspaceFocusPanel } from "../components/WorkspaceFocusPanel";
import { WorkspaceInsightRail } from "../components/WorkspaceInsightRail";
import { WorkspaceRoundRail } from "../components/WorkspaceRoundRail";
import { getApiBase } from "../api";
import { useWorkspaceSession } from "../hooks/useWorkspaceSession";
import { useAppNavigate } from "../routes";

export function WorkspacePage() {
  const { sessionKey } = useParams();
  const { openDetail, openMemo } = useAppNavigate();
  const {
    sessionSummary,
    rounds,
    activeRound,
    loading,
    error,
    workspaceNotice,
    editMode,
    selectedRoundNumbers,
    mutationBusy,
    mergeModal,
    isMockWorkspace,
    currentSessionCard,
    currentInterviewRecord,
    reviewFlagCount,
    highValueCount,
    selectedRounds,
    canMerge,
    canDelete,
    toggleEditMode,
    handleRoundCardClick,
    openMergeModal,
    closeMergeModal,
    appendMergeFragment,
    updateMergedInterviewerText,
    updateMergedCandidateText,
    clearMergedText,
    handleConfirmMerge,
    handleDeleteRound,
  } = useWorkspaceSession(sessionKey);

  return (
    <div className="workspace-flow">
      <header className="page-header workspace-header glass-card">
        <div className="page-header__copy">
          <button className="link-button" type="button" onClick={openDetail}>
            返回面试档案页
          </button>

          <div className="workspace-header__badges">
            <span className="badge">录音复盘工作台</span>
            {currentInterviewRecord ? (
              <span className="badge badge-muted">{currentInterviewRecord.roundLabel}</span>
            ) : null}
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
            {currentInterviewRecord?.notes ||
              currentSessionCard?.improvementNote ||
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
            <button className="btn btn-secondary" type="button" onClick={openMemo}>
              打开备忘录
            </button>
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
        <WorkspaceRoundRail
          sessionSummary={sessionSummary}
          highValueCount={highValueCount}
          reviewFlagCount={reviewFlagCount}
          editMode={editMode}
          isMockWorkspace={isMockWorkspace}
          selectedRounds={selectedRounds}
          mutationBusy={mutationBusy}
          canDelete={canDelete}
          canMerge={canMerge}
          loading={loading}
          error={error}
          rounds={rounds}
          activeRoundNumber={activeRound?.roundNumber || null}
          selectedRoundNumbers={selectedRoundNumbers}
          onToggleEditMode={toggleEditMode}
          onDeleteRound={handleDeleteRound}
          onOpenMergeModal={openMergeModal}
          onRoundCardClick={handleRoundCardClick}
        />

        <main className="center-stage">
          <WorkspaceFocusPanel activeRound={activeRound} />
        </main>

        <WorkspaceInsightRail activeRound={activeRound} />
      </div>

      <MergeRoundsModal
        mergeModal={mergeModal}
        mutationBusy={mutationBusy}
        onClose={closeMergeModal}
        onAppendFragment={appendMergeFragment}
        onUpdateMergedInterviewerText={updateMergedInterviewerText}
        onUpdateMergedCandidateText={updateMergedCandidateText}
        onClear={clearMergedText}
        onConfirm={handleConfirmMerge}
      />
    </div>
  );
}
