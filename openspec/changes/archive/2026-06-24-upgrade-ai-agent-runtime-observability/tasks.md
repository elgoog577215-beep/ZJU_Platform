# Tasks

## 1. OpenSpec

- [x] 1.1 Create proposal, design, and capability spec for runtime observability.
- [x] 1.2 Validate the OpenSpec change after implementation.

## 2. Runtime Health Aggregation

- [x] 2.1 Add per-Agent runtime health aggregation from recent `ai_assistant_runs` summaries.
- [x] 2.2 Add model health and circuit breaker recommendation summary from configs plus runtime signals.
- [x] 2.3 Keep the overview additive and avoid database migrations or model config writes.

## 3. Agent Registry Integration

- [x] 3.1 Pass runtime health into Agent overview modules.
- [x] 3.2 Add runtime health and model health sections to generated Agent spec.
- [x] 3.3 Let runtime issues influence continuous improvement priority without replacing maturity scoring.

## 4. Quality Gates

- [x] 4.1 Update registry checks to validate runtime health structure.
- [x] 4.2 Add assertions for model health and circuit breaker recommendation.
- [x] 4.3 Ensure generated spec includes runtime observability sections.

## 5. Verification

- [x] 5.1 Regenerate the AI Agent spec.
- [x] 5.2 Run Agent registry check.
- [x] 5.3 Run AI golden and stress checks.
- [x] 5.4 Run OpenSpec validation.
- [x] 5.5 Run lint and build, or document any pre-existing blocker.
