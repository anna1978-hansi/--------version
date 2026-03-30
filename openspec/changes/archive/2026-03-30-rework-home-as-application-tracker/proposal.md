## Why

The current home page is optimized for presentation and interview review entry points, but the user's primary daily need is to track job applications and interview pipeline progress at a glance. The project needs a denser, table-first home experience that treats application tracking as its own workflow instead of mixing it with interview review content.

## What Changes

- Replace the current presentation-heavy home page structure with a table-first application tracker workspace.
- Redefine the primary home page record as a single job application or role pipeline, not a single interview review session.
- Support multiple rows for the same company when the user applies to multiple roles or teams.
- Allow records to exist before any interview occurs, including records with only company, role, submission metadata, and optional link information.
- Keep ended and rejected records visible in the default table view so the user can inspect the full pipeline without switching contexts.
- Move state changes to row-level editing flows instead of inline single-cell status toggles on the home page.
- Treat interview review and recording analysis as separate downstream pages, not as part of the home page information architecture.
- Remove or demote low-value homepage content such as large hero messaging, narrative summary cards, and activity sections that compete with dense operational information.

## Capabilities

### New Capabilities
- `application-tracker-home`: A table-first home workspace for managing application records, statuses, pipeline progress, and summary statistics independently from interview review content.

### Modified Capabilities
- None.

## Impact

- Affects the front-end home page layout, navigation emphasis, and dashboard state composition.
- Requires a dedicated application-tracking data model distinct from interview review sessions.
- Will likely affect the provider layer, sample/mock data structure, and any future persistence contract used by the home page.
- Clarifies product boundaries between the home tracking experience and the separate interview review workflow.
