## MODIFIED Requirements

### Requirement: Project Plaza Page

There SHALL be a dedicated project plaza page at `/projects` that serves as the public hub for hackathon project submission, cross-event outcome discovery, and continued project growth. It SHALL aggregate published project cards and approved public competition works that do not yet resolve to a published project. The plaza SHALL NOT live under the AI community section.

#### Scenario: Plaza lists published projects and historical works

- **WHEN** a visitor opens `/projects`
- **THEN** the page lists project cards whose `status` is `published`
- **AND** lists approved, public, non-deleted competition works that do not resolve to a published project
- **AND** historical works are visibly identified as competition archives rather than user-owned project cards
- **AND** draft, removed, pending, rejected, non-consenting, and deleted records are not shown.

#### Scenario: Plaza reachable from primary navigation

- **WHEN** a visitor uses the primary navigation
- **THEN** a "项目广场" entry navigates to `/projects`
- **AND** the entry is not nested inside the AI community menu.

## ADDED Requirements

### Requirement: Project detail distinguishes source and public evidence

项目广场详情 SHALL 根据长期项目或赛事归档来源展示相应的公开事实，并保持 GitHub 与在线部署链接语义分离。

#### Scenario: Visitor opens a historical competition work

- **WHEN** 访问者打开 `source_type = competition_work` 的卡片
- **THEN** 详情 MUST 展示作品名称、作者、专业、简介、赛事、奖项或名次
- **AND** GitHub 链接存在时 MUST 提供仓库行动
- **AND** 部署链接存在时 MUST 提供在线体验行动
- **AND** MUST NOT 显示收藏、联系方式或虚假的项目所有权行动

#### Scenario: Visitor opens a long-term project with deployment

- **WHEN** 访问者打开包含 `deployment_url` 的已发布长期项目
- **THEN** 详情 MUST 分别提供仓库和在线体验行动
- **AND** 两个行动 MUST 使用安全外链属性
