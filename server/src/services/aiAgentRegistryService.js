const path = require('path');

const MATURITY_DIMENSIONS = [
  {
    id: 'prompt_templates',
    label: 'Prompt templates',
    goal: 'Prompts are named, versioned, scoped, and tied to an output contract.',
  },
  {
    id: 'reasoning_chain',
    label: 'Logic chain',
    goal: 'The agent has an explicit sequence from intent to context, model reasoning, validation, and response.',
  },
  {
    id: 'standard_libraries',
    label: 'Standard libraries',
    goal: 'The agent uses shared catalogs instead of inventing categories, labels, or business rules.',
  },
  {
    id: 'context_index',
    label: 'Context index',
    goal: 'The agent can use prebuilt profiles, cards, or indexes before sending a small context to the model.',
  },
  {
    id: 'memory_feedback',
    label: 'Memory and feedback',
    goal: 'The agent can learn from preferences, feedback, or admin decisions where appropriate.',
  },
  {
    id: 'structured_contract',
    label: 'Structured contract',
    goal: 'Model output is JSON-shaped, normalized, and stable for frontend rendering.',
  },
  {
    id: 'validation_guardrails',
    label: 'Validation guardrails',
    goal: 'Unknown IDs, unsupported values, unsafe writes, and hallucinated fields are rejected or downgraded.',
  },
  {
    id: 'fallback_recovery',
    label: 'Fallback recovery',
    goal: 'The user still gets an honest, useful answer when the model fails or times out.',
  },
  {
    id: 'evaluation_checks',
    label: 'Evaluation checks',
    goal: 'There are repeatable checks proving success, fallback, and critical ranking/parse behavior.',
  },
  {
    id: 'observability',
    label: 'Observability',
    goal: 'Runs expose model status, provider/model, confidence, sources, and warnings.',
  },
  {
    id: 'auto_update',
    label: 'Auto-update spec',
    goal: 'The agent registry can regenerate docs and health summaries from code.',
  },
  {
    id: 'safety_cost',
    label: 'Safety and cost',
    goal: 'The agent has clear permissions, data boundaries, timeout/cost controls, and protected write paths.',
  },
];

const statusWeight = {
  complete: 1,
  partial: 0.5,
  planned: 0,
  missing: 0,
};

const dimensionIds = new Set(MATURITY_DIMENSIONS.map((item) => item.id));

