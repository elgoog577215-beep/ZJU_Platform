# AI Community Redesign Design

Date: 2026-04-15

## Goal

Redesign the current AI community into a clearer product with four durable modules:

1. `求助天地`: a forum-style help board with thread posts, floor replies, second-level follow-ups, quote replies, and moderation.
2. `技术分享`: a blog-style article system with strong authoring and reading experience, but no comments.
3. `新闻热榜`: a left-side resident ranking list that opens news content in a modal and supports both manual publishing and imported external news.
4. `二维码社群`: a managed QR-code directory with upload, review, expiration, and display controls.

The redesign also removes the current `组队` and `会议` experience from the user-facing community IA.

## Product Intent

The user intent behind the request is not a cosmetic adjustment. The community needs to become:

- More social and interactive in `求助天地`, with a familiar Chinese forum mental model.
- More editorial and credible in `技术分享`, with clear reading hierarchy and mature publishing tools.
- More immediate and sticky in `新闻热榜`, with persistent visibility and rapid content access.
- More operationally maintainable in `二维码社群`, so group discovery stays useful over time.

The system should support non-admin participation, while keeping quality under control through moderation. Admins should be able to bypass review and operate the system efficiently.

## Scope

### In Scope

- Frontend IA and UI redesign for the AI community page
- New interaction patterns for help threads, articles, news, and QR groups
- Backend schema and API changes needed to support the new behavior
- Review flows for normal users
- Admin bypass for review
- Removal of `组队` and `会议` tabs from the community experience
- Upgraded upload and management flows for articles, news, and QR groups

### Out of Scope

- Full external crawler implementation for every target source
- Multi-tenant role system beyond existing user/admin plus future extensibility
- Infinite nested comment trees
- Real-time websocket updates
- External search engine indexing work

## Information Architecture

The AI community entry remains a single route, but the page is reorganized into:

1. Left rail:
   `新闻热榜` resident ranking list on desktop, collapsed into a mobile entry on small screens.
2. Main content:
   `求助天地` and `技术分享` as the two primary destination modules.
3. Utility area:
   `二维码社群` as a dedicated managed community directory.

The old `组队` and `会议` sections are removed from the active navigation and the related user-facing UI is retired.

## Module Design

### 1. 求助天地

#### UX Model

This becomes a forum-like help board:

- Thread list page
- Thread detail page
- Floor replies
- Second-level follow-up replies
- Quote reply support
- Sorting by latest and hottest
- Filtering by status and tags

#### Thread List

Each thread card shows:

- Title
- Excerpt
- Author
- Created time
- View count
- Like count
- Reply count
- Status badge: `待解决` or `已解决`
- Optional review badge for admins

Available controls:

- Search by keyword
- Tag filters
- Sort: latest, hottest
- Status filters: all, open, solved
- Create thread CTA

#### Thread Detail

The detail view contains:

- Main thread title and body
- Author block
- Tags
- Publish time
- View, like, favorite, share counts
- Solved answer marker if present
- Reply sort toggle

Reply system:

- Top-level replies are rendered as floors with `floor_number`
- Each floor supports second-level follow-up replies
- Users can quote either the main thread or an existing reply
- Quote content stores a snapshot so references remain meaningful even if the original content changes later

Reply actions:

- Reply
- Quote
- Like
- Expand more follow-ups

Moderation actions:

- Mark solved answer
- Close thread
- Delete content
- Admin quick review

#### Publishing and Review

- Any logged-in user can create threads
- Admin posts bypass review
- Normal user threads go into `pending_review`
- Replies are published directly for normal users, but remain moderated through reporting and admin removal

This balances participation with usability. Requiring review for every reply would make the forum feel inert and would not match the product goal.

#### Required Quality Features

- Rate limiting on thread/reply creation
- Input validation
- XSS sanitation
- Empty-content protection
- Owner/admin delete rules
- Reply pagination or lazy expansion
- Mobile-optimized floor layout

### 2. 技术分享

#### UX Model

This becomes a blog module rather than a generic resource list.

It focuses on:

- Strong article cards
- High-quality reading pages
- Mature publishing workflow
- No comment system

#### List Page

The list page includes:

- Featured article zone
- Main article feed
- Search
- Tag filter
- Sorting
- Submission entry

Each card shows:

- Cover image
- Title
- Excerpt
- Author
- Publish time
- Reading time
- Tags
- Popularity indicator

#### Article Detail

The article detail experience includes:

