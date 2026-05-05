## ADDED Requirements

### Requirement: Unified Assistant Overview

The system SHALL expose an admin-only overview for the unified AI assistant platform.

#### Scenario: Admin opens the AI assistant workspace

- **GIVEN** an authenticated admin
- **WHEN** the admin opens the AI assistant workspace
- **THEN** the system returns assistant modules including event recommendation, event governance, content parsing, and model configuration
- **AND** each module includes a status, description, and primary entrance information

### Requirement: Event Governance Scan

The system SHALL let admins scan the event database for classification and metadata improvement suggestions without mutating event records.

#### Scenario: Admin scans the event library

- **GIVEN** an authenticated admin
- **WHEN** the admin runs an event governance scan
- **THEN** the system reads non-deleted events
- **AND** produces suggestions for supported fields such as category, tags, and target audience
- **AND** each suggestion includes current value, suggested value, confidence, and reason
- **AND** no existing event record is changed by the scan

### Requirement: Event Governance Apply

The system SHALL let admins apply selected event governance suggestions safely.

#### Scenario: Admin applies selected suggestions

- **GIVEN** an authenticated admin and a completed governance scan
- **WHEN** the admin applies selected suggestions
- **THEN** the system updates only whitelisted event fields
- **AND** skips a suggestion if the event value has changed since the scan
- **AND** records applied, skipped, and failed counts
- **AND** stores enough before/after information for audit review

### Requirement: Assistant Traceability

The system SHALL store assistant run records and suggestion records for admin-side governance work.

#### Scenario: Governance scan creates records

- **GIVEN** an authenticated admin
- **WHEN** the admin runs a governance scan
- **THEN** the system stores a run record
- **AND** stores suggestion records linked to that run
- **AND** records confidence, reason, status, and timestamps

### Requirement: Model Configuration Integration

The unified assistant workspace SHALL include the existing AI model key management capability.

#### Scenario: Admin manages model keys from the assistant workspace

- **GIVEN** an authenticated admin
- **WHEN** the admin opens model configuration inside the AI assistant workspace
- **THEN** the existing model key management functions remain available
- **AND** configured model providers are reflected in assistant overview health

### Requirement: Recommendation Compatibility

The existing user-facing event recommendation assistant SHALL keep its current API compatibility.

#### Scenario: User requests event recommendations

- **GIVEN** a user on the events assistant interface
- **WHEN** the user asks for recommendations
- **THEN** the existing recommendation endpoint continues to return recommendations
- **AND** this change does not require frontend callers to change request shape
