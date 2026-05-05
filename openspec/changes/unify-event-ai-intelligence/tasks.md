## 1. Shared Catalog and Service

- [x] 1.1 Create the shared backend event catalog with canonical categories, aliases, labels, campus options, audience options, and allowed extraction tags.
- [x] 1.2 Implement the event intelligence service for prompt context, category normalization, audience normalization, payload validation, and deterministic legacy classification.
- [x] 1.3 Add targeted module-level checks for key normalization and classification cases.

## 2. WeChat Parsing Integration

- [x] 2.1 Update the WeChat parsing prompt to include shared standard catalog context and require canonical `category` output.
- [x] 2.2 Replace local WeChat category/audience post-processing with shared validation and metadata from the event intelligence service.
- [x] 2.3 Verify parsed sample payloads normalize legacy category labels and reject or repair unknown model values safely.

## 3. Event Assistant Integration

- [x] 3.1 Replace event assistant private category aliases, labels, campus options, and audience options with shared catalog/service imports.
- [x] 3.2 Update category inference and intent parsing to use shared normalization while preserving existing recommendation response behavior.
- [x] 3.3 Verify assistant scoring still handles canonical and legacy event categories.

## 4. Legacy Data Tooling

- [x] 4.1 Add `server/scripts/classify-event-categories.js` with dry-run default, apply mode, confidence threshold, reporting, and backup before mutation.
- [x] 4.2 Run the classifier in dry-run mode against the local database and review the planned changes.
- [x] 4.3 Document the server rollout commands in the script output or comments.

## 5. Validation

- [x] 5.1 Run focused backend checks for the new service and script.
- [x] 5.2 Run lint or the narrowest available syntax checks for changed backend files.
- [x] 5.3 Run OpenSpec validation for `unify-event-ai-intelligence`.
