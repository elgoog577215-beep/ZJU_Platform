## ADDED Requirements

### Requirement: Authenticated Avatar Upload
The system SHALL allow an authenticated user to upload one JPG, PNG, or WebP avatar up to 5MB and persist it to `users.avatar`.

#### Scenario: User uploads avatar
- **WHEN** an authenticated user uploads a valid avatar
- **THEN** the response includes the avatar URL and the updated user object
- **AND** `/auth/me` returns that URL.

#### Scenario: Guest uploads avatar
- **WHEN** an unauthenticated request uploads an avatar
- **THEN** the system returns 401.

#### Scenario: User uploads invalid avatar type
- **WHEN** an authenticated user uploads a file that is not JPG, PNG, or WebP
- **THEN** the system rejects the upload.
