## Why

The current hackathon outcome system has overlapping concepts: public showcase pages, generic gallery/video resources, winning works, honor titles, review queues, and a legacy competition media package. This makes the user-facing upload path hard to find and makes the admin surface feel like several half-overlapping products.

The product should treat a hackathon as an event domain that curates existing content channels, not as a second media CMS. Photos should use the live photo/gallery channel, videos should use the video channel, and winning works should use a dedicated work/story domain with review and honors.

## What Changes

- Establish one visible public outcome submission entry from the hackathon showcase and winner stories pages.
- Route outcome media by canonical content ownership:
  - stage photos -> photo live/gallery API
  - promo videos -> video API
  - winning works/stories -> hackathon work/story API
- Remove the legacy "competition outcome package" UI from admin operations and keep backend compatibility only until a later archive/migration.
- Define the public read model as a composed outcome page: event metadata, approved photos, approved videos, approved works, and honor/story details.
- Keep personal contact data, raw upload metadata, IP addresses, and private review fields out of public responses.

## Non-Goals

- Do not delete existing uploaded files, database tables, or historical records in this iteration.
- Do not migrate all legacy `competition_media` records automatically yet.
- Do not replace the generic photo/video managers.
- Do not build the full gamified honor/points economy yet; only define where titles attach.

## Impact

- Frontend: hackathon showcase, winner stories page, upload modal copy and entry points.
- Backend: API ownership policy; current implementation already routes photos/videos to existing media endpoints and works to work/story endpoints.
- Database: no destructive change now; future phase may add a formal `hackathon_events` / `hackathon_submissions` model and archive legacy media package records.
- Admin: hackathon admin should manage registrations and work/story review; media moderation remains in photo/video managers and pending review.
- Deployment: low risk for stage one; no production data deletion.

## Risks

- Existing legacy routes can still be called by old clients. Mitigation: remove all new UI dependencies first, then deprecate backend routes in a separate migration.
- Photos/videos are currently related by tags instead of a first-class event key. Mitigation: standardize tags now, add `event_key` or campaign relation later.
- Submitted works may include personal details in free text. Mitigation: public serializers must continue to whitelist fields and require review.
