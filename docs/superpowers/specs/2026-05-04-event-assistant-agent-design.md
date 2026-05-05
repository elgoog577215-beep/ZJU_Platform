# Event Assistant Agent Design

Date: 2026-05-04

## Goal

Upgrade the current activity AI search into a controlled event recommendation agent that understands:

- The event database and activity lifecycle
- Existing activity categories, tags, school/college audience taxonomy, and benefit fields
- Logged-in user preferences, profile fields, favorites, registrations, and browsing signals
- Administrator-managed AI model keys with failover

The first release should improve recommendation quality without rewriting the existing backend. The current `/api/events/assistant` endpoint remains the public entry point, but its internals become an agent orchestration layer backed by deterministic recommendation services.

## Approved Decisions

- The first version must include user profiles for logged-in users.
- Profile fields include college/department, school division, grade, campus, interest tags, comprehensive-evaluation preference, volunteer-hour preference, online/offline preference, and activity type preference.
- Upcoming activities have the highest priority. Ongoing activities are secondary. Past activities are only fallback recommendations and must be labeled as historical review material.
- First-version agent actions are limited to recommendation, explanation, one-step clarification, and remembering explicit preferences.
- The system continues using API-key based model calls.
- Admins need an AI key manager that can store multiple model configurations, test them, and automatically fail over when one key or provider fails.

## Non-Goals

- Do not auto-register users for events.
- Do not auto-favorite events.
- Do not auto-subscribe users to reminders in the first version.
- Do not replace existing event CRUD, favorites, registrations, or activity list APIs.
- Do not rely on a pure LLM recommendation flow that can recommend events outside the database.
- Do not send raw user behavior histories to the model when a local summarized profile is enough.

## Current Baseline

The project already has enough foundations to build a stronger assistant:

- `events`: title, date, end date, location, tags, status, image, description, content, link, featured flag, likes, views, uploader, score, target audience, organizer, volunteer time, category, and soft-delete state.
- `favorites`: user favorites for event and other resource types.
- `event_registrations`: event registration records.
- `event_view_events`: anonymous visitor-key based event view events.
- `tags`: centralized tag records.
- `users`: basic profile fields such as organization and organization certification.
- `src/data/eventTaxonomy.js`: frontend activity categories, aliases, and school/college audience options.
- `server/src/controllers/resourceController.js`: backend activity category filters and distinct event options.
- `server/src/utils/eventAssistant.js`: current assistant flow that selects a scoped candidate pool and asks the model to recommend, clarify, or return empty.

The main weakness is that the current assistant is model-centric. It does not yet have a durable user profile, deterministic ranking, model-key failover, or a rich explanation contract.

## Architecture

Use a single controlled agent with multiple backend tools:

```text
/api/events/assistant
  -> eventAssistantController
    -> EventAssistantAgent
      -> EventIntentService
      -> UserEventProfileService
      -> EventKnowledgeService
      -> EventRetrievalService
      -> EventRankingService
      -> EventExplanationService
      -> AssistantMemoryService
      -> AiModelConfigService
```

### EventAssistantAgent

The agent coordinates one assistant turn. It does not directly search every table or trust model output for database correctness.

Responsibilities:

- Validate the request.
- Parse the user intent into structured constraints.
- Load user profile when authenticated.
- Load event taxonomy and field semantics.
- Retrieve eligible candidate activities.
- Rank candidates with deterministic scoring.
- Decide whether to clarify, recommend, or return empty.
- Ask the model only for natural-language explanation and optional clarification wording.
- Return a UI-ready response.
- Store explicit user preferences only when the user clearly asks the assistant to remember them.

### EventIntentService

Parses user input into a normalized intent object.

Example:

```json
{
  "topics": ["AI", "技术创新"],
  "categoryHints": ["tech_innovation"],
  "lifecyclePreference": "upcoming_preferred",
  "locationMode": "offline",
  "audienceHints": ["新生", "全校"],
  "benefitHints": ["score", "volunteer_time"],
  "timeHints": ["this_weekend"],
  "mustHave": [],
  "niceToHave": ["线下", "适合新生", "有综测或志愿时长"]
}
```

