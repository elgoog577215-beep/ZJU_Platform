## MODIFIED Requirements

### Requirement: getUserResources Extended Coverage
`GET /users/:id/resources` SHALL include confirmed competition outcome bindings as `type = 'competition_work'`, applying visitor/owner/admin visibility rules.

#### Scenario: Competition work appears in profile resources
- **WHEN** a requester can see a user's confirmed competition work binding
- **THEN** the resources response includes an item with `type = 'competition_work'`.

#### Scenario: Visitor cannot see candidate work
- **WHEN** a visitor requests resources for a user with candidate, rejected, or revoked competition work bindings
- **THEN** those bindings are excluded.

#### Scenario: Owner can inspect non-public binding state
- **WHEN** the owner requests resources or binding management data
- **THEN** relevant candidate, rejected, and revoked states are available only to the owner or an administrator.
