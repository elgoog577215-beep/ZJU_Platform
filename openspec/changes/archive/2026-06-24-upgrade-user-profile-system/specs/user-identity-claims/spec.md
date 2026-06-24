## ADDED Requirements

### Requirement: Optional Identity Claims
The system SHALL allow an authenticated user to declare optional personal, team, or club identities for outcome matching.

#### Scenario: User creates personal identity claim
- **WHEN** an authenticated user creates a `person` identity claim with a display name
- **THEN** the claim is saved for that user with a normalized name and a non-public matching status.

#### Scenario: User creates team or club identity claim
- **WHEN** an authenticated user creates a `team` or `club` identity claim with a display name
- **THEN** the claim is saved for that user and can be used to generate competition outcome candidates.

#### Scenario: Guest creates identity claim
- **WHEN** an unauthenticated request creates an identity claim
- **THEN** the system returns 401.

### Requirement: Identity Claim Visibility
The system SHALL expose identity claims only to the owning user and administrators unless a claim is represented through a confirmed public outcome binding.

#### Scenario: Owner lists identity claims
- **WHEN** a user lists their own identity claims
- **THEN** all of their claims are returned with status.

#### Scenario: Visitor cannot list another user's private claims
- **WHEN** a visitor requests private identity claims for another user
- **THEN** the system does not expose private claim management data.
