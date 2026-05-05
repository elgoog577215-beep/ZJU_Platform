## Context

The admin console is a React tabbed workspace under `src/components/Admin`. It uses shared primitives in `AdminUI.jsx`, but several high-frequency modules still carry local styling and behavior that diverge from the rest of the console. The most visible divergence is `HackathonManager.jsx`, which currently renders as a standalone light table surface instead of using the admin shell. `ResourceManager.jsx` uses shared pieces but still hardcodes many dark-mode classes inside cards, tables, selected bars, icon buttons, and pagination.

The project already has a broader in-progress theme change, but this change is intentionally narrower: make the existing admin experience more refined and reliable without waiting for a full theme-system overhaul.

## Goals / Non-Goals

**Goals:**

- Improve admin clarity, scanability, and interaction polish across the shell, resource management, and hackathon management.
- Reuse and extend the existing Admin UI primitives instead of introducing a separate design system.
- Make the desktop table and mobile card experiences consume the same theme semantics.
- Add an automated admin regression that can run without a real admin login or live backend data.
- Keep implementation scoped to frontend and e2e tests.

**Non-Goals:**

- No database migration or backend API change.
- No full rewrite of every admin module in this pass.
- No route restructuring; the admin console remains one `/admin` route with internal tabs.
- No redesign of public-facing pages.

## Decisions

### 1. Refine the shared Admin UI primitives first

`AdminUI.jsx` will get small, reusable primitives for action icon buttons, table shells, helper rows, selected-action bars, and richer loading/empty states. This gives high-frequency pages a better foundation without forcing every manager file to duplicate theme conditionals.

Alternative considered: rewrite each admin page locally. That would move faster for one page but increase inconsistency and future maintenance cost.

### 2. Keep the admin shell tabbed, but make context denser

`AdminDashboard.jsx` will keep its internal tab model and `sessionStorage` persistence. The refinement adds clearer module metadata, compact nav affordances, and a more purposeful top summary so administrators always know where they are and what the active module does.

Alternative considered: nested admin routes. That is a bigger routing change and not necessary for the current UX goal.

### 3. Treat resource management as the representative table workflow

`ResourceManager.jsx` is used for photos, videos, music, articles, and events, so improvements there have high leverage. The page will clarify visible counts vs server totals, selection scope, filter state, event metrics, and destructive actions while preserving the existing API calls.

Alternative considered: change backend query status behavior so filters are server-side. That is useful later, but this change avoids backend risk and documents the current client-side filtering clearly.

### 4. Migrate HackathonManager into the shared admin system

The hackathon manager currently has its own layout, cards, form controls, confirm dialog, and export controls. It will be converted to `AdminPageShell`, `AdminPanel`, `AdminMetricCard`, `AdminButton`, and `ConfirmDialog`, aligning it with the rest of the console while keeping CSV export and pagination behavior.

Alternative considered: leave it for a later pass. That would keep one of the most obvious admin inconsistencies visible, so it is included here.

### 5. Mock admin data in Playwright instead of requiring real login

The new e2e test will seed local storage/session state and route API calls for `/auth/me`, `/stats`, resource lists, and hackathon registrations. This avoids flaky dependencies on a local database while still checking actual UI rendering, routing, navigation, responsive behavior, and key controls.

Alternative considered: use real admin login. That would couple the test to local environment variables and seeded users, increasing setup friction.

## Risks / Trade-offs

- Existing uncommitted work is present in the repository -> keep edits scoped to admin files and avoid reverting unrelated changes.
- Admin theme classes are shared by several pages -> add focused lint/build checks and one e2e regression before finishing.
- Client-side resource filtering can still differ from server totals -> make the UI copy explicit about current page/visible results instead of implying global filtered totals.
- Playwright mocks may miss backend contract drift -> keep the smoke narrow and retain existing manual/backend tests for API behavior.

## Migration Plan

1. Add the new admin spec and task plan.
2. Extend shared Admin UI primitives and CSS theme utilities.
3. Refine admin shell and overview context.
4. Refine resource manager table/card/selection behavior.
5. Convert hackathon manager to shared admin primitives.
6. Add Playwright admin regression with mocked API responses.
7. Run targeted lint, build, OpenSpec validation, and e2e. Iterate until clean or document any external blocker.

Rollback is a code revert only; no data migration is involved.

## Open Questions

None. The user requested autonomous execution and explicitly asked not to pause for additional approval, so implementation proceeds with conservative assumptions.
