## MODIFIED Requirements

### Requirement: Author Display Name Fallback
Author and uploader identity SHALL continue using nickname first and username as fallback, and avatar fields SHALL use `users.avatar` when available.

#### Scenario: Competition work uploader fallback
- **WHEN** a competition work is returned with uploader identity
- **THEN** uploader display uses nickname or username and includes avatar when available.

#### Scenario: Bound outcome identity display
- **WHEN** a competition work is returned with confirmed bound identity information
- **THEN** the response preserves original author/team text
- **AND** includes confirmed identity display information separately when available.
