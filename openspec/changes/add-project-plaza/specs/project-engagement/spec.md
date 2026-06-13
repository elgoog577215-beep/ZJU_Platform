## ADDED Requirements

### Requirement: Favorite Equals Like
A project card SHALL be favoritable by reusing the existing `favorites` mechanism with `item_type = 'project'`. Favoriting a project is the platform's "like": it adds the project to the user's favorites and contributes to the card's like count.

#### Scenario: Favorite a project
- **WHEN** a logged-in user favorites a project card
- **THEN** a `favorites` row with `item_type = 'project'` and `item_id = {card id}` is created
- **AND** the card's `likes` is recomputed from `favorites`
- **AND** the project appears in that user's favorites list.

#### Scenario: Unfavorite
- **WHEN** the user unfavorites the project
- **THEN** the `favorites` row is removed and `likes` is recomputed downward.

#### Scenario: Favorite requires login
- **WHEN** an unauthenticated user attempts to favorite
- **THEN** the action is rejected and the user is prompted to log in.

### Requirement: Notify Owner On Favorite
When a user favorites another user's project card, the project's owner SHALL receive a notification of type `favorite`, reusing the existing notification mechanism (identical to posts).

#### Scenario: Owner notified
- **WHEN** user B favorites user A's project card
- **THEN** user A receives a `favorite` notification referencing the project (`resourceType = 'project'`, `resourceId = card id`).

#### Scenario: No self-notification
- **WHEN** a user favorites their own project card
- **THEN** no notification is created (owner equals actor).

### Requirement: Report and Takedown
Published project cards SHALL be reportable by logged-in users, and admins SHALL be able to take a card down by setting its status to `removed`, reusing the platform's existing report pattern.

#### Scenario: Report a project
- **WHEN** a logged-in user reports a project card with a reason
- **THEN** a report record is created referencing the project.

#### Scenario: Admin takedown
- **WHEN** an admin takes down a reported project card
- **THEN** the card's `status` becomes `removed`
- **AND** it no longer appears in the plaza or in public profile aggregation.
