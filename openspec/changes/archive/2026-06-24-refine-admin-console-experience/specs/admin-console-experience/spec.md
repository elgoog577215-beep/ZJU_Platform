## ADDED Requirements

### Requirement: Admin shell presents clear operational context
The admin console SHALL show the active module, module purpose, navigation grouping, current date, and primary global actions in a way that is visible on desktop and mobile.

#### Scenario: Administrator opens the console on desktop
- **WHEN** an administrator visits `/admin` on a desktop viewport
- **THEN** the console shows grouped navigation, the active module label, the module description, date context, and logout/return-frontstage affordances without overlapping the main workspace.

#### Scenario: Administrator opens navigation on mobile
- **WHEN** an administrator opens the admin navigation from a mobile viewport
- **THEN** the navigation appears as a full-height drawer with a visible close control, active module indication, grouped module links, and body scroll lock until the drawer closes.

### Requirement: Shared admin UI primitives are consistent across modules
The admin console SHALL provide reusable visual primitives for panels, actions, filters, tables, metrics, empty states, loading states, selected-action bars, and confirmation dialogs.

#### Scenario: A manager page uses shared controls
- **WHEN** a manager page renders buttons, filters, metric cards, tables, empty states, or dialogs
- **THEN** those elements use the shared admin visual language for spacing, borders, text contrast, focus states, disabled states, and responsive wrapping.

#### Scenario: A destructive action is requested
- **WHEN** an administrator triggers a delete or bulk destructive action
- **THEN** the console presents a themed confirmation dialog with explicit copy, cancel/confirm actions, pending state, and dismissal behavior.

### Requirement: Resource management communicates scope and status
The resource management pages SHALL distinguish visible results, current-page totals, server totals, active filters, selected rows, and batch operation scope.

#### Scenario: Administrator filters resources
- **WHEN** an administrator applies search or status filters on a resource page
- **THEN** the page shows filtered visible counts, status counts, server total context, and an empty state if no visible item matches.

#### Scenario: Administrator selects resources for batch action
- **WHEN** one or more visible resources are selected
- **THEN** the page shows how many visible items are selected and provides batch approve, reject, and delete actions with confirmation before mutation.

### Requirement: High-frequency admin modules share the same refined system
The admin console SHALL render high-frequency management modules with the shared admin shell and primitives, including the hackathon registration manager.

#### Scenario: Administrator opens hackathon registration management
- **WHEN** an administrator switches to the hackathon tab
- **THEN** the page uses the shared admin page shell, metric cards, filters, table styling, pagination controls, export action, and confirmation dialog instead of an isolated page style.

### Requirement: Admin console remains accessible and responsive
The admin console SHALL preserve keyboard focus visibility, aria labels for icon-only controls, semantic button behavior, mobile-safe spacing, and non-overlapping text across common desktop and mobile viewports.

#### Scenario: Administrator navigates by keyboard
- **WHEN** an administrator tabs through navigation, filters, icon controls, and dialogs
- **THEN** each interactive element exposes a visible focus state and an accessible name.

#### Scenario: Administrator uses a narrow viewport
- **WHEN** an administrator views resource or hackathon management on a mobile-width viewport
- **THEN** controls wrap without text overlap, tables are replaced by usable cards or horizontal scrolling, and primary actions remain reachable.

### Requirement: Admin regression coverage exists
The project SHALL include automated regression coverage for the refined admin console.

#### Scenario: Admin smoke test runs
- **WHEN** the admin Playwright regression runs with mocked admin APIs
- **THEN** it verifies the admin overview loads, navigation can switch to at least one resource module, the mobile drawer opens/closes, and the hackathon manager renders core controls.
