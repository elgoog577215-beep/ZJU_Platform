# AI Community Phased Spec

Date: 2026-04-16

## Goal

Define a phased, implementation-oriented spec for the whole AI community product, not just the tech article module.

The community should evolve into one coordinated content and interaction system with four durable modules:

1. Help board: forum-style help board for questions, collaboration, and problem solving.
2. Tech articles: editorial article system for long-form AI content and durable knowledge.
3. News rail: persistent discovery rail for fast AI news consumption and operations.
4. Group directory: managed community directory for group discovery and conversion.

This spec focuses on:

- Cross-module information architecture
- Shared workflow and moderation rules
- Operational linkage between modules
- Phased delivery that fits the current codebase

## Product Intent

The AI community is currently usable, but still behaves like several adjacent features rather than one product.

The target product should:

- Feel like one coordinated AI community rather than isolated tabs
- Support both fast consumption and deep knowledge accumulation
- Let content move naturally across modules
- Give admins enough leverage to curate quality and traffic
- Let ordinary users contribute without making moderation collapse

The community should create three product outcomes:

1. Content accumulation: good articles and solved help threads remain discoverable.
2. Content distribution: news, help, and community groups can continuously pull users into deeper modules.
3. User growth: users can move from reader -> participant -> contributor -> core community member.

## Current State Summary

Based on the current implementation:

- The AI community route already has a left news rail and three main tabs: help, tech, groups.
- The tech article module already supports draft, pending review, trash, rich content blocks, document import, preview, and local draft recovery.
- The news rail already has a dedicated module with publish/import/review behaviors.
- The group directory already supports submission, review status, recommendation, and expiration handling.
- The backend already has reusable resource CRUD, status workflow, favorites, tags, and admin pending review infrastructure.

The current problem is not missing foundations. The current problem is that the modules are still only loosely connected and the community lacks a clear content circulation model.

## Core Problems

### 1. Module linkage is weak

Each module largely operates on its own.

- News is visible, but it does not reliably feed users into help threads, articles, or groups.
- Articles do not surface related help discussions, related news, or relevant groups.
- Help threads do not surface canonical articles or related news.
- Groups do not connect back to relevant topics, authors, or articles.

This means the AI community has traffic, but weak internal flow.

### 2. Tech article experience is not fully column-grade

The article module is the strongest of the four, but still lacks several high-value editorial features:

- No first-class search entry in the tech feed
- No featured article zone
- No generated table of contents
- No related article rendering in detail view
- No share flow
- No code block support
- No author-centric discovery surface

This makes the module publishable, but not yet strong enough as the backbone of the community knowledge layer.

### 3. Discovery logic is incomplete

The current IA exposes modules, but not enough recommendation logic.

- There is limited next-action guidance after reading content
- Ranking, recommendation, and relevance are inconsistent across modules
- There is no unified related-content model across content types

Users can enter the community, but the system does not reliably guide them deeper.

### 4. Workflow semantics are inconsistent

Articles, news, help posts, and groups all support review in different ways, but the experience is not yet productized as one coherent workflow.

Examples:

- Draft, pending, rejected, approved states are not exposed consistently in all modules
- Rejection feedback loops vary across modules
- Author-side editing and resubmission flows are uneven
- Admin review tools exist, but cross-module review guidance is still basic

### 5. Community growth loops are underdeveloped

The product lacks explicit loops such as:

- News -> article deep reading
- Help thread -> solved article reference
- Article -> join themed group
- Group -> submit question or article

Without these loops, each module remains useful but not compounding.

## Design Principles

1. One community, four modules.
   The modules are different content modes inside one product, not separate products.

2. Traffic flows from light to deep.
   News and groups drive quick entry; help and articles retain users longer.

3. Articles are the knowledge core.
   Technical articles are the deepest and most reusable content type and should become the long-tail knowledge layer of the community.

4. Help is the interaction core.
   Help threads are the highest-frequency interaction module and should be the main participation surface.

5. Operations must be explicit.
   Admins need clear controls for review, featuring, ranking, recommendation, expiration, and rejection reasons.

6. Phased delivery over full rewrite.
   Reuse the current route, resource infrastructure, and review system where practical. Avoid rebuilding the entire community stack at once.

