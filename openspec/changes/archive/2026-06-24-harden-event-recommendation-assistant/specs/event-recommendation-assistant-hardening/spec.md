## ADDED Requirements

### Requirement: 推荐助手必须保持受控服务边界
活动推荐助手 SHALL 将意图理解、候选召回、确定性排序、用户画像、解释生成、反馈证据、运行遥测和响应组装拆分为清晰服务边界，同时保持 `/api/events/assistant` 的公开入口兼容。

#### Scenario: 公开入口保持兼容
- **WHEN** 前端调用 `POST /api/events/assistant`
- **THEN** 系统 SHALL 继续返回 `recommend`、`clarify` 或 `empty` 类型响应
- **AND** 响应 SHALL 保持现有推荐卡片所需的活动字段

#### Scenario: 推荐门面调用服务层
- **WHEN** 后端执行一次活动推荐
- **THEN** 推荐门面 SHALL 调用独立服务完成意图、召回、排序、解释和遥测职责
- **AND** 单个模块 MUST NOT 同时长期承担所有推荐职责

### Requirement: 确定性排序必须成为推荐质量底座
系统 SHALL 在模型解释或模型重排之前，使用本地可测试评分对候选活动进行排序，并显式计算生命周期、硬约束、主题分类、用户画像、行为信号、负反馈、热度新鲜度和历史活动惩罚。

#### Scenario: 显式硬约束优先
- **GIVEN** 候选活动中存在满足用户显式时间、校区、组织、对象或收益条件的活动
- **WHEN** 用户提出包含这些显式条件的推荐请求
- **THEN** 满足更多显式条件的活动 SHALL 获得更高排序优先级
- **AND** 排序依据 SHALL 记录对应硬约束匹配信号

#### Scenario: 历史活动降级
- **GIVEN** 活动库中同时存在未来活动和历史活动
- **WHEN** 未来活动能够满足用户主要需求
- **THEN** 历史活动 SHALL 不排在未来活动之前
- **AND** 历史活动只有在 fallback 场景中才能作为历史线索展示

#### Scenario: 负反馈影响后续排序
- **GIVEN** 用户对某类推荐给出负反馈
- **WHEN** 后续候选活动包含相同弱匹配信号
- **THEN** 系统 SHALL 降低类似弱匹配活动的排序权重
- **AND** 当前查询中的显式需求 SHALL 高于历史负反馈

### Requirement: 模型必须被限制在受控候选池内
系统 SHALL 只允许模型在后端提供的候选活动池内进行语义重排和解释，MUST NOT 让模型推荐候选池外活动或覆盖后端硬约束保护。

#### Scenario: 模型返回候选池外活动 ID
- **GIVEN** 模型重排结果包含候选池外活动 ID
- **WHEN** 后端校验模型输出
- **THEN** 系统 SHALL 丢弃非法 ID
- **AND** 非法 ID MUST NOT 出现在最终推荐结果中

#### Scenario: 模型输出不可用时降级
- **GIVEN** 模型返回空内容、非法 JSON、非法活动 ID 或超时
- **WHEN** 后端无法得到可信模型重排结果
- **THEN** 系统 SHALL 返回本地排序 fallback 推荐或明确 empty 状态
- **AND** 响应 SHALL 设置 `modelStatus.fallbackUsed`
- **AND** 响应 SHALL 包含用户可读 warning

### Requirement: 用户画像必须区分信号来源
系统 SHALL 将用户画像区分为显式偏好、行为信号、对话记忆和负反馈信号，并在排序和解释中保留信号来源。

#### Scenario: 显式偏好影响推荐
- **GIVEN** 登录用户保存了学院、校区、兴趣标签、活动类型或收益偏好
- **WHEN** 用户请求活动推荐
- **THEN** 系统 SHALL 在排序中使用这些显式偏好
- **AND** 响应 SHALL 在画像解释中体现已使用的偏好信号

#### Scenario: 行为信号只作为弱偏好
- **GIVEN** 用户有收藏、报名、浏览或打开详情行为
- **WHEN** 系统构建用户画像
- **THEN** 系统 SHALL 将行为信号汇总为摘要权重
- **AND** 系统 MUST NOT 将完整原始行为列表发送给模型

#### Scenario: 对话记忆必须显式触发
- **WHEN** 用户没有明确要求助手记住某个偏好
- **THEN** 系统 MUST NOT 将本轮自然语言请求写入长期对话记忆

### Requirement: 推荐解释必须可读且可校验
活动推荐响应 SHALL 提供用户可读的总结、每个推荐项的理由、匹配信号、排序依据、不确定项和必要风险提示。

#### Scenario: 推荐响应包含解释结构
- **WHEN** 系统返回 `recommend` 响应
- **THEN** 响应 SHALL 包含 `summary`
- **AND** 每个推荐项 SHALL 包含 `reason`
- **AND** 每个推荐项 SHALL 包含 `matchSignals`
- **AND** 响应 SHALL 包含 `reasoningTrace.rankingBasis`
- **AND** 响应 SHALL 包含 `reasoningTrace.uncertainty`

#### Scenario: 前端展示核心解释
- **WHEN** 前端收到带解释结构的推荐响应
- **THEN** 前端 SHALL 展示助手理解到的需求
- **AND** 前端 SHALL 展示推荐排序依据
- **AND** 前端 SHALL 展示不确定项或风险提示

### Requirement: 前端交互必须支持纠错闭环
活动推荐助手前端 SHALL 支持用户对推荐结果进行纠错反馈，并让用户在不离开助手的情况下补充偏好、重新提问或打开活动详情。

#### Scenario: 用户提交负反馈原因
- **WHEN** 用户认为某条推荐不合适
- **THEN** 前端 SHALL 允许用户提交负反馈
- **AND** 前端 SHOULD 提供有限原因选项
- **AND** 后端 SHALL 记录反馈所属活动、用户、查询和原因

#### Scenario: 移动端保持完整主流程
- **WHEN** 用户在移动端打开活动推荐助手
- **THEN** 用户 SHALL 能输入需求、查看理解结果、查看推荐、打开详情并提交反馈

### Requirement: 推荐助手必须具备自动化质量评测
系统 SHALL 提供自动化评测覆盖意图理解、候选召回、确定性排序、模型非法输出、fallback、用户画像影响、反馈学习和前端渲染主流程。

#### Scenario: golden eval 验证排序质量
- **WHEN** 运行活动推荐 golden eval
- **THEN** 评测 SHALL 覆盖固定校园活动查询集
- **AND** 评测 SHALL 断言前排结果满足查询中的显式硬约束
- **AND** 评测 SHALL 输出失败原因和受影响信号

#### Scenario: fallback eval 验证模型失败
- **WHEN** 评测模拟模型超时、非法 JSON 或候选池外 ID
- **THEN** 评测 SHALL 断言最终响应不会包含非法活动
- **AND** 评测 SHALL 断言 `modelStatus.fallbackUsed` 或 empty 状态可被前端安全处理

#### Scenario: UI smoke 验证助手主流程
- **WHEN** 运行活动助手 UI smoke test
- **THEN** 测试 SHALL 覆盖桌面端助手入口、移动端全屏入口、推荐卡片、活动详情打开、反馈按钮和 empty/fallback 状态