const AGENT_DEFINITIONS = [
  {
    id: 'event_recommendation',
    title: 'Event Recommendation Agent',
    agentClass: 'user_assistant',
    productEntrance: 'Events page AI search',
    api: [
      'POST /api/events/assistant',
      'POST /api/events/assistant/feedback',
      'GET /api/events/assistant/preferences',
      'PUT /api/events/assistant/preferences',
    ],
    frontend: [
      'src/components/EventAssistantPanel.jsx',
      'src/components/MobileEventAssistantFullscreen.jsx',
      'src/components/Events.jsx',
    ],
    backend: [
      'server/src/controllers/eventAssistantController.js',
      'server/src/utils/eventAssistant.js',
      'server/src/services/eventAiProfileService.js',
      'server/src/services/unifiedAiRuntimeService.js',
    ],
    goal: 'Understand a campus activity request, retrieve a safe candidate pool, use model reasoning to rerank, and return explainable recommendations.',
    promptTemplates: [
      {
        id: 'event_recommendation_intent',
        version: 'v1',
        purpose: 'Parse user goal, campus, time, benefits, category, and clarification needs.',
      },
      {
        id: 'event_profile',
        version: 'v1',
        purpose: 'Build a reusable activity profile from public event metadata.',
      },
      {
        id: 'event_recommendation_rerank',
        version: 'v1',
        purpose: 'Rank only validated candidate event IDs and explain matched signals.',
      },
    ],
    reasoningChain: [
      'Sanitize query and optional clarification.',
      'Parse intent with the model and standard fallback intent parser.',
      'Normalize Chinese, English, and pinyin campus/audience terms through the shared standard library.',
      'Build a candidate pool from approved, non-deleted events.',
      'Ensure event AI profiles from cache, model, or transient request fallback when the model is skipped.',
      'Use model rerank over the bounded candidate list.',
      'Validate returned IDs against the candidate pool.',
      'Expose user-facing reasoningTrace with ranking basis, uncertainty, and action-evidence usage without leaking hidden chain-of-thought.',
      'For ambiguous requests, return clarification options plus provisional recommendations instead of a dead-end question.',
      'Return recommendations, confidence, source signals, warnings, and model status.',
      'Record recommended event IDs so later favorites, registrations, and feedback can be observed as action evidence.',
      'Feed bounded action evidence back into recall scoring and model rerank prompts as a personalization signal.',
      'Record feedback and optional preference memory.',
    ],
    standardLibraries: [
      'server/src/constants/eventCatalog.js',
      'server/src/services/eventIntelligenceService.js',
    ],
    contextIndexes: [
      'event_ai_profiles',
      'assistant_memory',
      'user_event_preferences',
      'event_recommendation_feedback',
      'favorites and event_registrations as post-recommendation action evidence',
    ],
    outputContracts: [
      'clarify',
      'recommend',
      'empty',
      'reasoningTrace',
      'clarificationOptions',
      'provisionalRecommendations',
    ],
    validation: [
      'Rejects invalid assistant state flags.',
      'Normalizes Zijingang/Yuquan/all students/undergraduate-style aliases before ranking.',
      'Validates model event IDs against the current candidate pool.',
      'Filters pending/deleted events out of recommendations.',
      'Keeps historical fallback explicit and lower priority.',
    ],
    fallback: [
      'Intent parser fallback.',
      'Transient profile fallback for request latency without writing to the index.',
      'Semantic/local ranking fallback.',
      'Explicit assistant_unreliable empty state when validation fails.',
    ],
    observability: [
      'modelStatus.tasks',
      'profileStats',
      'warnings',
      'coverage',
      'feedback rows',
      'recommendation action evidence status',
      'action-evidence ranking signals',
      'reasoning trace strength and weak preference signals',
      'clarification option and provisional recommendation counts',
      'post-recommendation favorites and registrations',
      'anonymous ai_assistant_runs turn summaries',
    ],
    evaluation: [
      'server/scripts/check-unified-ai-runtime.js',
      'server/scripts/verify_event_assistant.js',
      'server/scripts/stress-ai-assistants.js',
      'server/scripts/evaluate-ai-golden.js, including model-failure transient-profile performance coverage',
      'golden telemetry check for recommendation action evidence fields',
      'golden ranking check that action evidence can influence top recommendations',
      'golden clarification check for reasoning trace, options, and provisional recommendations',
    ],
    autoUpdateTriggers: [
      'Event catalog changes',
      'Prompt contract changes',
      'Event profile version changes',
      'Feedback schema changes',
    ],
    nextImprovements: [
      'Expose per-agent latency and failure rate in the admin console.',
      'Add async profile refresh for large event pools.',
      'Grow the golden ranking set with real anonymized user queries.',
    ],
    relatedAgents: [
      {
        id: 'event_profile_index',
        relationship: 'context_profile_dependency',
        reason: 'Uses event AI profiles for fast candidate recall and explanation signals.',
      },
      {
        id: 'model_config_runtime',
        relationship: 'model_runtime_dependency',
        reason: 'Uses the shared runtime for intent parsing, profile generation, reranking, JSON repair, and failover.',
      },
      {
        id: 'event_governance',
        relationship: 'data_quality_feedback',
        reason: 'Depends on the same event catalog and benefits when admin governance improves event metadata quality.',
      },
    ],
    qualityBacklog: {
      auto_update: 'Schedule generated spec/profile refresh after event catalog, prompt contract, or profile-version changes.',
      safety_cost: 'Expose per-agent latency, failure rate, and token-budget trend signals in the admin console.',
    },
    maturity: {
      prompt_templates: 'complete',
      reasoning_chain: 'complete',
      standard_libraries: 'complete',
      context_index: 'complete',
      memory_feedback: 'complete',
      structured_contract: 'complete',
      validation_guardrails: 'complete',
      fallback_recovery: 'complete',
      evaluation_checks: 'complete',
      observability: 'complete',
      auto_update: 'partial',
      safety_cost: 'partial',
    },
  },
  {
    id: 'hackathon_coach',
    title: 'Hackathon AI Coach',
    agentClass: 'user_assistant',
    productEntrance: 'Hackathon page AI coach',
    api: ['POST /api/hackathon/assistant'],
    frontend: ['src/components/HackathonRegistration.jsx'],
    backend: [
      'server/src/controllers/hackathonController.js',
      'server/src/services/hackathonAssistantService.js',
      'server/src/services/assistantOrchestratorService.js',
    ],
    goal: 'Coach a participant toward a small, shippable AI-native hackathon scope using event facts and model reasoning.',
    promptTemplates: [
      {
        id: 'hackathon_ai_coach',
        version: 'v1',
        purpose: 'Produce suitability, project direction, preparation plan, risk, and event-day strategy.',
      },
    ],
    reasoningChain: [
      'Read stable hackathon settings.',
      'Build event profile and advice cards.',
      'Detect user intent and participant signals.',
      'Select the most relevant context cards.',
      'Ask the model for structured coaching over bounded context.',
      'Normalize track, plan, risk, sources, confidence, and follow-up questions.',
      'Fall back to local strategy index when the model fails.',
    ],
    standardLibraries: [
      'Hackathon profile builder',
      'Hackathon context card index',
      'Shared assistant orchestrator',
    ],
    contextIndexes: [
      'Hackathon context cards',
      'Hackathon settings',
      'Participant profile payload',
      'ai_assistant_runs aggregate run summaries',
    ],
    outputContracts: [
      'hackathon_coach',
    ],
    validation: [
      'Limits query and participant profile length.',
      'Normalizes arrays and numeric confidence.',
      'Restricts sources to provided context card IDs.',
      'Avoids unsupported event policies.',
    ],
    fallback: [
      'Local intent detection.',
      'Advice-card ranking.',
      'Fallback response with modelStatus.fallbackUsed=true.',
    ],
    observability: [
      'modelStatus.used',
      'modelStatus.fallbackUsed',
      'sources',
      'warnings',
      'confidence',
      'anonymous run summaries',
    ],
    evaluation: [
      'server/scripts/check-hackathon-ai-assistant.js',
      'server/scripts/stress-ai-assistants.js',
      'server/scripts/evaluate-ai-golden.js',
    ],
    autoUpdateTriggers: [
      'Hackathon settings changes',
      'Advice card changes',
      'Output contract changes',
    ],
    nextImprovements: [
      'Version the context-card index separately from code.',
      'Expose anonymous aggregate question categories for product tuning.',
      'Grow the golden coaching set with beginner, engineer, and product-user variants.',
    ],
    relatedAgents: [
      {
        id: 'model_config_runtime',
        relationship: 'model_runtime_dependency',
        reason: 'Uses the shared assistant orchestrator and model runtime for structured coaching output.',
      },
      {
        id: 'event_recommendation',
        relationship: 'user_assistant_pattern',
        reason: 'Shares the bounded-context user assistant pattern and confidence/fallback response contract.',
      },
    ],
    qualityBacklog: {
      standard_libraries: 'Move hackathon rules, event-day strategy cards, and track vocabulary into a versioned standard library.',
      memory_feedback: 'Summarize anonymous question categories and coaching outcomes for product tuning without storing raw prompts.',
      observability: 'Expose aggregate coaching intent categories, confidence buckets, and fallback rate in the admin overview.',
      auto_update: 'Version the hackathon context-card index separately from code and show the active version in generated specs.',
      safety_cost: 'Add task-level timeout and token ceilings for hackathon coaching calls in the runtime policy registry.',
    },
    maturity: {
      prompt_templates: 'complete',
      reasoning_chain: 'complete',
      standard_libraries: 'partial',
      context_index: 'complete',
      memory_feedback: 'partial',
      structured_contract: 'complete',
      validation_guardrails: 'complete',
      fallback_recovery: 'complete',
      evaluation_checks: 'complete',
      observability: 'partial',
      auto_update: 'partial',
      safety_cost: 'partial',
    },
  },
  {
    id: 'wechat_event_parser',
    title: 'WeChat Event Parser',
    agentClass: 'content_parsing_skill',
    productEntrance: 'Upload modal WeChat parse action',
    api: ['POST /api/resources/parse-wechat'],
    frontend: ['src/components/UploadModal.jsx'],
    backend: [
      'server/src/controllers/wechatParseController.js',
      'server/src/routes/api.js',
      'server/src/utils/wechat.js',
      'server/src/services/eventIntelligenceService.js',
    ],
    goal: 'Extract structured event fields from a WeChat article and normalize them against the shared event catalog.',
    promptTemplates: [
      {
        id: 'wechat_event_parse',
        version: 'v1',
        purpose: 'Extract title, dates, location, organizer, audience, category, content, and metadata.',
      },
    ],
    reasoningChain: [
      'Clean and validate WeChat URL.',
      'Scrape article title, author, content, date, and cover image.',
      'Send article plus academic calendar and standard catalog to the model.',
      'Validate category and audience against event intelligence service.',
      'Download cover image when possible.',
      'Return parsed fields for admin review before save.',
    ],
    standardLibraries: [
      'server/src/constants/eventCatalog.js',
      'server/src/services/eventIntelligenceService.js',
      'Academic calendar context',
    ],
    contextIndexes: [
      'WeChat URL cache',
      'Standard event catalog prompt context',
      'ai_assistant_runs parse summaries',
    ],
    outputContracts: [
      'parsed_event_payload',
    ],
    validation: [
      'Requires canonical event category.',
      'Normalizes audience.',
      'Returns category confidence and reason.',
      'Falls back to scraped content fields when the model omits optional text.',
    ],
    fallback: [
      'Cache for repeated URL parsing.',
      'Clear API error for invalid key/rate limit.',
      'Anonymous parse run summaries even when scraping or model parsing fails.',
      'Manual form entry remains available.',
    ],
    observability: [
      'aiMeta.task',
      'aiMeta.provider',
      'aiMeta.model',
      'ai_assistant_runs anonymous parse summaries',
    ],
    evaluation: [
      'server/scripts/check-wechat-parser-agent.js',
      'server/scripts/check-event-intelligence.js',
      'server/scripts/stress-ai-assistants.js',
      'server/scripts/evaluate-ai-golden.js',
    ],
    autoUpdateTriggers: [
      'Event catalog changes',
      'Academic calendar changes',
      'WeChat parser prompt changes',
    ],
    nextImprovements: [
      'Show parser confidence and warnings in the admin form.',
      'Aggregate parse failure categories for prompt and scraper tuning.',
      'Grow parser golden samples for lecture, volunteer, recruitment, and exchange events.',
    ],
    relatedAgents: [
      {
        id: 'model_config_runtime',
        relationship: 'model_runtime_dependency',
        reason: 'Uses the shared runtime for structured article extraction, provider status, and JSON repair.',
      },
      {
        id: 'event_governance',
        relationship: 'metadata_quality_handoff',
        reason: 'Parser confidence and normalized fields feed the same event metadata quality surface used by governance.',
      },
      {
        id: 'event_recommendation',
        relationship: 'shared_event_catalog',
        reason: 'Parsed categories, audience, campus, and benefits must match the same catalog used for recommendation intent.',
      },
      {
        id: 'event_profile_index',
        relationship: 'profile_source_quality',
        reason: 'Cleaner parsed event fields improve downstream event AI profile quality and recommendation recall.',
      },
    ],
    qualityBacklog: {
      context_index: 'Persist bounded parse-cache metadata and confidence summaries so repeated URLs do not require full re-analysis.',
      memory_feedback: 'Aggregate parse failure categories and admin corrections for prompt and scraper tuning.',
      observability: 'Show parser confidence, warnings, provider, and model status directly in the admin form.',
      auto_update: 'Refresh parser prompt context automatically when event catalog or academic-calendar context changes.',
      safety_cost: 'Expose parser timeout, scrape failure, model failure, and fallback rates in the admin overview.',
    },
    maturity: {
      prompt_templates: 'complete',
      reasoning_chain: 'complete',
      standard_libraries: 'complete',
      context_index: 'partial',
      memory_feedback: 'partial',
      structured_contract: 'complete',
      validation_guardrails: 'complete',
      fallback_recovery: 'complete',
      evaluation_checks: 'complete',
      observability: 'partial',
      auto_update: 'partial',
      safety_cost: 'partial',
    },
  },
  {
    id: 'event_governance',
    title: 'Admin Event Governance Agent',
    agentClass: 'admin_governance_skill',
    productEntrance: 'Admin AI assistant governance workspace',
    api: [
      'GET /api/admin/ai-assistant/overview',
      'POST /api/admin/ai-assistant/event-governance/scan',
      'POST /api/admin/ai-assistant/event-governance/apply',
    ],
    frontend: ['src/components/Admin/AiAssistantManager.jsx'],
    backend: [
      'server/src/controllers/aiAssistantController.js',
      'server/src/services/unifiedAiAssistantService.js',
      'server/src/services/eventIntelligenceService.js',
    ],
    goal: 'Help admins improve event metadata through safe scan, review, and apply workflows.',
    promptTemplates: [
      {
        id: 'event_governance_review',
        version: 'v1',
        purpose: 'Review low-confidence or ambiguous governance suggestions against standard catalogs and recent admin decisions.',
      },
    ],
    reasoningChain: [
      'Scan non-deleted events.',
      'Use standard rules to suggest category and audience normalization.',
      'Load recent admin decision memory for governance context.',
      'Ask the model to review low-confidence or ambiguous category suggestions over a bounded candidate list.',
      'Validate model-reviewed fields against the shared event catalog before keeping them.',
      'Persist run and suggestion audit records.',
      'Let admins select suggestions.',
      'Apply only whitelisted fields when the scanned value still matches.',
      'Record applied, skipped, and conflict outcomes.',
    ],
    standardLibraries: [
      'server/src/constants/eventCatalog.js',
      'server/src/services/eventIntelligenceService.js',
    ],
    contextIndexes: [
      'ai_assistant_runs',
      'ai_event_governance_suggestions',
      'recent applied/skipped governance decisions',
    ],
    outputContracts: [
      'governance_scan',
      'event_governance_review',
      'governance_apply_summary',
    ],
    validation: [
      'Dry scan does not mutate event data.',
      'Apply is admin-only.',
      'Only whitelisted event fields can be changed.',
      'Model-reviewed categories must normalize to a known catalog value.',
      'Conflict check prevents overwriting changed rows.',
    ],
    fallback: [
      'Rule-backed deterministic suggestions.',
      'Model review failure keeps deterministic suggestions and records fallback status.',
      'Skipped status for unsupported or low-confidence items.',
    ],
    observability: [
      'run records',
      'suggestion records',
      'confidence',
      'status',
      'modelStatus',
      'governance memory summary',
    ],
    evaluation: [
      'server/scripts/check-unified-ai-assistant.js',
      'server/scripts/stress-ai-assistants.js',
      'server/scripts/evaluate-ai-golden.js',
    ],
    autoUpdateTriggers: [
      'Event catalog changes',
      'Governance whitelist changes',
      'Suggestion confidence policy changes',
    ],
    nextImprovements: [
      'Display changed dimension coverage in the admin console.',
      'Use admin decision memory to adjust deterministic confidence before model review.',
      'Grow golden ambiguous governance cases from real admin review decisions.',
    ],
    relatedAgents: [
      {
        id: 'event_recommendation',
        relationship: 'metadata_quality_provider',
        reason: 'Improves category and audience quality that recommendation uses for candidate ranking.',
      },
      {
        id: 'wechat_event_parser',
        relationship: 'admin_review_continuation',
        reason: 'Reviews and repairs metadata originally produced by parsing or manual admin entry.',
      },
      {
        id: 'model_config_runtime',
        relationship: 'model_runtime_dependency',
        reason: 'Uses shared model review, JSON parsing, and failover for ambiguous governance suggestions.',
      },
    ],
    qualityBacklog: {
      context_index: 'Expose changed-field coverage and recent ambiguous-case distribution in the governance workspace.',
      memory_feedback: 'Use recent applied and skipped admin decisions to adjust deterministic confidence before model review.',
      auto_update: 'Regenerate governance guidance when catalog aliases, whitelist fields, or confidence policy changes.',
    },
    maturity: {
      prompt_templates: 'complete',
      reasoning_chain: 'complete',
      standard_libraries: 'complete',
      context_index: 'partial',
      memory_feedback: 'partial',
      structured_contract: 'complete',
      validation_guardrails: 'complete',
      fallback_recovery: 'complete',
      evaluation_checks: 'complete',
      observability: 'complete',
      auto_update: 'partial',
      safety_cost: 'complete',
    },
  },
  {
    id: 'model_config_runtime',
    title: 'Model Config and Runtime',
    agentClass: 'infrastructure',
    productEntrance: 'Admin model key workspace',
    api: [
      'GET /api/admin/ai-model-configs',
      'POST /api/admin/ai-model-configs',
      'POST /api/admin/ai-model-configs/:id/test',
    ],
    frontend: ['src/components/Admin/AiModelConfigManager.jsx'],
    backend: [
      'server/src/services/aiModelConfigService.js',
      'server/src/services/unifiedAiRuntimeService.js',
      'server/src/services/assistantOrchestratorService.js',
    ],
    goal: 'Provide a shared OpenAI-compatible model configuration, failover, JSON parsing, repair, and streaming retry layer for all agents.',
    promptTemplates: [
      {
        id: 'json_repair',
        version: 'v1',
        purpose: 'Regenerate strict JSON when the first model response is malformed.',
      },
    ],
    reasoningChain: [
      'Load enabled model configs by priority.',
      'Resolve task-level runtime policy for timeout, token budget, and temperature.',
      'Inject shared assistant quality requirements before provider, repair, or injected test-runner calls.',
      'Call chat completions with timeout controls.',
      'Extract content and reasoning_content.',
      'Parse JSON from model text.',
      'Retry stream mode on empty content.',
      'Repair invalid JSON through a strict repair prompt.',
      'Expose attempts and provider status.',
    ],
    standardLibraries: [
      'OpenAI-compatible chat completions contract',
      'Encrypted API key storage',
      'TASK_RUNTIME_POLICIES',
      'Shared AI output quality policy',
    ],
    contextIndexes: [
      'ai_model_configs',
      'task runtime policy registry',
    ],
    outputContracts: [
      'callJson result',
      'modelStatus',
    ],
    validation: [
      'Requires database-backed config or injected model runner.',
      'Rejects missing messages.',
      'Rejects non-JSON assistant task output.',
      'Applies central policy defaults before provider calls and injected test runners.',
      'Never exposes API keys to frontend responses.',
    ],
    fallback: [
      'Provider failover.',
      'Stream retry for empty content.',
      'JSON repair prompt.',
      'Injected model runner for tests.',
    ],
    observability: [
      'attempts',
      'provider',
      'model',
      'last_status',
      'last_error',
      'runtimePolicy',
      'per-task duration',
      'per-task token budget estimates',
      'runtime telemetry rollups',
      'shared quality instruction coverage',
    ],
    evaluation: [
      'server/scripts/check-unified-ai-runtime.js',
      'server/scripts/check-hackathon-ai-assistant.js',
      'server/scripts/stress-ai-assistants.js',
    ],
    autoUpdateTriggers: [
      'Provider list changes',
      'Model timeout policy changes',
      'JSON repair contract changes',
    ],
    nextImprovements: [
      'Add circuit breaker status to admin overview.',
      'Let admin tune safe runtime policy ceilings without code changes.',
      'Persist longer-term runtime telemetry trend windows.',
    ],
    relatedAgents: [
      {
        id: 'event_recommendation',
        relationship: 'runtime_provider',
        reason: 'Provides model calls, JSON repair, failover, and task policy for event recommendation.',
      },
      {
        id: 'hackathon_coach',
        relationship: 'runtime_provider',
        reason: 'Provides structured coaching calls and fallback metadata for the hackathon assistant.',
      },
      {
        id: 'wechat_event_parser',
        relationship: 'runtime_provider',
        reason: 'Provides structured parse calls, provider status, and repair for content extraction.',
      },
      {
        id: 'event_governance',
        relationship: 'runtime_provider',
        reason: 'Provides bounded model review for ambiguous governance suggestions.',
      },
      {
        id: 'event_profile_index',
        relationship: 'runtime_provider',
        reason: 'Provides profile generation calls and fallback status for index refreshes.',
      },
    ],
    qualityBacklog: {
      prompt_templates: 'Version shared quality and JSON repair prompt templates with explicit task owners.',
      standard_libraries: 'Move runtime provider rules, task ceilings, and repair policy into a documented standard library.',
      memory_feedback: 'Persist longer-term runtime telemetry trend windows and provider health history.',
      auto_update: 'Regenerate runtime policy documentation when task policy or provider priority changes.',
    },
    maturity: {
      prompt_templates: 'partial',
      reasoning_chain: 'complete',
      standard_libraries: 'partial',
      context_index: 'complete',
      memory_feedback: 'partial',
      structured_contract: 'complete',
      validation_guardrails: 'complete',
      fallback_recovery: 'complete',
      evaluation_checks: 'complete',
      observability: 'complete',
      auto_update: 'partial',
      safety_cost: 'complete',
    },
  },
  {
    id: 'event_profile_index',
    title: 'Event AI Profile Index',
    agentClass: 'indexing_infrastructure',
    productEntrance: 'Backend event assistant index',
    api: [],
    frontend: [],
    backend: [
      'server/src/services/eventAiProfileService.js',
      'server/src/utils/eventAssistant.js',
      'server/scripts/refresh-event-ai-profiles.js',
    ],
    goal: 'Precompute or cache compact activity profiles so recommendation agents can reason quickly over relevant features.',
    promptTemplates: [
      {
        id: 'event_profile',
        version: 'v1',
        purpose: 'Extract summary, category, topics, campus, organizer, audience, benefits, and confidence.',
      },
    ],
    reasoningChain: [
      'Hash event source fields.',
      'Reuse existing ready profile when source hash matches.',
      'Generate a profile through the model when allowed.',
      'Store ready profile with provider metadata.',
      'Use deterministic fallback profile when model is skipped or fails.',
      'Use transient fallback profiles for live recommendation turns when persistence would add latency.',
      'Refresh stale or missing profiles through a background command.',
      'Record refresh summaries for coverage and fallback tracking.',
      'Report coverage to assistant overview.',
    ],
    standardLibraries: [
      'server/src/constants/eventCatalog.js',
      'server/src/services/eventIntelligenceService.js',
    ],
    contextIndexes: [
      'event_ai_profiles',
      'ai_assistant_runs refresh summaries',
    ],
    outputContracts: [
      'event_ai_profile',
    ],
    validation: [
      'Normalizes profile categories.',
      'Normalizes English and pinyin campus/audience/benefit signals through the shared catalog helpers.',
      'Clamps confidence.',
      'Stores source hash and profile version.',
      'Refresh command only processes approved, non-deleted events.',
    ],
    fallback: [
      'Rule profile fallback.',
      'Cache hit path.',
      'Transient no-write fallback for request latency.',
      'Background refresh can run with --no-model to rebuild fallback profiles safely.',
    ],
    observability: [
      'profile coverage',
      'ready/fallback counts',
      'model provider',
      'last error',
      'refresh run summaries',
      'transient fallback counts',
      'stale/missing profile counts',
      'profile issue reason counts',
    ],
    evaluation: [
      'server/scripts/check-unified-ai-runtime.js',
      'server/scripts/stress-ai-assistants.js',
      'server/scripts/evaluate-ai-golden.js',
      'server/scripts/refresh-event-ai-profiles.js',
    ],
    autoUpdateTriggers: [
      'PROFILE_VERSION changes',
      'Event source field changes',
      'Event catalog changes',
    ],
    nextImprovements: [
      'Add embedding-compatible output shape later without changing consumers.',
      'Schedule refresh runs after large event imports.',
      'Show stale and missing profile issue trends over time.',
    ],
    relatedAgents: [
      {
        id: 'event_recommendation',
        relationship: 'context_index_provider',
        reason: 'Supplies compact event profiles used by recommendation recall, reranking, and explanation.',
      },
      {
        id: 'model_config_runtime',
        relationship: 'model_runtime_dependency',
        reason: 'Uses the shared runtime for profile generation and fallback-aware refreshes.',
      },
      {
        id: 'wechat_event_parser',
        relationship: 'source_quality_consumer',
        reason: 'Profile quality depends on parsed event fields and standard catalog normalization.',
      },
    ],
    qualityBacklog: {
      memory_feedback: 'Track which profile issue reasons later correlate with poor recommendation feedback.',
      auto_update: 'Schedule profile refresh after large event imports and catalog/profile-version changes.',
      safety_cost: 'Add embedding-compatible profile fields without changing current consumers or increasing live request latency.',
    },
    maturity: {
      prompt_templates: 'complete',
      reasoning_chain: 'complete',
      standard_libraries: 'complete',
      context_index: 'complete',
      memory_feedback: 'partial',
      structured_contract: 'complete',
      validation_guardrails: 'complete',
      fallback_recovery: 'complete',
      evaluation_checks: 'complete',
      observability: 'complete',
      auto_update: 'partial',
      safety_cost: 'partial',
    },
  },
];

