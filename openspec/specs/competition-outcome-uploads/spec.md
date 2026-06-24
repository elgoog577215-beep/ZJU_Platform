# competition-outcome-uploads Specification

## Purpose
TBD - created by archiving change enhance-competition-outcome-uploads. Update Purpose after archive.
## Requirements
### Requirement: Competition outcomes must support a featured reusable competition

The system SHALL support multiple competitions and SHALL expose one featured competition as the public competition outcome page source.

#### Scenario: Public page loads featured competition

- **WHEN** a visitor opens the competition outcome page
- **THEN** the page SHALL request the current featured competition outcome data
- **AND** the page SHALL render that competition's approved promo videos, stage photos, and works.

#### Scenario: Administrator switches featured competition

- **WHEN** an administrator marks a competition as featured
- **THEN** the system SHALL make that competition the only featured competition
- **AND** future public outcome page loads SHALL use the newly featured competition.

### Requirement: External users must submit competition outcomes for review

Authenticated non-admin users SHALL be able to submit outcome content to the current featured competition, and submitted content SHALL enter a pending review state before public display.

#### Scenario: External user submits stage photo

- **WHEN** an authenticated non-admin user uploads a stage photo from the public outcome page
- **THEN** the system SHALL create a `stage_photo` competition media record with `status = pending`
- **AND** the photo MUST NOT appear on the public outcome page before approval.

#### Scenario: External user submits promo video

- **WHEN** an authenticated non-admin user uploads a competition promo video from the public outcome page
- **THEN** the system SHALL create a `promo_video` competition media record with `status = pending`
- **AND** the video MUST NOT appear on the public outcome page before approval.

#### Scenario: External user submits excellent work

- **WHEN** an authenticated non-admin user submits an excellent work form
- **THEN** the system SHALL require work title, author, summary, and Git URL
- **AND** the system SHALL create a competition work record with `status = pending`
- **AND** the work MUST NOT appear on the public outcome page before approval.

### Requirement: Administrators must manage and review competition outcomes

Administrators SHALL be able to create competitions, manage outcome media and works, and approve or reject user submissions one item at a time.

#### Scenario: Admin approves submitted media

- **WHEN** an administrator approves a pending competition media record
- **THEN** the system SHALL set `status = approved`
- **AND** store reviewer and review timestamp
- **AND** the media SHALL become eligible for public display under its competition.

#### Scenario: Admin rejects submitted work

- **WHEN** an administrator rejects a pending competition work record with a reason
- **THEN** the system SHALL set `status = rejected`
- **AND** store the rejection reason
- **AND** the work MUST NOT appear on the public outcome page.

#### Scenario: Admin uploads outcome content

- **WHEN** an administrator creates competition media or work content from the admin console
- **THEN** the system SHALL default the content to approved unless the administrator explicitly saves it as pending.

### Requirement: Competition outcome uploads must use a unified public entry

The public competition outcome page SHALL provide a single upload entry that lets authenticated users choose whether they are submitting a promo video, stage photo, or excellent work.

#### Scenario: User opens upload entry

- **WHEN** a user clicks the public upload entry
- **THEN** the upload UI SHALL present the three submission types: promo video, stage photo, and excellent work
- **AND** the form SHALL show only fields relevant to the selected type.

#### Scenario: Visitor is not authenticated

- **WHEN** an unauthenticated visitor attempts to submit competition outcome content
- **THEN** the system SHALL require login before accepting the submission
- **AND** no pending record SHALL be created.

### Requirement: Approved competition outcomes must remain separate from global resources

Approved competition promo videos, stage photos, and works SHALL display only in competition outcome experiences unless an administrator separately creates global resources.

#### Scenario: Approved competition photo is public

- **WHEN** a competition stage photo is approved
- **THEN** it SHALL appear in the relevant competition outcome page
- **AND** it SHALL NOT automatically appear in the global gallery page.

#### Scenario: Approved competition promo video is public

- **WHEN** a competition promo video is approved
- **THEN** it SHALL appear in the relevant competition outcome page
- **AND** it SHALL NOT automatically appear in the global videos page.

