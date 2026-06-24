## ADDED Requirements

### Requirement: Admin Module Jump Controls

The admin console SHALL provide compact controls for direct and sequential navigation between administrator modules without requiring sidebar scrolling.

#### Scenario: Direct module jump

- **GIVEN** an administrator is viewing any admin module
- **WHEN** the administrator uses the quick-jump control to choose another module
- **THEN** the console SHALL render the selected module
- **AND** the module metadata SHALL update to the selected module.

#### Scenario: Sequential module navigation

- **GIVEN** an administrator is viewing a module in the admin module order
- **WHEN** the administrator activates the previous or next module action
- **THEN** the console SHALL switch to the adjacent module
- **AND** wrap at the beginning or end of the module list.

### Requirement: Admin Scroll And Focus Restoration

The admin console SHALL restore the main content position and focus context after module changes and provide an explicit way to return to the top of admin content.

#### Scenario: Module change returns to content anchor

- **GIVEN** an administrator has scrolled within the admin page
- **WHEN** the administrator switches modules through sidebar, quick jump, mobile drawer, or overview shortcut
- **THEN** the admin shell SHALL scroll the current content anchor into view
- **AND** move focus context to that anchor without causing layout shift.

#### Scenario: Back-to-top action

- **GIVEN** an administrator has scrolled down the admin page
- **WHEN** the administrator activates the back-to-top action
- **THEN** the admin shell SHALL return to the current content anchor
- **AND** the action SHALL have an accessible label.

### Requirement: Resource List Positioning

Resource management pages SHALL keep list results easy to reach after query, filter, and pagination changes.

#### Scenario: Search and filter show list

- **GIVEN** an administrator is viewing a resource management page
- **WHEN** the administrator submits a search, clears a search, or changes the status filter
- **THEN** the page SHALL keep the current list section in view
- **AND** the visible result count SHALL still describe the filtered list.

#### Scenario: Pagination keeps list context

- **GIVEN** a resource management page has multiple pages
- **WHEN** the administrator moves to another page
- **THEN** the page SHALL scroll to the list section after data refresh.

### Requirement: Bounded Sticky Resource Tables

Desktop resource tables SHALL support bounded internal scrolling with visible column labels.

#### Scenario: Long desktop table

- **GIVEN** a resource table has enough rows to scroll inside its panel
- **WHEN** the administrator scrolls the table body
- **THEN** the table header SHALL remain visible
- **AND** table semantics SHALL remain unchanged.

### Requirement: Regression Coverage

The admin scroll and jump behavior SHALL be covered by automated browser tests using mocked admin API responses.

#### Scenario: Admin navigation regression

- **GIVEN** the admin e2e test suite runs
- **WHEN** it exercises desktop and mobile admin navigation
- **THEN** it SHALL verify quick jump, resource list interaction, back-to-top behavior, and mobile body scroll restoration.
