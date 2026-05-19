# AI Agent Operating System

> Generated from `server/src/services/aiAgentRegistryService.js`. Do not hand-edit generated sections; update the registry and rerun `npm --prefix server run agents:spec`.

Generated at: 2026-05-19T03:45:53.323Z

## Goal

All AI-facing features should behave like coordinated agents: explicit prompts, explicit logic chains, shared standard libraries, bounded context indexes, structured contracts, validation, fallback, evaluation, and observable runtime status.

## Maturity Dimensions

### Prompt templates

Prompts are named, versioned, scoped, and tied to an output contract.

### Logic chain

The agent has an explicit sequence from intent to context, model reasoning, validation, and response.

### Standard libraries

The agent uses shared catalogs instead of inventing categories, labels, or business rules.

### Context index

The agent can use prebuilt profiles, cards, or indexes before sending a small context to the model.

### Memory and feedback

The agent can learn from preferences, feedback, or admin decisions where appropriate.

### Structured contract

Model output is JSON-shaped, normalized, and stable for frontend rendering.

### Validation guardrails

Unknown IDs, unsupported values, unsafe writes, and hallucinated fields are rejected or downgraded.

### Fallback recovery

The user still gets an honest, useful answer when the model fails or times out.

### Evaluation checks

There are repeatable checks proving success, fallback, and critical ranking/parse behavior.

### Observability

Runs expose model status, provider/model, confidence, sources, and warnings.

### Auto-update spec

The agent registry can regenerate docs and health summaries from code.

### Safety and cost

The agent has clear permissions, data boundaries, timeout/cost controls, and protected write paths.

## System Summary

- Agent count: 6
- Average maturity: 85%
- High-priority gaps: 0
- Partial maturity gaps: 22

## Agents

### Event Recommendation Agent

- ID: event_recommendation
- Class: user_assistant
- Entrance: Events page AI search
- Maturity: 92%

Understand a campus activity request, retrieve a safe candidate pool, use model reasoning to rerank, and return explainable recommendations.

#### Prompt Templates

- event_recommendation_intent (v1): Parse user goal, campus, time, benefits, category, and clarification needs.
- event_profile (v1): Build a reusable activity profile from public event metadata.
- event_recommendation_rerank (v1): Rank only validated candidate event IDs and explain matched signals.

#### Logic Chain

- Sanitize query and optional clarification.
- Parse intent with the model and standard fallback intent parser.
- Normalize Chinese, English, and pinyin campus/audience terms through the shared standard library.
- Build a candidate pool from approved, non-deleted events.
- Ensure event AI profiles from cache, model, or transient request fallback when the model is skipped.
- Use model rerank over the bounded candidate list.
- Validate returned IDs against the candidate pool.
- Return recommendations, confidence, source signals, warnings, and model status.
- Record feedback and optional preference memory.

#### Standard Libraries

- server/src/constants/eventCatalog.js
- server/src/services/eventIntelligenceService.js

#### Context / Index / Memory

- event_ai_profiles
- assistant_memory
- user_event_preferences
- event_recommendation_feedback

#### Validation And Fallback

- Rejects invalid assistant state flags.
- Normalizes Zijingang/Yuquan/all students/undergraduate-style aliases before ranking.
- Validates model event IDs against the current candidate pool.
- Filters pending/deleted events out of recommendations.
- Keeps historical fallback explicit and lower priority.
- Intent parser fallback.
- Transient profile fallback for request latency without writing to the index.
- Semantic/local ranking fallback.
- Explicit assistant_unreliable empty state when validation fails.

#### Evaluation

- server/scripts/check-unified-ai-runtime.js
- server/scripts/verify_event_assistant.js
- server/scripts/stress-ai-assistants.js
- server/scripts/evaluate-ai-golden.js, including model-failure transient-profile performance coverage

#### Next Improvements

- Expose per-agent latency and failure rate in the admin console.
- Add async profile refresh for large event pools.
- Grow the golden ranking set with real anonymized user queries.

### Hackathon AI Coach

- ID: hackathon_coach
- Class: user_assistant
- Entrance: Hackathon page AI coach
- Maturity: 79%

Coach a participant toward a small, shippable AI-native hackathon scope using event facts and model reasoning.

#### Prompt Templates

- hackathon_ai_coach (v1): Produce suitability, project direction, preparation plan, risk, and event-day strategy.

#### Logic Chain

- Read stable hackathon settings.
- Build event profile and advice cards.
- Detect user intent and participant signals.
- Select the most relevant context cards.
- Ask the model for structured coaching over bounded context.
- Normalize track, plan, risk, sources, confidence, and follow-up questions.
- Fall back to local strategy index when the model fails.

#### Standard Libraries

- Hackathon profile builder
- Hackathon context card index
- Shared assistant orchestrator

#### Context / Index / Memory

- Hackathon context cards
- Hackathon settings
- Participant profile payload
- ai_assistant_runs aggregate run summaries

#### Validation And Fallback

- Limits query and participant profile length.
- Normalizes arrays and numeric confidence.
- Restricts sources to provided context card IDs.
- Avoids unsupported event policies.
- Local intent detection.
- Advice-card ranking.
- Fallback response with modelStatus.fallbackUsed=true.

