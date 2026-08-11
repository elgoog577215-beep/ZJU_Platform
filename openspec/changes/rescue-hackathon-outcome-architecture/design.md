# Design: Hackathon Outcome Architecture Rescue

## Target Model

Hackathon content is split by ownership:

- `Hackathon Event`: event identity, public landing/showcase configuration, sponsor/support context.
- `Photo Channel`: canonical photo and live-photo records. Event membership is expressed by a first-class event-media relation, while categories remain optional editorial facets.
- `Video Channel`: all event films, trailers, recap videos, and edited clips.
- `Work Story`: winning project, author display name, award, rank, honor title, project link, public summary, experience sharing, consent, and review state.
- `Review`: moderation state across photos, videos, and works.

## Public Information Architecture

- `/hackathon?event=<event-key>&view=showcase`: the primary event result surface. It has three top-level chapters only:
    1. `赛事总览`: event identity, official film, essential facts, and submission action.
    2. `现场档案`: a restrained highlight sequence with an event-scoped jump to the complete archive.
    3. `作品与荣誉`: podium emphasis, the complete approved work index, and in-context work detail. Partner/support credits close this chapter rather than forming another full-screen page.
- `/media?event=<competition-slug>`: canonical event archive. The selected event is URL-backed, and the visitor can switch to another event without losing the media-library context.
- `/hackathon/works?competition=<competition-slug>` and `/gallery`: compatibility routes. They resolve to the corresponding event-scoped showcase or media archive instead of presenting competing product surfaces.

## Event Archive Interaction

1. The media library opens on the latest published event when event archives exist.
2. The top-level switcher presents event identity, date, and media counts. `全部活动` is an overview of event archive covers, not one mixed stream of every photo.
3. Inside the selected event, photos are the primary visual archive and videos are a secondary recap strip. Photos have no persistent text panel or dark "门板" over the image; titles and metadata appear below the image or on deliberate focus/hover states.
4. Optional category facets such as 开幕、开发、颁奖、交流 can refine the selected event, but they never replace the event association.
5. Switching events updates the URL and fetches only that event's approved media, while preserving mobile vertical scrolling and back-button behavior.

## Work Exhibition Interaction

1. The showcase renders the top three works with stronger hierarchy, followed immediately by a compact ranked index for every other approved work.
2. Selecting a work opens its story without leaving the event context:
    - desktop: a wide detail layer or inline expansion with cover, award, author, summary, experience and project link;
    - mobile: a body-portal full-screen detail view using `100dvh`, scroll lock, and browser/back-button close.
3. The selected work is represented by `work=<id>` in the showcase URL so details are shareable and browser navigation remains truthful.
4. The separate winner-story page is not a second catalogue; it only adapts old deep links into this interaction.

## Event-Media Relation

Keep `photos` and `videos` as the canonical media records. Add an association such as `competition_media_links` with:

- `competition_id`
- `resource_type` (`photo` or `video`)
- `resource_id`
- `role` (`official-film`, `highlight`, `archive`)
- `sort_order`
- timestamps and a uniqueness constraint on `(competition_id, resource_type, resource_id)`

This avoids copying files or public metadata into a second CMS. The legacy `competition_media` table remains read-compatible until its records have been mapped and verified.

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

## Public Read Shape

Use the existing competition outcome aggregate as the first implementation surface, then expose the stable event route when the event template and competition slug mapping is formalized:

- `GET /competitions/:competitionSlug/outcome`
- future alias: `GET /hackathons/:eventKey/outcomes`

It should return only public fields:

- event
- approvedPhotos
- approvedVideos
- approvedWorks
- honors

The response also includes event archive counts and stable resource ids needed for `/media?event=` and `work=` deep links. Public serializers continue to whitelist fields.

This endpoint can compose from existing tables first, then move to first-class event relations later.
