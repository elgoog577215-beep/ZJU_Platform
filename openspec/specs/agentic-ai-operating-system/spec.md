# agentic-ai-operating-system Specification

## Purpose
TBD - created by archiving change agentic-ai-operating-system. Update Purpose after archive.
## Requirements
### Requirement: AI Agent Registry

The system SHALL maintain a machine-readable registry for all production AI agents and AI support modules.

#### Scenario: Registry covers current AI surfaces

- **WHEN** the registry is checked
- **THEN** it SHALL include event recommendation, hackathon coach, WeChat parsing, admin governance, model runtime/configuration, and event profile indexing.

#### Scenario: Agent metadata is complete

- **WHEN** an agent is registered
- **THEN** it SHALL declare prompt templates or an explicit planned prompt path, logic chain, standard libraries, context indexes, output contracts, validation, fallback, observability, evaluation checks, maturity, and next improvements.

### Requirement: Generated Agent Spec

The system SHALL generate a readable AI agent spec from the registry.

#### Scenario: Spec generation runs

- **WHEN** an operator runs the agent spec command
- **THEN** the system SHALL write a Markdown document describing maturity dimensions, registered agents, prompt templates, logic chains, standards, indexes, validation, fallback, evaluation, and next improvements.

### Requirement: Completion Analysis

The system SHALL analyze agent maturity and expose completion gaps.

#### Scenario: Admin overview loads

- **WHEN** the admin AI overview endpoint responds
- **THEN** the response SHALL include agent system summary, module maturity, and high-priority gaps derived from the registry.

#### Scenario: Registry check runs

- **WHEN** the registry health check runs
- **THEN** it SHALL fail if required agents are missing, if core dimensions are absent, or if a production agent lacks validation, fallback, output contracts, or evaluation checks.

### Requirement: Safe Incremental Operation

The Agentic AI Operating System SHALL be additive in its first slice.

#### Scenario: First slice deploys

- **WHEN** the registry and generated spec are deployed
- **THEN** existing AI endpoints SHALL keep their request shapes
- **AND** no database migration or destructive write SHALL be required.

### Requirement: Live AI Search Performance And Accuracy

Live AI activity search SHALL use the shared standard library for alias normalization and SHALL avoid unnecessary durable writes during request-time fallback.

#### Scenario: English and pinyin activity requests are normalized

- **WHEN** a user asks for campus/audience terms such as `Zijingang`, `Yuquan`, `all students`, or `undergraduate`
- **THEN** the event recommendation and parsing chain SHALL normalize them to the standard campus/audience catalog before ranking or validation.

#### Scenario: Model fallback does not pollute the profile index

- **WHEN** the recommendation intent model is attempted but fails during a live request
- **THEN** the system SHALL still return useful ranked candidates when local signals are sufficient
- **AND** request-time fallback profiles SHALL be transient
- **AND** the durable `event_ai_profiles` index SHALL not receive new rows from that live fallback path.

### Requirement: Recommendation Action Evidence

The event recommendation agent SHALL expose an observational action-evidence loop so operators can see whether AI recommendations led to user action.

#### Scenario: Recommendation run records bounded evidence anchors

- **WHEN** the event recommendation agent returns ranked events
- **THEN** the run summary SHALL store bounded recommended event IDs, categories, profile status, and average confidence
- **AND** it SHALL NOT store the raw user query in `ai_assistant_runs`.

#### Scenario: Admin overview summarizes action evidence

- **WHEN** the admin AI overview loads
- **THEN** it SHALL summarize recommendation action evidence from recent feedback, favorites, and event registrations
- **AND** it SHALL classify the evidence as `OBSERVED`, `PARTIALLY_OBSERVED`, `NOT_OBSERVED`, `CONTRADICTED`, or `NO_RECOMMENDATION`
- **AND** it SHALL include a next-adjustment hint without claiming causality.

#### Scenario: Action evidence influences the next recommendation turn

- **WHEN** a logged-in user has prior favorites, registrations, positive feedback, or negative feedback
- **THEN** the event recommendation agent SHALL summarize that history into bounded action-evidence signals
- **AND** those signals SHALL be available to deterministic candidate scoring and model reranking
- **AND** positive evidence MAY lift similar candidates while negative evidence MAY lower similar candidates
- **AND** action evidence SHALL remain secondary to explicit user intent such as date, campus, organizer, benefit, or activity type.

### Requirement: Recommendation Reasoning Trace

The event recommendation agent SHALL return user-facing reasoning traces without exposing hidden chain-of-thought.

#### Scenario: Recommendation includes trace

- **WHEN** the event recommendation agent returns recommendations
- **THEN** the response SHALL include `reasoningTrace`
- **AND** the trace SHALL include intent confidence, candidate count, ranking basis, weak or missing signals, action-evidence usage, fallback usage, and historical fallback usage
- **AND** the trace SHALL be derived from validated candidate facts and match signals rather than raw private model reasoning.

#### Scenario: Clarification remains useful

- **WHEN** the event recommendation agent needs clarification
- **THEN** the response SHALL include a concise question
- **AND** it SHALL include bounded `clarificationOptions`
- **AND** it SHALL include bounded `provisionalRecommendations` when candidates are available
- **AND** it SHALL include a reasoning trace explaining why clarification is useful.

