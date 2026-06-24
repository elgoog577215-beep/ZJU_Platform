## Context

The current activity AI features grew in separate places. `server/src/utils/wechat.js` has its own event categories, aliases, and audience list for WeChat parsing. `server/src/utils/eventAssistant.js` has another category alias set, labels, campus keywords, and audience keywords for recommendation intent parsing and scoring. `server/src/controllers/resourceController.js` also contains event category filter aliases so new category filters can still match legacy `category` and `tags` values.

This split is the source of the current mismatch: a WeChat article can still be parsed through older label assumptions, while the recommendation assistant and event page now expect canonical big-category values such as `lecture`, `competition`, `volunteer`, `recruitment`, `culture_sports`, `exchange`, and `other`.

## Goals / Non-Goals

**Goals:**
- Create one backend source of truth for event categories, aliases, campus options, audience options, and AI prompt context.
- Make WeChat parsing produce canonical event fields directly by giving the model the standard catalog before extraction.
- Keep a service-side validation layer so model output is accepted only when it matches the catalog or can be safely normalized.
- Make the event recommendation assistant use the same catalog for intent parsing, labels, category inference, and profile matching.
- Provide a dry-run/apply script that classifies legacy server events into canonical categories with confidence, reasons, backup, and low-confidence reporting.
- Keep existing database fields and public APIs compatible.

**Non-Goals:**
- Do not build a full cross-site autonomous agent in this change.
- Do not introduce a new database schema, vector store, or background job system.
- Do not allow models to mutate data directly without service validation.
- Do not remove legacy alias support from filters during this rollout.
- Do not require AI calls for deterministic legacy classification; model-assisted classification can be added later.

## Decisions

### 1. Add a shared event intelligence catalog module

Create a shared CommonJS module under `server/src/constants/eventCatalog.js` (or equivalent) that exports:
- `EVENT_CATEGORIES`
- `EVENT_CATEGORY_ALIASES`
- `EVENT_CATEGORY_LABELS`
- `EVENT_AUDIENCE_GROUPS`
- `EVENT_AUDIENCE_OPTIONS`
- `EVENT_CAMPUS_OPTIONS`
- allowed extraction tags for WeChat parsing

The catalog will include both canonical values and legacy aliases. This keeps current filters and old rows readable while establishing the canonical write format.

Alternative considered: keep catalog in frontend `src/data/eventTaxonomy.js` and import it from the server. That would mix module systems and couple backend behavior to frontend bundling. A backend catalog is safer for server scripts and API utilities.

### 2. Add a shared event intelligence service

Create `server/src/services/eventIntelligenceService.js` to own catalog operations:
- build compact model context for prompts
- normalize category values
- infer category from category/tags/title/description/content
- normalize target audiences to catalog values
- validate parsed event payloads
- classify legacy event rows with confidence and reason

The service should be deterministic and reusable by WeChat parsing, recommendation, resource filtering, and scripts. The model can be smarter because it sees the standard catalog, but the service remains the final gate.

Alternative considered: put normalization helpers directly in `wechat.js`. That would fix one assistant but keep the recommendation assistant separate.

### 3. WeChat parsing sends standard context before extraction

Update `parseWithLLM` so the prompt contains the shared standard catalog and explicitly requires:
- `category` must be one canonical value.
- `target_audience` must use allowed audience values, comma-separated for multiple values, or `null`.
- optional `category_confidence` and `category_reason` may be returned when the model can explain classification.

After the model returns JSON, `wechat.js` will call `validateParsedEventPayload`. If the model returns a legacy label such as `学术讲座`, the validator normalizes it to `lecture`. If it returns an unknown value, the service infers from extracted fields and records a lower-confidence reason.

Alternative considered: parse arbitrary text first, then run a second mapping pass. That is more steps and makes the first model call less useful; the new approach makes the model choose from the standard catalog up front.

### 4. Event recommendation reuses the shared catalog

Replace assistant-local category constants and category inference helpers with shared catalog functions. Recommendation scoring remains mostly deterministic and service-side. The model is still only used to polish recommendation copy from pre-ranked candidates, not to access arbitrary data.

Alternative considered: move all recommendation logic into a single model prompt. That would make the assistant less predictable and weaken candidate-pool guarantees.

### 5. Legacy classification script is safe by default

Add `server/scripts/classify-event-categories.js` with:
- `--dry-run` default mode that prints summary and planned changes without updating rows.
- `--apply` mode that creates a SQLite backup first and then updates `events.category`.
- `--min-confidence <number>` to avoid applying low-confidence changes.
- reporting for unchanged, changed, skipped, and low-confidence rows.

The script uses the shared service only. It does not require an API key. This makes deployment predictable: push code, run schema sync if needed, dry-run classification, then apply after review.

Alternative considered: auto-run classification during server startup. That is risky because it mutates production data implicitly and gives no operator review point.

## Risks / Trade-offs

- [Model still invents catalog values] -> validate every returned category and audience against the shared catalog before returning parsed data.
- [Catalog duplication with frontend taxonomy] -> backend becomes the source for AI workflows now; frontend can be aligned later or consume a future API endpoint.
- [Legacy rows classified incorrectly] -> dry-run by default, backup before apply, confidence threshold, and low-confidence report.
- [Overlarge model context] -> send compact standard lists and aliases, not the full database.
- [Recommendation changes regress matching] -> keep existing deterministic scoring structure and only replace taxonomy helpers.
- [Chinese labels and aliases drift again] -> all new event AI helpers must import the shared catalog instead of declaring category constants locally.

## Migration Plan

1. Deploy shared catalog/service and wire WeChat parsing and event recommendations to it.
2. Run the legacy classifier in dry-run mode on the server database.
3. Review low-confidence rows and obvious changes.
4. Run the classifier with `--apply` and keep the generated backup.
5. Spot-check `/api/events?category=<canonical>` and the AI activity assistant after classification.

Rollback:
- Revert the code change if runtime behavior regresses.
- Restore the generated SQLite backup if `--apply` produced unacceptable classifications.

## Open Questions

- Should low-confidence rows be left unchanged, converted to `other`, or exported for manual review first? The first implementation will leave them unchanged unless `--apply-low-confidence` is explicitly added later.
- Should the frontend eventually fetch the same catalog from the backend to eliminate the remaining frontend taxonomy copy? This change keeps frontend behavior stable and focuses on backend AI workflows first.
