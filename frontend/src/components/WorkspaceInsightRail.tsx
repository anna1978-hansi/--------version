import { StatePanel } from "./StatePanel";
import type { RoundItem } from "../types";

type WorkspaceInsightRailProps = {
  activeRound: RoundItem | null;
};

export function WorkspaceInsightRail({ activeRound }: WorkspaceInsightRailProps) {
  return (
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
          <StatePanel
            badge="AI 诊断"
            title=""
            description="等轮次数据加载完成后，这里会展示当前目录项的诊断信息。"
            compact
          />
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
  );
}
