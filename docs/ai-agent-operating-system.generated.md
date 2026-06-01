# AI Agent Operating System

> Generated from `server/src/services/aiAgentRegistryService.js`. Do not hand-edit generated sections; update the registry and rerun `npm --prefix server run agents:spec`.

Generated at: 2026-06-01T16:30:01.504Z

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

- Agent count: 7
- Average maturity: 85%
- High-priority gaps: 0
- Partial maturity gaps: 26

## Runtime Health

- Runtime health is available from admin overview when run data exists.
- Model health is reported without exposing API keys.
- Circuit breaker recommendation is read-only and never disables model configs automatically.

## Agents

### Event Recommendation Agent

- ID: event_recommendation
- Class: user_assistant
- Entrance: Events page AI search
- Maturity: 92%

Understand a campus activity request, read the unified user-system profile, retrieve a safe candidate pool, use model reasoning to rerank, and return explainable recommendations.

#### Prompt Templates

- event_recommendation_intent (v1): Parse user goal, campus, time, benefits, category, and clarification needs.
- event_profile (v1): Build a reusable activity profile from public event metadata.
- event_recommendation_rerank (v1): Rank only validated candidate event IDs and explain matched signals.

#### Logic Chain

- Sanitize query and optional clarification.
- Parse intent with the model and standard fallback intent parser.
- Load durable profile signals from the user system before applying event-specific preference and action evidence.
- Normalize Chinese, English, and pinyin campus/audience terms through the shared standard library.
- Build a candidate pool from approved, non-deleted events.
- Ensure event AI profiles from cache, model, or transient request fallback when the model is skipped.
- Use model rerank over the bounded candidate list.
- Validate returned IDs against the candidate pool.
- Expose user-facing reasoningTrace with ranking basis, uncertainty, and action-evidence usage without leaking hidden chain-of-thought.
- For ambiguous requests, return clarification options plus provisional recommendations instead of a dead-end question.
- Return recommendations, confidence, source signals, warnings, and model status.
- Record recommended event IDs so later favorites, registrations, and feedback can be observed as action evidence.
- Feed bounded action evidence back into recall scoring and model rerank prompts as a personalization signal.
- Record feedback and optional preference memory.

#### Standard Libraries

- server/src/constants/eventCatalog.js
- server/src/services/eventIntelligenceService.js

#### Context / Index / Memory

- users, user_profile_tags, user_profile_cards, user_social_links, and user_identity_claims as the durable user profile foundation
- event_ai_profiles
- assistant_memory
- user_event_preferences
- event_recommendation_feedback
- favorites and event_registrations as post-recommendation action evidence

#### Quality Profile

- Prompt templates: complete; next: Maintain with repeatable checks.
- Logic chain: complete; next: Maintain with repeatable checks.
- Standard libraries: complete; next: Maintain with repeatable checks.
- Context index: complete; next: Maintain with repeatable checks.
- Memory and feedback: complete; next: Maintain with repeatable checks.
- Structured contract: complete; next: Maintain with repeatable checks.
- Validation guardrails: complete; next: Maintain with repeatable checks.
- Fallback recovery: complete; next: Maintain with repeatable checks.
- Evaluation checks: complete; next: Maintain with repeatable checks.
- Observability: complete; next: Maintain with repeatable checks.
- Auto-update spec: partial; next: Schedule generated spec/profile refresh after event catalog, prompt contract, or profile-version changes.
- Safety and cost: partial; next: Expose per-agent latency, failure rate, and token-budget trend signals in the admin console.

#### Related Agents

- event_profile_index (context_profile_dependency): Uses event AI profiles for fast candidate recall and explanation signals.
- model_config_runtime (model_runtime_dependency): Uses the shared runtime for intent parsing, profile generation, reranking, JSON repair, and failover.
- event_governance (data_quality_feedback): Depends on the same event catalog and benefits when admin governance improves event metadata quality.

#### Runtime Observability

- Runtime health is reported in admin overview when run data exists.

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
- golden telemetry check for recommendation action evidence fields
- golden ranking check that action evidence can influence top recommendations
- golden clarification check for reasoning trace, options, and provisional recommendations

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

#### Quality Profile

