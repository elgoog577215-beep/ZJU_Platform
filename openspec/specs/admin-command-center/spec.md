# admin-command-center Specification

## Purpose
TBD - created by archiving change upgrade-admin-command-center. Update Purpose after archive.
## Requirements
### Requirement: Admin navigation must support intent search

The admin sidebar and mobile drawer SHALL let administrators search modules by group, label, or description.

#### Scenario: Search finds a module

- **WHEN** the administrator types a matching keyword into the module search field
- **THEN** only matching groups/modules shall remain visible
- **AND** choosing a result shall activate that module through the existing tab-selection flow.

#### Scenario: Search has no results

- **WHEN** the search query matches no module
- **THEN** the navigation shall show a clear empty state
- **AND** the administrator shall be able to clear the query.

### Requirement: Admin shell must expose recent modules

The admin shell SHALL show recently visited modules as shortcuts without replacing the existing quick jump or grouped navigation.

#### Scenario: Module changes

- **WHEN** the administrator switches modules
- **THEN** the module shall be added to the recent module list
- **AND** the recent shortcut shall navigate through the same flow as quick jump and sidebar navigation.

#### Scenario: Stored recent module is stale

- **WHEN** stored recent IDs include unknown modules
- **THEN** those IDs shall be ignored.

### Requirement: Overview must read as a command center

The overview page SHALL present high-signal operational metrics before detailed panels.

#### Scenario: Overview loads

- **WHEN** stats data is available
- **THEN** the overview shall show pending work, total content assets, upcoming activities, and 7-day activity visits above the detailed sections.

### Requirement: Command-center upgrade must preserve existing admin behavior

The shell upgrade SHALL preserve URL-addressable modules, quick jump, adjacent controls, mobile drawer body-scroll lock, and no-horizontal-overflow behavior.

#### Scenario: Run admin regression

- **WHEN** the admin Playwright spec is run
- **THEN** it shall verify command-center metrics, searchable navigation, recent shortcuts, mobile drawer search, and existing resource/AI flows.

