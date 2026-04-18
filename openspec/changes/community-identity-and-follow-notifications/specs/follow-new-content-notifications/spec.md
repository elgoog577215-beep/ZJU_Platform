## ADDED Requirements

### Requirement: Fan-out Notification on New Resource

当任一"被关注"用户发布下列 6 种资源之一（photos / music / videos / articles / news / events）且资源状态为 `'approved'` 或 `'pending'` 之外的可见状态时，后端 SHALL 在资源 INSERT 成功后同步向该作者的**每个粉丝**写入一条 `type = 'new_content'` 的通知。

- Fan-out helper：`fanOutNewContent({ authorId, resourceType, resourceId, title, isAnonymous })`
- Helper 内部 query `SELECT follower_id FROM user_follows WHERE following_id = ?` 取粉丝
- 遍历逐条调用 `createNotification(followerId, 'new_content', content, resourceId, resourceType)`
- 作者自己不进粉丝列表，即使他用其它账号关注了自己（被 self-follow 禁止规则拦截）
- 粉丝中 `role = 'banned'` 或 `deleted_at IS NOT NULL` 的用户 MUST 被过滤，不写通知

#### Scenario: Author publishes new article triggers fan-out

- **GIVEN** 用户 B 有粉丝 C, D, E（均未被封禁）
- **AND** B 不关注自己，D 是 banned 用户
- **WHEN** B 成功 `POST /articles` 创建一篇 article（id=42, title='CUDA 优化'）
- **THEN** `notifications` 表新增 2 条记录，分别给 C 和 E（D 被过滤）
- **AND** 每条记录 `type = 'new_content'`, `data.related_resource_type = 'article'`, `data.related_resource_id = 42`, `content` 含作者名和标题

#### Scenario: Author with no followers publishes

- **GIVEN** 用户 B 没有粉丝
- **WHEN** B 成功 `POST /photos`
- **THEN** `notifications` 表无新增行；资源创建成功响应照常返回

#### Scenario: Fan-out failure does not abort resource creation

- **GIVEN** 用户 B 有 1 个粉丝 C，且数据库 notifications 写入因某原因失败
- **WHEN** B 成功 `POST /articles`
- **THEN** 资源 INSERT 仍然成功，接口返回 200/201；通知写入失败被 `createNotification` 内部 try/catch 吞掉，记录 `console.error`

### Requirement: Notification Content Format

`new_content` 类型通知的 `content` 字段 SHALL 使用固定模板：`"{作者显示名} 发布了新{资源类型中文名}《{资源标题}》"`。

- 作者显示名遵循 `nickname` 优先、`username` 兜底规则
- 资源类型中文名映射：
  - `article` → "文章"
  - `photo` → "图片"
  - `music` → "音乐"
  - `video` → "视频"
  - `event` → "活动"
  - `news` → "新闻"
- 标题取资源表中的 `title` 字段，若为空或 null 则使用 "（无标题）"
- 文案在后端 fan-out 时组装并写入 `notifications.content` 列，**不在前端动态合成**

#### Scenario: Article notification content

- **GIVEN** 用户 `xsh_zju`（nickname=null）发布 article 标题为 `'CUDA 优化'`
- **WHEN** fan-out 生成通知
- **THEN** 通知 `content` 字段等于 `'xsh_zju 发布了新文章《CUDA 优化》'`

#### Scenario: Author with nickname, photo notification

- **GIVEN** 用户 username=`xsh_zju`, nickname=`'夜航船'` 发布 photo 标题为 `'樱花'`
- **WHEN** fan-out 生成通知
- **THEN** 通知 `content` 字段等于 `'夜航船 发布了新图片《樱花》'`

### Requirement: No Fan-out for Community Posts

社区帖（`community_posts` 表，包括 `section='help'` 和 `section='team'`）MUST NOT 触发 fan-out 通知。

**Rationale**: 求助贴可能是匿名的（推通知会暴露身份）；组队贴和讨论贴暂不在通知范围内，等后续迭代决定。

#### Scenario: Author publishes help post no notification

- **GIVEN** 用户 B 有粉丝 C（未关注任何资源）
- **WHEN** B 成功 `POST /community/posts` 且 `section='help'`（无论 is_anonymous）
- **THEN** `notifications` 表无新增行

#### Scenario: Author publishes team post no notification

- **GIVEN** 用户 B 有粉丝 C
- **WHEN** B 成功 `POST /community/posts` 且 `section='team'`
- **THEN** `notifications` 表无新增行

### Requirement: Prohibit Self-Follow

后端 `toggleFollowUser` 和任何 follow 相关写入操作（POST 创建 **和** DELETE 解除）SHALL 拒绝 `req.user.id === req.params.id` 的请求，返回 400 和明确错误消息。前端 `PublicProfile` 在 `isOwner === true` 时 MUST NOT 渲染关注按钮。

- 校验 MUST 在 handler 顶部统一进行（不能仅在 POST 分支，DELETE 也要同样拦截）
- 错误消息固定为中文 `"不能关注自己"` 或等价本地化文案
- 返回的 JSON body：`{ error: '不能关注自己' }`

#### Scenario: User tries to follow themselves via POST

- **GIVEN** 已登录用户 A（id=5）
- **WHEN** A 调用 `POST /users/5/follow`
- **THEN** 响应为 400，error message 为 `"不能关注自己"`；`user_follows` 表无新增

#### Scenario: User tries to unfollow themselves via DELETE

- **GIVEN** 已登录用户 A（id=5）
- **WHEN** A 调用 `DELETE /users/5/follow`
- **THEN** 响应为 400，error message 为 `"不能关注自己"`；没有任何 DB 变更

#### Scenario: Owner viewing own profile shows no follow button

- **GIVEN** 用户 A 已登录并访问 `/profile/5`（= 自己的 id）
- **WHEN** PublicProfile 渲染 header
- **THEN** 关注按钮不出现；取而代之的是"编辑资料"按钮（既有行为保持不变）

### Requirement: Notifications Read via Existing Infrastructure

本次 change MUST NOT 新增前端通知 UI、轮询机制或推送通道。复用 `NotificationCenter.jsx` 现有的 60 秒轮询 + 铃铛红点 + `buildNotificationTargetPath` 跳转逻辑，并确保新 type `'new_content'` 被该 path builder 正确路由到对应资源详情页。

#### Scenario: New content notification routes to article detail

- **GIVEN** 通知 `{ type: 'new_content', related_resource_type: 'article', related_resource_id: 42 }`
- **WHEN** 用户点击该通知项
- **THEN** 前端 `buildNotificationTargetPath` 返回 `/articles?id=42` 或等价路径，并 navigate 过去

#### Scenario: Notification bell refreshes within 60 seconds

- **GIVEN** 作者 B 发新 article，fan-out 完成，粉丝 C 已登录但当前未打开 NotificationCenter
- **WHEN** C 等待最多 60 秒
- **THEN** NotificationCenter 的轮询 fetchNotifications 至少触发一次；unreadCount 增加 1；铃铛红点刷新
