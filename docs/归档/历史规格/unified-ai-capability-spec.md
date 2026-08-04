# Spec: Unified AI Capability Layer

## Why

The site currently has several AI-branded workflows: event recommendation, WeChat parsing, model key management, and admin governance. The event assistant still relies heavily on deterministic scoring and only uses the model for copy polishing. This makes the product feel like a search tool with an AI label instead of a real AI assistant.

The target is a shared AI capability layer: every AI workflow uses the same model routing, JSON contract validation, standard event taxonomy, confidence reporting, and traceable run metadata. Fast lookup is still allowed, but only as candidate retrieval; user intent understanding and final recommendation ranking must involve the model.

## Goals

- Build one reusable server-side AI runtime for structured JSON calls, model failover, content extraction, and error metadata.
- Create an event AI profile index stored in SQLite so events are analyzed once and reused quickly.
- Make event recommendation use a model-driven flow: parse user intent with AI, retrieve candidates from AI profiles, then ask AI to rerank and explain.
- Make WeChat parsing reuse the unified AI runtime instead of direct `axios` model calls.
- Expose enough status in responses and admin overview to prove model participation, profile coverage, and fallback attempts.

## Non-goals

- No external vector database in this first implementation.
- No destructive rewrite of existing event data.
- No automatic high-risk data migration that changes event fields without admin review.
- No frontend redesign beyond small wording/status changes needed to stop calling model-backed recommendations "rules".

## Architecture

```text
AI model configs
  -> unifiedAiRuntime.callJson()
  -> capability-specific prompts and schema guards
  -> eventAiProfileService
  -> eventAssistant recommendation pipeline
  -> WeChat parser and admin AI overview
```

Event recommendation becomes:

```text
User query
  -> AI intent parser
  -> ensure / build event_ai_profiles
  -> fast candidate recall from profile JSON + event fields
  -> AI reranker with candidate evidence
  -> validated ranked event IDs + reasons + confidence
```

## Database

Add `event_ai_profiles`:

- `event_id` primary key, references `events(id)`
- `profile_json` for structured AI analysis
- `summary`, `topic_terms`, `benefit_terms`, `campus_terms`, `audience_terms`, `organizer_terms`
- `source_hash` to detect stale profiles after event edits
- `model_name`, `model_provider`, `confidence`, `status`, `last_error`
- timestamps

Indexes cover status, source hash, and coarse terms. A missing or stale profile is generated on demand; batch rebuild can be added later as an admin action.

## AI Contracts

Event profile output:

```json
{
  "summary": "short Chinese event summary",
  "category": "lecture",
  "topics": ["AI", "澶фā鍨?],
  "campuses": ["绱噾娓?],
  "organizers": ["璁＄畻鏈哄闄?],
  "audiences": ["鍏ㄦ牎"],
  "benefits": ["缁兼祴"],
  "time_preference_terms": ["鍛ㄤ簲", "鏅氫笂"],
  "confidence": 0.82,
  "rationale": "why these labels were selected"
}
```

Intent output:

```json
{
  "query_summary": "user wants an AI activity with score benefit",
  "topics": ["AI"],
  "campuses": ["绱噾娓?],
  "organizers": ["璁＄畻鏈哄闄?],
  "benefits": ["缁兼祴"],
  "categories": ["lecture"],
  "date_constraints": ["this_week"],
  "allow_historical": false,
  "needs_clarification": false,
  "clarification_question": "",
  "confidence": 0.8
}
```

Rerank output:

```json
{
  "summary": "short Chinese summary",
  "recommendations": [
    {
      "id": 12,
      "rank": 1,
      "confidence": 0.88,
      "reason": "why this event fits",
      "matched_signals": ["AI涓婚", "绱噾娓?, "鏈夌患娴?]
    }
  ]
}
```

## Scenarios

### Scenario: User asks for a specific event

GIVEN the event database has approved events and AI profiles
WHEN the user asks for a date, college, topic, or benefit
THEN the backend parses the query with AI, recalls candidates from event profiles, reranks with AI, and returns ranked results with reasons and confidence.

### Scenario: Events have no profiles yet

GIVEN profiles are missing or stale
WHEN the user asks the assistant
THEN the backend builds profiles for candidate events on demand before reranking, and includes profile coverage in the response.

### Scenario: Model temporarily fails

GIVEN no enabled AI model succeeds
WHEN a user asks the assistant
THEN the response must clearly say the AI model was unavailable instead of silently presenting rule-only results as AI.

### Scenario: WeChat article parsing

GIVEN an admin imports a WeChat article
WHEN the article is parsed
THEN the parser uses the unified AI runtime and the same event taxonomy context.

## Impact

- Frontend: small wording/status change in the event assistant result badge.
- Backend: new AI runtime service, new event profile service, event assistant pipeline changes, WeChat parser runtime reuse.
- Database: additive `event_ai_profiles` table and indexes.
- AI / standard data: all event recommendation and parsing requests use model-backed JSON contracts.
- Deployment: server restart and additive migration are required; no database file should be committed.

## Risks

- Model output can be invalid JSON. Mitigation: extract JSON, validate IDs, clamp confidence, and fail loudly when no valid model result exists.
- On-demand profiling can add latency. Mitigation: profile only bounded candidate sets and persist results by source hash.
- Existing old checks may assume rule-only governance behavior. Mitigation: add focused checks for the new AI runtime and profile pipeline, then keep old governance checks noted separately if they fail for unrelated reasons.
- Secrets must not be committed. Mitigation: key remains in ignored `server/.env`; only examples and code are committed.

## Tasks

- [ ] Add unified AI runtime helpers for JSON calls and message extraction.
- [ ] Add `event_ai_profiles` migration and service.
- [ ] Refactor event recommendation to AI intent parse + profile recall + AI rerank.
- [ ] Refactor WeChat parser to use the unified AI runtime.
- [ ] Update event assistant UI status wording.
- [ ] Add or update verification scripts for the unified AI pipeline.
- [ ] Run lint, build, focused AI checks, browser smoke test, secret scan.

## Acceptance

- [ ] Event assistant responses include `modelStatus.used = true` when a model call succeeds.
- [ ] Recommendations are ranked by model output using validated event IDs.
- [ ] Missing profiles are generated and persisted without mutating event rows.
- [ ] WeChat parsing no longer performs a direct model `axios.post`.
- [ ] If the model fails, the UI/backend do not pretend rule-only output is AI.
- [ ] No `.env`, API key, database, upload, `dist`, or `output` artifacts are staged or pushed.
