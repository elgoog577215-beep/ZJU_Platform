# admin-console-systematization Spec

## ADDED Requirements

### Requirement: Admin access must remain in admin context

When a user opens `/admin` without an authenticated admin session, the application SHALL show an admin-specific access gate instead of redirecting to the public home page.

#### Scenario: Unauthenticated user opens admin route

- **WHEN** the browser navigates to `/admin`
- **AND** no valid token is available
- **THEN** the page shall remain on `/admin`
- **AND** a focused admin login form shall be visible
- **AND** public navigation chrome shall not be shown.

#### Scenario: Authenticated non-admin opens admin route

- **WHEN** the browser navigates to `/admin`
- **AND** the current authenticated user is not an admin
- **THEN** the page shall show a no-permission admin access state
- **AND** the user shall have a clear logout path.

### Requirement: Admin modules must be URL-addressable

Admin modules SHALL be restorable through a `tab` query parameter while retaining session fallback behavior.

#### Scenario: Open a module directly

- **WHEN** the browser navigates to `/admin?tab=photos`
- **THEN** the photos resource module shall be active
- **AND** the quick-jump control shall show `photos`.

#### Scenario: Change modules from the UI

- **WHEN** the administrator chooses the intelligence module from quick jump, side nav, or adjacent controls
- **THEN** the active module shall change
- **AND** the URL shall include `tab=intelligence`
- **AND** content focus shall move to the admin content start.

#### Scenario: Legacy tab alias is used

- **WHEN** the browser navigates to `/admin?tab=ai-models`
- **THEN** the intelligence module shall be active
- **AND** the URL shall normalize to `tab=intelligence`.

### Requirement: Resource filtering and selection scope must be explicit

Resource manager pages SHALL apply status filters through the existing resource list API and describe batch selection as a current-page operation.

#### Scenario: Status filter changes

- **WHEN** the administrator selects a status filter such as pending or rejected
- **THEN** the next resource list request shall include that selected `status`
- **AND** the list shall reload from page 1
- **AND** previous selections shall be cleared.

#### Scenario: Batch selection is visible

- **WHEN** one or more resource rows are selected
- **THEN** the selected bar shall describe the items as current-page selections
- **AND** it shall state that other pages or unloaded results are not included.

### Requirement: AI governance must expose operational rationale

The intelligence governance view SHALL show enough rationale for administrators to decide whether to apply AI suggestions without relying on hover-only information.

#### Scenario: Suggestion includes a reason

- **WHEN** an AI governance suggestion contains a reason
- **THEN** the suggestion row shall show the reason inline
- **AND** the row shall remain compact enough for list scanning.

#### Scenario: Apply response uses fallback IDs

- **WHEN** an apply response returns a detail keyed by `id` instead of `suggestionId`
- **THEN** the matching suggestion shall still update its status and reason.

### Requirement: Model-key management must prioritize existing configuration

The model-key manager SHALL make existing keys the primary surface and hide creation fields until needed, while confirming destructive deletion.

#### Scenario: Existing keys are present

- **WHEN** one or more model keys exist
- **THEN** the key list shall appear before the creation form
- **AND** the creation form shall be hidden until the administrator chooses to add a key.

#### Scenario: Delete a model key

- **WHEN** the administrator chooses to delete a model key
- **THEN** a confirmation dialog shall appear
- **AND** the delete request shall only be sent after confirmation.

### Requirement: Admin regression coverage must protect the systematized flow

Automated browser tests SHALL cover the admin access gate, module deep links, resource scope copy, AI rationale visibility, and model-key deletion confirmation.

#### Scenario: Run admin console e2e

- **WHEN** the admin console Playwright spec is run with mocked API responses
- **THEN** it shall verify unauthenticated admin entry remains in admin context
- **AND** it shall verify URL tab navigation and AI/model-key cleanup behavior.