## Product Architecture

### Top-Level IA

The AI community remains a single route at `/articles`, but is clearly structured as:

1. Left rail.
   News ranking and news operations entry.

2. Main stage.
   Switchable primary modules:
   - Help board
   - Tech articles
   - Group directory

3. Cross-module recommendation layer.
   Context-aware related content and next actions shown inside detail views and list entry points.

### Role of Each Module

#### Help board

Purpose:

- High-frequency participation
- Problem-solving
- Community interaction
- Demand discovery

Primary outcomes:

- More posts, replies, solved threads
- More reusable knowledge topics
- More conversion into technical articles and groups

#### Tech articles

Purpose:

- Long-form AI knowledge
- Reusable solutions
- Editorial credibility
- Community memory

Primary outcomes:

- More high-quality articles
- More deep reading
- More authoritative references from help, news, and groups

#### News rail

Purpose:

- Fast discovery
- Daily habit
- Traffic entry
- Operations amplification

Primary outcomes:

- Higher revisit frequency
- More click-through into articles and help threads
- Better admin content steering

#### Group directory

Purpose:

- Community conversion
- Off-platform retention
- Thematic group discovery

Primary outcomes:

- Better group join conversion
- Stronger themed sub-communities
- More article and help contribution from group members

## Cross-Module Linkage Model

This is the core addition in this spec.

### 1. News -> Help / Article / Group

Each news item can optionally carry linked destinations:

- `related_article_ids`
- `related_post_ids`
- `related_group_ids`

Rules:

- At least one linkage is recommended for high-priority news
- Admins can set linkage manually during publish/edit
- Phase 1 uses manual operations first rather than auto-linking

UI:

- News modal shows extended reading, related help, and join group actions when linked
- News rail rows can show a small linked-content marker for manually curated items

### 2. Help -> Article / News / Group

Help thread detail should support:

- `related_article_ids`
- `related_news_ids`
- `related_group_ids`

Use cases:

- Solved threads can point to canonical articles
- Timely questions can point back to relevant news context
- Topic-driven questions can point users into related groups

UI:

- Thread detail bottom section shows related technical articles
- Solved thread can display a recommended reading block

### 3. Article -> Help / News / Group

Article detail should support:

- `related_article_ids`
- `related_post_ids`
- `related_news_ids`
- `related_group_ids`

Use cases:

- Surface current discussions about the topic
- Surface topical news context
- Surface practice groups for users who want to go further

UI:

- Article detail bottom area becomes a continue exploring zone
- Recommended block order:
  1. Related articles
  2. Related help threads
  3. Related news
  4. Related groups

### 4. Group -> Topic / Article / Help

Each group can optionally bind to:

- `primary_tags`
- `related_article_ids`
- `related_post_ids`

UI:

- Group card detail or expanded action panel shows:
  - Suitable topics
  - Recommended articles
  - Latest help threads

This makes groups part of the content system rather than isolated QR assets.

## Shared Domain Rules

### Shared Status Model

All user-submitted content should converge on:

- `draft`
- `pending`
- `approved`
- `rejected`
- `deleted` via soft delete behavior where applicable

Interpretation:

- `draft`: only visible to author and admin
- `pending`: waiting for review
- `approved`: public
- `rejected`: visible to author and admin, editable and resubmittable

### Shared Review Rules

- Admin-created content bypasses review by default
- Normal users can submit all modules where contribution is allowed
- Normal user help replies can remain post-publication moderated for interaction speed
- All other primary content types use review-first workflow

### Shared Recommendation Primitive

Introduce a lightweight linkage layer, not a heavy recommendation engine.

Minimum shared linkage fields:

- `related_article_ids`
- `related_post_ids`
- `related_news_ids`
- `related_group_ids`

Storage can begin as JSON text fields in relevant tables, then normalize later if needed.

## Module Specs

### A. Tech articles

#### Positioning

Tech articles are the knowledge backbone of the community.

#### New Required Features

1. Search input in article list
2. Featured article zone at top of feed
3. Author-aware card display
4. Generated TOC in article detail
5. Related content zone in detail
6. Share action in detail
7. Code block content support
8. Better rejected and pending author workflow visibility

#### Detail Experience