- Prompt templates: complete; next: Maintain with repeatable checks.
- Logic chain: complete; next: Maintain with repeatable checks.
- Standard libraries: partial; next: Move hackathon rules, event-day strategy cards, and track vocabulary into a versioned standard library.
- Context index: complete; next: Maintain with repeatable checks.
- Memory and feedback: partial; next: Summarize anonymous question categories and coaching outcomes for product tuning without storing raw prompts.
- Structured contract: complete; next: Maintain with repeatable checks.
- Validation guardrails: complete; next: Maintain with repeatable checks.
- Fallback recovery: complete; next: Maintain with repeatable checks.
- Evaluation checks: complete; next: Maintain with repeatable checks.
- Observability: partial; next: Expose aggregate coaching intent categories, confidence buckets, and fallback rate in the admin overview.
- Auto-update spec: partial; next: Version the hackathon context-card index separately from code and show the active version in generated specs.
- Safety and cost: partial; next: Add task-level timeout and token ceilings for hackathon coaching calls in the runtime policy registry.

#### Related Agents

- model_config_runtime (model_runtime_dependency): Uses the shared assistant orchestrator and model runtime for structured coaching output.
- event_recommendation (user_assistant_pattern): Shares the bounded-context user assistant pattern and confidence/fallback response contract.

#### Runtime Observability

- Runtime health is reported in admin overview when run data exists.

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

#### Quality Profile

- Prompt templates: complete; next: Maintain with repeatable checks.
- Logic chain: complete; next: Maintain with repeatable checks.
- Standard libraries: complete; next: Maintain with repeatable checks.
- Context index: partial; next: Persist bounded parse-cache metadata and confidence summaries so repeated URLs do not require full re-analysis.
- Memory and feedback: partial; next: Aggregate parse failure categories and admin corrections for prompt and scraper tuning.
- Structured contract: complete; next: Maintain with repeatable checks.
- Validation guardrails: complete; next: Maintain with repeatable checks.
- Fallback recovery: complete; next: Maintain with repeatable checks.
- Evaluation checks: complete; next: Maintain with repeatable checks.
- Observability: partial; next: Show parser confidence, warnings, provider, and model status directly in the admin form.
- Auto-update spec: partial; next: Refresh parser prompt context automatically when event catalog or academic-calendar context changes.
- Safety and cost: partial; next: Expose parser timeout, scrape failure, model failure, and fallback rates in the admin overview.

#### Related Agents

- model_config_runtime (model_runtime_dependency): Uses the shared runtime for structured article extraction, provider status, and JSON repair.
- event_governance (metadata_quality_handoff): Parser confidence and normalized fields feed the same event metadata quality surface used by governance.
- event_recommendation (shared_event_catalog): Parsed categories, audience, campus, and benefits must match the same catalog used for recommendation intent.
- event_profile_index (profile_source_quality): Cleaner parsed event fields improve downstream event AI profile quality and recommendation recall.

#### Runtime Observability

- Runtime health is reported in admin overview when run data exists.

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

#### Quality Profile

- Prompt templates: complete; next: Maintain with repeatable checks.
- Logic chain: complete; next: Maintain with repeatable checks.
- Standard libraries: complete; next: Maintain with repeatable checks.
- Context index: partial; next: Expose changed-field coverage and recent ambiguous-case distribution in the governance workspace.
- Memory and feedback: partial; next: Use recent applied and skipped admin decisions to adjust deterministic confidence before model review.
- Structured contract: complete; next: Maintain with repeatable checks.
- Validation guardrails: complete; next: Maintain with repeatable checks.
- Fallback recovery: complete; next: Maintain with repeatable checks.
- Evaluation checks: complete; next: Maintain with repeatable checks.
- Observability: complete; next: Maintain with repeatable checks.
- Auto-update spec: partial; next: Regenerate governance guidance when catalog aliases, whitelist fields, or confidence policy changes.
- Safety and cost: complete; next: Maintain with repeatable checks.

#### Related Agents

- event_recommendation (metadata_quality_provider): Improves category and audience quality that recommendation uses for candidate ranking.
- wechat_event_parser (admin_review_continuation): Reviews and repairs metadata originally produced by parsing or manual admin entry.
- model_config_runtime (model_runtime_dependency): Uses shared model review, JSON parsing, and failover for ambiguous governance suggestions.

#### Runtime Observability

- Runtime health is reported in admin overview when run data exists.

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

### Global AI Search Agent

- ID: global_ai_search
- Class: search_retrieval
- Entrance: Global search palette
- Maturity: 83%

Parse natural-language site search requests, retrieve public content across events, AI community, and media library, and return grouped results with match reasons.

#### Prompt Templates

