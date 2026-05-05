## 1. Spec

- [x] 1.1 Document scroll, jump, focus, and long-list needs in OpenSpec artifacts.
- [x] 1.2 Validate the new OpenSpec change before implementation is complete.

## 2. Admin Shell

- [x] 2.1 Add shared module selection logic for sidebar, quick jump, and overview-driven navigation.
- [x] 2.2 Add quick jump, previous/next module actions, content focus restoration, and floating back-to-top control.
- [x] 2.3 Preserve mobile drawer close behavior and body scroll restoration.

## 3. Resource Lists

- [x] 3.1 Add resource list anchor and scroll-to-list behavior for search, clear, filters, and pagination.
- [x] 3.2 Add clear search action and list jump affordance.
- [x] 3.3 Extend shared table shell with sticky headers and bounded internal scrolling.

## 4. Verification

- [x] 4.1 Extend admin Playwright regression for quick jump, back-to-top, resource filter/list behavior, and mobile drawer.
- [x] 4.2 Run `openspec validate enhance-admin-scroll-and-jump-flow --strict`.
- [x] 4.3 Run targeted ESLint for touched admin files and admin e2e.
- [x] 4.4 Run `npm run build`.
- [x] 4.5 Run `npx playwright test e2e/admin-console.spec.js --project=chromium`.
- [x] 4.6 Iterate on failures until verification passes or an external blocker is documented.
