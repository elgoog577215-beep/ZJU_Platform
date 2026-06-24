# event-opportunity-matching-system Specification

## Purpose
TBD - created by archiving change evolve-event-recommendation-opportunity-system. Update Purpose after archive.
## Requirements
### Requirement: 活动推荐助手必须有机会匹配目标契约
系统 SHALL 将活动推荐助手定位为校园机会匹配系统的第一阶段，并在产品与工程输出中围绕推荐可信、解释可判断、反馈能改变结果、从推荐到决策、成为平台智能入口五个阶段推进。

#### Scenario: 响应包含目标阶段
- **WHEN** 活动推荐助手返回推荐结果
- **THEN** 响应 SHALL 暴露当前机会匹配阶段或等价摘要
- **AND** 该阶段 SHALL 能被运行摘要记录

### Requirement: 推荐结果必须提供机会匹配结构
系统 SHALL 为每条推荐提供结构化机会匹配信息，至少包含匹配项、缺失项、不确定项、决策提示和反馈学习状态。

#### Scenario: 用户请求明确活动推荐
- **WHEN** 用户提出带有主题、校区、收益或时间条件的活动推荐请求
- **THEN** 每条推荐 SHALL 包含 `opportunityMatch.matched`
- **AND** 每条推荐 SHALL 包含 `opportunityMatch.missing`
- **AND** 每条推荐 SHALL 包含 `opportunityMatch.uncertainty`
- **AND** 每条推荐 SHALL 包含 `opportunityMatch.decisionHint`

### Requirement: 负反馈原因必须影响后续排序
系统 SHALL 将用户负反馈原因转化为有限行为信号，并在后续推荐中降低相同活动、相同类别或相同不适配原因的优先级。

#### Scenario: 用户反馈时间不合适
- **WHEN** 用户对某活动提交负反馈，原因包含“时间不合适”
- **THEN** 后续推荐 SHALL 记录该原因信号
- **AND** 同类候选在没有明确硬约束要求时 SHALL 被降低优先级
- **AND** 推荐解释 SHALL 暴露负反馈学习已经参与排序

### Requirement: 推荐必须支持轻量决策解释
系统 SHALL 对推荐列表中的首位活动提供轻量对比解释，说明它为什么优先于其他候选，且解释 MUST 只基于候选活动事实、硬约束分、匹配信号和缺失项。

#### Scenario: 用户收到多个候选活动
- **WHEN** 活动推荐助手返回两个或更多推荐
- **THEN** 首位推荐 SHALL 包含比较其他候选的决策提示
- **AND** 该提示 MUST NOT 编造未提供的时间、地点、报名状态或奖励

### Requirement: 机会匹配运行摘要必须可观测
系统 SHALL 在活动推荐运行摘要中记录机会匹配质量指标，用于后续分析失败查询、fallback 频率、硬约束缺失和反馈学习效果。

#### Scenario: 推荐运行完成
- **WHEN** 活动推荐助手完成一次推荐或澄清响应
- **THEN** `ai_assistant_runs.summary_json` SHALL 记录机会匹配阶段
- **AND** 推荐结果 SHALL 记录硬约束均值、缺失项数量、规则补齐数量和反馈学习是否使用

### Requirement: 活动推荐速度目标必须可观测且可回归检查
系统 SHALL 将活动推荐速度作为机会匹配系统的质量目标，记录端到端耗时和关键阶段耗时，并用自动化脚本防止画像准备链路退化为串行慢路径。

#### Scenario: 推荐运行摘要记录性能拆分
- **WHEN** 活动推荐助手完成一次推荐、澄清或兜底响应
- **THEN** `ai_assistant_runs.summary_json` SHALL 记录 `durationMs`
- **AND** `ai_assistant_runs.summary_json.performance` SHALL 至少记录候选加载、候选池构建和重排阶段耗时

#### Scenario: 活动画像准备速度回归检查
- **WHEN** 运行活动画像准备基准脚本
- **THEN** 系统 SHALL 用固定数量候选和固定模型延迟验证画像准备不会退回串行处理
- **AND** 基准结果 SHOULD 明显低于同等模型延迟下的串行总耗时

### Requirement: 机会匹配目标必须有自动化评测
系统 SHALL 使用自动化评测覆盖中文真实问法、硬约束、负反馈原因、决策解释、运行摘要和模型异常兜底。

#### Scenario: 运行 golden eval
- **WHEN** 运行活动推荐 golden eval
- **THEN** 评测 SHALL 覆盖中文真实问法
- **AND** 评测 SHALL 断言机会匹配结构存在
- **AND** 评测 SHALL 断言负反馈原因会影响排序
- **AND** 评测 SHALL 断言运行摘要包含机会匹配指标

