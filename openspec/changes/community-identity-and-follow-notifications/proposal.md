## Why

当前社区内容的作者身份显示存在严重偏差：非管理员发布的技术文章、图片、视频、新闻等资源，在详情页普遍显示为"匿名用户"。根因是 `resourceController.js` 与 `newsController.js` 中的 SQL 只 `SELECT u.nickname AS author_name` 而没有兜底 `username`，而绝大多数普通用户的 `nickname` 字段为 NULL（前端从未暴露过 nickname 编辑入口）。这让作者贡献不可见、粉丝关注无处可去、社区辨识度严重不足。

同时，现有的关注系统（`user_follows` 表 + `/users/:id/follow` API + PublicProfile 关注按钮）虽然基础设施齐全，但**被关注人发新内容时不会给粉丝产生通知**——关注关系等同于无效。PublicProfile 主页也没有把用户的社区帖（求助/组队/技术讨论）和新闻资源包含进来，用户无法从一个入口看到某人的完整产出。

本次把上述三件事合并收口：恢复作者身份显示、把关注系统转化为有实际价值的 fan-out 通知、扩展主页内容聚合；同时为求助贴引入真正的"匿名发布"opt-in 机制，替代当前由 SQL 漏洞引发的假匿名。

## What Changes

- **BREAKING**: `users.nickname` 引入全局唯一约束（2-20 字符，禁 emoji）。历史上同名 nickname 的用户需要在升级前人工 resolve（目前 `nickname` 基本都是 NULL，冲突概率极低）。
- 新增 `users.nickname` 编辑入口：`PublicProfile` 的 settings tab。仅在提交时校验，冲突返 409。
- 所有资源控制器（articles / photos / music / videos / events / news）的作者 JOIN SQL 改为 `COALESCE(u.nickname, u.username) AS author_name`。
- `community_posts` 表新增 `is_anonymous BOOLEAN DEFAULT 0` 列，历史数据全部 backfill 为 0（实名）。
- `POST /community/posts` 当 `section = 'help'` 时接受 `is_anonymous` 字段；`section = 'team'` 时忽略（强制实名）。
- 读取求助贴时：非作者本人、非 admin 的访客看到 `author_name = null / uploader_id = null / author_avatar = null`，前端展示"匿名用户"+ 灰底不可点头像。
- `PostComposer.jsx` 求助贴表单底部（提交按钮左侧）新增"匿名发布"checkbox；组队贴不显示此 checkbox。
- 6 种资源（photos / music / videos / articles / events / news）发布成功后，后端执行 fan-out：查作者的 followers，为每位写一条 `notifications` 记录，type=`new_content`，content 格式为"`{作者名}` 发布了新`{类型}`《`{标题}`》"。社区帖（含求助/组队）不触发通知。
- 匿名求助贴不 fan-out 通知（避免身份泄露）。
- `user_follows` 新增后端约束：禁止 self-follow（`follower_id = following_id` 时 400）；前端在 PublicProfile 中 `isOwner` 时隐藏关注按钮。
- `GET /users/:id/resources` 扩展：补 news 表查询，新增 `community_posts` 查询（组队贴全部 + 求助贴按 `is_anonymous=0 OR viewer=owner OR viewer=admin` 过滤）。
- PublicProfile 内容区采用**类型 tabs 筛选**（所有 / 图片 / 视频 / 音乐 / 文章 / 活动 / 新闻 / 求助 / 组队 / 技术讨论），卡片展示**保留现有"已发布"的大图 grid 风格**，点击卡片跳资源详情、返回回到当前主页（路由状态跟收藏系统对齐）。
- 资源详情弹窗（CommunityDetailModal）的作者头像区块加 onClick 跳转 `/profile/:uploader_id`；匿名或 `uploader_id` 为 null 时灰底 + `cursor: not-allowed`。

## Capabilities

### New Capabilities

- `community-author-identity`: 作者身份在所有资源和社区帖上的展示规则 —— nickname/username 兜底、匿名求助贴的字段脱敏、nickname 的编辑与唯一性约束。
- `follow-new-content-notifications`: 关注关系驱动的 fan-out 通知 —— 被关注人发新资源时，粉丝收到 type=`new_content` 通知；匿名贴不推；self-follow 禁止。
- `user-profile-content-aggregation`: PublicProfile 主页的内容聚合 —— `getUserResources` 扩展、类型 tabs 筛选、大图 grid 卡片、路由记忆返回、匿名贴对访客的隐藏规则；资源详情作者头像点击入口。

### Modified Capabilities

- `notifications-persistence`: 新增 `type = 'new_content'` 作为合法 notification type 之一，`data` JSON 字段包含 `related_resource_type` 和 `related_resource_id`，用于前端跳转。

## Impact

**后端**
- `server/src/controllers/resourceController.js` — `getOneHandler` / `getAllHandler` 的 author_name SQL；`createHandler` 发布后调用 fan-out；新增禁止 self-follow 校验
- `server/src/controllers/newsController.js` — 同样修 COALESCE + 发布 fan-out
- `server/src/controllers/communityController.js` — 求助贴 create/read 支持 `is_anonymous` 和脱敏
- `server/src/controllers/userController.js` — `updateUser` 加 nickname 唯一性校验；`getUserResources` 扩展 news + community_posts；`toggleFollowUser` 禁止 self-follow
- `server/src/controllers/notificationController.js` — 新增 `fanOutNewContent(authorId, resourceType, resourceId, title, isAnonymous)` helper
- `server/src/config/runMigrations.js` — `users.nickname` 增加 UNIQUE INDEX；`community_posts.is_anonymous` 添加列 + backfill

**前端**
- `src/components/PublicProfile.jsx` — settings tab 加 nickname 输入框；内容区从"已发布"改造为类型 tabs + 大图 grid；self-owner 隐藏关注按钮
- `src/components/PostComposer.jsx` — help section 底部加"匿名发布"checkbox
- `src/components/CommunityDetailModal.jsx` — 作者头像加 onClick → `/profile/:id`；匿名态样式
- `src/components/NotificationCenter.jsx` — 零改动（现有 60s 轮询 + 跳转 buildNotificationTargetPath 支持扩展 new_content type）

**数据库迁移**
- `ALTER TABLE community_posts ADD COLUMN is_anonymous BOOLEAN DEFAULT 0`（幂等）
- `CREATE UNIQUE INDEX idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL`（SQLite partial index）
- 可回滚：两个 migration 都独立，回滚只需 drop index 和 drop column

**不做**
- Feed 页面扩展（仍仅 photos/music/videos/articles/events，不扩展到 news 或 community_posts）
- 非详情页的卡片列表头像点击（仅详情页做）
- 邮件/微信外部推送（仅站内通知）
- 通知聚合 / 防抖 / 静音某个关注对象
- 数据迁移反向重建历史关注关系
- 大 V fan-out 的性能优化（粉丝数一般可接受，如未来超万级再拆队列）
