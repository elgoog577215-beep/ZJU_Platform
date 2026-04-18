## ADDED Requirements

### Requirement: Author Display Name Fallback

所有资源控制器在返回作者身份字段时 SHALL 使用 `COALESCE(u.nickname, u.username) AS author_name`，以保证 `nickname` 未设置的老用户也能显示真实身份。

适用资源表：`articles`, `photos`, `music`, `videos`, `events`, `news`。

- `getOneHandler` / `getAllHandler` / `listNews` / `getNews` / 以及任何涉及作者 JOIN 的查询 MUST 使用该 fallback
- 返回给前端的 `author_name` MUST 始终非 null，除非该资源 `uploader_id` 本身为 NULL（seed 数据或用户删号后的孤儿资源）
- 回归测试 MUST 覆盖"用户只有 username 没有 nickname"的场景

#### Scenario: User without nickname uploads an article

- **GIVEN** 一个 `nickname = NULL, username = 'zhang_san'` 的用户发布了一篇 `articles` 资源
- **WHEN** 任一访客调用 `GET /articles/:id`
- **THEN** 响应中的 `author_name` 字段等于 `'zhang_san'`，不为 `'匿名用户'`、不为 NULL

#### Scenario: User with nickname uploads an article

- **GIVEN** 一个 `nickname = '小明', username = 'zhang_san'` 的用户发布了一篇 `articles` 资源
- **WHEN** 任一访客调用 `GET /articles/:id`
- **THEN** 响应中的 `author_name` 字段等于 `'小明'`

#### Scenario: News endpoint uses the same fallback

- **GIVEN** 一条 news 的 uploader `nickname` 为 NULL 但 `username` 为 `'editor_01'`
- **WHEN** 访客调用 `GET /news` 或 `GET /news/:id`
- **THEN** 响应中的 `author_name` 为 `'editor_01'`

### Requirement: Nickname Field Constraints

`users.nickname` SHALL 满足以下约束：

- 可选字段，允许 NULL（历史用户默认保留 NULL）
- 长度范围 2-20 字符（按字符计数，中文单字按 1 个字符）
- 允许的字符集：中文、英文字母、数字、下划线（`_`）
- 禁止 emoji、空白字符、其他特殊符号
- 当非 NULL 时必须全局唯一（通过 SQLite partial unique index `WHERE nickname IS NOT NULL` 实现）
- 保存前后端 MUST trim 两端空白

#### Scenario: User sets valid nickname

- **GIVEN** 用户 A 提交 `PUT /users/:id` 且 body 中 `nickname = '夜航船'`（3 中文字符）
- **WHEN** 后端校验并持久化
- **THEN** 返回 200；`users.nickname` 被更新为 `'夜航船'`

#### Scenario: User sets nickname that is too short

- **GIVEN** 用户 A 提交 `PUT /users/:id` 且 body 中 `nickname = 'A'`
- **WHEN** 后端校验
- **THEN** 返回 400，error message 包含长度要求说明；`users.nickname` 保持不变

#### Scenario: User sets nickname with emoji

- **GIVEN** 用户 A 提交 `PUT /users/:id` 且 body 中 `nickname = '小明🎉'`
- **WHEN** 后端校验
- **THEN** 返回 400，error message 提示禁用字符

#### Scenario: Nickname collision with another user

- **GIVEN** 用户 B 已有 `nickname = '小明'`
- **AND** 用户 A 提交 `PUT /users/:id` 且 body 中 `nickname = '小明'`
- **WHEN** 后端写入
- **THEN** 返回 409，error message **MUST** 精确为 `"该昵称已被使用"`；`users.nickname` 对 A 保持原值

#### Scenario: Collision error message does not leak other user identity

- **GIVEN** 用户 B（id=42, username='bob'）已有 `nickname = '小明'`
- **AND** 用户 A 提交冲突 nickname
- **WHEN** 后端返回 409
- **THEN** error message **MUST NOT** 包含 B 的 `id`、`username`、`email` 或其它昵称；仅能为固定字符串 `"该昵称已被使用"`

#### Scenario: User sets nickname to NULL

- **GIVEN** 用户 A 当前有 `nickname = '小明'`
- **AND** A 提交 `PUT /users/:id` 且 body 中 `nickname` 为空字符串或显式 null
- **WHEN** 后端处理
- **THEN** `users.nickname` 被设置为 NULL；该 nickname 立即被释放可供他人使用

### Requirement: Nickname Editing UI Entry

前端 PublicProfile 的 settings tab SHALL 提供 nickname 输入框，并满足：

- 输入框紧邻 organization / avatar / gender / age / password 等既有字段，属于同一个 `handleProfileUpdate` 表单
- 占位符文案描述字段用途（如 "显示名称"、"昵称"）
- 字段约束在前端以 `maxLength=20` 展示
- 字符校验 MAY 在客户端做即时拦截（不接受 emoji/特殊符号），但最终校验以服务端为准
- 仅在用户点击"保存"提交时进行唯一性校验（不额外调用实时可用性接口）
- 服务端返回 409 时，前端 MUST 展示明确的冲突提示（如 toast 或字段级 error）

#### Scenario: User views settings tab and sets nickname

- **GIVEN** 已登录用户打开自己的 `/profile/:id` 页
- **WHEN** 切到 settings tab 并在 nickname 输入框输入 `'夜航船'` 后点击保存
- **THEN** 表单 POST 到 `PUT /users/:id`；成功后 toast 提示保存成功，页面 header 的显示名切换为 `'夜航船'`

#### Scenario: User submits conflicting nickname

