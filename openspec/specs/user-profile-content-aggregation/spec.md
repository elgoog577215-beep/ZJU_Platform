# user-profile-content-aggregation Specification

## Purpose
TBD - created by archiving change community-identity-and-follow-notifications. Update Purpose after archive.
## Requirements
### Requirement: getUserResources Extended Coverage
`GET /users/:id/resources` SHALL include confirmed competition outcome bindings as `type = 'competition_work'`, applying visitor/owner/admin visibility rules.

#### Scenario: Competition work appears in profile resources
- **WHEN** a requester can see a user's confirmed competition work binding
- **THEN** the resources response includes an item with `type = 'competition_work'`.

#### Scenario: Visitor cannot see candidate work
- **WHEN** a visitor requests resources for a user with candidate, rejected, or revoked competition work bindings
- **THEN** those bindings are excluded.

#### Scenario: Owner can inspect non-public binding state
- **WHEN** the owner requests resources or binding management data
- **THEN** relevant candidate, rejected, and revoked states are available only to the owner or an administrator.

### Requirement: Profile Content Type Tabs

PublicProfile 的"已发布"区 SHALL 按类型 tabs 组织，tabs 列表：

- 所有（聚合展示全部类型）
- 图片（photo）
- 视频（video）
- 音乐（music）
- 文章（article）
- 活动（event）
- 新闻（news）
- 求助（help）
- 组队（team）
- 项目（project）

每个 tab 旁边 MAY 展示该类型的数量。用户 0 条的 tab MAY 隐藏或显示空状态。

切换 tab 时 MUST 不触发整页刷新，仅切换内容区。

#### Scenario: User with mixed content browses tabs

- **GIVEN** 用户 B 发布了 3 张图片 + 2 篇文章 + 1 个求助贴
- **WHEN** 访客 C 打开 B 的主页并点"文章"tab
- **THEN** 内容区只显示 2 篇文章；其它 tabs 仍可切换

#### Scenario: Default tab is 所有

- **GIVEN** 用户 B 的主页 URL 无 tab 参数
- **WHEN** 首次加载
- **THEN** 默认选中"所有" tab，内容区按 `created_at DESC` 混排所有类型

### Requirement: Large Grid Card Layout

主页内容区 SHALL 使用大图 grid 卡片（保留平台既有"已发布" tab 的风格），而不是收藏页的小横条列表。

每张卡片 MUST 包含：
- cover 图（无 cover 的类型用占位渐变 + 类型图标）
- 类型 badge（左上，按类型色彩）
- 点赞数（右上）
- 标题（底部黑底信息栏）
- 日期（副文本）

桌面端默认 3 列，移动端降级到 2 列（具体断点遵循项目 Tailwind 默认 `md:` 响应式）。

#### Scenario: Cards render in grid

- **GIVEN** 访客 C 打开用户 B 的主页且"所有"tab 有 6 条内容
- **WHEN** 视窗宽度 ≥ 768px
- **THEN** 内容区以 3 列 grid 渲染 6 张大图卡片

#### Scenario: Help post without cover uses placeholder

- **GIVEN** 求助贴没有 cover image
- **WHEN** 该卡片渲染
- **THEN** cover 区显示类型图标（💬）+ 类型色的纯色/渐变背景

### Requirement: Navigate to Detail with Return State

点击主页卡片 SHALL 跳转到对应资源的详情页（或资源所在列表的详情弹窗），并在详情页的返回操作上回到原主页的 URL 和滚动位置。

实现约束：
- 前端 navigate 时通过 react-router `state` 传递 `fromUserProfile: { userId, scrollY }`
- 详情页返回（浏览器 back 或 UI 关闭按钮）时 `navigate(-1)`
- 返回后主页 tab 选中状态、滚动位置保持不变

#### Scenario: User clicks a photo card from profile

- **GIVEN** 访客 C 浏览用户 B 的主页，选中"图片"tab，滚动到中部
- **WHEN** C 点击一张照片卡片
- **THEN** 路由跳到 `/gallery?id=<photoId>` 或等价详情 URL

#### Scenario: User returns from detail view

- **GIVEN** 接上一个场景
- **WHEN** C 按浏览器后退或点详情页关闭按钮
- **THEN** 回到用户 B 的主页，"图片"tab 保持选中，滚动位置恢复到 C 之前的位置

### Requirement: Clickable Author Avatar in Detail Views

资源详情弹窗 / 详情页 SHALL 把作者头像区块做成可点击入口，点击 navigate 到 `/profile/:uploaderId`。

约束：
- 当 `uploader_id` 为 null（匿名求助贴 / 孤儿资源）时：头像显示为灰底默认占位，`cursor: not-allowed`，不绑定 onClick
- 当 `uploader_id` 存在：头像显示作者 avatar，`cursor: pointer`，hover 态加强
- 组件：`CommunityDetailModal.jsx` 及其他包含作者区块的详情组件

#### Scenario: Click normal article author avatar

- **GIVEN** 访客 C 打开用户 B 的 article 详情弹窗
- **WHEN** C 点击作者头像
- **THEN** 路由跳到 `/profile/B` 且加载 PublicProfile

#### Scenario: Click anonymous post author avatar (not allowed)

- **GIVEN** 访客 C 打开 `is_anonymous=1` 的求助贴详情
- **WHEN** C 尝试点击作者位置
- **THEN** 没有 navigate 发生，光标为 not-allowed，头像为灰底默认占位

### Requirement: Tab Count Respects Visibility

tabs 旁边显示的内容数量 SHALL 与该访客实际能看到的内容条数一致。

- 非 owner 非 admin：数量不包含匿名求助贴（否则数字泄露存在性）
- Owner / admin：数量包含全部（含匿名求助贴）

#### Scenario: Visitor sees reduced help tab count

- **GIVEN** 用户 B 共有 1 个非匿名求助贴 + 2 个匿名求助贴
- **WHEN** 访客 C 打开 B 的主页
- **THEN** "求助" tab 显示的数量为 1

#### Scenario: Owner sees full help tab count

- **GIVEN** 同上
- **WHEN** B 本人打开自己的主页
- **THEN** "求助" tab 显示的数量为 3

### Requirement: Profile Content Aggregation Includes Projects
个人主页内容聚合 SHALL include a "项目"(project) content type alongside existing types. A user's own published project cards SHALL appear under their profile project category, and favorited projects SHALL appear in the favorites list filterable by the project type. Clicking a project from either the published or favorites list SHALL open the project detail and return to the originating tab on close.

#### Scenario: Own projects on profile
- **WHEN** a visitor views a user's public profile and filters to the project type
- **THEN** the user's `published` project cards are returned as `type: 'project'`
- **AND** draft and removed cards are excluded for non-owner visitors.

#### Scenario: Owner sees own drafts
- **WHEN** the owner views their own profile project category
- **THEN** both published and draft project cards are returned.

#### Scenario: Favorited projects in favorites
- **WHEN** a user views their favorites and filters by the project type
- **THEN** project cards they favorited are listed
- **AND** selecting one navigates to `/projects?fromfav=1&id={id}` and returns to the favorites tab on close.

#### Scenario: Click project from published tab
- **WHEN** the owner clicks a project in their "已发布" tab
- **THEN** the project detail opens (`/projects?...&id={id}`)
- **AND** closing it returns to the profile tab.

#### Scenario: Favorite type option present
- **WHEN** the profile favorites/content type filter is rendered
- **THEN** it includes a "项目" option alongside the existing content type options.

