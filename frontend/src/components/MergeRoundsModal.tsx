import type { MergeModalState } from "../hooks/useWorkspaceSession";
import { roundLabel, sourceRoundLabel } from "../workspace-utils";

type MergeRoundsModalProps = {
  mergeModal: MergeModalState | null;
  mutationBusy: boolean;
  onClose: () => void;
  onAppendFragment: (target: "interviewer" | "candidate", fragmentText: string) => void;
  onUpdateMergedInterviewerText: (text: string) => void;
  onUpdateMergedCandidateText: (text: string) => void;
  onClear: () => void;
  onConfirm: () => void;
};

export function MergeRoundsModal({
  mergeModal,
  mutationBusy,
  onClose,
  onAppendFragment,
  onUpdateMergedInterviewerText,
  onUpdateMergedCandidateText,
  onClear,
  onConfirm,
}: MergeRoundsModalProps) {
  if (!mergeModal) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
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
          <button className="btn btn-secondary btn-compact" type="button" onClick={onClose}>
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
                    onClick={() => onAppendFragment("interviewer", round.interviewerText)}
                  >
                    加入面试官
                  </button>
                  <button
                    className="inline-btn"
                    type="button"
                    onClick={() => onAppendFragment("candidate", round.interviewerText)}
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
                    onClick={() => onAppendFragment("interviewer", round.candidateText)}
                  >
                    加入面试官
                  </button>
                  <button
                    className="inline-btn"
                    type="button"
                    onClick={() => onAppendFragment("candidate", round.candidateText)}
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
              onChange={(event) => onUpdateMergedInterviewerText(event.target.value)}
              placeholder="从上面的原始片段中整理出最终的面试官内容"
            />
          </label>

          <label className="merge-target">
            <span>合并后的面试者内容</span>
            <textarea
              value={mergeModal.mergedCandidateText}
              onChange={(event) => onUpdateMergedCandidateText(event.target.value)}
              placeholder="从上面的原始片段中整理出最终的面试者内容"
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary btn-compact" type="button" onClick={onClear}>
            清空
          </button>
          <button className="btn btn-primary" type="button" disabled={mutationBusy} onClick={onConfirm}>
            {mutationBusy ? "提交中..." : "确认合并"}
          </button>
        </div>
      </div>
    </div>
  );
}
