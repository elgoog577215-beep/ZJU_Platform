## 1. Spec

- [x] 1.1 Document admin layout organization scan findings, requirements, and design.
- [x] 1.2 Validate the OpenSpec change before implementation is complete.

## 2. Admin Shell

- [x] 2.1 Rework top header into orientation, navigation tools, and session actions with clearer hierarchy.
- [x] 2.2 Reduce sidebar density by hiding inactive descriptions and tightening item spacing.
- [x] 2.3 Preserve quick jump, previous/next, back-to-top, mobile drawer, and body scroll behavior.

## 3. Shared Components And Pages

- [x] 3.1 Tune shared Admin UI spacing, radius, and panel/header rhythm for a cleaner operations workspace.
- [x] 3.2 Reorganize `Overview.jsx` into today, content, and operations sections while removing repeated action panels.
- [x] 3.3 Simplify `ResourceManager.jsx` status/filter explanation into a compact work-surface status row.

## 4. Verification

- [x] 4.1 Update admin e2e coverage for organized shell, overview structure, and resource status row.
- [x] 4.2 Run `openspec validate organize-admin-console-layout --strict`.
- [x] 4.3 Run targeted ESLint for touched files and admin e2e.
- [x] 4.4 Run `npm run build`.
- [x] 4.5 Run `npx playwright test e2e/admin-console.spec.js --project=chromium`.
- [x] 4.6 Iterate on failures until verification passes or an external blocker is documented.
