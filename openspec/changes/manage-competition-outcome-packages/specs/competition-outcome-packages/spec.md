# competition-outcome-packages Spec

## ADDED Requirements

### Requirement: Competition package must be the atomic outcome unit

The system SHALL treat one competition package as the complete collection of outcome data for one competition, including promo videos, stage photos, excellent works, and review state.

#### Scenario: Admin views a competition package

- **WHEN** an administrator opens outcome management
- **THEN** each competition package SHALL be shown as a container for that package's promo videos, stage photos, works, and pending review items.
- **AND** child media/work items SHALL remain associated with their package by `competition_id`.

#### Scenario: Admin creates an empty competition package

- **WHEN** an administrator creates a competition package with metadata only
- **THEN** the package SHALL exist with zero promo videos, zero stage photos, zero works, and zero pending items.

### Requirement: Public outcome pages must show exactly one current package

The public competition outcome experiences SHALL load only the current display package and SHALL NOT mix content from multiple packages.

#### Scenario: Current package is displayed publicly

- **WHEN** a visitor opens `/hackathon/showcase`
- **THEN** the page SHALL render the current display package metadata
- **AND** only approved promo videos, stage photos, and works whose `competition_id` belongs to that package.

#### Scenario: Works page uses same current package

- **WHEN** a visitor opens `/hackathon/works`
- **THEN** the page SHALL render only approved works from the same current display package.

#### Scenario: Package with no approved content

- **WHEN** the current package has no approved promo videos, photos, or works
- **THEN** public pages SHALL show empty states instead of demo data or content from another package.

### Requirement: Admin can select the current display package

Administrators SHALL be able to mark one competition package as the current public display package.

#### Scenario: Admin switches current package

- **WHEN** an administrator sets package B as current display
- **THEN** package B SHALL become the only current display package
- **AND** package A SHALL no longer be current display
- **AND** no media/work records SHALL be moved between packages.

#### Scenario: Admin deletes current package

- **WHEN** an administrator deletes the current display package
- **THEN** that package and its child outcomes SHALL be hidden from public pages
- **AND** the system SHALL NOT automatically mix in another package's content unless another package is explicitly selected as current display.

### Requirement: Admin-created outcomes must bind to the selected package

Admin media and work creation SHALL require a selected competition package and SHALL bind new records to that package.

#### Scenario: Admin uploads a stage photo to package A

- **WHEN** an administrator selects package A and uploads a stage photo
- **THEN** the created media record SHALL have `competition_id = package A id`
- **AND** the photo SHALL only be eligible for public display when package A is current display and the photo is approved.

#### Scenario: Admin uploads an excellent work to package B

- **WHEN** an administrator selects package B and creates an excellent work
- **THEN** the created work record SHALL have `competition_id = package B id`
- **AND** it SHALL NOT appear when package A is current display.

### Requirement: External submissions must bind to current package and await review

External user submissions SHALL bind to the current display package at submit time and SHALL require admin approval before public display.

#### Scenario: External user submits while package A is current

- **WHEN** an authenticated non-admin user submits a stage photo, promo video, or excellent work
- **THEN** the new record SHALL be created under package A
- **AND** its status SHALL be `pending`
- **AND** it SHALL NOT appear publicly before approval.

#### Scenario: Current package changes before approval

- **GIVEN** a user submitted content to package A
- **WHEN** an administrator switches current display to package B before approving it
- **THEN** approving that content SHALL keep it under package A
- **AND** it SHALL not appear publicly while package B is current display.
