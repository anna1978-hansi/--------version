import { memoSidebarItems } from "../dashboardData";
import { useDashboard } from "../providers/DashboardProvider";
import { useAppNavigate } from "../routes";

export function MemoPage() {
  const {
    homeLeadSession,
    memoGroups,
    pendingMemoTaskCount,
    completedMemoTaskCount,
    criticalMemoTaskCount,
    toggleMemoTask,
  } = useDashboard();
  const { openHome, openDetail, openWorkspace } = useAppNavigate();

  return (
    <div className="memo-flow">
      <header className="memo-hero">
        <div className="memo-hero__copy">
          <div className="memo-kicker">Memo Desk</div>
          <h1 className="serif-title">任务备忘录</h1>
          <p>
            这一页更偏日常处理和运营感。先记录要做什么、什么时候做、是否已经完成，再决定要不要跳回档案页或复盘页。
          </p>

          <div className="memo-hero__actions">
            <button className="btn btn-primary memo-btn-primary" type="button" onClick={openHome}>
              返回平台首页
            </button>
            <button
              className="btn btn-secondary memo-btn-secondary"
              type="button"
              onClick={() => (homeLeadSession ? openDetail(homeLeadSession.sessionKey) : openHome())}
            >
              打开当前重点档案
            </button>
          </div>
        </div>

        <div className="memo-hero__stats">
          <article className="memo-stat-card">
            <span className="memo-stat-card__label">待完成</span>
            <strong>{pendingMemoTaskCount}</strong>
          </article>
          <article className="memo-stat-card">
            <span className="memo-stat-card__label">已完成</span>
            <strong>{completedMemoTaskCount}</strong>
          </article>
          <article className="memo-stat-card">
            <span className="memo-stat-card__label">高优先级</span>
            <strong>{criticalMemoTaskCount}</strong>
          </article>
        </div>
      </header>

      <div className="memo-layout">
        <aside className="memo-sidebar">
          <section className="memo-panel memo-panel--sidebar">
            <span className="memo-panel__eyebrow">本周状态</span>
            <h2 className="serif-title">备忘录概览</h2>
            <p>
              这里保留更偏商务的节奏。任务、提醒和结果更新都先在这里收口，不用每次都进复盘页。
            </p>
          </section>

          <div className="memo-sidebar-list">
            {memoSidebarItems.map((item) => (
              <article className="memo-sidebar-card" key={item.label}>
                <div className="memo-sidebar-card__topline">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          {homeLeadSession ? (
            <section className="memo-panel memo-panel--accent">
              <span className="memo-panel__eyebrow">当前关联</span>
              <h3 className="serif-title">
                {homeLeadSession.company} · {homeLeadSession.department}
              </h3>
              <p>{homeLeadSession.nextActionLabel}</p>

              <div className="memo-panel__actions">
                <button
                  className="btn btn-secondary btn-compact memo-btn-secondary"
                  type="button"
                  onClick={() => openDetail(homeLeadSession.sessionKey)}
                >
                  查看档案
                </button>
                <button
                  className="btn btn-secondary btn-compact memo-btn-secondary"
                  type="button"
                  onClick={() => openWorkspace(homeLeadSession.sessionKey)}
                >
                  进入复盘
                </button>
              </div>
            </section>
          ) : null}
        </aside>

        <main className="memo-main">
          {memoGroups.map((group) => (
            <section className="memo-panel memo-group-panel" key={group.id}>
              <div className="memo-group-panel__header">
                <div>
                  <span className="memo-panel__eyebrow">{group.title}</span>
                  <h2 className="serif-title">{group.description}</h2>
                </div>
                <span className="memo-group-panel__count">
                  {group.items.filter((item) => item.completed).length} / {group.items.length}
                </span>
              </div>

              <div className="memo-task-list">
                {group.items.map((item) => (
                  <article
                    className={[
                      "memo-task-row",
                      item.completed ? "is-complete" : "",
                      `tone-${item.tone}`,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={item.id}
                  >
                    <button
                      className={`memo-check${item.completed ? " is-complete" : ""}`}
                      type="button"
                      aria-pressed={item.completed}
                      onClick={() => toggleMemoTask(item.id)}
                    >
                      <span className="memo-check__ring" />
                      <span className="memo-check__dot" />
                    </button>

                    <div className="memo-task-row__body">
                      <div className="memo-task-row__topline">
                        <strong>{item.title}</strong>
                        <span>{item.dueLabel}</span>
                      </div>
                      <p>{item.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
