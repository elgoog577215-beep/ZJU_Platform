## ADDED Requirements

### Requirement: Project plaza is the cross-event hackathon project hub

系统 SHALL 以 `/projects` 作为跨届黑客松项目提交、成果发现与持续孵化的唯一公共项目中心，同时保留 `/projects?competition=<slug>` 的单场赛事上下文。

#### Scenario: Visitor opens the default project plaza

- **WHEN** 访问者打开 `/projects`
- **THEN** 首屏 MUST 明确说明项目广场服务黑客松项目的提交、展示和持续生长
- **AND** MUST 提供查看历届作品与提交项目的清晰行动
- **AND** MUST NOT 创建另一条黑客松项目目录路由

#### Scenario: Visitor enters one competition

- **WHEN** 访问者打开 `/projects?competition=<slug>` 且赛事公开存在
- **THEN** 页面 MUST 保留该赛事标题、作品数量、提交行动和返回全部项目的路径
- **AND** 列表 MUST 只显示属于该赛事的公开作品或项目

### Requirement: Historical public works remain discoverable without false ownership

默认项目广场 SHALL 展示未关联长期项目的已审核公开赛事作品，但不得因此创建虚假的项目所有权或复制赛事记录。

#### Scenario: Approved historical work has no project

- **WHEN** `competition_works.project_id` 为空且作品已审核、同意公开、未删除
- **THEN** `/projects` MUST 以赛事归档项目形态展示该作品
- **AND** MUST 展示真实作者、专业、赛事、奖项或名次以及可用的公开链接
- **AND** MUST NOT 把补录管理员显示为作品作者或项目所有者

#### Scenario: Historical work becomes linked to a published project

- **WHEN** 历史作品后来显式关联一个已发布 `project_cards`
- **THEN** 默认广场 MUST 只展示长期项目卡片
- **AND** MUST NOT 同时展示同一作品的未关联赛事投影

### Requirement: Hub supports event discovery and transparent missing evidence

项目中心 SHALL 支持按赛事发现作品，并如实表达仓库或部署证据是否存在。

#### Scenario: Visitor filters by competition

- **WHEN** 访问者选择一场公开赛事
- **THEN** URL MUST 更新为对应 `competition` 参数
- **AND** 项目列表 MUST 只显示该场赛事的公开项目和历史作品

#### Scenario: Historical work has no deployment URL

- **WHEN** 赛事作品没有 `deployment_url`
- **THEN** 详情 MUST 显示部署链接待补充或不展示可点击部署行动
- **AND** 系统 MUST NOT 从 GitHub 链接推断或生成部署地址

### Requirement: Hub remains usable across languages and viewports

项目中心新增的定位、筛选、提交、赛事归档和部署信息 SHALL 同时支持中文与英文，并在桌面和移动端保持可用。

#### Scenario: Mobile visitor browses historical works

- **WHEN** 访问者在 390px 宽度浏览默认项目中心并打开历史作品
- **THEN** 页面和详情 MUST 不产生文档级横向溢出
- **AND** 详情 MUST 可逆关闭并保持可滚动

#### Scenario: English visitor opens the hub

- **WHEN** 当前语言为英文
- **THEN** 新增用户可见文案 MUST 使用英文
- **AND** MUST NOT 显示原始 i18n key 或混入固定中文界面文案
