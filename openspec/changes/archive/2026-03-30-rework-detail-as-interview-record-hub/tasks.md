## 1. Rework Route Hierarchy

- [x] 1.1 Define route-family metadata so the first-level navigation only exposes home, detail, and memo
- [x] 1.2 Add or update the shared app-shell tab navigation so detail remains the active branch on workspace routes
- [x] 1.3 Replace legacy bare-workspace fallback behavior with explicit redirect or empty-state handling

## 2. Introduce Interview Record State

- [x] 2.1 Create a dedicated interview-record model that links application pipelines, round metadata, source type, processing state, and optional workspace session identifiers
- [x] 2.2 Prepare representative local or mock data for manual-only, text-upload, audio-upload, parsing, ready, and failed interview-record states
- [x] 2.3 Add provider-level selectors and actions needed to group records by pipeline and determine workspace entry availability

## 3. Replace The Detail Page

- [x] 3.1 Redesign the detail route into a grouped interview-record hub instead of a single-session hero/detail page
- [x] 3.2 Render multiple interview rounds under one application pipeline with clear per-record state and actions
- [x] 3.3 Add the new-record creation surface for manual metadata plus optional text or audio submission

## 4. Align Workspace Entry

- [x] 4.1 Update detail-to-workspace entry points to use explicit record-specific navigation
- [x] 4.2 Update home and memo cross-links so they point to the new detail-hub semantics instead of the legacy mock detail flow
- [x] 4.3 Preserve the existing workspace internals while adapting them to the new detail-owned entry model

## 5. Verify The Flow

- [x] 5.1 Verify the primary tab state on home, detail, memo, and workspace routes
- [x] 5.2 Verify records without parsed sessions stay visible in detail and do not expose invalid workspace actions
- [x] 5.3 Verify grouped multi-round pipelines and representative upload states render correctly with sample data
