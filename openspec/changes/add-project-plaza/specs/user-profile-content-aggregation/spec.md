## MODIFIED Requirements

### Requirement: Profile Content Aggregation Includes Projects
个人主页内容聚合 SHALL include a new "项目"(project) content type alongside existing types (相册/照片/视频/活动 等). A user's own published project cards SHALL appear under their profile project category, and favorited projects SHALL appear in the favorites list filterable by the project type.

#### Scenario: Own projects on profile
- **WHEN** a visitor views a user's public profile and filters to the project type
- **THEN** the user's `published` project cards are returned as `type: 'project'`
- **AND** draft and removed cards are excluded for non-owner visitors.

#### Scenario: Owner sees own drafts
- **WHEN** the owner views their own profile project category
- **THEN** both published and draft project cards are returned.

#### Scenario: Favorited projects in favorites
- **WHEN** a user views their favorites and filters by the project type
- **THEN** project cards they favorited are listed
- **AND** selecting one navigates to `/projects?id={id}` with `state.fromFavorites = true`.

#### Scenario: Favorite type option present
- **WHEN** the profile favorites type filter is rendered
- **THEN** it includes a "项目" option alongside the existing content type options.
