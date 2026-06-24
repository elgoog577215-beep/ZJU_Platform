## Why

The hackathon outcome package already supports approved works, media uploads, and admin review. The next product layer is to turn winning works into reusable member stories: a public visitor should see each winner's honor title, project entry, and selected experience sharing, while sensitive contact data stays private.

## What Changes

- Extend competition works with public profile fields: honor title, grade, major, highlight quote, experience sharing, and public consent.
- Let external logged-in users submit a work with experience sharing through the existing outcome upload modal.
- Let admins edit those fields, review the submission, and assign or correct the honor title.
- Show honor titles and short highlights on the public works page.
- Add a public detail view for approved works so visitors can read experience sharing without exposing phone, email, IP, or raw survey metadata.

## Non-Goals

- Do not publish phone numbers, email addresses, IP addresses, source channel details, or raw questionnaire metadata.
- Do not build a full gamified point system in this iteration.
- Do not migrate the collected offline files automatically into the database.
- Do not change generic gallery/video/article resource behavior.

## Impact

- Frontend: public works page, outcome upload modal, admin hackathon manager.
- Backend: competition work create/update/list/current outcome serialization.
- Database: additive columns on `competition_works`; no destructive migration.
- Deployment: back up SQLite before applying migration.