#### Evaluation

- server/scripts/check-hackathon-ai-assistant.js
- server/scripts/stress-ai-assistants.js
- server/scripts/evaluate-ai-golden.js

#### Next Improvements

- Version the context-card index separately from code.
- Expose anonymous aggregate question categories for product tuning.
- Grow the golden coaching set with beginner, engineer, and product-user variants.

### WeChat Event Parser

- ID: wechat_event_parser
- Class: content_parsing_skill
- Entrance: Upload modal WeChat parse action
- Maturity: 79%

Extract structured event fields from a WeChat article and normalize them against the shared event catalog.

#### Prompt Templates

- wechat_event_parse (v1): Extract title, dates, location, organizer, audience, category, content, and metadata.

#### Logic Chain

- Clean and validate WeChat URL.
- Scrape article title, author, content, date, and cover image.
- Send article plus academic calendar and standard catalog to the model.
- Validate category and audience against event intelligence service.
- Download cover image when possible.
- Return parsed fields for admin review before save.

#### Standard Libraries

- server/src/constants/eventCatalog.js
- server/src/services/eventIntelligenceService.js
- Academic calendar context

#### Context / Index / Memory

- WeChat URL cache
- Standard event catalog prompt context
- ai_assistant_runs parse summaries

#### Validation And Fallback

- Requires canonical event category.
- Normalizes audience.
- Returns category confidence and reason.
- Falls back to scraped content fields when the model omits optional text.
- Cache for repeated URL parsing.
- Clear API error for invalid key/rate limit.
- Anonymous parse run summaries even when scraping or model parsing fails.
- Manual form entry remains available.

#### Evaluation

- server/scripts/check-wechat-parser-agent.js
- server/scripts/check-event-intelligence.js
- server/scripts/stress-ai-assistants.js
- server/scripts/evaluate-ai-golden.js

#### Next Improvements

- Show parser confidence and warnings in the admin form.
- Aggregate parse failure categories for prompt and scraper tuning.
- Grow parser golden samples for lecture, volunteer, recruitment, and exchange events.

### Admin Event Governance Agent

- ID: event_governance
- Class: admin_governance_skill
- Entrance: Admin AI assistant governance workspace
- Maturity: 88%

Help admins improve event metadata through safe scan, review, and apply workflows.

#### Prompt Templates

- event_governance_review (v1): Review low-confidence or ambiguous governance suggestions against standard catalogs and recent admin decisions.

#### Logic Chain

- Scan non-deleted events.
- Use standard rules to suggest category and audience normalization.
- Load recent admin decision memory for governance context.
- Ask the model to review low-confidence or ambiguous category suggestions over a bounded candidate list.
- Validate model-reviewed fields against the shared event catalog before keeping them.
- Persist run and suggestion audit records.
- Let admins select suggestions.
- Apply only whitelisted fields when the scanned value still matches.
- Record applied, skipped, and conflict outcomes.

#### Standard Libraries

- server/src/constants/eventCatalog.js
- server/src/services/eventIntelligenceService.js

#### Context / Index / Memory

- ai_assistant_runs
- ai_event_governance_suggestions
- recent applied/skipped governance decisions

#### Validation And Fallback

- Dry scan does not mutate event data.
- Apply is admin-only.
- Only whitelisted event fields can be changed.
- Model-reviewed categories must normalize to a known catalog value.
- Conflict check prevents overwriting changed rows.
- Rule-backed deterministic suggestions.
- Model review failure keeps deterministic suggestions and records fallback status.
- Skipped status for unsupported or low-confidence items.

#### Evaluation

- server/scripts/check-unified-ai-assistant.js
- server/scripts/stress-ai-assistants.js
- server/scripts/evaluate-ai-golden.js

#### Next Improvements

- Display changed dimension coverage in the admin console.
- Use admin decision memory to adjust deterministic confidence before model review.
- Grow golden ambiguous governance cases from real admin review decisions.

### Model Config and Runtime

- ID: model_config_runtime
- Class: infrastructure
- Entrance: Admin model key workspace
- Maturity: 83%

Provide a shared OpenAI-compatible model configuration, failover, JSON parsing, repair, and streaming retry layer for all agents.

#### Prompt Templates

- json_repair (v1): Regenerate strict JSON when the first model response is malformed.

#### Logic Chain

- Load enabled model configs by priority.
- Resolve task-level runtime policy for timeout, token budget, and temperature.
- Inject shared assistant quality requirements before provider, repair, or injected test-runner calls.
- Call chat completions with timeout controls.
- Extract content and reasoning_content.
- Parse JSON from model text.
- Retry stream mode on empty content.
- Repair invalid JSON through a strict repair prompt.
- Expose attempts and provider status.

#### Standard Libraries

- OpenAI-compatible chat completions contract
- Encrypted API key storage
- TASK_RUNTIME_POLICIES
- Shared AI output quality policy

#### Context / Index / Memory

- ai_model_configs
- task runtime policy registry

#### Validation And Fallback

