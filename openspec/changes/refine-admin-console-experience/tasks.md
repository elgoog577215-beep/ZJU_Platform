## 1. Spec And Scan

- [x] 1.1 Document the admin-console scan findings, requirements, and design in OpenSpec artifacts.
- [x] 1.2 Validate the new OpenSpec change before implementation.

## 2. Shared Admin UI Refinement

- [x] 2.1 Extend `AdminUI.jsx` with reusable primitives for icon actions, table shells, selected-action bars, helper text, and more detailed loading/empty states.
- [x] 2.2 Add or refine admin CSS utilities in `src/index.css` for table cells, selected bars, icon buttons, loading indicators, and responsive polish.

## 3. Admin Shell And Overview

- [x] 3.1 Refine `AdminDashboard.jsx` navigation metadata, top context, mobile drawer behavior, and global action hierarchy.
- [x] 3.2 Refine `Overview.jsx` cards and operational guidance so the page scans as a working dashboard rather than decorative blocks.

## 4. Manager Pages

- [x] 4.1 Refine `ResourceManager.jsx` to clarify filter scope, selected-item scope, mobile cards, desktop tables, pagination, and destructive confirmations.
- [x] 4.2 Convert `HackathonManager.jsx` to the shared admin UI system while preserving search, grade filter, pagination, delete, and CSV export.

## 5. Verification

- [x] 5.1 Add a Playwright admin regression using mocked API responses for overview, resource navigation, mobile drawer, and hackathon controls.
- [x] 5.2 Run targeted ESLint for touched admin files and new e2e test.
- [x] 5.3 Run `npm run build`.
- [x] 5.4 Run the new admin Playwright regression.
- [x] 5.5 Iterate on any failures until the targeted verification passes or an external blocker is documented.
