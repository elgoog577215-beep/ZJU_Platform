# user-competition-outcomes Specification

## Purpose
TBD - created by archiving change upgrade-user-profile-system. Update Purpose after archive.
## Requirements
### Requirement: User Competition Work Binding
The system SHALL expose user-scoped competition works using confirmed identity binding relationships, not `competition_works.uploader_id`, as ownership.

#### Scenario: Matching creates candidate only
- **WHEN** a competition work text matches a user's personal, team, or club identity claim
- **THEN** the system creates a candidate binding
- **AND** the binding is not publicly treated as ownership until confirmed.

#### Scenario: Owner confirms candidate work
- **WHEN** the owner confirms a candidate binding
- **THEN** the competition work is associated with that user for profile display.

#### Scenario: Owner rejects candidate work
- **WHEN** the owner rejects or revokes a binding
- **THEN** the competition work is not associated with that user for profile display.

#### Scenario: Visitor sees approved work only
- **WHEN** a visitor requests another user's competition works
- **THEN** only confirmed, approved, public, non-deleted works are included.

#### Scenario: Owner sees binding states
- **WHEN** the owner requests their competition outcome bindings
- **THEN** candidate, confirmed, rejected, and revoked binding states are visible to that owner.

