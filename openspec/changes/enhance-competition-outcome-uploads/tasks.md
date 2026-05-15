## 1. Spec And Safety

- [x] 1.1 Create proposal, design, tasks, and requirements for competition outcome uploads.
- [x] 1.2 Validate the OpenSpec change.
- [x] 1.3 Before implementation, inspect git status and back up `server/database.sqlite`.

## 2. Backend And Database

- [x] 2.1 Add SQLite schema and migration for competitions, competition media, and competition works.
- [x] 2.2 Add backend controller/service logic for current featured outcome data.
- [x] 2.3 Add authenticated external submission endpoints for media and works.
- [x] 2.4 Add admin CRUD, feature selection, ordering, and review endpoints.
- [x] 2.5 Integrate competition media and works into the existing pending review center data source.
- [x] 2.6 Add validation for media type, required fields, status transitions, and Git URL format.

## 3. Frontend

- [x] 3.1 Replace static competition outcome page data with current featured competition API data.
- [x] 3.2 Add a unified public “上传成果” modal with type-specific forms.
- [x] 3.3 Replace static awarded works data with approved competition works from the API.
- [x] 3.4 Extend admin hackathon/competition management for competitions, media, works, sorting, and review.
- [x] 3.5 Extend the pending review UI to show and review competition media and works.
- [x] 3.6 Add loading, empty, error, and post-submit pending states for desktop and mobile.

## 4. Verification

- [x] 4.1 Run backend route/schema checks or targeted API smoke tests.
- [x] 4.2 Run `npm run lint` or targeted ESLint for touched files.
- [x] 4.3 Run `npm run build`.
- [x] 4.4 Use browser testing to verify public outcome page, upload modal, admin review, and approved display on desktop and mobile.
- [x] 4.5 Verify rejected or pending submissions never appear on public pages.
