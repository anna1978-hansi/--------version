## Why

The app now has a clearer table-first home page, but the route hierarchy and downstream review pages still reflect an older demo-oriented structure. The `detail` route still behaves like a single mock session detail, while `workspace` can feel like a peer page instead of a record-specific deep page, which makes the main tabs and page responsibilities hard to understand.

The product direction is now clearer: the first-level destinations should be home, detail, and memo, while workspace should sit underneath detail as the deep review surface for a specific interview record. To support that, the detail route needs to become a real interview record hub instead of a placeholder detail page.

## What Changes

- Define the app's first-level navigation around three stable destinations: home, detail, and memo.
- Treat workspace as a secondary route owned by the detail branch instead of as a first-level tab destination.
- Reframe the detail route from a single mock detail page into an interview record hub that lists review records and review entry points.
- Add grouped interview record presentation so one application pipeline can show first-round, second-round, and later interview records together.
- Add interview record creation flows that support manual metadata plus optional text or audio input, without requiring every interview record to have a parsed recording.
- Use explicit record-specific workspace entry paths for reviewable items while preserving the existing workspace page as the deep review surface.

## Capabilities

### New Capabilities
- `primary-navigation-tabs`: Stable first-level navigation for home, detail, and memo, with workspace treated as part of the detail route family.
- `interview-record-hub`: A detail-page record center that groups interview records by pipeline, supports adding new records, and routes record-backed items into workspace.

### Modified Capabilities
- None.

## Impact

- Affects front-end routing, app-shell navigation, and route-to-tab matching behavior.
- Requires replacing the current detail-page semantics and likely introducing a dedicated interview-record model between application records and workspace sessions.
- Affects page entry points from home and memo because they should target the new detail hub rather than the legacy single-session detail page.
- Influences future upload/parsing contracts for text and audio-backed interview records, even if the first implementation uses local or mock state.
