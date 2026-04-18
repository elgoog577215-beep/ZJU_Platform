## Context

当前 ZJU_Platform 的作者身份体系实际上处于半失效状态：

- `users.nickname` 字段是在早期 runMigrations 里 ALTER 添加的可选列，但前端**从未暴露编辑入口**（`PublicProfile` settings tab 只有 organization/avatar/gender/age/password），所以除了 admin 在 seed 时写死 `"Administrator"`，其余用户的 `nickname` 几乎全部为 NULL。
- 所有资源控制器（`resourceController.js` 覆盖 photos/music/videos/articles/events；`newsController.js` 单独处理 news）的作者 JOIN 只取 `u.nickname AS author_name`，**没有 fallback 到 username**。这与 `commentController.js`、`favoriteController.js`、`communityController.js` 里的 `nickname || username` 模式不一致。两个不一致相乘，导致绝大多数资源在前端兜底展示为"匿名用户"。
- 用户当前的认知："这是一个匿名 policy"——但其实是 SQL 漏洞 + UI 缺失导致的假象。

关注系统的基础设施已经存在：
- `user_follows` 表（`follower_id`, `following_id`, UNIQUE, 外键 CASCADE），索引齐全
- `/users/:id/follow` POST/DELETE toggle, `/followers`, `/following`, `/following/ids`, `/following/feed`, `/recommendations/follow`
- `PublicProfile.jsx` 有关注按钮 + UI
- `notifications` 表 + `createNotification()` helper + `NotificationCenter.jsx` 60 秒轮询 + 铃铛红点

**但**从未实现"被关注人发新内容时给粉丝推通知"的 fan-out 逻辑，关注 ≈ 只能进 Feed 页被动拉取，主动性为零。

PublicProfile 的 `getUserResources` 返回的内容集合也不完整：只查了 photos/videos/music/articles/events 5 张表（漏 news），完全没查 community_posts，用户无法从主页看到某人发过的求助贴、组队贴、技术讨论贴。

求助贴的"匿名用户"文案会在新增真实的 opt-in 匿名机制后产生语义冲突——需要明确区分"显示层面的 fallback"和"用户主动选择的隐身"。

## Goals / Non-Goals

**Goals:**
- 恢复所有资源的作者真实身份显示（当 `nickname` 缺失时用 `username` 兜底）
- 让普通用户可编辑 nickname，字段全局唯一
- 引入 `community_posts.is_anonymous` opt-in 字段，替代 SQL 漏洞驱动的假匿名
- 让关注行为产生粉丝侧可感知的通知（每条新内容 1 条）
- PublicProfile 主页内容聚合到类型 tabs 里，覆盖所有资源类型 + 社区帖（匿名贴对访客隐藏）
- 资源详情弹窗的作者头像可点击跳主页
- 禁止 self-follow
- 可安全回滚：所有数据库变更独立、幂等、可 drop

**Non-Goals:**
- 不扩展 Feed 页面（`/users/following/feed` 的范围保持现状）
- 不给所有卡片列表加头像点击（仅详情弹窗做；列表的作者头像入口等下一轮迭代）
- 不上邮件、短信、微信推送（仅站内通知）
- 不做通知聚合、防抖、静音列表（每条 = 1 条）
- 不反向重建历史关注关系、不为历史评论者/收藏者自动建立关注
- 不做大 V fan-out 的队列 / 异步化（当前粉丝规模小，同步写入可接受；如果后续某 user followers 超过阈值再拆队列）
- 不改 admin 的特权：admin 发内容与普通用户同样只推给自己的粉丝

## Decisions

### D1: nickname fallback 用 `COALESCE(nickname, username)` 而不是 `nickname || username`