Article detail should include:

- Cover
- Title
- Author identity
- Publish time
- Reading time
- Tag strip
- Table of contents
- Rich content blocks
- Attachments
- Cross-module related content
- Share action

#### Author Workflow

Author-side views should support:

- My submissions
- Drafts
- Pending review
- Rejected items
- Trash

For rejected items:

- Rejection reason must be visible
- Editing and resubmission should be obvious

### B. Help board

#### Positioning

Help board is the participation engine of the community.

#### Required Cross-Module Behaviors

1. Threads can recommend related articles
2. Solved threads can elevate canonical articles
3. Thread detail can show relevant current news
4. Tags should align with article and group tags where possible

#### Required Product Behaviors

1. Thread list search
2. Sort by latest and hottest
3. Status filtering
4. Solved state prominence
5. Related article recommendations
6. Better bottom-of-thread next actions

Suggested next actions after reading:

- Write a technical article
- View related articles
- Join a related group

### C. News rail

#### Positioning

News rail is the daily entry and editorial amplifier.

#### Required Cross-Module Behaviors

1. News can link to article, help, and group
2. News modal should show linked destinations
3. High-priority news can be pinned and manually weighted
4. Imported news should enter edit-and-link flow before final publish

#### Required Product Behaviors

1. Duplicate import protection by source URL
2. Source health check
3. Pinned-first ranking
4. Hot score control
5. Admin status filters
6. Better linked-destination operations

### D. Group directory

#### Positioning

Group directory is the conversion surface from content consumption to community participation.

#### Required Cross-Module Behaviors

1. Groups can bind to tags and topics
2. Groups can recommend related articles
3. Groups can surface active help threads
4. Article, help, and news detail pages can recommend groups

#### Required Product Behaviors

1. Platform filter
2. Search by name and description
3. Review status flow
4. Expiration and recommended state
5. Better QR preview and enlarge interaction
6. Better content linkage metadata

## Data Design

### Existing Structures to Reuse

- `articles`
- `community_posts`
- `community_comments`
- `news`
- `community_groups`
- `tags`
- `favorites`
- Pending review infrastructure

### Required Schema Expansion

#### articles

Keep existing fields and add or formalize:

- `slug`
- `reading_time`
- `views_count`
- `featured_weight`
- `related_article_ids`
- `related_post_ids`
- `related_news_ids`
- `related_group_ids`

#### community_posts

Add or formalize:

- `views_count`
- `solved_comment_id`
- `related_article_ids`
- `related_news_ids`
- `related_group_ids`

#### news

Add or formalize:

- `related_article_ids`
- `related_post_ids`
- `related_group_ids`
- `pin_weight`
- `hot_score`
- `views_count`

#### community_groups

Add or formalize:

- `primary_tags`
- `related_article_ids`
- `related_post_ids`
- `sort_order`
- `is_recommended`
- `valid_until`
- `is_expired`

### Storage Strategy

Phase 1:

- Allow linkage fields to be stored as JSON text arrays
- Keep implementation cheap and compatible with current SQLite resource model

Phase 2:

- Normalize into dedicated relation tables if operations complexity or query cost becomes a real issue

## API Design

### Shared Search / Discovery

Add or formalize support for:

- Article keyword search
- Help thread keyword search
- Related-content fetch for cross-module detail pages

Recommended endpoints:

- `GET /articles?search=...`
- `GET /community/posts?search=...`
- `GET /news?search=...` for admin and future expansion
- `GET /community/groups?search=...`

### Cross-Module Linkage Updates

Each primary resource update API should accept related IDs fields where relevant.

Examples:

- `PUT /articles/:id`
- `PUT /community/posts/:id`
- `PUT /news/:id`
- `PUT /community/groups/:id`

Payload examples:

- `related_article_ids`
- `related_post_ids`
- `related_news_ids`
- `related_group_ids`

### Article Detail Enhancements

Support:

- TOC generation in frontend from blocks and headings
- Shareable slug URL
- Related content fetch

Recommended endpoint:

- `GET /articles/:id/related-cross-module`

If keeping backend simple in phase 1, frontend may compose this from existing resource queries plus linkage IDs.

## UX Requirements

### Global

