# AI Community Implementation Plan

Date: 2026-04-16
Source Spec: `docs/superpowers/specs/2026-04-16-ai-community-phased-spec.md`

## Goal

Turn the approved AI community spec into an implementation-ready plan, with concrete work ordered by dependency and limited to pragmatic changes that fit the current codebase.

This plan prioritizes:

1. P0: cross-module linkage foundation
2. P1: tech article upgrade

P2 to P4 are included as follow-on work so the team can stage execution without reopening product scope.

## Delivery Strategy

Do not rewrite the AI community architecture.

Instead:

- Reuse the current `/articles` community route
- Reuse existing resource CRUD and moderation infrastructure
- Add a lightweight linkage layer first
- Upgrade `tech` detail and discovery next
- Extend help, news, and groups only after the article hub becomes a stable destination

## Phase Overview

### P0: Community Linkage Foundation

Objective:

Make all four community modules capable of referencing each other through explicit structured linkage metadata.

User-visible outcomes:

- Admins can associate news with articles, help threads, and groups
- Articles can recommend related help, news, and groups
- Groups can reference articles and help threads
- Help threads can surface related long-form content

### P1: Tech Article Upgrade

Objective:

Turn the tech article module into the knowledge hub of the AI community.

User-visible outcomes:

- Searchable technical article feed
- Featured article area
- Better article detail structure
- TOC
- Share action
- Related-content exploration block
- Better author workflow visibility for rejected and pending submissions

### P2: Help and News Linkage

Objective:

Make help and news meaningfully feed traffic into the article hub and into each other.

### P3: Group Conversion Layer

Objective:

Make groups a downstream conversion surface rather than a static asset wall.

### P4: Operations and Analytics

Objective:

Expose the minimum operating metrics and content controls needed to actively run the community.

## P0 Detailed Plan

### P0.1 Data Model Changes

Add lightweight JSON text linkage fields instead of new join tables.

Target tables:

- `articles`
- `community_posts`
- `news`
- `community_groups`

Fields:

- `related_article_ids`
- `related_post_ids`
- `related_news_ids`
- `related_group_ids`

Additional group field:

- `primary_tags`

Implementation notes:

- Store as JSON text arrays, default `NULL`
- Validate as arrays of numeric IDs at the API boundary
- Keep migration additive only

Primary files:

- `server/src/config/runMigrations.js`

Acceptance:

- Existing data remains valid
- New columns exist after migration
- Old records load without breakage

### P0.2 Backend Payload Normalization

Extend controllers so linkage fields are accepted, sanitized, and persisted consistently.

Work:

- Add linkage-field normalization helpers
- Validate JSON text or arrays in request bodies
- Persist normalized JSON text
- Reject malformed linkage payloads with 400

Primary files:

- `server/src/controllers/resourceController.js`
- `server/src/controllers/newsController.js`
- optionally shared helper under `server/src/utils/`

Acceptance:

- `PUT /articles/:id` accepts linkage fields
- `PUT /community/posts/:id` accepts linkage fields
- `PUT /news/:id` accepts linkage fields
- `PUT /community/groups/:id` accepts linkage fields

### P0.3 Read Path Support

Ensure detail endpoints return linkage metadata so the frontend can render related sections.

Work:

- Include linkage fields in detail responses
- Keep current detail payload shape otherwise unchanged
- Add optional helper endpoint only if composition in frontend becomes too noisy

Primary files:

- `server/src/controllers/resourceController.js`
- `server/src/controllers/communityController.js`
- `server/src/controllers/newsController.js`

Acceptance:

- Detail responses include linkage metadata
- No existing consumer breaks

### P0.4 Admin Editing Surface

Add minimal admin-edit capability for linkage metadata without designing a full relationship CMS.

Recommended scope:

- News rail edit flow can assign related article, post, and group IDs
- Group edit flow can assign related article and post IDs plus primary tags
- Article edit flow can assign related article, post, news, and group IDs

UI strategy:

- Use lightweight ID-based inputs in phase 0
- Avoid building complex search-and-select relationship pickers yet

Primary files:

