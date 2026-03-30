import { useState } from "react";
import {
  applicationStageOptions,
  applicationStatusOptions,
  createEmptyApplicationDraft,
  getApplicationStatusMeta,
  toApplicationDraft,
  type ApplicationRecord,
  type ApplicationRecordDraft,
} from "../applicationTrackerData";
import { StatePanel } from "../components/StatePanel";
import { useDashboard } from "../providers/DashboardProvider";
import { useAppNavigate } from "../routes";

type EditorMode = "create" | "edit" | null;

export function HomePage() {
  const { applicationRecords, applicationSummary, applicationNotice, upsertApplicationRecord } =
    useDashboard();
  const { openDetail } = useAppNavigate();
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ApplicationRecordDraft>(() => createEmptyApplicationDraft());

  const editingRecord =
    (editingRecordId
      ? applicationRecords.find((record) => record.id === editingRecordId)
      : null) || null;
  const draftStatus = getApplicationStatusMeta(draft.statusKey);
  const isEditorOpen = editorMode !== null;
  const summaryCards = [
    {
      label: "总投递",
      value: applicationSummary.total,
      tone: "scheduled",
      note: "当前正在追踪的全部岗位流程。",
    },
    {
      label: "推进中",
      value: applicationSummary.active,
      tone: "active",
      note: "仍在继续推进、安排或过轮的记录。",
    },
    {
      label: "待结果",
      value: applicationSummary.waiting,
      tone: "waiting",
      note: "当前正在等待反馈或下一步通知。",
    },
    {
      label: "已挂",
      value: applicationSummary.ended,
      tone: "rejected",
      note: "已经结束但默认继续保留在表格里。",
    },
    {
      label: "正向结果",
      value: applicationSummary.success,
      tone: "passed",
      note: "终面通过或进入 offer 阶段的记录。",
    },
  ] as const;

  function openCreateEditor() {
    setEditorMode("create");
    setEditingRecordId(null);
    setDraft(createEmptyApplicationDraft());
  }

  function openEditEditor(record: ApplicationRecord) {
    setEditorMode("edit");
    setEditingRecordId(record.id);
    setDraft(toApplicationDraft(record));
  }

  function closeEditor() {
    setEditorMode(null);
    setEditingRecordId(null);
    setDraft(createEmptyApplicationDraft());
  }

  function updateDraft<K extends keyof ApplicationRecordDraft>(
    field: K,
    value: ApplicationRecordDraft[K]
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    upsertApplicationRecord(editorMode === "edit" ? editingRecordId : null, draft);
    closeEditor();
  }

  if (!applicationRecords.length) {
    return (
      <div className="home-flow home-flow--tracker">
        <section className="section-shell glass-card tracker-empty">
          <StatePanel
            badge="Application Tracker"
            title="还没有投递流程记录"
            description="先建一条岗位记录，再在这里统一追踪状态、阶段、下一步和统计结果。"
          />

          <button className="btn btn-primary" type="button" onClick={openCreateEditor}>
            新建第一条记录
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="home-flow home-flow--tracker">
      <section className="glass-card tracker-shell">
        <div className="tracker-shell__topline">
          <div className="tracker-shell__copy">
            <span className="badge">Application Tracker</span>
            <h1 className="serif-title">个人面试平台</h1>
            <p>
              主页只负责记录岗位流程本身。公司、岗位、当前状态、下一步和总体统计都在这里收口，复盘页面继续独立存在。
            </p>
          </div>

          <div className="tracker-shell__actions">
            <button className="btn btn-secondary" type="button" onClick={openDetail}>
              打开面试记录页
            </button>
            <button className="btn btn-primary" type="button" onClick={openCreateEditor}>
              新建记录
            </button>
          </div>
        </div>

        {applicationNotice ? <div className="state-block tracker-notice">{applicationNotice}</div> : null}

        <div className="tracker-summary-grid">
          {summaryCards.map((item) => (
            <article className="tracker-summary-card" key={item.label}>
              <span className={`status-pill status-pill--${item.tone}`}>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell glass-card tracker-table-shell">
        <div className="tracker-table-shell__header">
          <div>
            <span className="badge">岗位流程总台</span>
            <h2 className="serif-title">按岗位追踪，而不是按复盘会话追踪</h2>
            <p>同一家公司投多个岗位会分成多行，结束记录也默认保留在主表里。</p>
          </div>
        </div>

        <div className="tracker-table-wrap">
          <table className="tracker-table">
            <thead>
              <tr>
                <th scope="col">公司</th>
                <th scope="col">岗位 / 部门</th>
                <th scope="col">当前状态</th>
                <th scope="col">当前流程</th>
                <th scope="col">下一步 / 时间</th>
                <th scope="col">投递时间</th>
                <th scope="col">投递链接</th>
                <th scope="col">备注</th>
                <th scope="col">操作</th>
              </tr>
            </thead>

            <tbody>
              {applicationRecords.map((record) => (
                <tr className={record.isClosed ? "is-closed" : ""} key={record.id}>
                  <td>
                    <div className="tracker-company-cell">
                      <strong>{record.company}</strong>
                      <span>
                        {record.sourceChannel || "渠道待补充"}
                        {record.city ? ` · ${record.city}` : ""}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="tracker-role-cell">
                      <strong>{record.roleTitle}</strong>
                      <span>{record.department || "部门待补充"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="tracker-status-cell">
                      <span className={`status-pill status-pill--${record.statusTone}`}>
                        {record.statusLabel}
                      </span>
                      <span>{record.updatedDate}</span>
                    </div>
                  </td>
                  <td>{record.stageLabel}</td>
                  <td>
                    <div className="tracker-notes-cell">
                      <strong>{record.nextStep || "待补充下一步"}</strong>
                    </div>
                  </td>
                  <td>{record.submissionDate}</td>
                  <td>
                    {record.applicationUrl ? (
                      <a
                        className="tracker-link"
                        href={record.applicationUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        打开链接
                      </a>
                    ) : (
                      <span className="tracker-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="tracker-notes-cell">
                      <span>{record.notes || "—"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="tracker-row-actions">
                      <button
                        className="btn btn-secondary btn-compact"
                        type="button"
                        onClick={() => openEditEditor(record)}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn-secondary btn-compact"
                        type="button"
                        onClick={openDetail}
                      >
                        面试记录
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isEditorOpen ? (
        <div className="tracker-overlay" role="presentation" onClick={closeEditor}>
          <aside
            aria-label={editorMode === "create" ? "新建岗位流程记录" : "编辑岗位流程记录"}
            className="tracker-drawer glass-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tracker-drawer__header">
              <div>
                <span className="badge">{editorMode === "create" ? "新建记录" : "编辑记录"}</span>
                <h2 className="serif-title">
                  {editorMode === "create"
                    ? "新增一条岗位流程"
                    : `${editingRecord?.company || draft.company || "岗位记录"} · 编辑`}
                </h2>
                <p>
                  这里按整行维护状态和上下文，不做单个状态格子的即时改动。
                </p>
              </div>

              <button className="btn btn-secondary btn-compact" type="button" onClick={closeEditor}>
                关闭
              </button>
            </div>

            <div className="tracker-drawer__status">
              <span className={`status-pill status-pill--${draftStatus.tone}`}>{draftStatus.label}</span>
              <p>{draftStatus.description}</p>
            </div>

            <form className="tracker-form" onSubmit={handleSubmit}>
              <div className="tracker-form-grid">
                <label className="tracker-field">
                  <span>公司</span>
                  <input
                    required
                    type="text"
                    value={draft.company}
                    onChange={(event) => updateDraft("company", event.target.value)}
                  />
                </label>

                <label className="tracker-field">
                  <span>岗位</span>
                  <input
                    required
                    type="text"
                    value={draft.roleTitle}
                    onChange={(event) => updateDraft("roleTitle", event.target.value)}
                  />
                </label>

                <label className="tracker-field">
                  <span>部门</span>
                  <input
                    type="text"
                    value={draft.department}
                    onChange={(event) => updateDraft("department", event.target.value)}
                  />
                </label>

                <label className="tracker-field">
                  <span>来源渠道</span>
                  <input
                    type="text"
                    value={draft.sourceChannel}
                    onChange={(event) => updateDraft("sourceChannel", event.target.value)}
                  />
                </label>

                <label className="tracker-field">
                  <span>当前流程</span>
                  <select
                    value={draft.stageKey}
                    onChange={(event) => updateDraft("stageKey", event.target.value as ApplicationRecordDraft["stageKey"])}
                  >
                    {applicationStageOptions.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="tracker-field">
                  <span>当前状态</span>
                  <select
                    value={draft.statusKey}
                    onChange={(event) =>
                      updateDraft("statusKey", event.target.value as ApplicationRecordDraft["statusKey"])
                    }
                  >
                    {applicationStatusOptions.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="tracker-field">
                  <span>投递时间</span>
                  <input
                    required
                    type="date"
                    value={draft.submissionDate}
                    onChange={(event) => updateDraft("submissionDate", event.target.value)}
                  />
                </label>

                <label className="tracker-field">
                  <span>城市</span>
                  <input
                    type="text"
                    value={draft.city}
                    onChange={(event) => updateDraft("city", event.target.value)}
                  />
                </label>
              </div>

              <label className="tracker-field">
                <span>下一步 / 时间</span>
                <input
                  type="text"
                  value={draft.nextStep}
                  onChange={(event) => updateDraft("nextStep", event.target.value)}
                  placeholder="例如：周四前跟进结果、准备二面、等待约面"
                />
              </label>

              <label className="tracker-field">
                <span>投递链接</span>
                <input
                  type="url"
                  value={draft.applicationUrl}
                  onChange={(event) => updateDraft("applicationUrl", event.target.value)}
                  placeholder="允许留空"
                />
              </label>

              <label className="tracker-field">
                <span>备注</span>
                <textarea
                  rows={4}
                  value={draft.notes}
                  onChange={(event) => updateDraft("notes", event.target.value)}
                  placeholder="补充当前判断、提醒事项或需要保留的上下文"
                />
              </label>

              <div className="tracker-form__footnote">
                状态直接覆盖，不保留历史；没有面试记录或没有投递链接时，也允许先建档。
              </div>

              <div className="tracker-form__actions">
                <button className="btn btn-secondary" type="button" onClick={closeEditor}>
                  取消
                </button>
                <button className="btn btn-primary" type="submit">
                  {editorMode === "create" ? "保存记录" : "更新记录"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
