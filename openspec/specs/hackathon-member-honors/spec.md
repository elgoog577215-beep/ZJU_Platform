# hackathon-member-honors Specification

## Purpose
TBD - created by archiving change add-hackathon-member-honors. Update Purpose after archive.
## Requirements
### Requirement: Approved Winning Works Show Public Honors

The system SHALL show approved hackathon works with a public honor title and optional winner profile fields.

#### Scenario: Visitor opens the works page

- GIVEN a current public competition package exists
- AND it has approved works
- WHEN a visitor opens `/hackathon/works`
- THEN the visitor sees the work title, author, honor title, rank/award, project link, and optional grade/major/highlight.

### Requirement: Experience Sharing Is Available Through Details

The system SHALL keep long experience sharing in a click-to-open detail view.

#### Scenario: Visitor opens a work detail

- GIVEN an approved work has experience sharing
- WHEN the visitor opens the detail view
- THEN the visitor can read the experience sharing and project summary
- AND phone numbers, email addresses, IP addresses, and raw source metadata are not displayed.

### Requirement: External Uploads Require Review

The system SHALL let authenticated external users submit work stories for the current competition package.

#### Scenario: Non-admin user submits a work story

- GIVEN a non-admin user is logged in
- WHEN they submit a work story
- THEN the work is saved as pending
- AND it does not appear publicly until an admin approves it.

### Requirement: Admins Can Assign Honor Titles

The system SHALL let admins edit honor titles and public story fields.

#### Scenario: Admin edits a work

- GIVEN an admin opens the hackathon manager
- WHEN they edit a work record
- THEN they can update honor title, grade, major, highlight, experience, public consent, sort order, and review status.