const clampScore = (value) => Math.min(Math.max(value, 0), 1);

const scoreMaturity = (maturity = {}) => {
  const total = MATURITY_DIMENSIONS.length;
  const score = MATURITY_DIMENSIONS.reduce((sum, dimension) => (
    sum + (statusWeight[maturity[dimension.id]] || 0)
  ), 0);
  return {
    score: clampScore(score / total),
    completeCount: MATURITY_DIMENSIONS.filter((dimension) => maturity[dimension.id] === 'complete').length,
    partialCount: MATURITY_DIMENSIONS.filter((dimension) => maturity[dimension.id] === 'partial').length,
    plannedCount: MATURITY_DIMENSIONS.filter((dimension) => maturity[dimension.id] === 'planned').length,
    missingCount: MATURITY_DIMENSIONS.filter((dimension) => !maturity[dimension.id] || maturity[dimension.id] === 'missing').length,
  };
};

const buildQualityProfile = (agent) => MATURITY_DIMENSIONS.map((dimension) => {
  const status = agent.maturity?.[dimension.id] || 'missing';
  const backlog = agent.qualityBacklog?.[dimension.id] || '';
  const defaultTask = status === 'complete'
    ? 'Maintain with repeatable checks.'
    : agent.nextImprovements?.[0] || `Upgrade ${dimension.label}.`;

  return {
    id: dimension.id,
    label: dimension.label,
    status,
    goal: dimension.goal,
    nextStep: backlog || defaultTask,
  };
});

