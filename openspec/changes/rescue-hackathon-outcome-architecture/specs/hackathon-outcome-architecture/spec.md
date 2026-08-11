## ADDED Requirements

### Requirement: Public Outcome Upload Entry Is Discoverable

The system SHALL provide a visible public entry for submitting hackathon outcomes from the main outcome surfaces.

#### Scenario: Visitor opens the showcase page

- GIVEN a visitor opens `/hackathon/showcase`
- WHEN the page renders
- THEN the visitor can see a "提交成果" action without going through admin pages.

#### Scenario: Visitor opens the winner stories page

- GIVEN a visitor opens `/hackathon/works`
- WHEN the page renders
- THEN the visitor can see a "提交作品/经验" action.

### Requirement: Outcome Uploads Route To Canonical Channels

The system SHALL route each outcome submission type to the canonical content channel.

#### Scenario: User submits a stage photo

- GIVEN a logged-in user selects "赛场照片"
- WHEN they submit a valid file
- THEN the system saves it through the photo live/gallery API
- AND it is tagged as hackathon outcome content.

#### Scenario: User submits a promo video

- GIVEN a logged-in user selects "赛事宣传片"
- WHEN they submit a valid video
- THEN the system saves it through the video API
- AND it is tagged as hackathon outcome content.

#### Scenario: User submits a winning work story

- GIVEN a logged-in user selects "优秀作品"
- WHEN they submit a valid project story
- THEN the system saves it through the hackathon work/story API
- AND it does not appear publicly until approved unless the user is an admin.

### Requirement: Legacy Media Package Is Not A New Admin Surface

The system SHALL avoid exposing the legacy competition media package as the primary admin workflow.

#### Scenario: Admin manages hackathon content

- GIVEN an admin opens the hackathon admin area
- WHEN they manage hackathon operations
- THEN they manage registrations and work/story review there
- AND photos/videos remain in their canonical media managers.

### Requirement: Public Outcome Responses Exclude Sensitive Fields

The system SHALL expose only public-safe fields for outcome pages.

#### Scenario: Visitor reads approved winner stories

- GIVEN approved works exist
- WHEN the visitor opens the public works page
- THEN the response excludes phone numbers, email addresses, IP addresses, raw upload metadata, and private review notes.

### Requirement: Showcase Reads Canonical Approved Outcomes

The system SHALL compose the public showcase from approved canonical channel records.

#### Scenario: Approved hackathon photos exist in the photo channel

- GIVEN approved photos are tagged as hackathon outcome content
- WHEN a visitor opens `/hackathon/showcase`
- THEN the live photo section can render those photos before static fallback images.

#### Scenario: Approved hackathon videos exist in the video channel

- GIVEN approved videos are tagged as hackathon outcome content
- WHEN a visitor opens `/hackathon/showcase`
- THEN the official film area can render the latest approved video.

#### Scenario: Approved winner stories exist

- GIVEN approved works exist in the work/story API
- WHEN a visitor opens `/hackathon/showcase`
- THEN the works section can render the approved works before static placeholder works.

### Requirement: Admin Hackathon Manager Covers Work Review

The system SHALL let admins review hackathon work/story submissions from the hackathon admin surface.

#### Scenario: Admin opens hackathon management

- GIVEN submitted works exist
- WHEN an admin opens the hackathon manager
- THEN they can see work counts, filter by review status, search works, and approve or reject work/story submissions.

### Requirement: Media Library Is Organized By Event Archive

The system SHALL organize event photos and videos by a first-class event association before applying optional editorial categories.

#### Scenario: Visitor switches between event archives

- GIVEN multiple published competitions have approved media
- WHEN a visitor selects a different event in `/media`
- THEN the page shows only that event's approved photos and videos
- AND the selected event is represented in the URL
- AND browser back and forward restore the previous event selection.

#### Scenario: Visitor opens all activities

- GIVEN multiple event archives exist
- WHEN a visitor chooses the all-activities view
- THEN the page shows event archive summaries with date and media counts
- AND it does not flatten all event photos into one undifferentiated stream.

#### Scenario: Canonical media is not linked to an event

- GIVEN an approved photo or video has no event association
- WHEN a visitor opens the generic media archive
- THEN the record remains discoverable through the existing generic archive
- AND it is not silently assigned to an unrelated event from its category or filename.

### Requirement: Showcase Uses Three Primary Outcome Chapters

The system SHALL present an event outcome through 赛事总览、现场档案、作品与荣誉 as its only primary showcase chapters.

#### Scenario: Visitor scans one event outcome

- GIVEN an event has official media, approved photos, approved works and support partners
- WHEN a visitor opens the event showcase
- THEN those outcomes are presented within the three primary chapters
- AND works are not repeated in a separate full-screen index chapter
- AND partner credits do not occupy a separate primary chapter.

### Requirement: Complete Work Exhibition Stays In Event Context

The system SHALL expose the complete approved work catalogue and each work story from the event showcase.

#### Scenario: Visitor opens a work detail

- GIVEN approved works exist for the selected event
- WHEN a visitor selects a work in the showcase
- THEN its award, author, summary, experience and public project link appear without navigating to a competing catalogue page
- AND the URL contains a stable work identifier
- AND closing or navigating back returns to the same showcase position.

#### Scenario: Visitor opens a legacy work URL

- GIVEN a visitor opens `/hackathon/works?competition=<slug>`
- WHEN the route resolves
- THEN the system enters the corresponding event showcase work exhibition
- AND approved works remain scoped to that competition.

### Requirement: Event Media Association Does Not Duplicate Canonical Records

The system SHALL relate canonical photos and videos to competitions without copying the media record into a second content store.

#### Scenario: Admin links a photo to an event

- GIVEN an approved canonical photo exists
- WHEN an admin assigns it to a competition archive
- THEN the system stores an event-media association with role and ordering metadata
- AND the original photo remains the canonical resource.

#### Scenario: Event archive is serialized publicly

- GIVEN approved linked media exists
- WHEN a visitor requests the competition outcome
- THEN only public-safe canonical media fields and event ordering metadata are returned
- AND review notes, upload metadata and private user fields are excluded.

### Requirement: Mobile Event Outcome Navigation Is Continuous

The system SHALL preserve native vertical scrolling and truthful browser navigation on mobile outcome surfaces.

#### Scenario: Visitor scrolls the event showcase on a phone

- GIVEN a viewport at or below the mobile breakpoint
- WHEN the visitor scrolls through the three chapters and opens or closes a work detail
- THEN the page has no horizontal overflow or trapped nested vertical scroll
- AND the mobile bottom navigation does not cover the final interactive content.
