# event-recommendation-agent Specification

## Purpose
TBD - created by archiving change upgrade-event-recommendation-agent. Update Purpose after archive.
## Requirements
### Requirement: 活动推荐必须经过 AI 协同主链路
系统 SHALL 在活动推荐生产路径中使用统一 AI runtime 完成意图理解和候选重排，并在模型状态中暴露参与任务。

#### Scenario: 正常推荐经过意图理解和重排
- **GIVEN** 活动库中存在未来或进行中的候选活动
- **WHEN** 用户请求推荐活动
- **THEN** 响应 SHALL 包含推荐结果
- **AND** `modelStatus.tasks` SHALL 包含 `event_recommendation_intent`
- **AND** `modelStatus.tasks` SHALL 包含 `event_recommendation_rerank`
- **AND** 推荐理由 SHALL 基于候选活动事实和用户需求

#### Scenario: 模型失败时可降级
- **GIVEN** 模型返回空内容、非法 JSON 或非法候选 ID
- **WHEN** 用户请求推荐活动
- **THEN** 系统 SHALL 返回 fallback 推荐或明确的 empty 状态
- **AND** `modelStatus.fallbackUsed` SHALL 为 true
- **AND** 响应 SHALL 包含用户可读 warning

### Requirement: 推荐排序必须尊重显式硬约束
系统 SHALL 把用户显式提出的日期、组织/学院、校区、对象、收益和参与形式作为硬约束信号，优先推荐满足更多硬约束的活动。

#### Scenario: 指定学院或组织优先
- **GIVEN** 候选活动中存在一个来自用户指定组织的活动和一个泛主题更热但组织不匹配的活动
- **WHEN** 用户明确指定组织或学院
- **THEN** 指定组织匹配的活动 SHALL 优先排序
- **AND** 推荐匹配信号 SHALL 说明组织或学院匹配

#### Scenario: 指定日期和校区优先
- **GIVEN** 候选活动中存在不同日期和校区的活动
- **WHEN** 用户明确说出日期和校区
- **THEN** 推荐排序 SHALL 优先满足日期和校区
- **AND** 不满足显式日期或校区的活动 SHALL 降低优先级

#### Scenario: 指定收益优先
- **GIVEN** 候选活动中只有部分活动包含综测或志愿时长信息
- **WHEN** 用户要求获得综测或志愿时长
- **THEN** 包含对应收益信息的活动 SHALL 优先排序
- **AND** 推荐匹配信号 SHALL 说明该收益来源

### Requirement: 活动推荐必须提供可解释输出
系统 SHALL 返回用户可读的排序依据、不确定项、匹配信号和信心值，帮助用户判断推荐是否可信。

#### Scenario: 推荐结果包含解释信息
- **WHEN** 系统返回推荐结果
- **THEN** 每个推荐项 SHALL 包含 `reason`
- **AND** 每个推荐项 SHOULD 包含 `matchSignals`
- **AND** 推荐响应 SHALL 包含 `reasoningTrace.rankingBasis`
- **AND** 推荐响应 SHALL 包含 `reasoningTrace.uncertainty`

#### Scenario: 前端展示排序依据
- **WHEN** 前端收到带有 `reasoningTrace` 的推荐响应
- **THEN** 前端 SHALL 展示排序依据
- **AND** 前端 SHOULD 展示不确定项

### Requirement: 活动推荐必须可评测
系统 SHALL 提供自动化评测，覆盖 AI 协同、硬约束排序、澄清、非法输出防护和 fallback。

#### Scenario: 定向评测验证 AI 协同
- **WHEN** 运行活动推荐评测脚本
- **THEN** 评测 SHALL 断言模型意图任务被调用
- **AND** 评测 SHALL 断言模型重排任务被调用
- **AND** 评测 SHALL 断言推荐第一名满足显式硬约束

#### Scenario: 压力评测验证失败兜底
- **WHEN** 模拟模型返回非法 ID 或非法 JSON
- **THEN** 评测 SHALL 断言非法 ID 不会进入推荐结果
- **AND** 评测 SHALL 断言 fallback 或 empty 状态可被前端安全处理

