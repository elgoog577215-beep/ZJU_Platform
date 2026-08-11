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

## Public Visual Language

- 视觉重构采用概念图驱动：先固定经用户选中的目标图，再为后续章节生成同一体系的 02 / 03 / 04 概念图；实现后必须在同一视口制作“概念图 / 真实页面”并排对照，不能以单张实现截图代替视觉验收。
- The showcase and event archive share one spatial world: deep black-green ground, a real raster X-field as the compositional backbone, acid-lime signals, documentary event media, and monumental Chinese type.
- The global ecosystem header is a route-invariant shell: every route uses the `拓浙AI生态` primary identity, shared destinations, controls, and flat underline navigation. The hackathon route may activate `浙客松`, but it must not replace the ecosystem identity or rename global navigation. The event switcher remains a compact secondary control below it instead of becoming a second full-width navigation bar.
- The X-field must remain visibly present in the first viewport. It is not recreated with CSS shapes and must not be hidden under an opaque page mask.
- Acid lime is reserved for the event title accent, key numbers, selected state, section numbering, and primary actions. White carries content hierarchy; muted copy remains low-contrast.
- Rounding is selective rather than global: the desktop overview film preserves the selected mockup's directional “train-nose” silhouette, other event media uses restrained 12–24 px radii, and controls use 9–12 px radii, while statistics, rankings, captions, and section dividers remain open and line-based. Mobile keeps the overview film as a stable rounded rectangle rather than carrying the desktop crop into a narrow viewport.
- Photos never receive a persistent text panel or dark overlay. Functional video affordances may float over media, but captions and metadata remain below the image.
- Desktop composition deliberately separates the upper-left title from the lower-right event photo across the X. Mobile collapses to one vertical story, keeps horizontal photo strips independently scrollable, and never introduces document-level horizontal overflow.

### Final 03 Fidelity Constraints

- The final selected 03 concept is the sole visual target for Works & Honors. At `1536×1024`, the section heading, complete TOP 3 podium, selected champion detail, and 04–08 index must form one readable viewport instead of letting one image push the index or detail below the fold.
- The podium keeps a champion-led track with aligned runner-up stories. The lower half uses an open media/editorial composition with a near-balanced detail/index relationship; restrained image radii are allowed, but a large rounded wrapper around the whole detail is not.
- The mobile layout keeps the champion on one row and second/third place in two columns. Its `body` portal owns its color variables and sits above the global bottom navigation so the full-screen detail cannot become transparent or visually fall behind the shell.
- Podium award names, selected-work titles, and creator labels are rank-driven locale strings. English UI never concatenates a Chinese backend award value into an English label; real work names, authors, and event content remain truthful source data.

## Event Archive Interaction

1. The media library opens on the latest published event when event archives exist.
2. The top-level switcher presents event identity, date, and media counts. `全部活动` is an overview of event archive covers, not one mixed stream of every photo.
3. Inside the selected event, photos are the primary visual archive and videos are a secondary recap strip. Photos have no persistent text panel or dark "门板" over the image; titles and metadata appear below the image or on deliberate focus/hover states.
4. Optional category facets such as 开幕、开发、颁奖、交流 can refine the selected event, but they never replace the event association.
5. Switching events updates the URL and fetches only that event's approved media, while preserving mobile vertical scrolling and back-button behavior.

## Work Exhibition Interaction

1. The showcase renders the top three works as a media-led award podium: the champion owns the dominant track, while second and third place remain aligned companion stories. Below it, the selected work and complete approved index share near-equal desktop tracks. The index uses real cover thumbnails and readable metadata so it cannot collapse into a tiny side rail beside an oversized detail panel.
2. Selecting a work opens its story without leaving the event context:
    - desktop: a wide detail layer or inline expansion with cover, award, author, summary, experience and project link;
    - mobile: a body-portal full-screen detail view using `100dvh`, scroll lock, and browser/back-button close.
3. The selected work is represented by `work=<id>` in the showcase URL so details are shareable and browser navigation remains truthful.
4. The separate winner-story page is not a second catalogue; it only adapts old deep links into this interaction.
5. Partner credits close the chapter as a knowledge-and-innovation network: a large truthful partner count, one restrained enterprise-logo runway sourced from the About partner truth, then grouped school/community roles and an indexed name matrix. It does not become a repeated logo-card wall or a separate route.

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