- **GIVEN** 用户 A 在 settings tab 输入已被用户 B 占用的 nickname
- **WHEN** A 点击保存
- **THEN** 接口返回 409；前端 toast 展示"该昵称已被使用"；输入框保留 A 的输入以便修改

### Requirement: Anonymous Help Post Opt-in

`community_posts` 表 SHALL 新增 `is_anonymous BOOLEAN DEFAULT 0` 列，仅对 `section = 'help'` 的帖子生效；`section = 'team'` 的组队贴强制实名，后端 MUST 忽略提交的 `is_anonymous` 字段。

历史数据 MUST 全部保持 `is_anonymous = 0`（实名）。

#### Scenario: Create anonymous help post

- **GIVEN** 已登录用户 A 提交 `POST /community/posts`，body 包含 `{ section: 'help', is_anonymous: true, title: '...', content: '...' }`
- **WHEN** 后端持久化
- **THEN** `community_posts` 行的 `is_anonymous` 列为 1

#### Scenario: Create team post with is_anonymous true is ignored

- **GIVEN** 已登录用户 A 提交 `POST /community/posts`，body 包含 `{ section: 'team', is_anonymous: true, ... }`
- **WHEN** 后端持久化
- **THEN** `community_posts` 行的 `is_anonymous` 列为 0（后端忽略了该字段）

### Requirement: Anonymous Help Post Server-side Redaction

后端在序列化 community_posts 输出时 SHALL 对匿名求助贴做字段脱敏，仅当访客既非作者本人、也非 admin 时生效。

被脱敏的字段（设置为 `null`）：
- `author_name`
- `author_avatar`
- `uploader_id` / `author_id`
- 任何可能泄露作者身份的衍生字段

脱敏逻辑 MUST 在统一的 `serializeCommunityPost(post, viewer)` helper 内实现，所有读路径 MUST 经由该 helper。

#### Scenario: Anonymous visitor views anonymous help post

- **GIVEN** 用户 B 发布了 `is_anonymous = 1` 的求助贴（id=100）
- **AND** 访客 C（非登录 / 非 B / 非 admin）
- **WHEN** C 调用 `GET /community/posts/100`
- **THEN** 响应中的 `author_name` 为 null，`author_avatar` 为 null，`uploader_id` 或 `author_id` 为 null

#### Scenario: Author views own anonymous post

- **GIVEN** 用户 B 发布了 `is_anonymous = 1` 的求助贴（id=100）
- **WHEN** B 本人调用 `GET /community/posts/100`
- **THEN** 响应中的 `author_name` / `author_avatar` / `author_id` 均为 B 的真实值

#### Scenario: Admin views anonymous help post

- **GIVEN** 用户 B 发布了 `is_anonymous = 1` 的求助贴（id=100）
- **AND** 管理员 D（role = 'admin'）
- **WHEN** D 调用 `GET /community/posts/100`
- **THEN** 响应中的 `author_name` / `author_avatar` / `author_id` 均为 B 的真实值，以便审核

### Requirement: Single Serializer Coverage Guarantee

任何从 `community_posts` 表读取并返回给客户端的代码路径 MUST 通过 `serializeCommunityPost(post, viewer)` helper；直接返回 raw 行将被视为安全回归。

为保证覆盖：

- 本次 change 实现阶段 MUST 在 `server/src/controllers/communityController.js`（或任何引用 `community_posts` 的 controller）中审计全部读路径
- 项目 MUST 新增自动化 assertion：
  - 方案 A（推荐）：添加 pre-commit 或 CI 脚本，grep 源码中出现 `FROM community_posts` 或 `.get/.all('SELECT...community_posts')` 的行，对比白名单（允许列表为 helper 内部的 SQL）；白名单外命中则 CI 失败
  - 方案 B：添加测试用例遍历所有 `/community/posts*` 响应，断言 is_anonymous=1 的帖对访客脱敏
- 新增读路径（如管理后台 list、search 返回 posts）MUST 同步经过 helper

#### Scenario: New read path must go through helper

- **GIVEN** 开发者新增 `GET /community/posts/search` 端点，SQL 里有 `FROM community_posts`
- **AND** 该端点未走 serializeCommunityPost
- **WHEN** CI 或 pre-commit 运行 assertion 脚本
- **THEN** 构建失败，明确指出违规文件行号；修复方式：把响应通过 helper 过滤后再返回

#### Scenario: Integration test verifies redaction on all post endpoints

- **GIVEN** 测试数据集中至少有 1 个 is_anonymous=1 的求助贴
- **WHEN** 集成测试分别调用所有返回 posts 的 endpoint（以匿名访客身份）
- **THEN** 所有响应中该帖的 `author_name / author_avatar / author_id` 都为 null

### Requirement: PostComposer Anonymous Checkbox

`PostComposer` 组件在 `section === 'help'` 时 SHALL 在表单底部（提交按钮同行左侧）展示"匿名发布" checkbox；`section === 'team'` 时 MUST NOT 显示该 checkbox。

- 默认 unchecked（默认实名发布）
- checkbox 状态在 submit 时通过 body `is_anonymous` 字段传递
- 关闭表单时状态重置

#### Scenario: Help composer shows anonymous checkbox

- **GIVEN** 已登录用户打开 PostComposer 且 `section='help'`
- **WHEN** UI 渲染
- **THEN** 表单 footer 区域显示"匿名发布" checkbox，位于"取消"/"发布"按钮左侧

#### Scenario: Team composer hides anonymous checkbox

- **GIVEN** 已登录用户打开 PostComposer 且 `section='team'`
- **WHEN** UI 渲染
- **THEN** 表单 footer 区域不显示"匿名发布" checkbox
