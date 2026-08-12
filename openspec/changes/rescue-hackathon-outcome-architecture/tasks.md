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

- [x] 5.1 Add the non-destructive `competition_media_links` event relation for canonical photo/video records, including idempotent indexes and known-event backfill.
- [ ] 5.2 Archive or migrate legacy `competition_media` records after confirming no production UI depends on them.

## 6. Event-Scoped Outcome System

- [x] 6.1 Extend the public outcome read model and event list metadata with approved photo/video/work counts and stable event identifiers.
- [x] 6.2 Rebuild `/media` around a URL-backed event switcher; keep categories as optional in-event facets and preserve generic unlinked media.
- [x] 6.3 Compress the showcase to three primary chapters: 赛事总览、现场档案、作品与荣誉.
- [x] 6.4 Render the complete approved work catalogue and work detail interaction inside the showcase, including `work=<id>` deep links.
- [x] 6.5 Convert `/gallery` and `/hackathon/works` into compatibility entries for the selected event archive/showcase instead of parallel destinations.
- [ ] 6.6 Add admin assignment controls for linking canonical photos/videos to an event and ordering official film, highlights, and archive media.

## 7. Event-System Verification

- [ ] 7.1 Verify desktop and mobile event switching, browser back/forward, deep links, empty events, and unlinked-media fallback.
- [x] 7.2 Verify that work detail uses body portal, `100dvh`, scroll lock, and return/back close without horizontal overflow on mobile.
- [x] 7.3 Verify Chinese and English locale completeness and JSON parsing.
- [x] 7.4 Run focused frontend lint, backend tests for event-media association and outcome serialization, production build, strict OpenSpec validation, and local browser screenshots.

## 8. 验证记录

- 2026-06-29：`openspec validate rescue-hackathon-outcome-architecture --strict` 通过。
- 2026-06-29：审计 `src/`，未发现前端继续调用 `competition-media` / `admin/competition-media`；legacy `competition_media` 当前只保留在后端 admin 兼容接口和数据层。
- 2026-06-29：按当前阶段决策，不做破坏性迁移或删除；5.2 仍保留为后续数据迁移/归档任务。
- 2026-08-11：完成事件级媒体关系、三章节成果页、事件制影像库和旧路由兼容；桌面 `1440×1024`、手机 `390×844` 实拍均无横向溢出。
- 2026-08-11：中英文 locale 解析、目标 ESLint、2 个后端测试文件共 6 项测试、生产构建、`git diff --check`、严格 OpenSpec 校验全部通过；设计对照见项目根目录 `design-qa.md`。
- 2026-08-11：当前本地仅有一个公开赛事，7.1 的多赛事前端切换和空赛事视觉态仍待有第二场真实数据后验收；后端双赛事隔离已由自动化测试覆盖。
- 2026-08-11：成果页与影像库统一升级为黑绿 X-field 视觉语言；桌面将超大标题与真实现场照片跨 X 错位排布，移动端章节纵向展开、照片条独立横滑。成果页和影像库在 `1440×1024` 与 `390×844` 均复测无文档级横向溢出。
- 2026-08-11：按选定效果图完成第二轮忠实度校正：放大标题、照片、数字和主操作，移除重复首屏章节标签，收窄赛事切换器并加入浙客松专属桌面导航；修复章节 hash 在赛事参数同步时丢失及英文成果页签 key 错误。
- 2026-08-11：根据用户反馈恢复桌面首屏照片上窄下宽、向右冲出的“车头”异形轮廓；浏览器支持时使用曲线 `shape()`，否则保留同方向多边形降级，手机继续使用圆角矩形。桌面与手机文档宽度分别复测为 `1440` 和 `390`，均无横向溢出。
- 2026-08-11：全站桌面导航统一为 `拓浙AI生态` 主品牌与扁平下划线交互；进入浙客松仅切换当前项，不替换生态 Logo、导航名称或全局控制。作品区升级为“冠军主展位 + 亚季军并列 + 选中作品焦点展览 + 完整排行侧栏”，共同见证升级为分组知识与创新阵容；移动端滚动后同步收起赛事时间轴与页面切换条，避免遮挡作品和阵容内容。
- 2026-08-11：针对用户指出的作品详情 / 索引尺度失衡再次校正：桌面两列实测宽度约 `741 / 698px`，索引加入真实封面并放大名次、标题和作者层级；`1742×1006`、`1440×1000` 与 `390×844` 均无文档级横向溢出。
- 2026-08-11：按概念图驱动流程完成 01 / 02 / 03 / 04 四屏收口：01 在 `1366×768` 保持严格两行标题，02 使用主图与四图连续档案，03 重排奖台、详情和完整索引，04 复用 About 真实企业合作方与学校 / 社团阵容；最终以 `1440×1024` 并排对照板、`390×844` 四段手机实拍及中英文页面验收。
- 2026-08-12：按最终选定 03 概念图再次忠实收口作品与荣誉：`1536×1024` 同屏展示完整奖台、冠军详情和 04–08 索引；修复异步 hash 定位与手机 portal 透明 / 层级问题，桌面和手机均无文档级横向溢出，中英文前三名奖项标签完成独立验收。
- 2026-08-12：只重构 04 共同见证为双层支持矩阵：动态 `14` 家真实支持方作为规模锚点，7 家企业形成单行编号跑道，学校与社团形成两组开放式阵列；`1487×1058` 中英文桌面与 `390×844` 手机均实拍无横向溢出，01–03、共享 Logo 与 Navbar 未修改。

## 9. Concept-First Visual Closure

- [x] 9.1 Freeze the selected 01 visual target and generate matching 02, 03, and 04 concept images before implementation.
- [x] 9.2 Rebuild the four showcase chapters against the selected concepts while preserving the shared ecosystem Navbar and Logo.
- [x] 9.3 Keep the hero title to exactly two lines at laptop width and rebalance the works detail/index at desktop width.
- [x] 9.4 Verify desktop, laptop, mobile, Chinese, and English states with real local screenshots and side-by-side concept comparisons.
- [x] 9.5 Reconcile the final 03 concept at `1536×1024`, including podium/detail/index balance, mobile portal visibility, URL-backed selection, and localized podium labels.
- [x] 9.6 Reconcile all four selected concepts at `1487×1058`: remove showcase-only floating chrome, lock the Chinese hero to two lines, restore per-chapter breathing room, and make 04 a full closing screen without changing the shared Navbar or Logo.
- [x] 9.7 Recheck `1366×768` laptop, `390×844` mobile, English localization, document overflow, and the mobile work-detail open/close scroll-lock cycle.
