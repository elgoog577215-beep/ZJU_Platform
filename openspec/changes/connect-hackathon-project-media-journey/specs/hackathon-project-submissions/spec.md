## ADDED Requirements

### Requirement: Project and competition work have an explicit relationship

系统 SHALL 使用 `competition_works.project_id` 显式连接长期项目与一次赛事作品快照，不得通过标题、作者、标签或 Git URL 推断正式关系。

#### Scenario: Owner submits an existing project

- **WHEN** 已登录用户选择自己拥有的项目提交到赛事 A
- **THEN** 系统 MUST 创建一条属于赛事 A 的 `competition_works` 记录
- **AND** 该记录 MUST 保存所选项目的 `project_id`
- **AND** 作品标题、简介、作者、封面与 Git 链接 MUST 作为本次参赛快照保存

#### Scenario: Same project enters another event

- **WHEN** 同一项目随后提交到赛事 B
- **THEN** 系统 MUST 创建独立的赛事 B 作品记录
- **AND** 赛事 A 的审核、名次、奖项和故事字段 MUST 保持不变

#### Scenario: Historical work has no project link

- **WHEN** 历史 `competition_works` 记录的 `project_id` 为空
- **THEN** 系统 MUST 继续展示其公开赛事快照
- **AND** 系统 MUST NOT 自动猜测或写入项目关系

### Requirement: Public submission requires an owned project

普通用户提交赛事作品 SHALL 显式选择自己拥有且未下架的项目；管理员历史补录 MAY 保持未关联。

#### Scenario: Non-owner attempts submission

- **WHEN** 用户提交不属于自己的 `project_id`
- **THEN** 系统 MUST 拒绝请求
- **AND** 不得创建赛事作品或修改项目

#### Scenario: Removed project is submitted

- **WHEN** 用户提交状态为 `removed` 的项目
- **THEN** 系统 MUST 拒绝请求并提示先恢复或选择其他项目

#### Scenario: Duplicate project submission

- **WHEN** 同一项目已经提交到同一赛事
- **THEN** 系统 MUST 拒绝重复提交
- **AND** 返回现有作品标识或明确的重复提示

### Requirement: Submission flow supports select or create

赛事作品提交界面 SHALL 允许用户选择已有项目，或进入带当前赛事上下文的项目广场创建项目后继续提交。

#### Scenario: Select existing project from hackathon

- **WHEN** 用户从某场黑客松点击“提交项目”
- **THEN** 作品表单 MUST 展示用户拥有的可用项目
- **AND** 选择后 MUST 预填项目公开标题、简介、Git 链接和封面等可复用事实
- **AND** 用户 MUST 能确认或修改本次赛事快照后提交

#### Scenario: Create project before submission

- **WHEN** 用户没有合适项目并选择创建
- **THEN** 系统 MUST 打开带当前 `competition` 上下文的项目广场创建流程
- **AND** 项目发布成功后 MUST 回到同一赛事投稿流程并预选新项目

### Requirement: Public cross-surface traceability

系统 SHALL 让已审核赛事作品、已发布项目和赛事影像档案相互可追溯，同时只返回公开字段。

#### Scenario: Open linked work from event showcase

- **WHEN** 访问者查看已关联且项目仍为 `published` 的公开赛事作品
- **THEN** 页面 MUST 提供打开 `/projects?id={projectId}` 的行动
- **AND** 公共响应 MUST NOT 暴露项目联系方式、审核备注或身份 claim 内部字段

#### Scenario: Open event history from project

- **WHEN** 访问者打开参加过赛事的项目详情
- **THEN** 页面 MUST 展示已审核赛事摘要
- **AND** 每条摘要 MUST 能进入对应赛事成果和现场影像上下文

#### Scenario: Linked project is no longer public

- **WHEN** 赛事作品关联的项目被下架或不再公开
- **THEN** 赛事作品快照 MUST 继续按其审核状态展示
- **AND** 公共响应 MUST 隐藏项目深链

### Requirement: New project submission is a single participant action

赛事项目广场 SHALL 允许参赛者用一张封面、名称、简介、作者和一个公开项目链接完成新作品提交，同时仍分别保存长期项目与单届赛事快照。

#### Scenario: Participant submits a new project

- **WHEN** 已登录用户在赛事项目广场选择直接提交新作品
- **THEN** 前端 MUST 先通过正式项目创建能力创建 `project_cards`
- **AND** MUST 立即使用返回的 `project_id` 创建当前赛事作品快照
- **AND** 用户 MUST NOT 被要求先完成通用项目广场的进度、招募、技术标签或联系方式字段

#### Scenario: Project creation succeeds but competition submission fails

- **WHEN** 长期项目已创建但赛事作品写入失败
- **THEN** 系统 MUST 保留已创建项目
- **AND** 错误反馈 MUST 告知用户可选择该项目重试本场提交
- **AND** MUST NOT 静默创建重复项目

### Requirement: Ranking metadata is operator-owned

名次、奖项和评选后扩展信息 SHALL 由赛事运营者维护在 `competition_works`，不作为普通参赛提交的必填内容，也不得覆盖长期项目事实。

#### Scenario: Operator publishes ranking metadata

- **WHEN** 运营者为已审核作品补充有效数字名次或奖项
- **THEN** 赛事项目广场 MUST 展示该公开值
- **AND** 默认赛事排序 MUST 将有效数字名次按升序放在未排名作品之前
- **AND** 项目自身的标题、简介和长期状态 MUST NOT 因此被改写