const decorateAgent = (agent) => {
  const maturityScore = scoreMaturity(agent.maturity);
  return {
    ...agent,
    maturityScore,
    qualityProfile: buildQualityProfile(agent),
  };
};

const getAgentDefinitions = () => AGENT_DEFINITIONS.map(decorateAgent);

const getHighPriorityGaps = (agents) => agents.flatMap((agent) => {
  const gaps = [];
  for (const dimension of MATURITY_DIMENSIONS) {
    const status = agent.maturity?.[dimension.id] || 'missing';
    if (status === 'missing' || status === 'planned') {
      gaps.push({
        agentId: agent.id,
        agentTitle: agent.title,
        dimensionId: dimension.id,
        dimensionLabel: dimension.label,
        status,
      });
    }
  }
  return gaps;
});

const buildNextIterationPlan = (agents) => getHighPriorityGaps(agents)
  .slice(0, 8)
  .map((gap, index) => {
    const agent = agents.find((item) => item.id === gap.agentId);
    const firstImprovement = agent?.nextImprovements?.[0] || `Improve ${gap.dimensionLabel}.`;
    return {
      order: index + 1,
      target: gap.agentTitle,
      dimension: gap.dimensionLabel,
      currentStatus: gap.status,
      task: firstImprovement,
      acceptance: `${gap.agentTitle} marks ${gap.dimensionLabel} as partial or complete and has a repeatable check.`,
    };
  });