**Alternatives:**
- (a) 保持现状，仅加 nickname 编辑入口 → 不解决老用户看不到作者的核心问题
- (b) 迁移时把 users.nickname backfill 为 username → 会让用户失去"nickname 是昵称"的语义，且 backfill 后 nickname 唯一约束会直接因 username 不冲突偶尔冲突（邮箱/学号作为 username 时反而不冲突，实际可行，但污染字段语义）
- (c) **[选用]** SQL 层 `COALESCE(u.nickname, u.username) AS author_name`，数据层保持 nickname 语义干净

**Rationale:** 读路径改动最小、最一致；写路径不动；和 `commentController` 等其他控制器已经用的 `nickname || username` 运行时模式对齐。

### D2: nickname 的唯一性用 SQLite partial index 实现

SQLite 支持 partial index：`CREATE UNIQUE INDEX idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL`。这样所有 NULL 值都不参与唯一约束（历史数据无需 backfill 就能满足），只有用户主动设置了 nickname 才进入唯一池。

**Alternatives:**
- (a) 全字段 UNIQUE：会因为历史上大量 NULL 互相冲突（SQLite 把多个 NULL 视为相等？实际 SQLite 视 NULL 不等所以可行，但语义不清晰）
- (b) 应用层校验：不做 DB 级约束，只在 updateUser 里 SELECT + check → 有 race condition 风险

**Rationale:** partial index 数据库级保证，租户和 race 都安全，且不影响历史 NULL 用户。

### D3: nickname 校验仅在提交时做，不加实时可用性探测接口

用户明确选择"只在提交时校验，冲突返 409"。权衡：UX 上用户输完才知道冲突，但省掉 `GET /users/nickname-available?name=xxx` 的额外 endpoint；当前预期冲突率极低（社区规模小，重名概率低）。

### D4: fan-out 通知在资源创建事务之后、同步调用

在 `createHandler` 的 `db.run(INSERT ...)` 成功后，同步调用 `fanOutNewContent(authorId, resourceType, resourceId, title)`。该 helper 内部：
1. `SELECT follower_id FROM user_follows WHERE following_id = ?`
2. 遍历每个 follower_id，调用 `createNotification(follower_id, 'new_content', content, resourceId, resourceType)`

**Alternatives:**
- (a) 用消息队列（BullMQ / Redis）异步 fan-out → 项目当前不用 Redis，引入重型依赖违背 YAGNI
- (b) 单条 BATCH INSERT 替代逐条 createNotification → 性能更好，但牺牲 `createNotification` 已有的错误处理和一致性；当前粉丝规模小，直接循环调用
- (c) **[选用]** 同步循环 `createNotification`

**Rationale:** 简单、可审计；错误被 createNotification 内部 try/catch 吞掉不会 abort 主事务。若某 user 粉丝数超过 1000 影响发布耗时，再考虑 batch 或队列。

### D5: 通知文案在后端生成并写入 content 列，前端不重新组装

`fanOutNewContent` 把文案（比如"`xsh_zju` 发布了新文章《CUDA 性能优化》"）写入 `notifications.content`，前端直接展示。优点：
- 作者改了 nickname 后历史通知不会随之变化（历史一致性）
- 前端不需要知道每种类型对应的 i18n key

**Alternatives:**
- 前端模板化：通知只存 structured data，前端根据 resourceType + data 拼字符串 → i18n 支持更灵活，但前端需要大量类型 switch

**Rationale:** 当前项目 notifications 都是后端文案，保持一致。若未来要多语言切换再做前端模板化。

### D6: 匿名求助贴的脱敏在后端完成，不依赖前端判断

读取 `community_posts` 时，如果 `is_anonymous = 1` 且 (viewer 不是作者) 且 (viewer 不是 admin)：
- `author_name` → `null`（前端兜底显示"匿名用户"）
- `author_avatar` → `null`
- `uploader_id` / `author_id` → `null`（避免前端拿到 id 去猜）

**Alternatives:**
- 前端判断 is_anonymous 后自行隐藏 → 一旦前端不更新或绕过前端调 API 就泄露身份，不安全

**Rationale:** 隐私字段必须在服务端 strip，前端只做展示。

