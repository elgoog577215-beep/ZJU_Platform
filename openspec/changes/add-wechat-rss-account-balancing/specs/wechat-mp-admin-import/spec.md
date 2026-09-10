## ADDED Requirements

### Requirement: WeRead account round-robin selection
The WeWe RSS service SHALL distribute article-list and MP-info requests across all enabled, non-blocked accounts using one process-local round-robin cursor.

#### Scenario: Multiple eligible accounts
- **WHEN** successive requests select accounts from an unchanged eligible set
- **THEN** each account SHALL be selected once per cycle, including when the set exceeds ten accounts

#### Scenario: Account unavailable
- **WHEN** an account is disabled, invalid, or blocked for the current Shanghai calendar day
- **THEN** subsequent selections SHALL skip it and fail explicitly when no eligible accounts remain

#### Scenario: Rate limit recovery
- **WHEN** an account returns WeReadError429
- **THEN** the service SHALL exclude it immediately until the next Shanghai calendar day or an existing administrator unblock action
- **AND** unrelated network errors SHALL NOT add accounts to that exclusion list
