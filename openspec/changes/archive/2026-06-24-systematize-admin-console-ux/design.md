## Context

The admin console is a React 18 + Vite + Tailwind workspace at `/admin`. The shell uses an internal `activeTab` state, shared admin primitives in `AdminUI.jsx`, and mocked Playwright coverage in `e2e/admin-console.spec.js`. Earlier changes improved layout, scroll affordances, and AI assistant consolidation, but this pass focuses on operational logic and information architecture rather than broad visual restyling.

## Goals / Non-Goals

**Goals:**

- Keep users inside a purposeful admin access experience when `/admin` is opened without an admin session.
- Make modules addressable and restorable through the URL without a large router rewrite.
- Align resource filtering, totals, and selection language around the same current scope.
- Reduce AI governance clutter by separating list-first model-key management from creation and by surfacing rationale text.
- Apply confirmation consistency to model-key deletion.
- Protect the behavior with targeted e2e coverage.

**Non-Goals:**

- No nested admin route migration.
- No API/schema migration.
- No wholesale visual rewrite of every admin manager.
- No unrelated public route fixes, even if unrelated local files are currently dirty.

## Decisions

### 1. Add a dedicated `AdminAccessGate`

`AdminRoute` will render a lazy-loaded admin access gate for loading, unauthenticated, and non-admin states instead of redirecting to `/`. The gate reuses `useAuth().login/logout`, provides the local admin username default, and keeps the browser on `/admin`.

Alternative considered: show the existing global auth modal. That modal is optimized for public-page login and would keep the admin entry feeling like a side-effect of the public site.

### 2. Use `?tab=` for deep links

`AdminDashboard` will read and write `?tab=<id>` via React Router search params. It will still persist the last active tab in `sessionStorage`, normalize legacy aliases, and scroll/focus the content start on module changes.

Alternative considered: nested routes such as `/admin/photos`. That is cleaner long-term, but it has a larger blast radius for route transitions, tests, and redirects. Query params give most of the operational value with lower risk.

### 3. Make resource filters server-scoped and page-scoped copy explicit

`ResourceManager` will send `statusFilter` to the existing resource list endpoint and reload from page 1 when status changes. Copy and selected-bar text will explicitly say "当前页" so batch actions cannot be mistaken for all pages or all matching results.

Alternative considered: keep the client filter and only rewrite copy. The backend already supports `status=all/approved/pending/rejected`, so using it removes the mismatch rather than describing it away.

### 4. Progressive disclosure for model-key creation

`AiModelConfigManager` will show the key list as the primary surface. "添加 Key" opens the form; when there are no keys, the form remains visible as an empty-state path. Delete uses `ConfirmDialog`.

Alternative considered: keep the form always first. That creates unnecessary visual weight in the AI area, especially when administrators are usually testing, enabling, disabling, or editing existing keys.

### 5. Surface AI suggestion rationale inline

`SuggestionRow` will render a compact "原因" line below the current-to-suggested value row. Apply-result reconciliation will use `suggestion.suggestionId || suggestion.id` consistently.

Alternative considered: keep rationale in the browser title tooltip. It is undiscoverable on touch devices and not visible when scanning.

## Frontend Responsibilities

- Render admin access states without public navbar/footer.
- Synchronize admin module state with query params, session storage, quick jump, side nav, previous/next controls, and browser back/forward.
- Keep selection state reset on server-filtered result changes.
- Confirm model-key deletion before calling the existing delete endpoint.
- Maintain keyboard/touch accessibility for the access form, module controls, and confirmation dialog.

## Backend Responsibilities

- Continue serving existing auth and resource APIs.
- Resource endpoints already support `status` query filtering; no backend code change is required for this pass.
- Runtime local login depends on the backend process listening behind the Vite proxy; this change does not replace backend startup/seed requirements.

## Accessibility And Performance

- Admin access gate uses labeled fields, visible errors, and a single primary submit button with loading feedback.
- Module query sync avoids remounting the whole app and only remounts the active admin content as before.
- Inline rationale text is compact and line-clamped to preserve scanability.
- No new third-party dependency or heavy asset is introduced.

## Risks / Trade-offs

- Query-param synchronization can loop if active tab normalization is not guarded. The implementation must normalize invalid/legacy values and only update params when needed.
- Playwright mocks must handle new AI/model-key endpoints; otherwise new tests could fail on unrelated live data.
- The local app currently reports login 500 through the Vite proxy when the backend is not reachable. The UI can now expose that cleanly, but real login verification still requires a running backend.

## Verification

- Validate the OpenSpec change.
- Run targeted ESLint for touched frontend files and admin e2e.
- Run `npm run build`.
- Run `npx playwright test e2e/admin-console.spec.js --project=chromium`.
- If the backend is started during verification, check `123 / 123456` login manually through the admin gate or direct API.