- global_search_query_parser (v1-rule): Map query terms to modules, event categories, campuses, audiences, benefits, media type, and time range without model dependency.

#### Logic Chain

- Sanitize and cap the query.
- Parse module intent, time range, event category, campus, audience, benefits, media type, and keywords.
- Search only approved and non-deleted public content.
- Retrieve events, AI community articles/posts/groups, and media-library photos/videos in parallel.
- Use resource_search_index as a governance-generated supplemental recall index.
- Merge duplicate SQL and index hits by resource type and id.
- Attach match reasons and direct deep links for each result.
- Group results by product area while keeping a flat compatibility list.
- Keep event recommendation assistant separate for profile-driven recommendations.

#### Standard Libraries

- server/src/services/eventIntelligenceService.js
- server/src/constants/eventCatalog.js

#### Context / Index / Memory

- events public metadata
- articles and community_posts public text
- community_groups public metadata
- photos and videos media metadata
- resource_search_index structured summaries, facets, keywords, and vector_json

#### Quality Profile

- Prompt templates: partial; next: Replace rule-only parser with a bounded structured model parser when evaluation cases are available.
- Logic chain: complete; next: Maintain with repeatable checks.
- Standard libraries: complete; next: Maintain with repeatable checks.
- Context index: complete; next: Improve resource_search_index recall with model embeddings and scheduled refresh cadence.
- Memory and feedback: partial; next: Aggregate anonymous no-result and click-through signals for search quality tuning.
- Structured contract: complete; next: Maintain with repeatable checks.
- Validation guardrails: complete; next: Maintain with repeatable checks.
- Fallback recovery: complete; next: Maintain with repeatable checks.
- Evaluation checks: partial; next: Add deterministic fixture checks for events, community, media, no-result, and module-only queries.
- Observability: complete; next: Expose search group counts and no-result rates in the admin AI overview.
- Auto-update spec: partial; next: Regenerate search guidance when searchable modules or index schemas change.
- Safety and cost: complete; next: Maintain with repeatable checks.

#### Related Agents

- event_recommendation (parallel_user_assistant): Global search finds resources across the site; event recommendation uses user profiles and action evidence for personalized activity suggestions.
- event_governance (index_quality_provider): Governance refresh jobs maintain structured resource summaries and index coverage for global search.
- event_profile_index (event_context_index_provider): Event profiles enrich the event rows that are folded into the global resource search index.

#### Runtime Observability

- Runtime health is reported in admin overview when run data exists.

#### Validation And Fallback

- Requires query length >= 2.
- Restricts all result queries to approved, non-deleted public resources.
- Returns deterministic deep links scoped to the owning module.
- Does not perform side-effect actions such as favorite, registration, review, or delete.
- Index refresh only writes rows for public approved resources and prunes unavailable rows.
- Rule and SQL matching without model dependency.
- Search remains usable when resource_search_index is empty or unavailable.
- Empty grouped response when no public match exists.
- Legacy flat result list for older UI assumptions.

#### Evaluation

- server/scripts/check-ai-agent-registry.js
- server/scripts/refresh-resource-search-index.js
- manual /api/search smoke checks
- frontend build for SearchPalette integration

#### Next Improvements

- Replace local vector_json with model embeddings or an external vector store behind the same contract.
- Let governance jobs upgrade summaries with model-generated resource quality notes.
- Collect anonymous aggregate search failure categories for index tuning.

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

#### Quality Profile

- Prompt templates: partial; next: Version shared quality and JSON repair prompt templates with explicit task owners.
- Logic chain: complete; next: Maintain with repeatable checks.
- Standard libraries: partial; next: Move runtime provider rules, task ceilings, and repair policy into a documented standard library.
- Context index: complete; next: Maintain with repeatable checks.
- Memory and feedback: partial; next: Persist longer-term runtime telemetry trend windows and provider health history.
- Structured contract: complete; next: Maintain with repeatable checks.
- Validation guardrails: complete; next: Maintain with repeatable checks.
- Fallback recovery: complete; next: Maintain with repeatable checks.
- Evaluation checks: complete; next: Maintain with repeatable checks.
- Observability: complete; next: Maintain with repeatable checks.
- Auto-update spec: partial; next: Regenerate runtime policy documentation when task policy or provider priority changes.
- Safety and cost: complete; next: Maintain with repeatable checks.

#### Related Agents

