## Why

The current hackathon outcome system has overlapping concepts: public showcase pages, generic gallery/video resources, winning works, honor titles, review queues, and a legacy competition media package. The visible result is now also structurally fragmented: the media library groups records by generic categories instead of events, the showcase repeats works in separate "获奖作品" and "作品索引" chapters, and opening a work leaves the event narrative for a second full-page exhibition.

The product should treat a hackathon as an event domain that curates existing content channels, not as a second media CMS. Photos should use the live photo/gallery channel, videos should use the video channel, and winning works should use a dedicated work/story domain with review and honors.

## What Changes

- Establish one visible public outcome submission entry from the hackathon showcase and winner stories pages.
- Route outcome media by canonical content ownership:
    - stage photos -> photo live/gallery API
    - promo videos -> video API
    - winning works/stories -> hackathon work/story API
- Remove the legacy "competition outcome package" UI from admin operations and keep backend compatibility only until a later archive/migration.
- Define the public read model as a composed outcome page: event metadata, approved photos, approved videos, approved works, and honor/story details.
- Make the media library event-oriented: visitors switch between event archives (for example 05.10 and 06.07), then browse that event's complete approved photo/video record. Generic categories remain optional facets inside an event and are not the event source of truth.
- Compress the public outcome information architecture to three primary chapters: 赛事总览、现场档案、作品与荣誉. Partner credits and follow-up links move into the closing area instead of occupying independent full-screen chapters.
- Move the complete approved work exhibition and work detail interaction into the event showcase. Keep `/hackathon/works` only as a compatibility/deep-link entry into the same event-scoped result view.
- Add an explicit event-to-media relation so photos and videos can belong to an event without duplicating their canonical media records.
- Keep personal contact data, raw upload metadata, IP addresses, and private review fields out of public responses.

## Non-Goals

- Do not delete existing uploaded files, database tables, or historical records in this iteration.
- Do not migrate all legacy `competition_media` records automatically yet.
- Do not replace the generic photo/video managers.
- Do not remove `media_categories`; they remain editorial facets for non-event media or for optional filtering within an event archive.
- Do not build the full gamified honor/points economy yet; only define where titles attach.

## Impact

- Frontend: media library event switcher, hackathon showcase, winner-story compatibility route, upload modal copy and entry points.
- Backend: API ownership policy; current implementation already routes photos/videos to existing media endpoints and works to work/story endpoints.
- Database: add a non-destructive event-media association beside canonical `photos` and `videos`; keep the legacy media package readable until migration is verified.
- Admin: hackathon admin should manage registrations and work/story review; media moderation remains in photo/video managers and pending review.
- Deployment: low risk for stage one; no production data deletion.

## Risks

- Existing legacy routes can still be called by old clients. Mitigation: remove all new UI dependencies first, then deprecate backend routes in a separate migration.
- Photos/videos are currently related by tags instead of a first-class event key. Mitigation: introduce an association backed by the canonical competition/event slug, backfill known records idempotently, and keep unlinked records visible in their existing generic archive.
- Existing links point to `/gallery` and `/hackathon/works`. Mitigation: preserve route compatibility and translate them into `/media?event=<slug>` and `/hackathon?event=<event-key>&view=showcase&work=<id>` without breaking old bookmarks.
- Submitted works may include personal details in free text. Mitigation: public serializers must continue to whitelist fields and require review.
