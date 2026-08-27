## Why

项目广场已经具备项目名片与赛事上下文，但默认形态仍偏通用展示，上一届 20 个已审核作品也只作为未关联赛事快照存在，无法在广场首页形成完整的历届黑客松成果资产。现在需要把项目广场明确升级为黑客松项目的提交、发现、认领与持续孵化中心，同时保留长期项目真源和历史赛事快照的边界。

## What Changes

- 将 `/projects` 的产品主叙事调整为黑客松项目中心，首屏组织当前赛事、历届作品和项目提交行动；赛事上下文继续使用 `/projects?competition=<slug>`，不新增平行广场。
- 默认项目广场同时展示已发布 `project_cards` 和已审核、公开但尚未关联长期项目的历史 `competition_works`，让上一届 20 个作品无需伪造所有者即可进入广场。
- 项目与赛事作品增加独立的公开部署信息：`deployment_provider` 与 `deployment_url`；GitHub/仓库链接继续由 `repo_url` / `git_url` 承载，不混用字段。
- 赛事作品提交表单明确采集作品名称、姓名、专业、GitHub 链接和魔搭社区部署链接；普通用户仍需选择或在一次动作中创建自己拥有的长期项目，管理员可补录未关联历史作品。
- 项目卡片和详情展示赛事、奖项、作者、专业、GitHub 与可用的部署入口；缺少魔搭链接的历史作品显示待补充状态，不伪造数据。
- 保留现有审核、排名、项目下架、身份认领与公开字段白名单；不通过姓名、标题或 GitHub 自动猜测项目归属。

## Capabilities

### New Capabilities

- `hackathon-project-hub`: 定义项目广场作为跨届黑客松项目提交、归档发现、历史未认领作品展示和持续孵化中心的公共信息架构。

### Modified Capabilities

- `project-plaza`: 默认广场增加历史公开赛事作品、赛事筛选与黑客松导向的首屏和详情信息。
- `project-cards`: 长期项目增加公开部署平台与部署链接，并保持仓库链接和部署链接语义分离。
- `competition-outcome-uploads`: 赛事作品提交增加专业和独立部署链接合同，普通参赛者与管理员补录继续遵守不同归属边界。

## Impact

- 数据模型：为 `project_cards` 和 `competition_works` 增加可空 `deployment_provider`、`deployment_url`；迁移幂等且不改写现有 GitHub 字段。
- API：项目和赛事作品创建、更新、列表、详情及公共成果序列化增加部署字段；默认项目列表可投影未关联且已审核公开的历史赛事作品。
- 前端：升级 `ProjectPlaza.jsx`、`EventProjectSubmissionModal.jsx`、`CompetitionOutcomeUploadModal.jsx` 及中英文文案；不修改黑客松沉浸式成果页视觉主结构。
- 数据：本地已有 20 条历史作品继续以 `competition_works` 为真源进入项目广场；不批量创建管理员所有的 `project_cards`，不自动建立 `project_id`。
- 验收：覆盖迁移、API 安全字段、20 条历史作品、提交校验、桌面与移动端项目广场及中英文显示。
- 回滚：新字段均可空；前端可回退到旧展示而不丢失赛事作品。生产迁移前必须备份数据库；本变更不自动触碰生产数据库或用户资产。