### D7: PublicProfile 内容区改造保留"大图 grid 卡片"视觉

不使用收藏页的"小横条列表"样式，保持现有"已发布"tab 的大图 3 列 grid（每卡 cover + 类型 badge + 标题 + meta）。求助/组队等无 cover 的类型用占位图（类型图标 + 纯色背景）。

**Rationale:** 保持平台已有视觉语言，用户对此路径有肌肉记忆；收藏页的列表样式是另一种场景产物（收藏偏重"快速扫已收藏的东西"），不适合"作者作品展示"的语义。

### D8: 主页类型 tabs 里不暴露"技术讨论"作为独立 tab

社区帖的 section 目前只有 `help` 和 `team`。Proposal 中提到 tabs 列表包含"技术讨论"只是为未来预留；如果短期内不存在第三种 section，tabs 应该只显示有实际内容的类型（用户 0 篇的 tab 可以隐藏或展示空状态）。tabs 的类型 + 计数由后端返回（或前端聚合），避免硬编码全部 9 种。

### D9: 路由记忆（点卡片 → 详情 → 返回主页）

前端用 react-router-dom 的 `useLocation().state` 传 `{ fromUserProfile: userId }`，详情页 back 逻辑类似 `CommunityTech.jsx` 里已有的 `fromFavoritesRef` 模式。无需新增路由，只需 navigate 时带 state，返回时 `navigate(-1)` 回去。

### D10: self-follow 防御在后端 + 前端双重

- 后端：`toggleFollowUser` 在 `authenticate` 后检查 `req.params.id == req.user.id` 返回 400
- 前端：`PublicProfile` 判断 `isOwner` 时隐藏关注按钮（当前已经实现，见 line 434-442）

确保即使绕过前端直接 POST /users/:self/follow 也会被拦。

## Risks / Trade-offs

**[风险] 大 V 发内容时 fan-out 同步循环可能阻塞响应**
→ Mitigation: 当前粉丝上限不会超过百级，INSERT 语句在 SQLite 上可忽略。监控点：发布接口 p99 > 1s 时优先排查 fan-out 循环。超过阈值时迁移到 setImmediate 异步或 worker queue。

**[风险] nickname 唯一约束 migration 失败（如果历史上有非 NULL 的 nickname 碰撞）**
→ Mitigation: 迁移前用 `SELECT nickname, COUNT(*) FROM users WHERE nickname IS NOT NULL GROUP BY nickname HAVING COUNT(*) > 1` 扫描冲突。如有冲突，在 migration 中打 warning + 给冲突行附加随机后缀（如 `xsh → xsh-2`），或在 change archive 前手动 resolve。目前 admin 写死 "Administrator" 是唯一非 NULL 值，但 CD 管道应当加该扫描步骤。

**[风险] is_anonymous 脱敏遗漏某个读取路径**
→ Mitigation: 所有 community_posts 的读路径集中到一个 `serializeCommunityPost(post, viewer)` helper，里面统一判断 + strip；grep `SELECT.*community_posts` 审查覆盖所有出口。

**[风险] 通知内容硬编码中文，i18n 场景下不友好**
→ Mitigation: 接受该 trade-off。项目 `notifications` 现有所有 content 都是中文（"X 评论了你的文章"等），保持一致。未来做 i18n 改造时统一翻修。

**[风险] PublicProfile 的 community_posts 查询和资源查询分表，排序混合复杂**
→ Mitigation: 后端 UNION ALL 合并资源 + community_posts，统一按 `created_at` 排序，返回时带 `type` 字段供前端分组。SQL 复杂度可控，单用户的数据量不会大。

**[风险] 匿名求助贴的作者自己看自己的主页，看到的"我的求助"列表里带匿名贴，可能被旁人隔着屏幕偷看**
→ 接受。设计上作者本人看自己的主页就该看到自己发的所有东西，物理层面无法防旁观。UI 可以给匿名贴加一个小"👁‍🗨 匿名"标识提示作者本人。