- Requires database-backed config or injected model runner.
- Rejects missing messages.
- Rejects non-JSON assistant task output.
- Applies central policy defaults before provider calls and injected test runners.
- Never exposes API keys to frontend responses.
- Provider failover.
- Stream retry for empty content.
- JSON repair prompt.
- Injected model runner for tests.

#### Evaluation

- server/scripts/check-unified-ai-runtime.js
- server/scripts/check-hackathon-ai-assistant.js
- server/scripts/stress-ai-assistants.js

#### Next Improvements

- Add circuit breaker status to admin overview.
- Let admin tune safe runtime policy ceilings without code changes.
- Persist longer-term runtime telemetry trend windows.

### Event AI Profile Index

- ID: event_profile_index
- Class: indexing_infrastructure
- Entrance: Backend event assistant index
- Maturity: 88%

Precompute or cache compact activity profiles so recommendation agents can reason quickly over relevant features.

#### Prompt Templates

- event_profile (v1): Extract summary, category, topics, campus, organizer, audience, benefits, and confidence.

#### Logic Chain

- Hash event source fields.
- Reuse existing ready profile when source hash matches.
- Generate a profile through the model when allowed.
- Store ready profile with provider metadata.
- Use deterministic fallback profile when model is skipped or fails.
- Use transient fallback profiles for live recommendation turns when persistence would add latency.
- Refresh stale or missing profiles through a background command.
- Record refresh summaries for coverage and fallback tracking.
- Report coverage to assistant overview.

#### Standard Libraries

- server/src/constants/eventCatalog.js
- server/src/services/eventIntelligenceService.js

#### Context / Index / Memory

- event_ai_profiles
- ai_assistant_runs refresh summaries

#### Validation And Fallback

- Normalizes profile categories.
- Normalizes English and pinyin campus/audience/benefit signals through the shared catalog helpers.
- Clamps confidence.
- Stores source hash and profile version.
- Refresh command only processes approved, non-deleted events.
- Rule profile fallback.
- Cache hit path.
- Transient no-write fallback for request latency.
- Background refresh can run with --no-model to rebuild fallback profiles safely.

#### Evaluation

- server/scripts/check-unified-ai-runtime.js
- server/scripts/stress-ai-assistants.js
- server/scripts/evaluate-ai-golden.js
- server/scripts/refresh-event-ai-profiles.js

#### Next Improvements

- Add embedding-compatible output shape later without changing consumers.
- Schedule refresh runs after large event imports.
- Show stale and missing profile issue trends over time.

## Operating Loop

1. Define target maturity dimensions for the agent.
2. Break the gap into prompt, context, contract, validation, fallback, evaluation, and UI tasks.
3. Implement the smallest safe step.
4. Run registry checks, focused AI checks, lint, and build.
5. Compare actual maturity with the target and repeat.

## Next Iteration Plan

### 1. Hackathon AI Coach / Observability

- Current: partial
- Task: Version the context-card index separately from code.
- Acceptance: Hackathon AI Coach marks Observability as complete or exposes a measurable production signal.

### 2. WeChat Event Parser / Observability

- Current: partial
- Task: Show parser confidence and warnings in the admin form.
- Acceptance: WeChat Event Parser marks Observability as complete or exposes a measurable production signal.

### 3. Event AI Profile Index / Safety and cost

- Current: partial
- Task: Add embedding-compatible output shape later without changing consumers.
- Acceptance: Event AI Profile Index marks Safety and cost as complete or exposes a measurable production signal.

### 4. Event Recommendation Agent / Safety and cost

- Current: partial
- Task: Expose per-agent latency and failure rate in the admin console.
- Acceptance: Event Recommendation Agent marks Safety and cost as complete or exposes a measurable production signal.

### 5. Hackathon AI Coach / Safety and cost

- Current: partial
- Task: Version the context-card index separately from code.
- Acceptance: Hackathon AI Coach marks Safety and cost as complete or exposes a measurable production signal.

### 6. WeChat Event Parser / Safety and cost

- Current: partial
- Task: Show parser confidence and warnings in the admin form.
- Acceptance: WeChat Event Parser marks Safety and cost as complete or exposes a measurable production signal.

### 7. Admin Event Governance Agent / Memory and feedback

- Current: partial
- Task: Display changed dimension coverage in the admin console.
- Acceptance: Admin Event Governance Agent marks Memory and feedback as complete or exposes a measurable production signal.

### 8. Event AI Profile Index / Memory and feedback

- Current: partial
- Task: Add embedding-compatible output shape later without changing consumers.
- Acceptance: Event AI Profile Index marks Memory and feedback as complete or exposes a measurable production signal.

### 9. Hackathon AI Coach / Memory and feedback

- Current: partial
- Task: Version the context-card index separately from code.
- Acceptance: Hackathon AI Coach marks Memory and feedback as complete or exposes a measurable production signal.

### 10. Model Config and Runtime / Memory and feedback

- Current: partial
- Task: Add circuit breaker status to admin overview.
- Acceptance: Model Config and Runtime marks Memory and feedback as complete or exposes a measurable production signal.
