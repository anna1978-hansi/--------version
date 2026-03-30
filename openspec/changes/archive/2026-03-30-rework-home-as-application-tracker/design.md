## Context

The current home page is built around `DashboardSessionCard` data that blends interview review context, mock company metadata, action summaries, and entry points into detailed review pages. This creates a presentation-heavy experience that is useful for demos but not for the user's day-to-day tracking workflow.

The clarified product boundary is different:
- The home page is a dense operating surface for job application and role pipeline tracking.
- Interview review is a separate workflow and must not shape the home page information architecture.
- A single company may appear multiple times because each row represents a distinct role pipeline.
- A record may exist before any interview happens.

There is also an existing technical mismatch: current backend session data represents parsed interview conversations and does not contain the fields needed for an application tracker home. The design therefore needs to separate the home page data model from interview review sessions instead of continuing to project session data into the home page.

## Goals / Non-Goals

**Goals:**
- Make the home page primarily a dense application tracker table.
- Define the home page row as one application or role pipeline.
- Support a workflow where users can create and inspect records before any interview review data exists.
- Keep the core operational fields front and center so the page answers “what have I applied to, what stage is it in, and what needs attention”.
- Preserve room for lightweight aggregate statistics without introducing another hero-style information layer.
- Route record updates through row-level editing flows rather than inline single-cell editing.

**Non-Goals:**
- Redesign the interview review workspace or merge it back into the home page.
- Introduce status history or audit history for each row.
- Add batch selection or batch status updates in this change.
- Define the long-term persistence backend in full detail if the first implementation uses a front-end store or mock source.
- Recreate narrative content blocks such as large hero panels, timeline storytelling, or platform marketing copy on the new home page.

## Decisions

### 1. Separate the application tracker data model from interview review sessions

The home page will no longer treat `ApiSession` or `DashboardSessionCard` as its primary domain object. Instead, it will use an application-tracker record model with fields oriented around company, role, pipeline status, next action, submission date, optional link, and notes.

Why:
- The session model describes recorded interviews, not recruiting pipelines.
- The current mapping relies on static blueprint data and does not match the real product need.
- Decoupling allows records to exist before interviews and allows multiple roles per company.

Alternatives considered:
- Keep reusing interview sessions and enrich them with more presentation fields. Rejected because it keeps the wrong primary entity and forces the home page to depend on review lifecycle data.
- Hide review concepts in the UI while keeping the same underlying model. Rejected because the data mismatch would remain and would continue to constrain later features.

### 2. Make the table the primary page structure

The main content of the home page will be a dense table of application records. Aggregate statistics may exist as compact summary chips or counters, but the page must be visually anchored by the table rather than by hero content or editorial cards.

Why:
- The user needs operational scanning, not storytelling.
- The page must support fast comparison across many companies and roles.
- Dense layout is the main value proposition of the new home page.

Alternatives considered:
- Keep a large summary section above the table. Rejected because it repeats information and reduces useful density.
- Split the page into multiple card sections for schedule, updates, and all records. Rejected because it fragments one coherent workflow.

### 3. Treat each row as one role pipeline

Each table row represents one application for one role or team. The system must allow multiple rows with the same company name when the user applies to multiple openings.

Why:
- Company-level grouping is not granular enough for real interview tracking.
- Different roles at the same company often have different status, timing, and outcome.

Alternatives considered:
- One row per company with nested roles. Rejected for the initial design because it obscures the primary unit the user wants to track.

### 4. Use row-level editing instead of inline cell editing

Users will change state and maintain related row data by opening a row-level editing surface rather than by clicking directly on a status cell in the table. The editing surface can be implemented as a dedicated detail route or a drawer, but it must preserve the row as the editing unit.

Why:
- Status changes are tied to the rest of the row context.
- Row-level editing reduces accidental edits and keeps the table itself focused on scanning.
- This matches the user's preference that each row be handled as one unified item.

Alternatives considered:
- Inline cell editing for status only. Rejected because it optimizes for speed at the cost of row cohesion.
- Modal editing only. Partially acceptable, but a route or drawer gives better room for future metadata without blocking the table.

### 5. Default to showing ended records

Rejected, passed, and ended pipelines remain visible in the default table view. Filtering may later help narrow the list, but the default view should reflect the full current corpus of tracked applications.

Why:
- The user wants holistic tracking, not only active work.
- Ended rows still contribute to personal statistics and recall.

Alternatives considered:
- Hide ended records by default. Rejected because it makes totals and recall less trustworthy.

## Risks / Trade-offs

- [Home page and review pages share state utilities today] -> Introduce a dedicated application tracker state path so the home page can evolve without breaking review flows.
- [The backend does not yet expose application tracking fields] -> Define the application record model explicitly and allow the first implementation to use a front-end source that can later be persisted.
- [Dense tables can become unreadable on smaller screens] -> Design the record fields with priority ordering and allow a compact responsive treatment rather than forcing every column into the same mobile viewport.
- [Human-readable statuses can become hard to aggregate] -> Separate display labels from aggregate status grouping so totals remain stable while labels stay intuitive.

## Migration Plan

1. Introduce the new application tracker capability and spec without changing the review workflow.
2. Replace the current home page composition with a table-first record view backed by an application record source.
3. Remove or demote legacy hero, activity, and platform summary content from the home route.
4. Keep review pages available as separate routes while the home page stops depending on interview session semantics.
5. If implementation needs staged rollout, keep sample application data available until a real persistence layer is introduced.

Rollback strategy:
- Restore the existing home page component and previous provider wiring if the tracker view proves unusable.
- Because the change separates data models instead of mutating stored interview sessions, rollback does not require data migration.

## Open Questions

- Should row editing open a dedicated route, a side drawer, or a lightweight details panel in the first implementation?
- Which human-readable status labels should ship in v1 for pre-interview states such as “已投递” versus “待捞取”?
- Which columns must always stay visible on smaller screens, and which can collapse into the row detail surface?
