## ADDED Requirements

### Requirement: Home page SHALL use an application-tracker table as its primary workspace
The system SHALL present the home page as a dense table-first workspace for tracking application and interview pipeline progress. The table MUST be the dominant content area of the page, and any aggregate statistics shown on the page MUST remain visually subordinate to the table.

#### Scenario: User opens the home page
- **WHEN** the user navigates to the home route
- **THEN** the page shows a table of application records as the primary interface
- **THEN** the page does not rely on large hero content or narrative dashboard sections to convey the main workflow

### Requirement: Each application record SHALL represent one role pipeline
The system SHALL model each home page row as one application or role pipeline. It MUST allow multiple rows with the same company name when they correspond to different roles, teams, or independent application processes.

#### Scenario: Same company, different roles
- **WHEN** the user tracks two different roles at the same company
- **THEN** the system stores and displays them as separate rows
- **THEN** each row can maintain its own status, timeline, and metadata independently

### Requirement: The tracker SHALL support records before any interview occurs
The system SHALL allow users to create and maintain application records before any interview review session exists. Application link fields MUST be optional, and records without a link MUST still be valid.

#### Scenario: User records a fresh application
- **WHEN** the user creates a record for a newly submitted application that has no interview review data yet
- **THEN** the system accepts the record without requiring an interview session
- **THEN** the system allows the record to omit an application link
- **THEN** the record can use an early-stage status such as submitted or waiting to be picked up

### Requirement: The tracker SHALL surface core operational fields for each row
The system SHALL prioritize fields that let the user scan overall pipeline progress. At minimum, the record experience MUST support company, role or department, current status, current pipeline stage, next step or next time, submission date, optional application link, and notes.

#### Scenario: User scans the table for current context
- **WHEN** the user reviews rows on the home page
- **THEN** the table exposes the core operational fields needed to compare companies and pipelines quickly
- **THEN** missing optional data such as links does not prevent the rest of the row from being displayed

### Requirement: The home page SHALL include aggregate counts without hiding ended records
The system SHALL provide overall statistics for the tracked application corpus while keeping ended, rejected, and completed records visible in the default table view.

#### Scenario: User checks totals with historical rows still visible
- **WHEN** the user views the default home page table
- **THEN** active and ended records are both included in the visible dataset unless the user later applies a filter
- **THEN** the page can summarize totals such as total tracked applications and status-group counts across that dataset

### Requirement: Record updates SHALL be performed through row-level editing
The system SHALL let the user open a row-level editing flow to update status and related pipeline fields. The home page MUST not require inline single-cell status editing as the primary editing interaction.

#### Scenario: User changes the status of one application row
- **WHEN** the user chooses to update a record from the table
- **THEN** the system opens a row-level editing surface for that record
- **THEN** the user can review the rest of the row context before saving the new status
