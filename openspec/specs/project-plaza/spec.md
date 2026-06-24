# project-plaza Specification

## Purpose
全站「项目广场」独立页面（`/projects`，不在 AI 社区下），聚合所有已发布项目名片，支持按进度/需求标签筛选与关键词搜索，点击打开详情，并支持从收藏进入后正确返回收藏；视觉跟随平台全局主题。（由 add-project-plaza 同步）
## Requirements
### Requirement: Project Plaza Page
There SHALL be a dedicated project plaza page at `/projects` that aggregates all published project cards across users. The plaza SHALL NOT live under the AI community section.

#### Scenario: Plaza lists published cards
- **WHEN** a visitor opens `/projects`
- **THEN** the page lists project cards whose `status` is `published`
- **AND** each card shows cover, title, intro, progress badge, need tags, tech tags, team/owner, and like count
- **AND** draft and removed cards are not shown.

#### Scenario: Plaza reachable from primary navigation
- **WHEN** a visitor uses the primary navigation
- **THEN** a "项目广场" entry navigates to `/projects`
- **AND** the entry is not nested inside the AI community menu.

### Requirement: Filter and Search
The plaza SHALL support filtering by progress and by need tag, and keyword search over title, tech, and owner.

#### Scenario: Filter by need
- **WHEN** the visitor selects the need filter "缺人"
- **THEN** only cards whose `need_tags` include "缺人" are shown.

#### Scenario: Filter by progress
- **WHEN** the visitor selects progress "开发中"
- **THEN** only cards with `progress = dev` are shown.

#### Scenario: Keyword search
- **WHEN** the visitor searches a keyword
- **THEN** cards matching the keyword in title, tech tags, or owner name are shown.

### Requirement: Project Detail View
点击项目卡片后，系统 SHALL 打开项目详情视图，展示长正文、概要数据、需求标签、技术标签、登录后可见的联系方式、仓库操作，以及项目分享海报操作。桌面端 SHALL 使用弹窗覆盖层，移动端 SHALL 使用全屏视图。

#### Scenario: Open share poster preview
- **WHEN** 访问者打开项目详情
- **THEN** 详情视图显示“生成海报”操作。
- **WHEN** 访问者点击该操作
- **THEN** 系统先打开海报预览，而不是直接开始下载。

#### Scenario: Poster contains shareable project card
- **WHEN** 海报预览完成渲染
- **THEN** 海报展示项目封面图，或在没有封面时展示生成的兜底视觉
- **AND** 海报展示“拓浙AI生态：项目广场”标识和站点 logo
- **AND** 海报展示项目标题、简介、进度、精选技术标签、精选需求标签、发起人展示名、发起人头像、收藏数和浏览数
- **AND** 发起人展示名优先使用昵称，昵称为空时回退用户名
- **AND** 海报不展示登录后才可见的联系方式。

#### Scenario: Poster QR opens project detail
- **WHEN** 海报预览完成渲染
- **THEN** 海报包含指向 `/projects?id={projectId}` 的二维码。
- **WHEN** 用户扫描二维码
- **THEN** 项目详情可以通过现有深链行为打开。

#### Scenario: Download poster image
- **WHEN** 访问者选择下载海报
- **THEN** 浏览器将预览内容导出为 PNG 图片。

#### Scenario: Share link fallback
- **WHEN** 原生文件分享不可用
- **THEN** 海报预览仍然允许访问者复制项目详情链接。

### Requirement: Return To Favorites Navigation
When a project detail is opened from the user's favorites list, closing it SHALL return the user to the favorites tab, reusing the platform's existing favorites-return navigation pattern (a URL marker is used since the detail's history push wipes router state).

#### Scenario: From favorites back to favorites
- **WHEN** a user opens a project from their favorites (navigated to `/projects?fromfav=1&id={id}`)
- **AND** then closes the project detail
- **THEN** the user is returned to the favorites tab on their profile (via `navigate(-2)`), matching Events/Gallery/Videos behavior — not stranded on the plaza.

### Requirement: Theme Follows Global UI Mode
The plaza and project cards SHALL render correctly under both the platform day theme and dark theme, following the global `uiMode` rather than a page-level style toggle, and SHALL sit on the platform's global background rather than painting their own.

#### Scenario: Dark and day render
- **WHEN** the platform theme is dark
- **THEN** the plaza renders in the cyber dark style on the global BackgroundSystem
- **WHEN** the platform theme is day
- **THEN** the plaza renders in the light style on the day ambient.

### Requirement: Empty State
The plaza SHALL show a guiding empty state when there are no matching cards.

#### Scenario: No cards yet
- **WHEN** there are no published project cards (or none match the filters)
- **THEN** an empty state invites the user to publish a project.

