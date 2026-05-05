## ADDED Requirements

### Requirement: Organized Admin Shell Hierarchy

The admin shell SHALL separate orientation, navigation tools, and session actions so administrators can identify the current module and switch modules without scanning a crowded header.

#### Scenario: Header has distinct work zones

- **GIVEN** an administrator opens the admin console
- **WHEN** the shell renders
- **THEN** the active module orientation SHALL be visually grouped separately from quick navigation controls
- **AND** session actions SHALL remain visible without competing with the primary module title.

#### Scenario: Quick navigation remains available

- **GIVEN** the header layout has been simplified
- **WHEN** the administrator uses quick jump or previous/next module actions
- **THEN** the selected module SHALL render
- **AND** the content anchor SHALL remain the scroll target after navigation.

### Requirement: Calmer Sidebar Density

The admin sidebar SHALL preserve grouped navigation while reducing repeated description text for faster scanning.

#### Scenario: Inactive items stay compact

- **GIVEN** the sidebar contains multiple module groups
- **WHEN** an item is not the current module
- **THEN** it SHALL show the module icon and label without a full description block.

#### Scenario: Active item retains context

- **GIVEN** a sidebar item is the current module
- **WHEN** the sidebar renders
- **THEN** it SHALL indicate current state
- **AND** MAY show a short description for context.

### Requirement: Structured Overview Reading Order

The overview page SHALL present admin work in a clear order: today’s priority, content inventory, then operational/system context.

#### Scenario: Overview starts with priority

- **GIVEN** an administrator opens the overview
- **WHEN** statistics load
- **THEN** the first overview section SHALL communicate the current priority and direct action.

#### Scenario: Overview avoids repeated action panels

- **GIVEN** the overview contains multiple data sections
- **WHEN** the administrator scans the page
- **THEN** repeated CTA panels with the same destinations SHALL be removed or consolidated.

### Requirement: Compact Resource Work Surface

Resource management pages SHALL keep filters, metrics, status text, and list results organized around the table/list as the main work surface.

#### Scenario: Resource status is compact

- **GIVEN** a resource manager page is loaded
- **WHEN** search or status filtering is active
- **THEN** the page SHALL show the current result scope in a compact status row
- **AND** provide a direct way to jump to the list.

### Requirement: Layout Organization Regression Coverage

The admin layout organization SHALL be covered by automated browser tests.

#### Scenario: Organized admin regression

- **GIVEN** the admin e2e test suite runs with mocked APIs
- **WHEN** it opens desktop and mobile admin views
- **THEN** it SHALL verify organized header controls, overview priority structure, resource status row, and mobile drawer behavior.