- Preserve current single-route AI community structure
- Maintain desktop left rail for news
- Maintain mobile bottom-sheet treatment where needed
- Keep overlays keyboard-closeable
- Ensure no major layout jumps when switching module tabs

### Article Detail

- Long-form reading typography must remain the strongest in the community
- TOC should appear only when headings exist
- Continue exploring should never be empty if related content exists
- Share action should support copy link and native share where available

### Help Detail

- Solved threads should visually surface the best answer
- Related articles should appear below the reply area or in a side section on desktop

### News Modal

- Linked destinations should be clearly labeled as next-step actions
- Original source availability should be visible

### Groups

- Joining a group should feel like progression from content interest to community participation

## Phased Delivery

### Phase P0: Community Linkage Foundation

Goal:

Create the minimum shared model that lets modules refer to each other.

Scope:

- Add linkage fields to core tables
- Extend update APIs to accept linkage metadata
- Add admin-side ability to edit linkage fields
- Keep storage JSON-based

Success criteria:

- News can link to article, help, and group
- Article can link to help, news, and group
- Group can link to article and help

### Phase P1: Tech Article Upgrade

Goal:

Upgrade tech articles into a real knowledge hub.

Scope:

- Add article search
- Add featured article zone
- Add TOC
- Add related content zone
- Add share action
- Add code block support
- Expose rejected workflow feedback better

Success criteria:

- Users can find old articles by search
- Long-form articles have stronger reading structure
- Article detail becomes a traffic distribution node

### Phase P2: Help and News Linkage

Goal:

Make help board and news rail feed traffic into articles and each other.

Scope:

- Add related article and news sections to help detail
- Add linked destination actions to news modal
- Add better solved-thread recommendation behavior
- Add more explicit next actions after reading

Success criteria:

- News can drive traffic into deeper content
- Solved threads can promote reusable article assets

### Phase P3: Group Conversion Layer

Goal:

Turn the group directory into a community conversion module.

Scope:

- Add topic and related-content linkage to groups
- Add group recommendation sections in article, help, and news
- Improve QR preview and enlarge interaction

Success criteria:

- Readers can move from content into real communities
- Groups stop behaving like isolated cards

### Phase P4: Operations and Analytics

Goal:

Give admins enough leverage to actively run the community.

Scope:

- Add module-level metrics and conversion tracking
- Add featured and recommended operations surfaces
- Add author growth indicators
- Add better cross-module curation workflows

Success criteria:

- Admins can see what content drives deeper engagement
- Curation becomes intentional instead of manual guesswork

## Non-Goals

This spec does not require:

- Full recommendation engine or ML ranking
- Real-time websocket updates
- Full social graph redesign
- Multi-tenant permissions redesign
- Complete schema normalization in the first phase

## Risks

1. Spec too broad.
   Mitigation: phase explicitly and keep P0 and P1 narrow enough for implementation.

2. Cross-module linkage becomes operationally heavy.
   Mitigation: start with manual linkage fields and admin curation, not auto-linking.

3. Article module becomes overburdened.
   Mitigation: treat articles as the deepest module, but keep interaction lightweight.

4. Data model complexity grows too early.
   Mitigation: use JSON text arrays first, normalize later only if needed.

## Acceptance Criteria

The spec is considered satisfied when:

1. The AI community is treated as one product with explicit module roles.
2. Cross-module linkage is defined in data, API, and UX terms.
3. The article module is clearly identified as the knowledge core and upgraded accordingly.
4. The phased roadmap is implementation-friendly and not a vague end-state vision only.
5. The plan can be used directly to create implementation tasks for P0 and P1.

## Recommended Implementation Order

1. P0 linkage foundation
2. P1 tech article upgrade
3. P2 help and news linkage
4. P3 group conversion layer
5. P4 operations and analytics

## Chosen Direction

Do not rebuild the whole community from scratch.

Instead:

- Keep the current route structure
- Reuse the current resource, review, upload, and moderation infrastructure
- Strengthen tech articles first because they are already the strongest module
- Add a lightweight but explicit cross-module linkage layer
- Use phased delivery so each release makes the AI community more coherent and more operationally useful

This direction gives the product a stronger community model without paying the cost of a full-stack rewrite.
