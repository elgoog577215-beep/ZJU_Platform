## ADDED Requirements

### Requirement: User Profile Card Display
The system SHALL expose a modular public profile card for each user, including slogan, status, tags, social links, and custom content cards.

#### Scenario: Visitor views profile card
- **WHEN** a visitor requests a user's profile card
- **THEN** the response includes public slogan, status, tags, visible social links, and visible custom cards sorted by `sort_order`.

#### Scenario: Owner views profile card
- **WHEN** the owner requests their profile card
- **THEN** the response includes both visible and hidden social links and cards.

### Requirement: User Profile Card Editing
The system SHALL allow an authenticated user to edit their own profile card data.

#### Scenario: Owner saves profile card
- **WHEN** an authenticated user submits slogan, status, tags, social links, and custom cards
- **THEN** the system persists the data and returns the updated profile card.

#### Scenario: Guest edits profile card
- **WHEN** an unauthenticated user submits profile card edits
- **THEN** the system rejects the request.

### Requirement: Profile Card Visibility
The system SHALL keep hidden social links and custom cards private to the owner and administrators.

#### Scenario: Hidden items are private
- **WHEN** a visitor requests another user's profile card
- **THEN** hidden social links and hidden custom cards are omitted.
