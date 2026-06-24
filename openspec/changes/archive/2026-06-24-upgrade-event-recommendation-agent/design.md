## 总体方案

活动推荐助手采用“索引先行、模型协同、约束校验、可解释输出”的 agent 架构。

链路如下：

1. 本地标准库先做轻量解析，得到初始 category、campus、audience、benefit、format、time preference。
2. 大模型基于标准活动库、用户画像和本地初始解析，输出结构化意图。
3. 后端用结构化意图从未来和进行中活动中召回候选池。
4. 活动 AI profile 为候选活动提供摘要、主题、收益、校区、组织、对象等语义字段。
5. 硬约束评分层计算组织、日期、校区、对象、收益、形式的匹配程度。
6. 大模型只接收收窄后的候选池，负责语义重排、解释理由和不确定性说明。
7. 后端校验模型返回的 event id、数量、confidence、reason 和 matched signals。
8. 前端展示推荐、排序依据、不确定项、模型状态和 fallback warning。

## 关键设计

### 1. 强制 AI 协同

生产路径不再优先走旧的纯规则推荐。`runEventAssistantTurn` 统一转入 `runUnifiedEventAssistantTurn`。

只有两种情况不完整调用模型：

- 外部模型不可用或输出不可靠，此时使用 fallback，并在响应中标记 `fallbackUsed`。
- 单元测试显式注入 `modelRunner`，仍走同一套 AI task 契约，只是模型由测试 runner 模拟。

### 2. 意图解析契约

意图解析模型必须输出：

- `query_summary`
- `topics`
- `categories`
- `campuses`
- `organizers`
- `audiences`
- `benefits`
- `date_constraints`
- `format`
- `hard_constraints`
- `needs_clarification`
- `clarification_question`
- `confidence`

后端继续用本地标准库归一化输出，防止模型生成自造分类。

### 3. 候选池召回和硬约束

候选池不直接让模型扫全量活动，而是先取未来和进行中的活动：

- 本地 `scoreEvent` 做快速召回。
- `event_ai_profiles` 给每个候选补充语义画像。
- `getHardConstraintScore` 计算硬约束匹配。
- 最终只把较小候选池传给模型重排。

这样既快，又能保留 AI 分析能力。

### 4. 模型重排

重排提示词强调：

- 只能推荐候选池中的 event id。
- 显式组织、日期、校区、收益和形式优先于泛兴趣。
- 不能编造报名状态、奖励、链接或地点。
- 必须输出用户可读的 `summary`、`recommendations` 和 `reasoning_trace`。

后端会把硬约束最高的候选强制保护，避免模型把明显满足条件的活动排到后面。

### 5. 评测策略

新增或更新评测脚本，覆盖：

- AI 主题 + 校区 + 综测收益。
- 指定学院/组织优先。
- 日期约束优先。
- 模糊问题触发澄清。
- 模型非法 ID 不进入结果。
- 模型空响应或 JSON 错误时 fallback 可用。
- 运行记录中能看到 AI task 和 telemetry。

## 前端影响

前端只做轻量增强：

- “大模型已参与排序”展示更精确。
- 展示排序依据 `reasoningTrace.rankingBasis`。
- 展示不确定项 `reasoningTrace.uncertainty`。
- 对 fallback warning 保持明显但不阻塞用户使用。

## 回滚策略

如果模型链路不可用，可回滚到 fallback 推荐：

- 保留 `buildFallbackRecommendationResponse`。
- 保留活动画像索引和本地排序。
- `modelStatus.fallbackUsed` 和 warning 会让前端明确显示降级状态。
