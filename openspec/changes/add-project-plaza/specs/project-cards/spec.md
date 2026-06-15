## ADDED Requirements

### Requirement: Project Card Entity
A project card SHALL be a first-class persistent entity owned by a single user, stored in `project_cards`, carrying cover photos, title, one-line intro, long-form content, progress, need tags, tech tags, repository link, and contact info.

#### Scenario: Fields persisted on create
- **WHEN** a logged-in user submits a new project card with title, intro, long content, progress, need tags, tech tags, repo url, contact, and one or more photos
- **THEN** a `project_cards` row is created with `user_id` set to the author
- **AND** `progress` is one of `idea`/`dev`/`live`/`pause`
- **AND** `need_tags` and `tech_tags` are stored as JSON arrays
- **AND** the first photo is stored as `cover_url` and all photos in `images_json`.

#### Scenario: Title required
- **WHEN** a create request omits the title
- **THEN** the request is rejected with a validation error and no row is created.

### Requirement: Draft and Published Status
A project card SHALL support `draft`, `published`, and `removed` status. Only `published` cards appear in public surfaces; `draft` cards are visible only to their owner.

#### Scenario: Save as draft
- **WHEN** the owner saves a project card as draft
- **THEN** `status` is `draft`
- **AND** the card does not appear in the project plaza or in public profile aggregation
- **AND** the owner can still see and continue editing it.

#### Scenario: Publish
- **WHEN** the owner publishes a draft
- **THEN** `status` becomes `published`
- **AND** the card appears in the plaza and in the owner's profile project category.

### Requirement: Owner-Only Edit and Delete
Editing and deleting a project card SHALL require authentication and SHALL be restricted to the card's owner (or an admin).

#### Scenario: Non-owner cannot edit
- **WHEN** a user who is not the owner sends an update or delete for a project card
- **THEN** the request is rejected with a forbidden error
- **AND** the card is unchanged.

#### Scenario: Owner edits
- **WHEN** the owner updates fields of their project card
- **THEN** the changes persist and `updated_at` advances.

### Requirement: Contact Visibility Gated by Login
Contact fields (`contact_wechat`, `contact_email`) SHALL only be returned to authenticated requests; unauthenticated responses SHALL omit them and signal that login is required.

#### Scenario: Anonymous visitor cannot see contact
- **WHEN** an unauthenticated request fetches a project card
- **THEN** the response omits `contact_wechat` and `contact_email`
- **AND** sets `contact_locked: true`.

#### Scenario: Logged-in visitor sees contact
- **WHEN** an authenticated request fetches a project card that has contact info
- **THEN** the response includes the contact fields.

### Requirement: Input Safety
Project card text SHALL be rendered as escaped text (not raw HTML), and `repo_url` SHALL be restricted to the `https://` scheme; uploaded images SHALL reuse the platform's existing type and size validation.

#### Scenario: Repo url scheme rejected
- **WHEN** a create or update supplies a `repo_url` that is not `https://`
- **THEN** the request is rejected with a validation error.

### Requirement: Creation Rate Limiting
Project card creation SHALL be rate-limited per user to prevent spam, consistent with community post creation limits.

#### Scenario: Excessive creates throttled
- **WHEN** a user exceeds the project creation rate limit within the window
- **THEN** further create requests are rejected with a rate-limit error until the window resets.