const partialPriority = {
  observability: 1,
  safety_cost: 2,
  memory_feedback: 3,
  auto_update: 4,
  context_index: 5,
  standard_libraries: 6,
  prompt_templates: 7,
};

const runtimeIssuePriority = {
  blocked: 0,
  degraded: 0.5,
  watch: 0.8,
  healthy: 5,
  NO_DATA: 6,
};

const getPartialMaturityGaps = (agents) => agents.flatMap((agent) => {
  const gaps = [];
  for (const dimension of MATURITY_DIMENSIONS) {
    const status = agent.maturity?.[dimension.id] || 'missing';
    if (status === 'partial') {
      gaps.push({
        agentId: agent.id,
        agentTitle: agent.title,
        dimensionId: dimension.id,
        dimensionLabel: dimension.label,
        status,
        priority: partialPriority[dimension.id] || 20,
      });
    }
  }
  return gaps;
}).sort((left, right) => (
  left.priority - right.priority
  || left.agentTitle.localeCompare(right.agentTitle)
  || left.dimensionLabel.localeCompare(right.dimensionLabel)
));

const buildContinuousImprovementPlan = (agents, health = {}) => getPartialMaturityGaps(agents)
  .sort((left, right) => {
    const leftRuntime = health.agentRuntimeHealth?.[left.agentId]?.status || 'NO_DATA';
    const rightRuntime = health.agentRuntimeHealth?.[right.agentId]?.status || 'NO_DATA';
    return (
      (runtimeIssuePriority[leftRuntime] ?? 10) - (runtimeIssuePriority[rightRuntime] ?? 10)
      || left.priority - right.priority
      || left.agentTitle.localeCompare(right.agentTitle)
      || left.dimensionLabel.localeCompare(right.dimensionLabel)
    );
  })
  .slice(0, 10)
  .map((gap, index) => {
    const agent = agents.find((item) => item.id === gap.agentId);
    const runtimeHealth = health.agentRuntimeHealth?.[gap.agentId] || null;
    const firstImprovement = (
      (runtimeHealth && ['blocked', 'degraded', 'watch'].includes(runtimeHealth.status)
        ? runtimeHealth.suggestedAction
        : '')
      || agent?.qualityBacklog?.[gap.dimensionId]
      || agent?.nextImprovements?.[0]
      || `Upgrade ${gap.dimensionLabel} from partial to complete.`
    );
    return {
      order: index + 1,
      target: gap.agentTitle,
      dimension: gap.dimensionLabel,
      currentStatus: gap.status,
      runtimeStatus: runtimeHealth?.status || 'NO_DATA',
      task: firstImprovement,
      acceptance: `${gap.agentTitle} marks ${gap.dimensionLabel} as complete or exposes a measurable production signal.`,
    };
  });

