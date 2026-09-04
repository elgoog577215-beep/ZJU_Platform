## MODIFIED Requirements

### Requirement: Project Card Entity

A project card SHALL be a first-class persistent entity owned by a single user, stored in `project_cards`, carrying cover photos, title, one-line intro, long-form content, progress, need tags, tech tags, repository link, public deployment provider and URL, and contact info.

#### Scenario: Fields persisted on create

- **WHEN** a logged-in user submits a new project card with title, intro, long content, progress, need tags, tech tags, repo url, deployment provider and URL, contact, and one or more photos
- **THEN** a `project_cards` row is created with `user_id` set to the author
- **AND** `progress` is one of `idea`/`dev`/`live`/`pause`
- **AND** `need_tags` and `tech_tags` are stored as JSON arrays
- **AND** the repository and deployment values are stored in separate fields
- **AND** the first photo is stored as `cover_url` and all photos in `images_json`.

#### Scenario: Title required

- **WHEN** a create request omits the title
- **THEN** the request is rejected with a validation error and no row is created.

### Requirement: Input Safety

Project card text SHALL be rendered as escaped text (not raw HTML), and `repo_url` and `deployment_url` SHALL be restricted to the `https://` scheme; uploaded images SHALL reuse the platform's existing type and size validation.

#### Scenario: Repo url scheme rejected

- **WHEN** a create or update supplies a `repo_url` that is not `https://`
- **THEN** the request is rejected with a validation error.

#### Scenario: Deployment url scheme rejected

- **WHEN** a create or update supplies a `deployment_url` that is not `https://`
- **THEN** the request is rejected with a validation error
- **AND** repository data remains unchanged.
