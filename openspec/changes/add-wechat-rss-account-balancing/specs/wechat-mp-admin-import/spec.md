## ADDED Requirements

### Requirement: WeRead account random selection

The WeWe RSS service SHALL distribute article-list and MP-info requests across all enabled, non-blocked accounts by independently selecting one eligible account uniformly at random for every request, without a cursor.

#### Scenario: Multiple eligible accounts

-   **WHEN** successive requests select accounts from an unchanged eligible set
-   **THEN** every eligible account SHALL be selectable, including when the set exceeds ten accounts
-   **AND** consecutive requests MAY select the same account

#### Scenario: Account unavailable

-   **WHEN** an account is disabled, invalid, or blocked for the current Shanghai calendar day
-   **THEN** subsequent selections SHALL skip it and fail explicitly when no eligible accounts remain

#### Scenario: Rate limit recovery

-   **WHEN** an account returns WeReadError429
-   **THEN** the service SHALL exclude it immediately until the next Shanghai calendar day or an existing administrator unblock action
-   **AND** unrelated network errors SHALL NOT add accounts to that exclusion list

### Requirement: Image-only RSS production deployment

The RSS production deployment SHALL use an immutable image built in CI and SHALL NOT build images or install dependencies on the production host.

#### Scenario: Publish a runtime image

-   **WHEN** CI publishes an RSS image
-   **THEN** the image SHALL contain compiled application files, production dependencies and required migrations, excluding application source, tests and source maps

#### Scenario: Update the existing service

-   **WHEN** an operator deploys an image digest
-   **THEN** the deployment SHALL preserve the existing database volume and replace only the RSS application container with CPU, memory and log limits
-   **AND** failed application health checks SHALL trigger application image rollback without automatically restoring the database
