## ADDED Requirements

### Requirement: The detail route SHALL act as an interview record hub
The system SHALL present the detail route as a catalog-style interview record hub instead of a single mock session detail page. The hub MUST show the set of interview records and the actions available for each record.

#### Scenario: User opens the detail route
- **WHEN** the user navigates to the detail route
- **THEN** the page shows a list or grouped catalog of interview records
- **THEN** the page does not assume that one default session detail is the only thing to display

### Requirement: The interview record hub SHALL group records under application pipelines
The system SHALL organize interview records under their parent application pipeline so multiple rounds for the same role or department appear together. Each interview record MUST remain independently addressable within that grouped presentation.

#### Scenario: One role pipeline has multiple interview rounds
- **WHEN** the user has first-round, second-round, and later interview records for the same application pipeline
- **THEN** the detail route shows those records under the same pipeline grouping
- **THEN** each round still exposes its own status and available actions

### Requirement: Interview records SHALL support creation without requiring a parsed recording
The system SHALL allow the user to create an interview record before a parsed workspace session exists. The creation flow MUST support manual metadata entry and MAY additionally accept text or audio input without making either one mandatory for every record.

#### Scenario: User records an interview that has no transcript yet
- **WHEN** the user creates a new interview record with round metadata but without a parsed session
- **THEN** the system stores and displays that record in the detail hub
- **THEN** the record remains valid even though no workspace session is available yet

### Requirement: The hub SHALL expose readiness-specific actions for each interview record
The system SHALL distinguish between records that are ready for workspace review and records that are still manual, uploading, parsing, or failed. A record that is not ready for workspace MUST expose a non-workspace action state instead of a broken workspace link.

#### Scenario: User sees mixed record states in the detail hub
- **WHEN** one interview record has a workspace-backed session and another is still pending upload or parsing
- **THEN** the ready record exposes an action that enters workspace
- **THEN** the pending record exposes a status or follow-up action that does not navigate into an unavailable workspace
