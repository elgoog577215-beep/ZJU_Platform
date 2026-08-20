## MODIFIED Requirements

### Requirement: Project Plaza Page

系统 SHALL 在浙客松赛事工作区的“项目作品”环节聚合所选赛事的公开项目与赛事作品，同时 SHALL 保留 `/projects` 作为兼容的独立项目中心，用于跨赛事发现全部已发布项目名片。项目能力 SHALL NOT 位于 AI 社区下。

#### Scenario: Event project stage lists public cards

- **WHEN** 访问者打开 `/hackathon?event=<eventKey>&view=projects`
- **THEN** 页面列出对应 competition 下公开的已发布项目和已审核赛事作品投影
- **AND** 草稿、已下架和未审核作品不显示
- **AND** 页面提供当前赛事的作品提交入口及真实开放状态。

#### Scenario: Compatibility plaza lists published cards

- **WHEN** 访问者通过历史链接打开 `/projects`
- **THEN** 页面继续列出全站公开项目与允许公开的赛事作品投影
- **AND** 每张卡片保留封面、标题、简介、进度、需求、技术、作者/团队和互动信息。

#### Scenario: Plaza is discovered from hackathon navigation

- **WHEN** 访问者使用全站主导航进入“浙客松”并选择“项目作品”
- **THEN** 系统在同一赛事工作区展示项目广场能力
- **AND** 全站主导航不再显示与“浙客松”并列的“项目广场”栏目。