- `src/components/UploadModal.jsx`
- `src/components/CommunityNewsRail.jsx`
- `src/components/CommunityGroups.jsx`
- `src/components/CommunityTech.jsx`

Acceptance:

- Admin can save and update linkage metadata from UI
- Saved linkage appears again when reopening edit form

### P0.5 Frontend Related Content Rendering

Render related sections in detail views using the new linkage fields.

Minimum scope:

- Article detail: related help, news, groups, articles
- Help detail: related articles and news
- News modal: extended reading and next-step actions
- Group detail or expanded group panel: recommended articles and latest help

Implementation strategy:

- Add a shared related-content fetch helper
- Resolve IDs to cards using existing list/detail endpoints
- Keep rendering resilient when linked items are deleted or no longer approved

Primary files:

- `src/components/CommunityDetailModal.jsx`
- `src/components/CommunityTech.jsx`
- `src/components/CommunityHelp.jsx`
- `src/components/CommunityNewsRail.jsx`
- `src/components/CommunityGroups.jsx`
- `src/hooks/useCommunityFeed.js` if shared fetching belongs there

Acceptance:

- Linked content appears in detail views when configured
- Missing linked resources fail silently and do not break the page

## P1 Detailed Plan

### P1.1 Article Search

Add first-class keyword search to the tech article feed.

Backend:

- Reuse existing `search` support in resource controller for `articles`

Frontend:

- Add search input to `CommunityTech`
- Reset pagination on query change
- Combine with existing tag and workflow views

Primary files:

- `src/components/CommunityTech.jsx`
- `src/hooks/useCommunityFeed.js`

Acceptance:

- Users can search article title, tags, excerpt, and body
- Search works together with tags and sort

### P1.2 Featured Article Zone

Add a top-of-feed featured article area for the `tech` feed.

Recommended implementation:

- Use current `featured` flag first
- If more than one featured item exists, sort by newest for phase 1
- Keep `featured_weight` reserved for later expansion

Primary files:

- `src/components/CommunityTech.jsx`
- optionally `server/src/controllers/resourceController.js` if a dedicated query path is needed

Acceptance:

- Featured article appears above the main feed when present
- Feed still behaves correctly with zero featured items

### P1.3 Article Detail Structure Upgrade

Upgrade article detail into a stronger editorial experience.

Scope:

- Tag strip
- Better metadata row
- Dedicated attachments area if file blocks exist
- Continue exploring section using P0 related content support

Primary files:

- `src/components/CommunityDetailModal.jsx`
- `src/components/CommunityTech.jsx`
- `src/components/communityUtils.js` if parsing helpers need extension

Acceptance:

- Detail page hierarchy is clearer than the current modal
- Related content and metadata are visually separated from body content

### P1.4 TOC Generation

Generate a table of contents from heading-style content blocks.

Implementation strategy:

- Parse heading blocks from `content_blocks`
- Render TOC only when at least two headings exist
- Anchor-scroll inside the detail modal

Primary files:

- `src/components/CommunityTech.jsx`
- `src/components/CommunityDetailModal.jsx`
- `src/components/communityUtils.js`

Acceptance:

- TOC appears only for structured long-form articles
- Clicking TOC items scrolls to the right section

### P1.5 Share Action

Add lightweight share support to article detail.

Priority behavior:

1. Copy deep link
2. Use `navigator.share` when available

Implementation notes:

- Prefer query-param deep link in phase 1 because the current route already supports modal deep linking
- Defer slug-based route exposure until backend/frontend routing is intentionally expanded

Primary files:

- `src/components/CommunityTech.jsx`
- `src/components/CommunityDetailModal.jsx`

Acceptance:

- Users can copy an article link
- Native share works on supported devices

### P1.6 Code Block Support

Extend the article editor and renderer to support code blocks.

Data design:

- Add a new block type: `code`
- Fields:
  - `language`
  - `text`
  - optional `caption`

Editor scope:

- Add slash command insertion for code block
- Add code block editing UI
- Render monospace preview

Reader scope:

- Render code block in detail modal
- Use plain highlighted styling first, no heavy syntax-highlighting dependency unless necessary

