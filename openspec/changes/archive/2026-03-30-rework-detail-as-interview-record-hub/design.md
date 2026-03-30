## Context

The home page has already been separated into an application-tracker workflow, but the rest of the navigation still carries assumptions from the earlier demo structure. In the current app:

- `HomePage` is built on `applicationRecords`, which represent job applications or role pipelines.
- `DetailPage`, `MemoPage`, and `WorkspacePage` still rely on `dashboardSessions` and `homeLeadSession`, which represent interview-session-oriented data.
- The current `detail` route behaves like a single-session detail page with fallback behavior when no specific session is selected.
- The current `workspace` route can also load fallback data without a stable record-specific entry path, which makes it feel like a top-level destination even though it is really a deep review surface.

The desired information architecture is different:

- The first-level route families should be home, detail, and memo.
- The detail route should become an interview record hub or record center.
- Workspace should remain a deep page used for one specific reviewable interview record.
- Not every interview will have a recording, a transcript, or a parsed workspace session, so the detail hub needs an entity that can exist before workspace is available.

## Goals / Non-Goals

**Goals:**
- Establish a stable first-level navigation model centered on home, detail, and memo.
- Reframe the detail route into a record hub that explains and owns the path into workspace.
- Support interview records that start from manual entry, uploaded text, or uploaded audio.
- Allow one application pipeline to display multiple interview rounds together in the detail hub.
- Keep workspace as the focused page for one record-specific review flow instead of redesigning its internals.

**Non-Goals:**
- Redesign the inner analysis experience of the existing workspace page.
- Fully define long-audio parsing or background processing infrastructure.
- Replace the application-tracker home model or merge it back into a single dashboard page.
- Finalize backend persistence contracts for every new record state in this change.

## Decisions

### 1. Limit the primary navigation to three stable route families

The app will treat home, detail, and memo as the only first-level destinations exposed through the shared tab-like navigation. Workspace remains part of the detail route family rather than becoming its own first-level tab.

Why:
- These three destinations map cleanly to the user's mental model of the product.
- `workspace` is only meaningful when tied to a specific interview record.
- Stable first-level destinations make the active-tab state understandable.

Alternatives considered:
- Keep workspace as a fourth top-level tab. Rejected because it creates a route that has no stable independent meaning without a selected record.
- Collapse detail into home and keep only home plus memo. Rejected because the user wants a dedicated total-detail or record-center page for interview records.

### 2. Replace the current detail page with an interview record hub

The detail route will no longer behave as a single mock detail page for one session. Instead, it will become a catalog-style page that lists interview records, their readiness states, and the actions available for each record.

Why:
- The current detail page does not explain the overall record set or how to reach workspace consistently.
- A record hub fits the desired product direction of "total detail page" better than a hero-style one-object page.
- This gives the app a clear middle layer between the application tracker and the deep workspace review page.

Alternatives considered:
- Keep the current detail page and only restyle it. Rejected because the main issue is page responsibility, not just presentation.
- Send users directly from home into workspace. Rejected because not every interview has a reviewable session and the product needs a place to manage upload and record states.

### 3. Introduce an interview-record entity between application pipelines and workspace sessions

The detail hub should be backed by a dedicated interview-record model. Each interview record belongs to one application pipeline and can represent a manual note, a text-backed record, an audio-backed record, or a parsed workspace-backed record. A record may optionally reference a workspace session identifier once parsing or import is complete.

Representative fields likely include:
- parent application or pipeline identifier
- company, role, department, and round label or round number
- interview date or scheduled date
- source type such as manual, text, or audio
- processing state such as draft, uploaded, parsing, ready, or failed
- optional `sessionKey` for workspace-backed items

Why:
- `ApplicationRecord` is too coarse because one pipeline can contain multiple rounds.
- `ApiSession` is too narrow because not every interview record has a parsed session yet.
- A bridging record model lets the detail page exist independently from workspace readiness.

Alternatives considered:
- Reuse `ApplicationRecord` rows as workspace entries. Rejected because it collapses pipeline tracking and per-round review into the same entity.
- Reuse `ApiSession` as the only detail-page item. Rejected because it excludes manual-only or pending-upload interview records.

### 4. Group the detail hub by application pipeline and round sequence

The detail route will present records grouped under a pipeline heading such as company plus role or department, then show interview records within that group in round order.

Why:
- The user needs to see one department's first round, second round, and third round as related items.
- Grouping by pipeline preserves context without hiding per-round actions.
- This structure makes it easier to add new rounds later without fragmenting the page into disconnected cards.

Alternatives considered:
- Flat reverse-chronological record list. Rejected because it makes multi-round progression harder to scan.
- Group only by company. Rejected because the existing home spec already treats one role pipeline as the primary unit, and the detail hub should align with that.

### 5. Make record-specific workspace paths canonical

The detail hub will route reviewable items into a record-specific workspace path, such as `workspace/:sessionKey`, while non-ready records remain in the detail flow with upload, parsing, or completion actions. If a bare workspace route is retained for compatibility, it should redirect to a safe detail-owned state or show an explicit empty state rather than silently falling back to an arbitrary first record.

Why:
- Workspace is only meaningful for a concrete record.
- Record-specific deep links are easier to reason about than fallback-driven routing.
- Removing silent fallback behavior reduces confusion and accidental context switching.

Alternatives considered:
- Keep the current fallback behavior that loads the first available session. Rejected because it hides state and makes the route semantics unstable.
- Force every record to create a session immediately. Rejected because the product explicitly needs records without recordings or parsed sessions.

## Risks / Trade-offs

- [The current provider mixes application data and interview-session data] -> Introduce a separate interview-record state path so the new detail hub does not depend on mock single-session detail assumptions.
- [Primary-tab behavior can become ambiguous on deep routes] -> Define route-family matching explicitly so workspace still highlights the detail branch.
- [Audio upload and parsing are not fully implemented yet] -> Represent upload and parsing as explicit UI states so the product flow can ship before the backend workflow is complete.
- [There may be legacy deep links to bare workspace routes] -> Preserve compatibility with redirect or empty-state handling during migration instead of silently opening unrelated data.

## Migration Plan

1. Introduce route-family metadata and shared first-level navigation for home, detail, and memo.
2. Add a dedicated interview-record model and sample or local-state data that covers manual, text, audio, parsing, and ready states.
3. Replace the current detail page with the grouped interview-record hub experience.
4. Update workspace entry logic so the canonical deep path is tied to a concrete record or session.
5. Update cross-page entry points from home and memo so they land in the new detail hub semantics.

Rollback strategy:
- Restore the existing detail-page implementation and prior route matching if the new hub proves too disruptive.
- Because the change introduces a new front-end-oriented record layer rather than mutating persisted application rows, rollback can revert UI wiring without requiring data migration.

## Open Questions

- Should the public home URL remain `/` while the product label remains "homepage", or should the route surface also add a `/homepage` alias?
- If bare `/workspace` is kept temporarily, should it redirect to `/detail`, to a detail substate, or show an explicit empty-state screen?
- What minimum fields are required to create a new interview record in v1: round label only, or also date, source type, and parent pipeline selection?
