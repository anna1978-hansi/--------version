import { homeActivityFeed } from "../dashboardData";
import { StageTrail } from "../components/StageTrail";
import { StatePanel } from "../components/StatePanel";
import { getApiBase } from "../api";
import { useDashboard } from "../providers/DashboardProvider";
import { useAppNavigate } from "../routes";

export function HomePage() {
  const {
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
  } = useDashboard();
  const { openDetail, openWorkspace, openMemo } = useAppNavigate();

  if (!homeLeadSession) {
    return (
      <StatePanel
        badge="面试平台"
        title="暂无可展示的档案"
        description="等我们把静态样例或真实数据库接进来后，这里会展示首页总台。"
      />
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
            <button className="btn btn-secondary" type="button" onClick={openMemo}>
              打开备忘录
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

              <StageTrail session={item} />

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
