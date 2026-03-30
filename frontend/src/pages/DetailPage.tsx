import { useParams } from "react-router-dom";
import { statusUpdateOptions } from "../dashboardData";
import { StageTrail } from "../components/StageTrail";
import { StatePanel } from "../components/StatePanel";
import { useDashboard } from "../providers/DashboardProvider";
import { useAppNavigate } from "../routes";

export function DetailPage() {
  const { sessionKey } = useParams();
  const { dashboardSessions, homeLeadSession, catalogNotice, updateInterviewStatus } = useDashboard();
  const { openHome, openWorkspace, openMemo } = useAppNavigate();

  const detailSession =
    dashboardSessions.find((item) => item.sessionKey === sessionKey) || homeLeadSession;

  if (!detailSession) {
    return (
      <StatePanel
        badge="面试档案页"
        title="暂无可展示的档案"
        description="请先回到首页确认当前是否已有静态样例或真实数据。"
      />
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

          <StageTrail session={detailSession} />
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
            <button className="btn btn-secondary" type="button" onClick={openMemo}>
              打开备忘录
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
                    onClick={() => updateInterviewStatus(detailSession.sessionKey, item.key)}
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
