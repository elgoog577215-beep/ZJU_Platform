## ADDED Requirements

### Requirement: Two administrator tiers share the existing console

The system SHALL use the same operational modules for developer and regular administrators, with configurable grants for overview, events, content including community, review, projects, partners, taxonomy and public pages.

#### Scenario: A regular administrator receives standard access

- **WHEN** a developer administrator selects the regular administrator role
- **THEN** the editor defaults to all implemented operational grants, which can be individually removed.

#### Scenario: A module is not granted

- **WHEN** the user opens an unauthorized deep link or invokes its management API
- **THEN** the console does not mount that module and the API denies elevated operations independently of navigation.

### Requirement: Privacy and system administration remain protected

The system SHALL reserve private account management, access grants, registration details, credentials, complete audit logs, model and system configuration for developer administrators.

#### Scenario: An operator calls a private endpoint

- **WHEN** a regular administrator calls a protected platform endpoint
- **THEN** the request is rejected before its controller executes.

#### Scenario: An operator changes public page copy

- **WHEN** a regular administrator with page permission changes an allowlisted page field
- **THEN** the change is accepted
- **AND** attempts to change credentials or other system fields are rejected.

#### Scenario: An operator views project moderation or the overview

- **WHEN** the corresponding operational module is granted
- **THEN** project contacts, reporter details, system internals and complete audit information are excluded.

### Requirement: Content management preserves ownership and domain grants

The system SHALL authorize content management by resource capability while preserving existing publisher attribution and limiting review queues to permitted resource types.

#### Scenario: An operator edits another publisher's event

- **WHEN** the event module is granted and the existing publisher is retained in the editor
- **THEN** the event is updated without replacing its publisher with the operator's personal identity.

#### Scenario: Only event management is granted

- **WHEN** the operator opens the review queue or attempts article management
- **THEN** the review queue contains only events and article management is denied.

### Requirement: Access changes are immediate and atomic

The system SHALL refresh database authority on every request and atomically commit access changes with audit records, rejecting stale edits and self access changes.

#### Scenario: A module grant is revoked

- **WHEN** a developer administrator removes a grant
- **THEN** the old token cannot authorize its next request for that module
- **AND** the console refreshes visible capabilities on focus or within 15 seconds.

#### Scenario: Sessions are revoked or identity lookup fails

- **WHEN** the session generation mismatches or the database cannot be read
- **THEN** the request is denied without JWT privilege fallback.

#### Scenario: An audit write fails or an edit is stale

- **WHEN** the audit write fails or the submitted access version is stale
- **THEN** the permission change does not persist.

### Requirement: Administrator access and migration recovery are preserved

The system SHALL preserve at least one developer administrator and verify a private snapshot before migrating an existing file database.

#### Scenario: Two administrators concurrently revoke each other

- **WHEN** both changes race
- **THEN** at most one succeeds and a developer administrator remains.

#### Scenario: An existing database is migrated

- **WHEN** the migration runs for the first time
- **THEN** backup verification precedes transactional changes and existing platform access is retained
- **AND** backup failure stops startup.

#### Scenario: The server restarts after grants were removed

- **WHEN** the migration runs again
- **THEN** it does not recreate revoked grants.
