import { StatePanel } from "./StatePanel";
import { roundLabel, sourceRoundLabel } from "../workspace-utils";
import type { RoundItem } from "../types";

type WorkspaceFocusPanelProps = {
  activeRound: RoundItem | null;
};

export function WorkspaceFocusPanel({ activeRound }: WorkspaceFocusPanelProps) {
  return (
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
        <StatePanel
          badge="当前聚焦轮次"
          title="暂无可展示的轮次"
          description="请先确认后端服务已启动，并且当前数据库中已经导入面试会话。"
        />
      )}
    </section>
  );
}