**[Trade-off] 通知文案存死字符串，作者改 nickname 后历史通知不同步**
→ 设计选择。优先历史一致性（通知是"当时发生了什么"的快照），不做 lazy 文案合成。

## Migration Plan

**Phase 1 — 数据库迁移（runMigrations）**
1. `ALTER TABLE community_posts ADD COLUMN is_anonymous BOOLEAN DEFAULT 0`（幂等，用现有 PRAGMA table_info 检测模式）
2. `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL`
3. 新增 pre-migration 脚本：检查 nickname 冲突，打 warning 但不中止

**Phase 2 — 后端**
4. `resourceController.js` + `newsController.js` 修 COALESCE
5. `userController.updateUser` 加 nickname 唯一性校验（提交时 try/catch SQLite UNIQUE 冲突 → 409）
6. `userController.toggleFollowUser` 加 self-follow 禁止
7. `userController.getUserResources` 扩 news + community_posts，加脱敏
8. `communityController.createPost` 接受 is_anonymous（仅 section=help）
9. `communityController` 读路径统一脱敏 helper
10. `notificationController` 新增 `fanOutNewContent` helper
11. 在 `resourceController.createHandler` 和 `newsController` 发布成功后调用 fan-out

**Phase 3 — 前端**
12. `PublicProfile.jsx` settings tab 加 nickname 输入框
13. `PostComposer.jsx` help section 底部加匿名 checkbox
14. `CommunityDetailModal.jsx` 作者头像 onClick 跳 `/profile/:id`，匿名态样式
15. `PublicProfile.jsx` 内容区改造为类型 tabs + 3 列 grid 卡片，接入 getUserResources 新 payload
16. 路由记忆：navigate 时传 state，返回时 `navigate(-1)`

**Phase 4 — E2E smoke**
17. 新用户注册 → 发文章 → 他人看到真实 username（不匿名）
18. 设 nickname → 再发文章 → 他人看到 nickname
19. nickname 冲突 → 409 + 前端 toast
20. 关注 A → A 发资源 → 铃铛 1 分钟内红点 + 通知内容正确
21. A 发匿名求助贴 → 粉丝**不**收到通知
22. A 主页对访客：匿名求助贴不可见；对 A 本人：可见
23. 详情页点头像 → 跳 A 主页 → 返回 → 回到原详情页

**Rollback 策略**
- DB：`DROP INDEX idx_users_nickname`, `ALTER TABLE community_posts DROP COLUMN is_anonymous`（SQLite 不支持 DROP COLUMN，需 rebuild；备份脚本 `server/database.sqlite.bak.pre-*` 作为安全网）
- 后端代码：所有修改可 revert commit；fan-out helper 未被外部依赖，新增删除均安全
- 前端：单独的 React 组件改动，可 revert；nickname 输入框删掉后 NULL 字段照常存在

## Open Questions

- **Q1**: nickname 设置 UI 的 placeholder 文案是 "给自己起个昵称" 还是更学院气的 "显示名称"？→ 由 /plan 阶段的 impeccable-clarify 决定，不阻塞架构
- **Q2**: tabs 里计数 "所有 42"的计数是否 include 匿名贴？
  - 对作者本人：include（他知道自己发了匿名的）
  - 对访客：exclude（否则计数泄露数量）
  - 规则收口：count 计算和内容返回同源，都按脱敏规则过滤后再 count。确认到 specs 里。
- **Q3**: fan-out 时如果作者的粉丝已被 ban（用户状态为 banned），要不要跳过？
  - 建议：跳过（banned 用户不应该收新通知）；在 fan-out helper 查粉丝时顺便 JOIN `users` 过滤 role != 'banned'
  - 放 specs 里明确
- **Q4**: `user-profile-content-aggregation` capability 里的"大图 grid 卡片"是否需要响应式（手机两列/桌面三列）？→ 设计层面按目前 PublicProfile 样式延续，具体断点放 /plan