Intent parsing can start with deterministic keyword/alias extraction. LLM-based parsing can be added later if needed, but the first version should not require the LLM to parse every request.

### UserEventProfileService

Builds a recommendation-safe user profile from explicit preferences and local behavior signals.

Profile inputs:

- User account fields
- `user_event_preferences`
- `assistant_memory`
- Event favorites
- Event registrations
- Event views
- Optional user feedback from previous recommendations

The service returns summarized tags and weights, not raw history dumps.

Example:

```json
{
  "college": "计算机科学与技术学院",
  "division": "信息学部",
  "grade": "本科一年级",
  "campus": "紫金港",
  "preferredCategories": [
    { "value": "tech_innovation", "weight": 0.82 },
    { "value": "competition_project", "weight": 0.45 }
  ],
  "preferredTags": [
    { "value": "AI", "weight": 0.9 },
    { "value": "黑客松", "weight": 0.62 }
  ],
  "benefitPreferences": {
    "score": true,
    "volunteerTime": false
  },
  "locationMode": "offline"
}
```

### EventKnowledgeService

Provides backend-owned taxonomy so both the assistant and filters use the same meanings.

Responsibilities:

- Move or mirror activity categories and aliases from frontend taxonomy into backend shared code.
- Normalize category labels such as `AI`, `人工智能`, `技术创新`, and `黑客松`.
- Normalize audience fields such as `全校`, college names, school divisions, and new-student variants.
- Normalize benefit fields such as comprehensive evaluation, volunteer hours, certificates, competitions, workshops, and lectures.
- Provide lifecycle classification: upcoming, ongoing, past, unknown.

### EventRetrievalService

Retrieves candidate events from the database before ranking.

Candidate policy:

- Always exclude deleted and unapproved events.
- Default scope: upcoming first.
- Include ongoing if upcoming candidates are too weak or too few.
- Include past only if no suitable upcoming/ongoing result exists.
- Use event category, tags, title, description, organizer, target audience, location, score, and volunteer time as searchable fields.
- Keep a bounded candidate pool for model cost and latency.

### EventRankingService

Ranks candidate events deterministically. This is the recommendation foundation and must be testable without model access.

Recommended scoring components:

```text
finalScore =
  topicMatch
  + categoryMatch
  + userProfileMatch
  + audienceMatch
  + lifecycleScore
  + benefitMatch
  + locationMatch
  + popularityScore
  + freshnessScore
  + diversityBoost
  - mismatchPenalty
  - pastEventPenalty
```

Important rules:

- Future activities outrank past activities.
- Past activities can still appear only as clearly marked historical fallback items.
- A strong explicit user request can override weaker implicit profile signals.
- User favorites and registrations should influence preferences, but should not blindly repeat already-registered events unless useful.
- The service should produce machine-readable explanation signals, for example `["topic:AI", "benefit:score", "audience:全校"]`.

### EventExplanationService

Calls the model to explain already-ranked results. It must not let the model invent activity IDs.

Inputs:

- User intent summary
- User profile summary
- Ranked candidates with explanation signals
- Whether results include past activities

Outputs:

- Assistant summary
- Optional one-step clarification question
- Per-event explanation
- Warnings or caveats
- UI chips representing understood needs

If model access fails, the service must return deterministic template explanations from ranking signals.

### AssistantMemoryService

Stores only explicit user preferences. Examples:

- "以后多给我推荐 AI 比赛"
- "我更想要线下活动"
- "我不想看历史活动"

It should not silently turn every click into long-term memory. Clicks, views, and favorites belong to behavior signals in the profile service, not conversational memory.

## Data Model

### `user_event_preferences`

Stores explicit structured profile fields.

Suggested columns:

- `id`
- `user_id`
- `college`
- `division`
- `grade`
- `campus`
- `interest_tags` JSON text
- `preferred_categories` JSON text
- `benefit_preferences` JSON text
- `location_mode`
- `created_at`
- `updated_at`

### `assistant_memory`

Stores explicit natural-language preferences accepted by the assistant.

Suggested columns:

