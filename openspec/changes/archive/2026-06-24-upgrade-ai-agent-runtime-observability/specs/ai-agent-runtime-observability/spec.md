## ADDED Requirements

### Requirement: Per-Agent Runtime Health

The system SHALL expose runtime health for each registered AI Agent using recent assistant run summaries.

#### Scenario: Overview includes runtime health

- **WHEN** the admin AI overview endpoint responds
- **THEN** the response SHALL include per-Agent runtime health with sample size, run count, model-used rate, fallback rate, error count, average duration, retry count, and status recommendation.

#### Scenario: Agent has no recent data

- **WHEN** a registered Agent has no recent run summaries
- **THEN** runtime health SHALL mark that Agent as `NO_DATA` and SHALL NOT claim the Agent is healthy or unhealthy.

### Requirement: Model Health Summary

The system SHALL expose model configuration health without exposing secrets.

#### Scenario: Model configs are summarized

- **WHEN** the admin AI overview endpoint responds
- **THEN** model health SHALL include enabled count, healthy count, error count, recent error summaries, and suggested action
- **AND** it SHALL NOT include raw API keys.

#### Scenario: Runtime failures affect model recommendation

- **WHEN** recent runtime telemetry shows repeated retries, fallback, or failed runs
- **THEN** model health SHALL move from `healthy` to `watch`, `degraded`, or `blocked` according to bounded thresholds.

### Requirement: Circuit Breaker Recommendation

The system SHALL provide a circuit breaker recommendation but MUST NOT automatically disable model configs.

#### Scenario: Failed provider receives recommendation

- **WHEN** model configs are enabled but recent status or runtime telemetry indicates repeated failures
- **THEN** the overview SHALL include a suggested action such as test key, lower priority, rotate key, or inspect provider
- **AND** no model config SHALL be modified by the overview request.

### Requirement: Runtime-Aware Agent Overview

The Agent registry overview SHALL combine declared maturity with runtime health.

#### Scenario: Modules include runtime health

- **WHEN** agent system modules are built
- **THEN** every module SHALL include runtime health if available.

#### Scenario: Runtime issues influence next improvements

- **WHEN** an Agent has high fallback rate, high average duration, or recent errors
- **THEN** the continuous improvement plan SHALL be able to prioritize that Agent's observability or safety-cost backlog.

### Requirement: Runtime Observability Quality Gate

Repeatable checks SHALL validate runtime observability structure.

#### Scenario: Registry check validates runtime health

- **WHEN** the AI Agent registry check runs with sample health data
- **THEN** it SHALL assert that runtime health, model health, and circuit breaker recommendation fields are present.

#### Scenario: Generated spec documents runtime observability

- **WHEN** the AI Agent spec is generated
- **THEN** the generated Markdown SHALL include runtime health and model health sections.
