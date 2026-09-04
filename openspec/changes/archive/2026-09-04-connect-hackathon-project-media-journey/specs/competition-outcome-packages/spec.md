## MODIFIED Requirements

### Requirement: External submissions must bind to current package and await review

External user submissions SHALL bind to the selected event package at submit time and SHALL require admin approval before public display. An external work submission SHALL also bind to a project owned by the submitter; photo and video submissions remain event-media records and do not require a project.

#### Scenario: External user submits while package A is selected

- **WHEN** an authenticated non-admin user submits a stage photo or promo video to package A
- **THEN** the new media relation SHALL be created under package A
- **AND** its status SHALL be `pending`
- **AND** it SHALL NOT appear publicly before approval.

#### Scenario: External user submits a project work

- **WHEN** an authenticated non-admin user submits a work to package A with an owned project
- **THEN** the new work SHALL be created under package A
- **AND** its `project_id` SHALL reference the selected project
- **AND** its status SHALL be `pending` unless the submitter has an existing review-bypass permission
- **AND** it SHALL NOT appear publicly before approval.

#### Scenario: Current package changes before approval

- **GIVEN** a user submitted content to package A
- **WHEN** an administrator switches current display to package B before approving it
- **THEN** approving that content SHALL keep it under package A
- **AND** it SHALL not appear publicly while package B is current display.

## ADDED Requirements

### Requirement: Public outcome works expose safe project references

The public competition outcome response SHALL expose a linked project's stable id and public title only when the work is approved, public consent is enabled, and the linked project is published.

#### Scenario: Approved linked work

- **WHEN** an approved public work is linked to a published project
- **THEN** the public work response SHALL include `project_id` and `project_title`
- **AND** SHALL NOT include project contact fields or internal review fields.

#### Scenario: Unlinked or non-public project

- **WHEN** a public work has no project relation or its project is not published
- **THEN** the work snapshot SHALL remain visible according to its own review state
- **AND** the public response SHALL omit the project reference.

### Requirement: Hackathon outcome page leads into the project journey

The public hackathon outcome page SHALL provide event-scoped actions for browsing submitted projects and submitting an owned project.

#### Scenario: Browse event projects

- **WHEN** a visitor selects the event project action
- **THEN** the system SHALL open `/projects?competition=<competition-slug>`.

#### Scenario: Start project submission

- **WHEN** a logged-in user selects the submission action
- **THEN** the system SHALL open the work submission flow for the current event
- **AND** the flow SHALL offer owned projects or a path to create one in the event-scoped project plaza.

### Requirement: Registration and outcome views remain reachable

The public hackathon route SHALL preserve both the registration view and the outcome view for every event that enables them.

#### Scenario: Visitor opens the hackathon route without a view

- **WHEN** a visitor opens `/hackathon` for an event whose registration view is enabled
- **THEN** the system MUST open the registration view
- **AND** the registration form MUST remain visible even when an outcome package already exists.

#### Scenario: Visitor switches from outcome to registration

- **WHEN** a visitor is viewing the event outcome
- **THEN** a visible registration/outcome switch MUST remain available
- **AND** choosing registration MUST preserve the current `event` context.

### Requirement: Event media exposes live and curated projections

The public outcome response SHALL expose approved event photos as both a latest-first live stream and an operator-curated selection without duplicating media records.

#### Scenario: Approved archive photo enters the live stream

- **WHEN** an approved event photo has relation role `archive`
- **THEN** it MUST appear in `media.live_photos`
- **AND** it MUST NOT appear in `media.featured_photos`.

#### Scenario: Operator selects a highlight

- **WHEN** an administrator changes an event photo relation from `archive` to `highlight`
- **THEN** the same photo MUST remain in `media.live_photos`
- **AND** it MUST also appear in `media.featured_photos`
- **AND** the operation MUST NOT copy the photo or create a second media record.

#### Scenario: Live stream ordering

- **WHEN** multiple approved event photos are returned
- **THEN** `media.live_photos` MUST order them by capture/upload creation time newest first
- **AND** `media.featured_photos` MUST honor operator sort order before creation time.
