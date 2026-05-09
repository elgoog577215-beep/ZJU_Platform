# admin-resource-workflows Spec

## ADDED Requirements

### Requirement: Resource lists must ignore stale responses

Admin resource list requests SHALL only update visible list state when the response belongs to the latest request for that resource manager instance.

#### Scenario: Older request resolves after a newer request

- **WHEN** the administrator changes search, status, sort, or page quickly
- **AND** an earlier request resolves after a later request
- **THEN** the earlier response shall not replace the newer list, pagination, selected IDs, or loading state.

### Requirement: Resource refresh must avoid unnecessary layout jumps

Resource managers SHALL preserve the current page structure during follow-up refreshes after initial load.

#### Scenario: Filtering an already loaded list

- **WHEN** the administrator filters, searches, sorts, paginates, or manually refreshes a loaded resource list
- **THEN** the existing admin page shell and list area shall remain visible
- **AND** a compact refreshing state shall indicate that data is updating.

### Requirement: Resource controls must be clearly accessible

Resource search, filter, sort, refresh, and list-jump controls SHALL expose stable labels for assistive technology and regression tests.

#### Scenario: Search resource content

- **WHEN** the administrator focuses the resource search input
- **THEN** the control shall have a descriptive accessible name matching its resource type or purpose.

### Requirement: Mobile resource cards must communicate selection state

Mobile resource cards SHALL visually communicate when an item is selected and keep core actions stable.

#### Scenario: Select a mobile resource card item

- **WHEN** the administrator selects an item from a mobile resource card
- **THEN** the card shall show selected styling
- **AND** edit/delete actions shall remain visible without causing layout shift.
