import { useState } from "react";
import {
  createEmptyInterviewRecordDraft,
  getInterviewRecordSourceMeta,
  interviewRecordSourceOptions,
  type InterviewRecordDraft,
} from "../interviewRecordData";
import { StatePanel } from "../components/StatePanel";
import { useDashboard } from "../providers/DashboardProvider";
import { useAppNavigate } from "../routes";

export function DetailPage() {
  const {
    applicationRecords,
    interviewRecords,
    interviewRecordGroups,
    readyInterviewRecordCount,
    pendingInterviewRecordCount,
    catalogNotice,
    createInterviewRecord,
  } = useDashboard();
  const { openHome, openWorkspace, openMemo } = useAppNavigate();
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [draft, setDraft] = useState<InterviewRecordDraft>(() =>
    createEmptyInterviewRecordDraft(applicationRecords[0]?.id || "")
  );

  const coveredPipelineCount = interviewRecordGroups.length;
  const activeSourceMeta = getInterviewRecordSourceMeta(draft.sourceType);
  const sourceStateHint: Record<InterviewRecordDraft["sourceType"], string> = {
    manual: "保存后会先作为“手记待补充”出现，不会直接进入复盘工作台。",
    text: "保存后会先作为“文本待解析”出现，后续再衔接结构化复盘。",
    audio: "保存后会先作为“解析中”出现，等音频切分完成后再进入复盘。",
  };

  function openCreateDrawer(applicationRecordId?: string) {
    setDraft(createEmptyInterviewRecordDraft(applicationRecordId || applicationRecords[0]?.id || ""));
    setIsCreatorOpen(true);
  }

  function closeCreateDrawer() {
    setIsCreatorOpen(false);
    setDraft(createEmptyInterviewRecordDraft(applicationRecords[0]?.id || ""));
  }

  function updateDraft<K extends keyof InterviewRecordDraft>(
    field: K,
    value: InterviewRecordDraft[K]
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createInterviewRecord(draft);
    closeCreateDrawer();
  }

  if (!applicationRecords.length) {
    return (
      <div className="detail-flow detail-flow--hub">
        <section className="section-shell glass-card tracker-empty">
          <StatePanel
            badge="Interview Record Hub"
            title="还没有可挂载的岗位流程"
            description="请先在首页建立岗位流程记录，再回到这里挂载每一轮的面试经验、文本或音频。"
          />

          <button className="btn btn-primary" type="button" onClick={openHome}>
            返回平台首页
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="detail-flow detail-flow--hub">
      <header className="glass-card detail-hub-hero">
        <div className="detail-hub-hero__copy">
          <div className="detail-hub-hero__badges">
            <span className="badge">Interview Record Hub</span>
            <span className="badge badge-muted">detail 分支一级页</span>
          </div>

          <h1 className="serif-title">面试记录总页</h1>
          <p>
            这里承接每一条面试记录，而不是单个 mock 详情。可以按岗位查看一面、二面、主管面等不同轮次，再从可复盘的记录进入
            workspace。
          </p>

          <div className="page-meta">
            <span>{applicationRecords.length} 条岗位流程</span>
            <span className="dot" />
            <span>{coveredPipelineCount} 条已挂载面试记录的流程</span>
            <span className="dot" />
            <span>{interviewRecords.length} 条面试记录</span>
          </div>
        </div>

        <div className="detail-hub-hero__actions">
          <button className="btn btn-secondary" type="button" onClick={openHome}>
            返回平台首页
          </button>
          <button className="btn btn-secondary" type="button" onClick={openMemo}>
            打开备忘录
          </button>
          <button className="btn btn-primary" type="button" onClick={() => openCreateDrawer()}>
            新增面试记录
          </button>
        </div>
      </header>

      <section className="glass-card detail-hub-stats">
        <article className="detail-hub-stat">
          <span className="status-pill status-pill--passed">可复盘</span>
          <strong>{readyInterviewRecordCount}</strong>
          <p>已有具体 sessionKey，可直接进入 workspace 的记录。</p>
        </article>
        <article className="detail-hub-stat">
          <span className="status-pill status-pill--waiting">处理中</span>
          <strong>{pendingInterviewRecordCount}</strong>
          <p>包括手记待补、文本待解析、解析中和失败待补录的记录。</p>
        </article>
        <article className="detail-hub-stat">
          <span className="status-pill status-pill--active">覆盖岗位</span>
          <strong>{coveredPipelineCount}</strong>
          <p>已经开始沉淀面试经验、并形成目录的岗位流程数量。</p>
        </article>
        <article className="detail-hub-stat">
          <span className="status-pill status-pill--scheduled">未挂载岗位</span>
          <strong>{applicationRecords.length - coveredPipelineCount}</strong>
          <p>这些岗位还没创建面试记录，可以直接从这里补第一条。</p>
        </article>
      </section>

      {catalogNotice ? <div className="notice-strip glass-card">{catalogNotice}</div> : null}

      {interviewRecordGroups.length ? (
        <div className="detail-record-group-list">
          {interviewRecordGroups.map((group) => (
            <section className="section-shell glass-card detail-record-group" key={group.applicationRecord.id}>
              <div className="detail-record-group__header">
                <div>
                  <span className="badge">Pipeline</span>
                  <h2 className="serif-title">
                    {group.applicationRecord.company} ·{" "}
                    {group.applicationRecord.department || group.applicationRecord.roleTitle}
                  </h2>
                  <p>
                    {group.applicationRecord.roleTitle}
                    {group.applicationRecord.city ? ` · ${group.applicationRecord.city}` : ""}
                    {group.applicationRecord.sourceChannel
                      ? ` · ${group.applicationRecord.sourceChannel}`
                      : ""}
                  </p>
                </div>

                <div className="detail-record-group__meta">
                  <span className={`status-pill status-pill--${group.applicationRecord.statusTone}`}>
                    {group.applicationRecord.statusLabel}
                  </span>
                  <span className="detail-record-group__summary">
                    {group.readyCount} 条可复盘 · {group.pendingCount} 条待补充
                  </span>
                  <button
                    className="btn btn-secondary btn-compact"
                    type="button"
                    onClick={() => openCreateDrawer(group.applicationRecord.id)}
                  >
                    新增这一条线的记录
                  </button>
                </div>
              </div>

              <div className="accent-strip">
                <strong>当前流程说明</strong>
                <p>{group.applicationRecord.nextStep || "暂时还没有补充下一步说明。"}</p>
              </div>

              <div className="detail-record-grid">
                {group.records.map((record) => {
                  const sourceMeta = getInterviewRecordSourceMeta(record.sourceType);

                  return (
                    <article className="detail-record-card" key={record.id}>
                      <div className="detail-record-card__topline">
                        <div>
                          <div className="detail-record-card__badges">
                            <span className="badge badge-muted">{sourceMeta.label}</span>
                            <span className="badge badge-muted">{record.interviewDate}</span>
                          </div>
                          <h3>{record.roundLabel}</h3>
                          <p>{record.sourceName || "暂未附带文件名或来源说明"}</p>
                        </div>

                        <span className={`status-pill status-pill--${record.processingTone}`}>
                          {record.processingLabel}
                        </span>
                      </div>

                      <p className="detail-record-card__copy">
                        {record.notes || record.processingDescription}
                      </p>

                      <div className="detail-record-card__meta">
                        <span>{sourceMeta.description}</span>
                        {record.sessionKey ? (
                          <>
                            <span className="dot" />
                            <span>Session: {record.sessionKey}</span>
                          </>
                        ) : null}
                      </div>

                      <div className="interview-card__footer">
                        {record.canOpenWorkspace && record.sessionKey ? (
                          <button
                            className="btn btn-primary btn-compact"
                            type="button"
                            onClick={() => openWorkspace(record.sessionKey || undefined)}
                          >
                            {record.actionLabel}
                          </button>
                        ) : (
                          <button className="btn btn-secondary btn-compact" disabled type="button">
                            {record.actionLabel}
                          </button>
                        )}

                        <span className="detail-record-card__hint">
                          {record.processingDescription}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="section-shell glass-card tracker-empty">
          <StatePanel
            badge="Interview Record Hub"
            title="还没有面试记录目录"
            description="岗位流程已经有了，但 detail 页还没有任何面试记录。先新增一条手动记录、文字版或音频版，把目录搭起来。"
          />

          <button className="btn btn-primary" type="button" onClick={() => openCreateDrawer()}>
            新增第一条面试记录
          </button>
        </section>
      )}

      {isCreatorOpen ? (
        <div className="tracker-overlay" role="presentation" onClick={closeCreateDrawer}>
          <aside
            aria-label="新增面试记录"
            aria-modal="true"
            className="tracker-drawer glass-card"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tracker-drawer__header">
              <div>
                <span className="badge">新增面试记录</span>
                <h2 className="serif-title">把这轮经验挂到 detail 目录里</h2>
                <p>先录入轮次和来源，workspace 是否可用由记录当前状态决定。</p>
              </div>

              <button className="btn btn-secondary btn-compact" type="button" onClick={closeCreateDrawer}>
                关闭
              </button>
            </div>

            <div className="tracker-drawer__status">
              <strong>{activeSourceMeta.label}</strong>
              <p>{activeSourceMeta.description}</p>
              <p>{sourceStateHint[draft.sourceType]}</p>
            </div>

            <form className="tracker-form" onSubmit={handleSubmit}>
              <div className="tracker-form-grid">
                <label className="tracker-field">
                  <span>所属岗位流程</span>
                  <select
                    required
                    value={draft.applicationRecordId}
                    onChange={(event) => updateDraft("applicationRecordId", event.target.value)}
                  >
                    {applicationRecords.map((record) => (
                      <option key={record.id} value={record.id}>
                        {record.company} · {record.department || record.roleTitle}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="tracker-field">
                  <span>轮次名称</span>
                  <input
                    placeholder="例如：技术一面 / 主管面 / HR 复盘"
                    required
                    value={draft.roundLabel}
                    onChange={(event) => updateDraft("roundLabel", event.target.value)}
                  />
                </label>

                <label className="tracker-field">
                  <span>面试日期</span>
                  <input
                    required
                    type="date"
                    value={draft.interviewDate}
                    onChange={(event) => updateDraft("interviewDate", event.target.value)}
                  />
                </label>

                <label className="tracker-field">
                  <span>记录来源</span>
                  <select
                    value={draft.sourceType}
                    onChange={(event) =>
                      updateDraft("sourceType", event.target.value as InterviewRecordDraft["sourceType"])
                    }
                  >
                    {interviewRecordSourceOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="tracker-field">
                  <span>文件名 / 来源说明</span>
                  <input
                    placeholder="可选，例如 transcript.txt / 录音原件"
                    value={draft.sourceName}
                    onChange={(event) => updateDraft("sourceName", event.target.value)}
                  />
                </label>
              </div>

              <label className="tracker-field">
                <span>记录说明</span>
                <textarea
                  placeholder="这一轮的结论、追问方向、是否需要后续补上传文本或音频。"
                  value={draft.notes}
                  onChange={(event) => updateDraft("notes", event.target.value)}
                />
              </label>

              <div className="tracker-form__actions">
                <button className="btn btn-secondary" type="button" onClick={closeCreateDrawer}>
                  取消
                </button>
                <button className="btn btn-primary" type="submit">
                  保存到详情页目录
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
