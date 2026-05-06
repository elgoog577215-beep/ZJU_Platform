## Why

The admin console has already been refined through several focused UI passes, but the latest scan still shows structural problems that make the interface feel less efficient than it should be for real operations:

- Opening `/admin` without a valid admin session silently returns users to the public home page, so local admin login failures look like navigation bugs instead of an access-state issue.
- Admin modules are still internal tabs only. They cannot be bookmarked, shared, restored with browser back/forward, or opened directly from a URL.
- Resource status filtering is visually global but still mixed with current-page client filtering, making totals and selection scope easy to misread.
- AI governance now contains both event suggestions and model keys, but suggestion rationale is hidden in tooltips and model-key creation/deletion still occupies too much attention.
- Dangerous actions are safer for resources, but model-key deletion lacks the same confirmation standard.
- Existing regression coverage exercises admin rendering, but does not yet protect deep links, unauthenticated admin entry, or the cleaned AI/model-key workflow.

The goal of this change is to make the admin console more orderly, efficient, and operationally trustworthy: administrators should understand where they are, what data scope they are operating on, and how to recover from access/session problems without falling back to the public site.

## What Changes

- Add an admin access gate so `/admin` stays in an admin context when unauthenticated or logged in as a non-admin. The gate provides a focused admin login form and clear non-admin feedback.
- Make admin tabs URL-addressable with `?tab=<module>`, while preserving the existing session fallback and legacy `ai-models -> intelligence` alias.
- Convert resource status filters to request server-side status scope and make current-page selection/copy explicit.
- Declutter the AI governance area by showing suggestion reasons inline and fixing suggestion status reconciliation for fallback IDs.
- Move model-key creation behind progressive disclosure and require confirmation before deleting a key.
- Update Playwright coverage for unauthenticated admin entry, URL tab navigation, resource scope copy, AI rationale, and model-key delete confirmation.

## Non-Goals

- No full admin routing rewrite to nested `/admin/<module>` routes in this pass.
- No database schema migration.
- No backend API contract change beyond using the existing `status` query parameter on resource endpoints.
- No full redesign of settings/page-content ownership, user lifecycle management, or message reply workflows.
- No public-page UI work.

## Capabilities

### New Capabilities

- `admin-console-systematization`: Defines requirements for admin access handling, URL-addressable module navigation, resource scope clarity, AI governance cleanup, destructive-action consistency, and regression coverage.

### Modified Capabilities

- Existing admin layout, scroll/navigation, and AI-intelligence capabilities are extended by implementation behavior but not redefined wholesale.

## Impact

- Affected frontend files:
  - `src/App.jsx`
  - `src/components/Admin/AdminAccessGate.jsx`
  - `src/components/Admin/AdminDashboard.jsx`
  - `src/components/Admin/ResourceManager.jsx`
  - `src/components/Admin/AiAssistantManager.jsx`
  - `src/components/Admin/AiModelConfigManager.jsx`
- Affected tests:
  - `e2e/admin-console.spec.js`
- Backend/API impact:
  - No new endpoint.
  - Resource manager now sends the selected `status` to existing resource list endpoints.
  - Local backend availability remains a runtime requirement for real `123 / 123456` login; the UI change makes that failure visible inside the admin access context.
- Data safety:
  - No migration or bulk data operation.
  - Model-key deletion gains confirmation before the existing delete request is sent.
- Rollback strategy:
  - Revert this change set. Since no schema or persisted data format changes are introduced, rollback is code-only.
