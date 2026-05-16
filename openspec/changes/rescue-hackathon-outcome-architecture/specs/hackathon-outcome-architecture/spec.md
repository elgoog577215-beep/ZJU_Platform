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