Primary files:

- `src/components/UploadModal.jsx`
- `src/components/CommunityDetailModal.jsx`
- `src/components/communityUtils.js`

Acceptance:

- Authors can create and edit code blocks
- Readers can distinguish code from paragraph text immediately

### P1.7 Rejected and Pending Author Workflow

Expose workflow state more clearly in article author views.

Scope:

- Surface rejection reason in author-side cards or detail
- Make resubmission path obvious
- Preserve current draft, pending, mine, trash segmentation

Primary files:

- `src/components/CommunityTech.jsx`
- `src/components/UploadModal.jsx`

Acceptance:

- Rejected items show reason when present
- Authors can reopen, edit, and resubmit without confusion

## P2 Outline

### P2.1 Help Search and Discovery

- Add visible thread search input
- Improve bottom-of-thread next actions

### P2.2 Help -> Article Promotion

- Surface canonical articles on solved threads
- Show recommended reading block

### P2.3 News -> Deeper Destination Actions

- Extend news modal with explicit linked destination cards
- Preserve source status and fallback behavior

## P3 Outline

### P3.1 Group Linkage Rendering

- Show topic tags
- Show recommended articles
- Show active help threads

### P3.2 Content -> Group Conversion

- Article detail recommends relevant groups
- Help detail recommends relevant groups
- News modal recommends relevant groups when curated

## P4 Outline

### P4.1 Content Operations

- Better featured and recommended controls
- Better curation surfaces for admins

### P4.2 Community Metrics

- Expose at least:
  - article reads
  - article shares
  - news-to-article click-through
  - article-to-group click-through

## Suggested Execution Order

1. Add P0 schema migrations
2. Add backend normalization for linkage fields
3. Add frontend admin edit support for linkage metadata
4. Render related content in detail views
5. Add article search
6. Add featured article zone
7. Add TOC
8. Add share action
9. Add code block support
10. Improve rejected and pending author workflow

## File-Level Work Map

### Backend

- `server/src/config/runMigrations.js`
- `server/src/controllers/resourceController.js`
- `server/src/controllers/communityController.js`
- `server/src/controllers/newsController.js`

### Frontend

- `src/components/CommunityTech.jsx`
- `src/components/CommunityHelp.jsx`
- `src/components/CommunityNewsRail.jsx`
- `src/components/CommunityGroups.jsx`
- `src/components/CommunityDetailModal.jsx`
- `src/components/UploadModal.jsx`
- `src/components/communityUtils.js`
- `src/hooks/useCommunityFeed.js`

## Risks

### 1. Frontend scope creep in P0

Mitigation:

- Use ID-based linkage editing first
- Do not build a full relation picker yet

### 2. Detail-view fetch fanout

Mitigation:

- Keep related fetch small and lazy
- Load only when detail view opens

### 3. Article modal complexity

Mitigation:

- Centralize TOC, share, and related-content rendering in the detail stack rather than scattering logic across cards and lists

### 4. Code block editor complexity

Mitigation:

- Start with plain code block support
- Defer syntax-highlighting polish if it threatens delivery

## Acceptance Gates

### Gate 1: P0 Complete

- Linkage fields migrated
- API accepts and returns linkage metadata
- Admin can edit linkage metadata
- Detail views render linked content safely

### Gate 2: P1 Complete

- Article search is live
- Featured article zone is live
- TOC works
- Share works
- Code blocks work
- Author workflow visibility is improved

## Recommended PR Breakdown

1. PR-1: P0 schema + backend normalization
2. PR-2: P0 frontend linkage editing
3. PR-3: P0 related-content rendering
4. PR-4: P1 search + featured zone
5. PR-5: P1 detail upgrade + TOC + share
6. PR-6: P1 code blocks + workflow polish

## Chosen Direction

Ship linkage first, then make tech articles the strongest destination in the community.

This keeps the plan aligned with current product reality:

- The community route and modular structure already exist
- The article workflow is already the most mature
- The biggest product gap is not missing modules, but weak linkage and weak deep-reading experience

With this order, every completed phase strengthens the whole AI community rather than producing another isolated feature.