- `id`
- `user_id`
- `scope` such as `events`
- `memory_type` such as `preference`
- `content`
- `structured_value` JSON text
- `source_message`
- `created_at`
- `updated_at`
- `deleted_at`

### `event_recommendation_feedback`

Records whether recommendations helped.

Suggested columns:

- `id`
- `user_id`
- `event_id`
- `assistant_run_id`
- `feedback_type` such as `helpful`, `not_interested`, `opened`, `favorited`, `registered`
- `reason`
- `created_at`

### `event_ai_profiles`

Optional cache for event-level AI summaries and enriched tags. This can be implemented after the MVP if needed.

Suggested columns:

- `id`
- `event_id`
- `summary`
- `audience_tags` JSON text
- `benefit_tags` JSON text
- `topic_tags` JSON text
- `embedding_text`
- `generated_at`
- `updated_at`

### `ai_model_configs`

Stores administrator-managed model keys and routing information.

Suggested columns:

- `id`
- `name`
- `provider`
- `base_url`
- `model`
- `api_key_ciphertext`
- `priority`
- `enabled`
- `health_status`
- `failure_count`
- `last_error`
- `last_success_at`
- `last_failure_at`
- `created_at`
- `updated_at`

Security requirements:

- Never return full API keys to the frontend.
- Show only a masked key preview such as `sk-...abcd`.
- Do not log full API keys.
- Encrypt API keys at rest using a server-side secret such as `AI_CONFIG_ENCRYPTION_KEY`.
- If database configs do not exist, the existing environment variables may be used as a fallback for local development.

## AI Key Manager

Add an admin-only AI model configuration section.

Capabilities:

- List configured model providers.
- Add a provider config.
- Edit name, provider, base URL, model, priority, and enabled state.
- Replace API key.
- Test connection.
- Show health state, recent error, recent success time, and failure count.
- Disable a broken config manually.

Failover behavior:

- Sort enabled configs by priority.
- Try the first healthy config.
- On timeout, 401, 403, 429, or repeated 5xx failures, mark the config degraded and try the next one.
- If all database configs fail, optionally try environment fallback.
- If all fail, return a graceful assistant response with deterministic local recommendations and a note that AI explanation is temporarily unavailable.

## API Contract

Keep:

```text
POST /api/events/assistant
```

Request:

```json
{
  "query": "想找 AI 相关活动，最好线下、适合新生、有综测",
  "clarificationAnswer": "",
  "clarificationUsed": false,
  "allowHistoricalFallback": true,
  "rememberPreference": false
}
```

Response:

```json
{
  "type": "recommend",
  "scope": "upcoming",
  "understoodIntent": {
    "chips": ["AI", "线下", "新生", "综测"]
  },
  "summary": "我优先筛选了未开始、AI 相关、适合新生且有收益标记的活动。",
  "recommendations": [
    {
      "id": 2,
      "event": {},
      "score": 82,
      "reason": "匹配 AI 和学习效率主题，地点为线下报告厅，面向全校师生。",
      "matchSignals": ["topic:AI", "location:offline", "audience:全校"],
      "warnings": [],
      "isHistorical": false
    }
  ],
  "actions": [
    { "type": "open_event", "label": "查看详情" },
    { "type": "remember_preference", "label": "记住这个偏好" }
  ]
}
```

Clarification response:

```json
{
  "type": "clarify",
  "question": "你更想要未来可报名活动，还是也接受历史回顾资料？",
  "understoodIntent": {
    "chips": ["AI"]
  }
}
```

Empty response:

```json
{
  "type": "empty",
  "scope": "upcoming",
  "summary": "暂时没有符合条件的未开始活动。",
  "suggestions": ["放宽时间范围", "查看历史活动", "关注类似活动"]
}
```

Admin APIs:

```text
GET    /api/admin/ai-model-configs
POST   /api/admin/ai-model-configs
PUT    /api/admin/ai-model-configs/:id
POST   /api/admin/ai-model-configs/:id/test
DELETE /api/admin/ai-model-configs/:id
```

Deleting a config can be implemented as disabling first if hard deletion is not desired.

