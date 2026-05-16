# Design: Hackathon Outcome Architecture Rescue

## Target Model

Hackathon content is split by ownership:

- `Hackathon Event`: event identity, public landing/showcase configuration, sponsor/support context.
- `Photo Channel`: all event photos and live photo records. Hackathon photos are related by tags now and by `event_key` later.
- `Video Channel`: all event films, trailers, recap videos, and edited clips.
- `Work Story`: winning project, author display name, award, rank, honor title, project link, public summary, experience sharing, consent, and review state.
- `Review`: moderation state across photos, videos, and works.

## Public Navigation

- `/hackathon/showcase`: primary outcome surface. It shows the official film, photo highlights, winning works, partners, and a clear "提交成果" action.
- `/hackathon/works`: long-form winner story surface. It shows approved works and has a direct "提交作品/经验" action.
- `/gallery`: canonical photo browsing surface.
- video pages: canonical video browsing surface.

## Upload Flow

1. Visitor clicks "提交成果" or a contextual upload button.
2. Modal starts with the relevant type:
   - showcase main CTA defaults to stage photo
   - live photo CTA defaults to stage photo
   - works CTA defaults to work/story
3. Authenticated user submits.
4. Media is saved through the generic upload service, then attached to the canonical channel:
   - `POST /photos`
   - `POST /videos`
   - `POST /competitions/current/works`
5. Non-admin submissions remain pending until review.

## Admin Boundary

Hackathon admin should not be a shadow CMS for media. It should own:

- registrations
- participant state
- work/story review and honor metadata
- event-level configuration

Photos and videos should be moderated in their existing managers and pending review queues.

## Future Backend Shape

When this moves beyond the rescue stage, add an aggregate read endpoint:

`GET /hackathons/:eventKey/outcomes`

It should return only public fields:

- event
- approvedPhotos
- approvedVideos
- approvedWorks
- honors

This endpoint can compose from existing tables first, then move to first-class event relations later.
