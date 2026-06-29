## 1. Architecture Decision

- [x] 1.1 Confirm current upload modal exists but has no active public caller.
- [x] 1.2 Define canonical ownership for photos, videos, and work/story submissions.
- [x] 1.3 Keep legacy media package data protected; do not delete files or tables in this stage.

## 2. Stage One Implementation

- [x] 2.1 Add visible "提交成果" entry on `/hackathon/showcase`.
- [x] 2.2 Add contextual photo upload entry in the live photo section.
- [x] 2.3 Add contextual work/story upload entry on showcase and `/hackathon/works`.
- [x] 2.4 Clarify upload modal destinations: photos -> 图片直播, videos -> 视频栏目, works -> 荣誉与经验分享.

## 3. Verification

- [x] 3.1 Validate the OpenSpec change.
- [x] 3.2 Run focused frontend lint checks for changed components.
- [x] 3.3 Run production build.
- [x] 3.4 Browser-check that the outcome upload entry is visible and opens the correct modal type.

## 4. Stage Two Full-Link Integration

- [x] 4.1 Make `/competitions/current/outcome` compose approved photos/videos from canonical media tables.
- [x] 4.2 Keep legacy `competition_media` read-compatible without exposing it as the new review workflow.
- [x] 4.3 Make `/hackathon/showcase` render dynamic approved video, photos, and works with safe fallbacks.
- [x] 4.4 Add a hackathon work/story review area to the admin hackathon manager.
- [x] 4.5 Prevent legacy `competition_media` pending items from reappearing in the new review center.

## 5. Later Cleanup

- [ ] 5.1 Add first-class `event_key` / campaign relation for photo/video records.
- [ ] 5.2 Archive or migrate legacy `competition_media` records after confirming no production UI depends on them.

## 6. 验证记录

- 2026-06-29：`openspec validate rescue-hackathon-outcome-architecture --strict` 通过。
- 2026-06-29：审计 `src/`，未发现前端继续调用 `competition-media` / `admin/competition-media`；legacy `competition_media` 当前只保留在后端 admin 兼容接口和数据层。
- 2026-06-29：按当前阶段决策，不做破坏性迁移或删除；5.2 仍保留为后续数据迁移/归档任务。