const resolveAgentStatus = (agent, health = {}) => {
  if (agent.id === 'event_recommendation') return Number(health.eventCount || 0) > 0 ? 'live' : 'attention';
  if (agent.id === 'event_governance') return Number(health.uncategorizedEventCount || 0) > 0 ? 'attention' : 'ready';
  if (agent.id === 'model_config_runtime') return Number(health.enabledModelConfigCount || 0) > 0 ? 'ready' : 'attention';
  if (agent.id === 'event_profile_index') {
    return Number(health.eventAiProfileCoverageRatio || 0) >= 0.7 ? 'ready' : 'attention';
  }
  return 'live';
};

const buildAgentMetrics = (agent, health = {}) => {
  const maturity = scoreMaturity(agent.maturity);
  const base = [
    { label: 'Maturity', value: `${Math.round(maturity.score * 100)}%` },
    { label: 'Prompts', value: agent.promptTemplates.length },
    { label: 'Checks', value: agent.evaluation.length },
  ];

  if (agent.id === 'event_recommendation') {
    return [
      { label: 'Events', value: health.eventCount || 0 },
      { label: 'Profiles', value: health.eventAiProfileCount || 0 },
      { label: 'Memory', value: health.memoryCount || 0 },
      { label: 'Runs', value: health.recommendationRunCount || 0 },
      { label: 'Action evidence', value: health.recommendationActionEvidenceStatus || 'NO_RECOMMENDATION' },
      { label: 'Action rate', value: `${Math.round((health.recommendationActionRate || 0) * 100)}%` },
      ...base,
    ];
  }
  if (agent.id === 'event_governance') {
    return [
      { label: 'Uncategorized', value: health.uncategorizedEventCount || 0 },
      { label: 'Runs', value: health.governanceRunCount || 0 },
      ...base,
    ];
  }
  if (agent.id === 'model_config_runtime') {
    return [
      { label: 'Enabled keys', value: health.enabledModelConfigCount || 0 },
      { label: 'Healthy keys', value: health.healthyModelConfigCount || 0 },
      { label: 'AI tasks', value: health.runtimeTelemetryTaskCount || 0 },
      { label: 'Avg ms', value: health.runtimeTelemetryAvgDurationMs || 0 },
      { label: 'Retry', value: health.runtimeTelemetryRetryCount || 0 },
      ...base,
    ];
  }
  if (agent.id === 'event_profile_index') {
    return [
      { label: 'Coverage', value: `${Math.round((health.eventAiProfileCoverageRatio || 0) * 100)}%` },
      { label: 'Ready', value: health.readyEventAiProfileCount || 0 },
      { label: 'Stale', value: health.staleEventAiProfileCount || 0 },
      { label: 'Missing', value: health.missingEventAiProfileCount || 0 },
      { label: 'Refresh runs', value: health.profileRefreshRunCount || 0 },
      ...base,
    ];
  }
  if (agent.id === 'hackathon_coach') {
    return [
      { label: 'Runs', value: health.hackathonRunCount || 0 },
      ...base,
    ];
  }
  if (agent.id === 'wechat_event_parser') {
    return [
      { label: 'Parse runs', value: health.wechatParseRunCount || 0 },
      ...base,
    ];
  }
  return base;
};