## Frontend UX

Upgrade the current `AI 搜索 Beta` mode into an `AI 活动助手` experience.

Desktop:

- Keep the mode toggle, but make the assistant panel feel like a primary discovery tool rather than only a filter alternative.
- Show "我理解你想找" chips after submission.
- Show recommendation cards with score hints, match reasons, warnings, and historical labels.
- Add feedback controls: `适合我`, `不感兴趣`, and `记住偏好`.
- Do not hide historical fallback. Label it clearly.

Mobile:

- The assistant should not be buried only inside the filter sheet.
- Add a visible AI assistant entry near the top activity toolbar.
- Keep the sheet as an expanded editing surface if space is limited.

Admin:

- Add an AI model configuration section in the existing admin console.
- Use masked keys, health badges, priority ordering, and a test button.
- Do not show full API keys after save.

## Privacy And Safety

- Use authenticated user data only for that user's recommendations.
- Summarize user profile locally before model calls.
- Avoid sending raw browsing history, raw favorites lists, or raw registration lists to the model unless required for a specific explanation.
- Never allow model output to create event IDs or recommend database-external activities.
- Treat event descriptions and user-generated activity content as untrusted data in model prompts.
- Log assistant failures without sensitive data.

## Error Handling

The assistant must handle:

- No upcoming activities.
- No matching activities.
- Only historical matches.
- User not logged in.
- Model key missing.
- Model key invalid.
- Provider timeout.
- Provider rate limiting.
- Model returns invalid JSON.
- Database profile tables unavailable during rollout.

Fallback principle:

If the model fails but deterministic ranking succeeds, still show recommendations with template explanations.

## Testing Plan

Backend tests:

- Intent extraction from Chinese activity queries.
- Lifecycle ordering: upcoming before ongoing before past.
- Historical fallback appears only when future matches are absent or too weak.
- Ranking rewards category, tag, audience, benefit, and profile matches.
- Ranking penalizes irrelevant and past events.
- Logged-in profile influences ordering.
- Anonymous users still receive sensible recommendations.
- Model failover tries the next enabled config.
- Invalid model output falls back safely.
- API keys are masked in admin responses.

Frontend tests:

- Assistant renders initial state on desktop and mobile.
- Submitting a query shows understood chips.
- Recommendation card opens event detail.
- Historical recommendation displays a clear historical label.
- Empty state offers useful next steps.
- Admin AI model config list masks keys.
- Admin test connection shows success and failure states.

Manual acceptance:

- A user asking for AI, offline, new-student-friendly activities sees relevant matches first.
- If no future activity exists, the assistant says so and labels any historical fallback.
- A logged-in user with saved AI/competition interests receives more relevant results than an anonymous user.
- If the first model key fails, the system uses another configured key or falls back gracefully.

## Rollout Plan

### Phase 1: Controlled Recommender Agent

- Introduce the agent service layer behind `/api/events/assistant`.
- Add deterministic retrieval and ranking.
- Add template fallback explanations.
- Preserve the current UI enough to avoid a large frontend dependency.

### Phase 2: User Profiles And Memory

- Add user preference tables.
- Add profile editor fields or onboarding prompts.
- Use favorites, registrations, and event views as summarized profile signals.
- Add explicit preference memory.

### Phase 3: Admin AI Key Manager

- Add model config schema.
- Add admin APIs.
- Add admin UI.
- Add failover and health tracking.

This phase can be implemented before Phase 2 if model operations are the larger blocker.

### Phase 4: UI Upgrade And Feedback Loop

- Upgrade the assistant panel UI.
- Add understood chips, match reasons, warnings, historical fallback labels, and feedback controls.
- Record feedback and use it in later ranking.

## Acceptance Criteria

- `/api/events/assistant` keeps working for existing callers.
- Recommendations are limited to approved, non-deleted database events.
- User profile signals affect logged-in recommendations.
- Historical activities are low priority and clearly labeled.
- AI key management supports multiple configs and failover.
- The assistant can still return useful results when the model is unavailable.
- Admins can manage model keys without exposing full secrets.
- The UI communicates why each activity was recommended.

