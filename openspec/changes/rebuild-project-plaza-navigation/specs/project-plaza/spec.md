## MODIFIED Requirements

### Requirement: Project Plaza Page

There SHALL be a dedicated project plaza page at `/projects` that aggregates all published project cards across users and public competition work projections. The plaza SHALL use one stable page structure for the all-projects scope and every competition scope, and SHALL NOT live under the AI community section.

#### Scenario: Plaza lists published cards

- **WHEN** a visitor opens `/projects`
- **THEN** the page lists public project cards and competition work projections allowed by the current project-plaza data contract
- **AND** each item shows source-appropriate cover, title, intro, status or award, public identity and evidence
- **AND** draft, removed, pending, rejected, non-consenting and deleted records are not shown.

#### Scenario: Plaza reachable from primary navigation

- **WHEN** a visitor uses the primary navigation
- **THEN** a "项目广场" entry navigates to `/projects`
- **AND** the entry is not nested inside the AI community menu.

#### Scenario: Page structure remains stable when scope changes

- **WHEN** a visitor switches between all projects and one public competition
- **THEN** the project-center header, competition index, discovery controls and results region MUST remain in the same semantic order
- **AND** only the selected state, competition context and result data MUST change
- **AND** the page MUST NOT replace the competition index with a separate event-only header.

### Requirement: Filter and Search

The plaza SHALL support keyword search and sorting in every browsing scope, and SHALL support progress and need-tag filters when browsing all projects. Controls SHALL remain close to the results they affect and SHALL expose the active scope and active conditions.

#### Scenario: Filter by need

- **WHEN** the visitor selects the need filter "缺人" while browsing all projects
- **THEN** only cards whose `need_tags` include "缺人" are shown.

#### Scenario: Filter by progress

- **WHEN** the visitor selects progress "开发中" while browsing all projects
- **THEN** only cards with `progress = dev` are shown.

#### Scenario: Keyword search

- **WHEN** the visitor searches a keyword in any scope
- **THEN** the current scope only shows projects matching the backend search contract
- **AND** the results header identifies the current scope and returned count.

#### Scenario: Entering an event clears inapplicable project filters

- **WHEN** a visitor has an active progress or need filter and selects a competition
- **THEN** the page MUST clear the progress and need filters before loading the competition results
- **AND** MUST preserve the keyword and sort selection
- **AND** MUST NOT leave a hidden filter causing unexplained empty results.

### Requirement: Empty State

The plaza SHALL show a guiding state when data is loading or when no cards match, without replacing the stable scope and discovery controls.

#### Scenario: Projects are loading

- **WHEN** the current project request is pending
- **THEN** the results region MUST show a bounded skeleton representation of the project grid
- **AND** the scope navigation and discovery controls MUST remain available.

#### Scenario: Current conditions have no match

- **WHEN** there are public projects in the plaza but none match the current search or applicable filters
- **THEN** the empty state MUST identify that the current conditions have no match
- **AND** MUST offer a direct action to clear the query and filters.

#### Scenario: Current scope has no projects

- **WHEN** the selected public competition or the entire plaza has no visible projects
- **THEN** the empty state MUST identify the empty scope
- **AND** MUST offer the scope-appropriate publish or submission action when it is available.

## ADDED Requirements

### Requirement: Persistent Competition Scope Navigation

The project plaza SHALL expose a persistent competition index containing all projects and every available public competition in every browsing scope.

#### Scenario: Visitor selects a competition

- **WHEN** a visitor selects a public competition from the persistent index
- **THEN** the URL MUST update to `/projects?competition=<slug>`
- **AND** the selected competition MUST remain visible and marked with `aria-current`
- **AND** the all-projects option and other competition options MUST remain available
- **AND** the results MUST only contain items from the selected competition.

#### Scenario: Visitor returns to all projects

- **WHEN** a visitor selects the all-projects option from a competition scope
- **THEN** the `competition` query parameter MUST be removed
- **AND** the all-projects option MUST become current
- **AND** the default public project collection MUST load without a full page navigation.

#### Scenario: Mobile visitor changes competition

- **WHEN** a visitor uses the competition index at a 390px viewport
- **THEN** the index MUST remain horizontally operable without document-level overflow
- **AND** the current option MUST be brought into view
- **AND** no competition selection MAY remove the index from the page.

### Requirement: Competition Context Is Subordinate To Navigation

When one competition is selected, the plaza SHALL show its public facts and actions in a contextual region that does not replace the project-center identity or competition index.

#### Scenario: Selected competition has public context

- **WHEN** the selected competition response includes title, date, work count and related routes
- **THEN** the context region MUST show the title, date and visible work count
- **AND** MUST provide the current submission state
- **AND** MUST provide available event and media links
- **AND** MUST keep long-term project publishing available as a distinct secondary action.

#### Scenario: Selected competition submission is unavailable

- **WHEN** the selected competition is upcoming or closed
- **THEN** the submission control MUST state the actual unavailable phase
- **AND** MUST NOT appear as an enabled submission action.

### Requirement: Stable Responsive Project Workspace

The project results SHALL use a consistent, source-aware directory layout that remains operable across supported locales and viewports.

#### Scenario: Desktop visitor compares projects

- **WHEN** at least four projects are visible on a desktop viewport
- **THEN** project cards MUST use a consistent grid footprint rather than item-position-dependent spans
- **AND** awards, status, author and evidence MUST remain scannable without opening every detail.

#### Scenario: Mobile visitor browses and opens a project

- **WHEN** a visitor browses at 390px and opens then closes a project
- **THEN** the page and detail MUST not cause document-level horizontal overflow
- **AND** the project detail MUST remain scrollable and reversibly closeable
- **AND** the visitor MUST return to the same competition scope and discovery state.

#### Scenario: English visitor changes scope

- **WHEN** the current language is English and the visitor switches competition scope
- **THEN** all new navigation, context, discovery, loading and empty-state copy MUST use English
- **AND** the page MUST NOT expose raw translation keys or fixed Chinese labels.
