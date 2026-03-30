## ADDED Requirements

### Requirement: The app SHALL expose home, detail, and memo as the only first-level navigation destinations
The system SHALL provide the application's shared first-level tab navigation around the home route, the detail route, and the memo route. The system MUST NOT present workspace as a peer first-level tab destination.

#### Scenario: User views the primary app navigation
- **WHEN** the user opens the application shell
- **THEN** the visible first-level destinations are home, detail, and memo
- **THEN** workspace is not shown as a separate first-level tab

### Requirement: The app SHALL treat workspace as part of the detail route family
The system SHALL resolve workspace routes as belonging to the detail navigation branch. A record-specific workspace route MUST preserve the detail branch as the active primary context.

#### Scenario: User opens a record-specific workspace
- **WHEN** the user navigates to a workspace route for a specific interview record
- **THEN** the application treats that route as part of the detail branch
- **THEN** the primary navigation keeps the detail destination active

### Requirement: The app SHALL provide a record-specific deep path for workspace access
The system SHALL support workspace access through a record-specific or session-specific route so the current review context is explicit in the URL.

#### Scenario: User enters workspace from the detail hub
- **WHEN** the user chooses a reviewable interview record from the detail route
- **THEN** the application navigates to a workspace URL that identifies the target record or session
- **THEN** the destination does not rely on silently choosing an unrelated default record
