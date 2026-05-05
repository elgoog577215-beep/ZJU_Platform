## Why

The project already has several AI-adjacent capabilities: event recommendation, event classification, WeChat parsing, and admin-side model key management. They currently feel like separate tools. This makes the AI assistant hard to understand, hard to maintain, and hard to expand.

We need one visible AI assistant platform: the same assistant core should understand the event database, taxonomy, user preference signals, parsing rules, and model configuration. Different product entrances can then call the same assistant for different jobs: user-facing event recommendation, WeChat/content parsing, and admin-side activity library governance.

## What

- Add a unified AI assistant architecture and admin workspace.
- Keep the existing user-facing event recommendation endpoint compatible.
- Add admin-side event library governance:
  - scan events without mutating data,
  - suggest category/tag/audience normalization,
  - apply selected high-confidence suggestions,
  - keep run and suggestion records for traceability.
- Move AI model key management into the unified AI assistant admin workspace.
- Provide a clear product structure for future WeChat parsing and other assistant skills without coupling them directly to recommendation UI.

## Capabilities

- `unified-ai-assistant`: a shared assistant platform with module overview, admin workspace, event governance, and model configuration integration.

## Impact

- Backend:
  - Add assistant platform service, controller, routes, and database migration tables for assistant runs and event governance suggestions.
  - Reuse the existing event taxonomy and AI model configuration services.
- Frontend:
  - Add a unified admin AI assistant workspace.
  - Preserve the existing public event assistant UI and APIs.
- Data:
  - Add non-destructive audit tables.
  - Event updates only happen through explicit admin apply actions.
- Rollback:
  - UI can be hidden by reverting the admin entry.
  - API additions are isolated.
  - New database tables are additive and do not change existing event schema.
