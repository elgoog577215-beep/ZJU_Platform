## Design

### Data Model

新增三类比赛成果数据，独立于全站 `photos` / `videos`，确保审核通过后只进入比赛成果页。

- `competitions`: `id`, `slug`, `title`, `subtitle`, `description`, `event_date`, `cover_image`, `is_featured`, `status`, `created_at`, `updated_at`。
- `competition_media`: `id`, `competition_id`, `type` (`promo_video` / `stage_photo`), `title`, `description`, `url`, `cover_url`, `sort_order`, `status`, `uploader_id`, `reviewed_by`, `review_note`, `reviewed_at`, `created_at`, `updated_at`。
- `competition_works`: `id`, `competition_id`, `title`, `author`, `summary`, `git_url`, `award`, `rank`, `cover_url`, `sort_order`, `status`, `uploader_id`, `reviewed_by`, `review_note`, `reviewed_at`, `created_at`, `updated_at`。

Only one competition should be featured at a time. The implementation should enforce this in service logic when an admin sets `is_featured = true`.

### Backend Responsibilities

Add a dedicated competition outcome controller and routes under `/api`:

- Public/current data:
  - `GET /competitions/current/outcome`: returns the featured approved competition with approved media and works.
- User submissions:
  - `POST /competitions/current/media`: authenticated users submit one promo video or one stage photo to the current featured competition.
  - `POST /competitions/current/works`: authenticated users submit one work record to the current featured competition.
- Admin management:
  - `GET/POST/PUT/DELETE /admin/competitions`
  - `PUT /admin/competitions/:id/feature`
  - `GET/PUT/DELETE /admin/competition-media/:id`
  - `PUT /admin/competition-media/:id/review`
  - `GET/PUT/DELETE /admin/competition-works/:id`
  - `PUT /admin/competition-works/:id/review`

Status rules:

- External user submissions are always `pending`.
- Admin-created submissions default to `approved` unless explicitly saved as pending.
- Public endpoints only return `status = approved` and non-deleted records.
- Reject actions store `review_note`; approve actions store reviewer and timestamp.

Validation:

- Media `type` must be `promo_video` or `stage_photo`.
- Promo videos require a video upload URL and may include cover image.
- Stage photos require an image upload URL.
- Works require title, author, summary, and Git URL; award/rank are allowed and can be edited by admin.
- Git URL must be an `http` or `https` URL.

### Frontend Responsibilities

The public competition outcome page keeps the existing immersive route, but replaces static `mediaMoments`, film placeholders, and `hackathonWorks.js` data with API data from the current featured competition.

- Add one visible “上传成果” entry on the public outcome page.
- The upload modal starts with a type selector: 赛事宣传片、赛场照片、优秀作品。
- Non-admin users must be logged in before submitting. After submit, show “已提交审核”。
- Admin users primarily manage content in the admin console; public upload may still work but should follow admin status rules.
- If there is no featured competition or no approved content yet, show a polished empty state rather than demo copy.

Admin console:

- Extend the existing hackathon/admin competition area into a competition outcome manager.
- Allow admins to create competitions, set the current featured competition, upload/edit media and works, adjust sort order/rank, and review pending submissions.
- Add competition media and work records to the existing pending review center with clear type labels.

### Compatibility And Safety

- Keep existing `/hackathon` registration management intact.
- Do not remove existing static fallback data until the new API page has empty/loading/error states.
- Reuse existing upload restrictions: image max 50MB, video max 500MB, dangerous extensions blocked.
- Before migration or implementation validation against a real database, create a SQLite backup.
