## 1. Spec And Safety

- [x] 1.1 Confirm existing competition outcome APIs and admin UI match package-first semantics.
- [x] 1.2 Inspect git status before implementation and avoid overwriting unrelated edits.
- [x] 1.3 Back up SQLite before any migration or data-affecting validation.

## 2. Backend And Data Rules

- [x] 2.1 Verify `GET /admin/competitions` returns package-level promo video count, stage photo count, works count, and pending count.
- [x] 2.2 Ensure `PUT /admin/competitions/:id/feature` makes exactly one active package current display.
- [x] 2.3 Ensure public outcome queries only return approved children from the current package's `competition_id`.
- [x] 2.4 Ensure external submissions always bind to the current display package and default to pending for non-admin users.
- [x] 2.5 Ensure deleting a package hides the package and its children from admin lists and public pages.

## 3. Admin Frontend

- [x] 3.1 Rename or clarify admin copy from generic “比赛” to “比赛成果包” where it affects understanding.
- [x] 3.2 Add a prominent current-display summary in the outcome management tab.
- [x] 3.3 Show package list counts for promo videos, stage photos, excellent works, and pending items.
- [x] 3.4 Keep all media/work forms scoped to the selected package and make that selected context obvious.
- [x] 3.5 Keep create/edit package workflow complete: name, subtitle, description, date, cover, status, current-display flag.
- [x] 3.6 Preserve existing registration management in the same manager without changing its behavior.

## 4. Public Frontend

- [x] 4.1 Verify `/hackathon/showcase` renders only current package metadata and approved child records.
- [x] 4.2 Verify `/hackathon/works` renders only current package approved works.
- [x] 4.3 Show polished empty states when the current package has no approved promo videos, photos, or works.
- [x] 4.4 Keep upload and detail-view behavior scoped to the current package.

## 5. Verification

- [x] 5.1 Create package A and package B; add different content to each package.
- [x] 5.2 Switch current display between A and B and verify public pages switch as a whole package.
- [x] 5.3 Verify pending/rejected submissions never appear publicly.
- [x] 5.4 Verify package switching does not change child `competition_id` values.
- [x] 5.5 Run `npm run build`.
- [x] 5.6 Run targeted API smoke tests for package list, feature switching, and current outcome data.
