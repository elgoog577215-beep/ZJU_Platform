## Why

The admin shell now works as a command center, but the resource-management modules still carry a few friction points:

- Fast filter/search changes can show stale results because older requests may resolve after newer ones.
- List refreshes always fall back to a full loading state, which creates unnecessary visual jumps during routine filtering.
- Search controls rely on adjacent button text instead of explicit accessible names.
- Mobile resource cards do not expose a quick “open/edit” style action as clearly as the desktop table.

This follow-up pass makes resource workflows feel steadier and more polished without changing backend APIs or data models.

## What Changes

- Guard resource-list requests so only the latest response updates UI state.
- Keep the existing list visible during follow-up refreshes while showing a subtle refreshing state.
- Add explicit labels for resource search and sort controls.
- Tighten mobile resource card actions and selected-state feedback.
- Extend admin regression coverage for the new refresh/search behavior.

## Non-Goals

- No backend API change.
- No database or migration work.
- No public-page changes.
- No broad redesign of unrelated admin managers.
- No push of local generated files, database files, environment files, or unrelated dirty files.

## Impact

- Frontend:
  - `src/components/Admin/ResourceManager.jsx`
  - `src/components/Admin/AdminUI.jsx` if shared controls need small ergonomic polish
- Tests:
  - `e2e/admin-console.spec.js`
- Rollback:
  - Code-only revert. No persisted data shape changes.
