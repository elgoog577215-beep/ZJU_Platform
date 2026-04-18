# community-author-identity Specification

## Purpose
TBD - created by archiving change community-identity-and-follow-notifications. Update Purpose after archive.
## Requirements
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

---

> **Deprecated (removed 2026-04-18)**: The earlier requirements for
> `Anonymous Help Post Opt-in`, `Anonymous Help Post Server-side
> Redaction`, `Single Serializer Coverage Guarantee`, and
> `PostComposer Anonymous Checkbox` were dropped. Rationale: since
> nicknames are freely editable per user, an explicit anonymous flag
> provided no meaningful privacy that nickname choice couldn't already
> deliver. The `community_posts.is_anonymous` column remains in the
> schema for backwards compatibility but is always written as 0.
