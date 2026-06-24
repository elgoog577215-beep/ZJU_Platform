# smart-ai-assistant-v2 Specification

## Purpose
TBD - created by archiving change smart-ai-assistant-v2. Update Purpose after archive.
## Requirements
### Requirement: Unified assistant tasks shall use the shared model runtime

AI-facing assistants SHALL call a shared orchestration layer above the existing unified model runtime so that task names, JSON contracts, model status, and fallback behavior are consistent.

#### Scenario: Assistant task succeeds

- WHEN an assistant task calls the orchestrator with a valid JSON contract
- THEN the orchestrator SHALL return parsed JSON and model status from the unified runtime.

#### Scenario: Assistant task fails

- WHEN the model returns no reliable structured result
- THEN the assistant SHALL return a declared fallback result instead of an empty or broken response.

### Requirement: Hackathon page shall provide an AI coach

The hackathon page SHALL expose an AI coach that answers user questions using large-model reasoning grounded in the hackathon context index.

#### Scenario: User asks a personal preparation question

- WHEN the user asks a question about suitability, preparation, tools, track choice, or event-day strategy
- THEN the assistant SHALL return summary, recommendation, preparation plan, risks, sources, confidence, and model status.

#### Scenario: Model is unavailable

- WHEN the model cannot complete the answer
- THEN the assistant SHALL return a fallback plan with `modelStatus.fallbackUsed=true`.