const buildOverviewModules = (health = {}) => getAgentDefinitions().map((agent) => ({
  id: agent.id,
  title: agent.title,
  status: resolveAgentStatus(agent, health),
  entrance: agent.productEntrance,
  description: agent.goal,
  agentClass: agent.agentClass,
  maturityScore: agent.maturityScore,
  metrics: buildAgentMetrics(agent, health),
  promptTemplates: agent.promptTemplates.map((item) => item.id),
  standardLibraries: agent.standardLibraries,
  contextIndexes: agent.contextIndexes,
  outputContracts: agent.outputContracts,
  qualityProfile: agent.qualityProfile,
  relatedAgents: agent.relatedAgents || [],
  qualityBacklog: agent.qualityBacklog || {},
  runtimeHealth: health.agentRuntimeHealth?.[agent.id] || null,
  nextImprovements: agent.nextImprovements.slice(0, 3),
}));

const getAgentSystemOverview = (health = {}) => {
  const agents = getAgentDefinitions();
  const averageMaturity = agents.length
    ? agents.reduce((sum, agent) => sum + agent.maturityScore.score, 0) / agents.length
    : 0;
  const highPriorityGaps = getHighPriorityGaps(agents);
  const partialGaps = getPartialMaturityGaps(agents);

  return {
    generatedAt: new Date().toISOString(),
    specVersion: 'agent-os-v1',
    dimensions: MATURITY_DIMENSIONS,
    summary: {
      agentCount: agents.length,
      averageMaturity: clampScore(averageMaturity),
      highPriorityGapCount: highPriorityGaps.length,
      partialGapCount: partialGaps.length,
      liveAgentCount: buildOverviewModules(health).filter((agent) => agent.status === 'live').length,
    },
    modules: buildOverviewModules(health),
    runtimeHealth: health.agentRuntimeHealth || {},
    modelHealth: health.modelHealth || null,
    qualityProfiles: Object.fromEntries(agents.map((agent) => [agent.id, agent.qualityProfile])),
    collaborationMap: agents.map((agent) => ({
      agentId: agent.id,
      agentTitle: agent.title,
      relatedAgents: agent.relatedAgents || [],
    })),
    highPriorityGaps,
    partialGaps,
    nextIterationPlan: buildNextIterationPlan(agents),
    continuousImprovementPlan: buildContinuousImprovementPlan(agents, health),
  };
};

