## ADDED Requirements

### Requirement: Project Plaza Page
There SHALL be a dedicated project plaza page at `/projects` that aggregates all published project cards across users. The plaza SHALL NOT live under the AI community section.

#### Scenario: Plaza lists published cards
- **WHEN** a visitor opens `/projects`
- **THEN** the page lists project cards whose `status` is `published`
- **AND** each card shows cover, title, intro, progress badge, need tags, tech tags, team/owner, and like count
- **AND** draft and removed cards are not shown.

#### Scenario: Plaza reachable from primary navigation
- **WHEN** a visitor uses the primary navigation
- **THEN** a "项目广场" entry navigates to `/projects`
- **AND** the entry is not nested inside the AI community menu.

### Requirement: Filter and Search
The plaza SHALL support filtering by progress and by need tag, and keyword search over title, tech, and owner.

#### Scenario: Filter by need
- **WHEN** the visitor selects the need filter "缺人"
- **THEN** only cards whose `need_tags` include "缺人" are shown.

#### Scenario: Filter by progress
- **WHEN** the visitor selects progress "开发中"
- **THEN** only cards with `progress = dev` are shown.

#### Scenario: Keyword search
- **WHEN** the visitor searches a keyword
- **THEN** cards matching the keyword in title, tech tags, or owner name are shown.

### Requirement: Project Detail View
Clicking a card SHALL open a project detail view showing the full long-form content, summary stats, need tags, tech tags, contact (login-gated), and a repository action. On desktop it SHALL be a modal overlay; on mobile a full-screen view.

#### Scenario: Open and close detail
- **WHEN** the visitor clicks a project card in the plaza
- **THEN** the detail opens showing the full `content`, summary stats, needs, tech, and (if logged in) contact
- **AND** closing the detail returns to the plaza.

#### Scenario: Deep link to a card
- **WHEN** the plaza is opened with `?id={id}`
- **THEN** the corresponding card's detail opens automatically.

### Requirement: Return To Favorites Navigation
When a project detail is opened from the user's favorites list, closing it SHALL return the user to the favorites tab, reusing the platform's existing `fromFavorites` navigation pattern.

#### Scenario: From favorites back to favorites
- **WHEN** a user opens a project from their favorites (navigated with `state.fromFavorites = true`)
- **AND** then closes the project detail
- **THEN** the user is returned to the favorites tab on their profile (via `navigate(-2)`), matching Events/Gallery/Videos behavior — not stranded on the plaza.

### Requirement: Theme Follows Global UI Mode
The plaza and project cards SHALL render correctly under both the platform day theme and dark theme, following the global `uiMode` rather than a page-level style toggle.

#### Scenario: Dark and day render
- **WHEN** the platform theme is dark
- **THEN** the plaza renders in the cyber dark style
- **WHEN** the platform theme is day
- **THEN** the plaza renders in the light style.

### Requirement: Empty State
The plaza SHALL show a guiding empty state when there are no matching cards.

#### Scenario: No cards yet
- **WHEN** there are no published project cards (or none match the filters)
- **THEN** an empty state invites the user to publish a project.