- event_recommendation (runtime_provider): Provides model calls, JSON repair, failover, and task policy for event recommendation.
- hackathon_coach (runtime_provider): Provides structured coaching calls and fallback metadata for the hackathon assistant.
- wechat_event_parser (runtime_provider): Provides structured parse calls, provider status, and repair for content extraction.
- event_governance (runtime_provider): Provides bounded model review for ambiguous governance suggestions.
- event_profile_index (runtime_provider): Provides profile generation calls and fallback status for index refreshes.

#### Runtime Observability

- Runtime health is reported in admin overview when run data exists.

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

#### Quality Profile

- Prompt templates: complete; next: Maintain with repeatable checks.
- Logic chain: complete; next: Maintain with repeatable checks.
- Standard libraries: complete; next: Maintain with repeatable checks.
- Context index: complete; next: Maintain with repeatable checks.
- Memory and feedback: partial; next: Track which profile issue reasons later correlate with poor recommendation feedback.
- Structured contract: complete; next: Maintain with repeatable checks.
- Validation guardrails: complete; next: Maintain with repeatable checks.
- Fallback recovery: complete; next: Maintain with repeatable checks.
- Evaluation checks: complete; next: Maintain with repeatable checks.
- Observability: complete; next: Maintain with repeatable checks.
- Auto-update spec: partial; next: Schedule profile refresh after large event imports and catalog/profile-version changes.
- Safety and cost: partial; next: Add embedding-compatible profile fields without changing current consumers or increasing live request latency.

#### Related Agents

- event_recommendation (context_index_provider): Supplies compact event profiles used by recommendation recall, reranking, and explanation.
- model_config_runtime (model_runtime_dependency): Uses the shared runtime for profile generation and fallback-aware refreshes.
- wechat_event_parser (source_quality_consumer): Profile quality depends on parsed event fields and standard catalog normalization.

#### Runtime Observability

- Runtime health is reported in admin overview when run data exists.

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
- Task: Expose aggregate coaching intent categories, confidence buckets, and fallback rate in the admin overview.
- Acceptance: Hackathon AI Coach marks Observability as complete or exposes a measurable production signal.

### 2. WeChat Event Parser / Observability

- Current: partial
- Task: Show parser confidence, warnings, provider, and model status directly in the admin form.
- Acceptance: WeChat Event Parser marks Observability as complete or exposes a measurable production signal.

### 3. Event AI Profile Index / Safety and cost

- Current: partial
- Task: Add embedding-compatible profile fields without changing current consumers or increasing live request latency.
- Acceptance: Event AI Profile Index marks Safety and cost as complete or exposes a measurable production signal.

### 4. Event Recommendation Agent / Safety and cost

- Current: partial
- Task: Expose per-agent latency, failure rate, and token-budget trend signals in the admin console.
- Acceptance: Event Recommendation Agent marks Safety and cost as complete or exposes a measurable production signal.

### 5. Hackathon AI Coach / Safety and cost

- Current: partial
- Task: Add task-level timeout and token ceilings for hackathon coaching calls in the runtime policy registry.
- Acceptance: Hackathon AI Coach marks Safety and cost as complete or exposes a measurable production signal.

### 6. WeChat Event Parser / Safety and cost

- Current: partial
- Task: Expose parser timeout, scrape failure, model failure, and fallback rates in the admin overview.
- Acceptance: WeChat Event Parser marks Safety and cost as complete or exposes a measurable production signal.

### 7. Admin Event Governance Agent / Memory and feedback

- Current: partial
- Task: Use recent applied and skipped admin decisions to adjust deterministic confidence before model review.
- Acceptance: Admin Event Governance Agent marks Memory and feedback as complete or exposes a measurable production signal.

### 8. Event AI Profile Index / Memory and feedback

- Current: partial
- Task: Track which profile issue reasons later correlate with poor recommendation feedback.
- Acceptance: Event AI Profile Index marks Memory and feedback as complete or exposes a measurable production signal.

### 9. Global AI Search Agent / Memory and feedback

- Current: partial
- Task: Aggregate anonymous no-result and click-through signals for search quality tuning.
- Acceptance: Global AI Search Agent marks Memory and feedback as complete or exposes a measurable production signal.

### 10. Hackathon AI Coach / Memory and feedback

- Current: partial
- Task: Summarize anonymous question categories and coaching outcomes for product tuning without storing raw prompts.
- Acceptance: Hackathon AI Coach marks Memory and feedback as complete or exposes a measurable production signal.
