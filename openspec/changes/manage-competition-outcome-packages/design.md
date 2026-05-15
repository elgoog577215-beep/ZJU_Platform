## Design

### Product Model

A competition package is the complete public result bundle for one competition. It includes:

- Package metadata from `competitions`: title, subtitle, description, event date, cover image, status, current-display flag.
- Package media from `competition_media`: `promo_video` and `stage_photo` records bound by `competition_id`.
- Package works from `competition_works`: excellent work records bound by `competition_id`.
- Review state on every media/work item.

The public site must treat the current featured competition package as an atomic source. It must not mix media or works from other packages.

### Current Display Selection

Use `competitions.is_featured = 1` as the current public display selector.

- Setting one package as current display must unset `is_featured` on all other non-deleted packages.
- The selected package should be forced/kept `status = active` so public pages can load it.
- Switching current display must not mutate `competition_media` or `competition_works` rows.

### Admin Experience

The admin outcome area should present package-first management:

- A clear current-display summary, e.g. “当前公开展示：<比赛包名称>”.
- A create/edit package form for metadata.
- A package list showing title, subtitle/date, current-display badge, media count, works count, and pending count.
- A selected package context. All media/work forms and lists operate on the selected package.
- A visible empty state when no package exists, guiding admins to create a package before uploading outcomes.

Media/work management keeps existing behavior but must make package binding obvious:

- Admin-created media/work records use the selected package ID.
- Existing records remain bound to their original package unless an admin explicitly edits the record's package association.
- Stage photos only require the photo file/address; promo videos may have an optional cover.
- Works require title, author, summary, and Git URL; cover, award, and rank are optional.

### Public Data Flow

- `/competitions/current/outcome` returns only the current featured active package.
- Returned media and works must be filtered by that package's `competition_id`, `status = approved`, and `deleted_at IS NULL`.
- `/hackathon/showcase` renders the package metadata plus approved promo videos, stage photos, and works.
- `/hackathon/works` renders only approved works from the same current package.
- If there is no current package, public pages show empty states and upload submission should fail with a specific message.

### External Submission Flow

- External users submit through the public outcome page.
- The backend resolves the current featured package at submit time.
- New external media/work records are created with that package ID and `status = pending`.
- Pending/rejected records never appear on public pages.
- After approval, records appear only when their package is the current display package.

### Safety And Data Integrity

- Deleting a package soft-deletes the package and soft-deletes or hides all child media/work records from admin lists and public pages.
- Package switching is reversible by selecting another package as current display.
- No data migration should move child records between packages automatically.