- Large cover
- Article title
- Author info
- Publish time
- Reading time
- Tag strip
- Generated table of contents
- Rich content block rendering
- Attachment area
- Related articles

Interaction stays lightweight:

- Like
- Favorite
- Share

No comment system is included.

#### Authoring Experience

The editor must support:

- Title
- Excerpt
- Cover
- Tags
- Rich content blocks
- Images
- Video embeds or uploaded video blocks
- Files and attachments
- Code blocks
- Quotes
- Lists
- Preview
- Draft save

Workflow:

- Logged-in users can submit
- Admin articles publish directly
- Normal users submit into review
- Statuses include draft, pending, published, rejected

#### Required Quality Features

- Reading time generation
- Shareable URL
- Cover fallback
- Content validation
- Safe HTML rendering
- Mobile typography optimization
- Edit existing draft or pending submission
- Recoverable soft delete

### 3. 新闻热榜

#### UX Model

This becomes a persistent left-side anchor on desktop, similar to a hot search list.

The right side of the page keeps the current main module, while the left rail continuously exposes news discovery and publishing.

On mobile:

- The left rail collapses into a top shortcut or sheet entry
- News detail still opens in a modal

#### Ranking List

Each news row shows:

- Rank number
- Title
- Hotness score
- Publish time
- Source label
- Pinned/recommended state when applicable

List capabilities:

- Latest
- Hottest
- Pinned first
- Source marker

#### News Detail

Clicking a news item opens a modal, not a route transition.

The modal includes:

- Cover if available
- Title
- Source
- Original link
- Publish time
- Full body content
- Attachments
- Hotness and view metadata

#### Publishing and Import

The upload entry is embedded in the list header.

Supported input modes:

1. Manual publish
2. Import by external link
3. Future import from configured source adapters

Workflow:

- Admin import/publish bypasses review
- Normal user news submission enters review
- Imported content must still pass through edit-and-confirm before publish

#### Required Quality Features

- Duplicate import protection by source URL
- Source validity checks
- Fallback behavior for dead original links
- Keyboard-accessible modal close
- Pinned-first ranking logic
- Hotness score calculation rules

### 4. 二维码社群

#### UX Model

This becomes an operational QR directory instead of a static card wall.

It should support:

- QR image upload
- Invite link
- Group description
- Platform
- Expiration
- Recommended placement
- Valid/invalid state

#### Frontend

Each group card shows:

- Group name
- Platform
- Description
- QR code image
- Invite link
- Update time or validity note
- Expired badge when needed

User interactions:

- Click to enlarge QR
- Open invite link
- Filter by platform
- Search by group name

#### Upload and Review

The upload flow supports:

- QR image file
- Group name
- Platform type
- Description
- Invite link
- Tags
- Valid until
- Sort order
- Recommended flag

Workflow:

- Admin submissions publish directly
- Normal users submit for review

#### Required Quality Features

- Image preview and replacement
- URL validation
- Platform normalization
- Expired-state handling
- Fallback image state
- Admin review notes

## Permissions and Review Rules

### Base Rule

- All logged-in users can submit content to `求助天地`, `技术分享`, `新闻热榜`, and `二维码社群`.
- Admins bypass review.

### Review Matrix

- Help thread creation: normal user pending review, admin direct publish
- Help replies: direct publish, moderated post-publication
- Tech article submission: normal user pending review, admin direct publish
- News publish/import: normal user pending review, admin direct publish
- QR group submission: normal user pending review, admin direct publish

### Moderation Capabilities

Admins can:

- Approve
- Reject
- Delete
- Close
- Mark solved
- Pin
- Recommend
- Set hotness weights
- Mark expired

Users can:

- Edit or delete their own editable content
- Reply and quote where permitted
- View their own pending submissions

## Data Design

### Existing Tables Reused

- `community_posts`
- `community_comments`
- `articles`
- `community_groups`

### New or Expanded Structures

#### community_posts

Refocus on help threads:

- `section`
- `title`
- `content`
- `excerpt`
- `tags`
- `status`
- `review_status`
- `views_count`
- `likes_count`
- `comments_count`
- `last_replied_at`
- `solved_comment_id`
- `is_pinned`
- `pin_weight`

#### community_comments

Upgrade to support floor and second-level replies:

- `post_id`
- `author_id`
- `content`
- `parent_id`
- `root_id`
- `reply_to_comment_id`
- `floor_number`
- `quote_snapshot`
- `likes_count`
- `created_at`

Rules:

- `parent_id = null` means top-level floor reply
- second-level replies point to their parent and root floor
- nesting stops at second level

#### articles

Expand as blog table:

- `slug`
- `excerpt`
- `cover`
- `content_blocks`
- `reading_time`
- `review_status`
- `featured_weight`
- `views_count`
- `likes_count`
- `favorites_count`

#### news

Create a dedicated table rather than overloading `articles`.

Needed fields:

- `title`
- `excerpt`
- `cover`
- `content`
- `content_blocks`
- `source_name`
- `source_url`
- `import_type`
- `external_id`
- `review_status`
- `is_pinned`
- `pin_weight`
- `hot_score`
- `views_count`
- `published_at`

Reason:

News has ranking, origin, import lifecycle, and hotness semantics that differ from technical blog content.

#### community_groups

Extend with:

- `platform`
- `qr_code_url`
- `invite_link`
- `review_status`
- `is_recommended`
- `sort_order`
- `valid_until`
- `is_expired`

## API Design

### Help Board

- `GET /community/posts`
- `GET /community/posts/:id`
- `POST /community/posts`
- `PUT /community/posts/:id/status`
- `PUT /community/posts/:id/solve`
- `GET /community/posts/:id/comments`
- `POST /community/posts/:id/comments`
- `POST /community/posts/:id/comments/:commentId/like`

The existing help endpoints are extended to carry floor and quote metadata.

### Tech Blog

Use the `articles` resource but formalize blog-specific fields and review states.

Needed operations:

- create draft
- submit for review
- publish
- edit
- soft delete
- fetch related articles

### News

Add dedicated news endpoints:

- `GET /news`
- `GET /news/:id`
- `POST /news`
- `POST /news/import`
- `PUT /news/:id`
- `DELETE /news/:id`
- `PUT /news/:id/review`

### QR Groups

Keep current endpoints, but extend payload support and review operations.

## UI Design Direction

The page should feel more editorial and productized, not like a list of generic cards.

### Layout

Desktop:

- Left resident rail for `新闻热榜`
- Right main panel for current module
- Clear visual separation but shared atmospheric background

Mobile:

- News rail collapses into a dedicated top entry
- Main module becomes single-column
- Detail content remains modal or full-screen sheet where appropriate

### Visual Style

- Strong section headers
- Clear accent colors per module
- Dense but readable content cards
- Elegant status chips
- Deliberate motion, not decorative overload
- Consistent modal shells and action bars

### Interaction Quality

- Skeleton loading states
- Empty states that still preserve hierarchy
- Inline actions where high-frequency
- Full keyboard close support for overlays
- No layout jumps when switching tabs or filtering

## Testing Strategy

### Functional

- User can submit help thread
- Admin thread publishes instantly
- Normal user thread appears in review flow
- Help replies create correct floor and second-level behavior
- Quote reply renders correct snapshot
- Solved answer updates thread state
- Tech article draft/save/submit/publish all work
- Tech article detail renders rich blocks correctly
- News manual publish works
- News import flow deduplicates and validates
- News modal opens and closes correctly
- QR group upload, edit, expire, and display all work

### Regression

- AI community route still loads without console errors
- Existing auth and admin flows remain intact
- Mobile toolbar behavior still works where reused
- No broken references after removing team/meeting tabs

### UI

- Desktop layout preserves left resident news rail
- Mobile layout remains readable
- Low-content states stay top-aligned
- Long-content detail views scroll correctly

## Migration Notes

Implementation should proceed in phases:

1. Data schema changes
2. API changes
3. Community IA and route updates
4. Help board rewrite
5. Tech blog upgrade
6. News rail and modal system
7. QR group upload and management upgrade
8. Admin review polish and regression testing

`组队` and `会议` user-facing UI must be removed early in the frontend rewrite to avoid parallel maintenance paths.

## Risks

- Mixing old and new community data semantics can create migration edge cases.
- News import can become unstable without strong deduplication and source validation.
- Floor reply logic can get messy if parent/root constraints are not enforced at API level.
- Rich article editing can regress if content block parsing and preview are not centralized.

## Chosen Direction

Use a structural refactor on top of the current community stack:

- Reuse auth, settings, upload, and resource infrastructure where practical
- Replace the current IA and component structure
- Add the minimum new tables and endpoints needed for clarity
- Favor top-aligned, editorial layouts over generic centered card walls

This gives the product a substantial upgrade without the risk of rebuilding the whole site from scratch.
