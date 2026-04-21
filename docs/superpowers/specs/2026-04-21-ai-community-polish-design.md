# AI Community Polish Design

## Context

The AI community area already has meaningful product breadth: help posts, tech articles, news, and QR-code groups, with cross-linking between them. The current implementation is functional but has a few structural weaknesses that show up in day-to-day use:

- legacy SQLite schemas can still break core community endpoints after deployments
- feed panels do not clearly distinguish "no data" from "no results under current filters"
- search/filter state is not easy to reset, and users get weak feedback about what the panel is currently showing
- comment loading failures degrade silently into blank states
- groups/news side panels have thinner error and retry affordances than the main feed surfaces

The goal of this pass is not to redesign the whole community from scratch. It is to improve reliability, interaction clarity, and perceived polish while preserving the current IA and visual language.

## Scope

This pass covers:

1. Backend migration hardening for community-related legacy SQLite schemas
2. Shared AI community feed UX improvements
3. Comment-detail resilience and recovery affordances
4. Community groups/news side-surface usability polish

This pass does not cover:

- a full visual redesign of all community cards
- new recommendation algorithms
- a new information architecture for the community tabs
- broad backend model rewrites

## Findings

### 1. Migration safety is incomplete

The current runtime migrations already add several newer community columns, but the recent production issue showed that older real-world databases can still miss columns that newer code assumes exist. In particular:

- `comments` may lack `user_id`, `parent_id`, and `likes`
- `notifications` may be on either the old `title/message/data` shape or the newer `content` shape

The result is endpoint-level failure on otherwise healthy deployments.

### 2. Feed panels undersignal state

`CommunityFeedPanel` already handles loading, empty, and error states, but it does not explain:

- how many results are currently shown
- whether the list is filtered
- whether the empty state is caused by filters/search rather than true absence of content

This makes the community feel less controllable, especially for help and tech tabs.

### 3. Community search/filter flows are sticky but not forgiving

`useCommunityFeed` exposes search, tags, sort, and status state, but it lacks a unified reset affordance. Users can end up in a filtered empty state with no obvious "recover to defaults" action.

### 4. Comment failures collapse into ambiguity

`CommunityPostDetail` fetches comments and renders them well when the request succeeds, but on failure it can fall back to an empty comment list. That reads like "there are no replies" instead of "replies failed to load".

### 5. Groups/news rails are comparatively brittle

`CommunityGroups` and `CommunityNewsRail` have rich capabilities, but their list-level error/retry affordances are weaker than the main feed surfaces. This causes uneven UX quality inside the same product area.

## Options Considered

### Option A: Full AI community redesign

Rework layout, cards, information architecture, and panel hierarchy in one pass.

Pros:

- maximum visual impact
- opportunity to unify every section deeply

Cons:

- too much risk for one iteration
- high regression surface
- weak fit for the current user request, which prioritizes polish, stability, and usability

### Option B: Reliability-only patch

Only fix migrations and obvious 500s.

Pros:

- safest technically
- very fast

Cons:

- leaves the current UX rough edges in place
- does not materially improve usability

### Option C: Stability + shared-surface polish

Harden backend migrations, improve shared feed-state communication, and strengthen failure recovery in comments/groups/news.

Pros:

- highest value-to-risk ratio
- improves both real reliability and perceived product quality
- leverages existing shared components

Cons:

- less visually dramatic than a redesign

## Decision

Use Option C.

This keeps the current structure intact, fixes proven operational weak points, and improves the clarity of the interaction model across the AI community without overreaching.

## Design

### Backend

`runMigrations.js` will explicitly ensure all community-critical legacy columns exist on startup.

For `comments`, the migration layer will idempotently ensure:

- `user_id`
- `parent_id`
- `author`
- `author_name`
- `avatar`
- `root_id`
- `reply_to_comment_id`
- `floor_number`
- `quote_snapshot`
- `likes`
- `updated_at`

For `notifications`, the migration layer will idempotently ensure both legacy and current access patterns are safe:

- `title`
- `message`
- `content`
- `data`

This prevents runtime failures when the deployed code encounters pre-upgrade production databases.

### Shared feed UX

`useCommunityFeed` will expose higher-level UI state for shared panels:

- whether any search/tags/status filters are active
- whether the current list is in a filtered result state
- a single reset action

`CommunityFeedPanel` will use that state to add:

- a compact result summary row
- a "clear filters" action when the user is in a narrowed state
- a clearer no-results empty state distinct from "no content exists"
- a visible refresh action in failure states

This keeps the interface familiar while making it much easier to understand why a list looks the way it does.

### Comments and detail recovery

`CommunityPostDetail` will separate comment request failure from a true empty reply list.

The detail view will show:

- loading feedback while comments are being fetched
- a retry affordance when the comments request fails
- the normal empty state only when the request succeeds with zero replies

This removes ambiguity and makes comment problems recoverable from the UI.

### Groups and news polish

`CommunityGroups` and `CommunityNewsRail` will adopt stronger list-state behavior consistent with the main feed surfaces:

- explicit load failure messaging
- inline retry actions
- clearer empty-copy when filters/search produce no matches
- small summary text showing current result count / active filters where useful

The goal is parity of interaction quality, not a new layout system.

## Data Flow

1. User enters a community section
2. Section-specific state flows through `useCommunityFeed` or section-local list loading
3. Shared panels render loading, results, filtered-empty, or error states distinctly
4. Detail views can retry failed secondary requests without forcing a full page refresh
5. Startup migrations make schema assumptions safe before any route handler uses them

## Error Handling

- Community DB migrations must stay idempotent and tolerate partially-upgraded schemas
- Comment fetch failure must not masquerade as "0 comments"
- Feed-level errors should always expose a retry path
- Filtered empty states should guide users back to a valid default state

## Validation

Validation for this pass will include:

- targeted startup sanity for migration logic
- focused UI verification for help/tech/groups/news states
- smoke checks for community posts and comment detail flows

## Implementation Notes

- Reuse existing shared primitives where possible rather than introducing a second community-specific state model
- Preserve current route/query-param behavior
- Prefer additive changes to shared components over section-by-section forks
- Keep visual changes aligned with the existing community aesthetic instead of switching art direction mid-product