const validateAgentRegistry = () => {
  const errors = [];
  const ids = new Set();

  for (const agent of AGENT_DEFINITIONS) {
    if (!agent.id) errors.push('Agent is missing id.');
    if (ids.has(agent.id)) errors.push(`Duplicate agent id: ${agent.id}`);
    ids.add(agent.id);

    for (const field of ['title', 'agentClass', 'productEntrance', 'goal']) {
      if (!agent[field]) errors.push(`${agent.id} is missing ${field}.`);
    }

    for (const listField of [
      'reasoningChain',
      'standardLibraries',
      'contextIndexes',
      'outputContracts',
      'validation',
      'fallback',
      'observability',
      'evaluation',
      'nextImprovements',
      'relatedAgents',
    ]) {
      if (!Array.isArray(agent[listField])) {
        errors.push(`${agent.id}.${listField} must be an array.`);
      }
    }

    if (agent.standalone !== true && (!Array.isArray(agent.relatedAgents) || agent.relatedAgents.length === 0)) {
      errors.push(`${agent.id} must declare relatedAgents or standalone=true.`);
    }

    if (!agent.qualityBacklog || typeof agent.qualityBacklog !== 'object') {
      errors.push(`${agent.id} must declare qualityBacklog.`);
    }

    for (const key of Object.keys(agent.maturity || {})) {
      if (!dimensionIds.has(key)) errors.push(`${agent.id} has unknown maturity dimension: ${key}`);
    }

    for (const dimension of MATURITY_DIMENSIONS) {
      if (!agent.maturity || !agent.maturity[dimension.id]) {
        errors.push(`${agent.id} is missing maturity for ${dimension.id}.`);
      }
      const status = agent.maturity?.[dimension.id] || 'missing';
      if (status !== 'complete' && !agent.qualityBacklog?.[dimension.id]) {
        errors.push(`${agent.id} needs qualityBacklog for ${dimension.id}.`);
      }
    }
  }

  for (const agent of AGENT_DEFINITIONS) {
    for (const relatedAgent of agent.relatedAgents || []) {
      if (!relatedAgent.id) {
        errors.push(`${agent.id}.relatedAgents entry is missing id.`);
      } else if (!ids.has(relatedAgent.id)) {
        errors.push(`${agent.id}.relatedAgents references unknown agent: ${relatedAgent.id}`);
      }
      if (relatedAgent.id === agent.id) {
        errors.push(`${agent.id}.relatedAgents must not reference itself.`);
      }
      if (!relatedAgent.relationship) {
        errors.push(`${agent.id}.relatedAgents.${relatedAgent.id} is missing relationship.`);
      }
      if (!relatedAgent.reason) {
        errors.push(`${agent.id}.relatedAgents.${relatedAgent.id} is missing reason.`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    agentCount: AGENT_DEFINITIONS.length,
    dimensionCount: MATURITY_DIMENSIONS.length,
  };
};

const markdownList = (items = []) => items.length
  ? items.map((item) => `- ${item}`).join('\n')
  : '- None';

const buildAgentSpecMarkdown = (health = {}) => {
  const overview = getAgentSystemOverview(health);
  const generatedAt = new Date().toISOString();
  const lines = [
    '# AI Agent Operating System',
    '',
    '> Generated from `server/src/services/aiAgentRegistryService.js`. Do not hand-edit generated sections; update the registry and rerun `npm --prefix server run agents:spec`.',
    '',
    `Generated at: ${generatedAt}`,
    '',
    '## Goal',
    '',
    'All AI-facing features should behave like coordinated agents: explicit prompts, explicit logic chains, shared standard libraries, bounded context indexes, structured contracts, validation, fallback, evaluation, and observable runtime status.',
    '',
    '## Maturity Dimensions',
    '',
    ...MATURITY_DIMENSIONS.flatMap((dimension) => [
      `### ${dimension.label}`,
      '',
      dimension.goal,
      '',
    ]),
    '## System Summary',
    '',
    `- Agent count: ${overview.summary.agentCount}`,
    `- Average maturity: ${Math.round(overview.summary.averageMaturity * 100)}%`,
    `- High-priority gaps: ${overview.summary.highPriorityGapCount}`,
    `- Partial maturity gaps: ${overview.summary.partialGapCount}`,
    '',
    '## Runtime Health',
    '',
    overview.modelHealth
      ? markdownList([
        `Model health: ${overview.modelHealth.status}`,
        `Enabled configs: ${overview.modelHealth.enabledCount}`,
        `Healthy configs: ${overview.modelHealth.healthyCount}`,
        `Retry count: ${overview.modelHealth.retryCount}`,
        `Circuit breaker recommendation: ${overview.modelHealth.circuitBreakerRecommendation?.suggestedAction || 'None'}`,
      ])
      : markdownList([
        'Runtime health is available from admin overview when run data exists.',
        'Model health is reported without exposing API keys.',
        'Circuit breaker recommendation is read-only and never disables model configs automatically.',
      ]),
    '',
    '## Agents',
    '',
  ];

  for (const agent of getAgentDefinitions()) {
    lines.push(
      `### ${agent.title}`,
      '',
      `- ID: ${agent.id}`,
      `- Class: ${agent.agentClass}`,
      `- Entrance: ${agent.productEntrance}`,
      `- Maturity: ${Math.round(agent.maturityScore.score * 100)}%`,
      '',
      agent.goal,
      '',
      '#### Prompt Templates',
      '',
      agent.promptTemplates.length
        ? agent.promptTemplates.map((template) => `- ${template.id} (${template.version}): ${template.purpose}`).join('\n')
        : '- None yet',
      '',
      '#### Logic Chain',
      '',
      markdownList(agent.reasoningChain),
      '',
      '#### Standard Libraries',
      '',
      markdownList(agent.standardLibraries),
      '',
      '#### Context / Index / Memory',
      '',
      markdownList(agent.contextIndexes),
      '',
      '#### Quality Profile',
      '',
      markdownList(agent.qualityProfile.map((dimension) => (
        `${dimension.label}: ${dimension.status}; next: ${dimension.nextStep}`
      ))),
      '',
      '#### Related Agents',
      '',
      markdownList((agent.relatedAgents || []).map((relatedAgent) => (
        `${relatedAgent.id} (${relatedAgent.relationship}): ${relatedAgent.reason}`
      ))),
      '',
      '#### Runtime Observability',
      '',
      (() => {
        const runtimeHealth = overview.runtimeHealth?.[agent.id];
        return runtimeHealth
          ? markdownList([
            `Status: ${runtimeHealth.status}`,
            `Sample size: ${runtimeHealth.sampleSize}`,
            `Model used rate: ${runtimeHealth.modelUsedRate}`,
            `Fallback rate: ${runtimeHealth.fallbackRate}`,
            `Average duration ms: ${runtimeHealth.avgDurationMs}`,
            `Retry count: ${runtimeHealth.retryCount}`,
            `Suggested action: ${runtimeHealth.suggestedAction}`,
          ])
          : '- Runtime health is reported in admin overview when run data exists.';
      })(),
      '',
      '#### Validation And Fallback',
      '',
      markdownList([...agent.validation, ...agent.fallback]),
      '',
      '#### Evaluation',
      '',
      markdownList(agent.evaluation),
      '',
      '#### Next Improvements',
      '',
      markdownList(agent.nextImprovements),
      '',
    );
  }

  lines.push(
    '## Operating Loop',
    '',
    '1. Define target maturity dimensions for the agent.',
    '2. Break the gap into prompt, context, contract, validation, fallback, evaluation, and UI tasks.',
    '3. Implement the smallest safe step.',
    '4. Run registry checks, focused AI checks, lint, and build.',
    '5. Compare actual maturity with the target and repeat.',
    '',
    '## Next Iteration Plan',
    '',
    ...(overview.nextIterationPlan.length > 0 ? overview.nextIterationPlan : overview.continuousImprovementPlan).flatMap((item) => [
      `### ${item.order}. ${item.target} / ${item.dimension}`,
      '',
      `- Current: ${item.currentStatus}`,
      `- Task: ${item.task}`,
      `- Acceptance: ${item.acceptance}`,
      '',
    ]),
  );

  return `${lines.join('\n')}\n`;
};

const GENERATED_SPEC_PATH = path.join('docs', 'ai-agent-operating-system.generated.md');

module.exports = {
  MATURITY_DIMENSIONS,
  GENERATED_SPEC_PATH,
  buildAgentMetrics,
  buildAgentSpecMarkdown,
  buildOverviewModules,
  getAgentDefinitions,
  getAgentSystemOverview,
  validateAgentRegistry,
};
