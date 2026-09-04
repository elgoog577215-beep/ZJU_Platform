# ai-model-role-routing Specification

## Purpose
明确聊天模型与 embedding 模型的角色、配置和回退边界，使通用、快速、推理和向量任务只能选择具备对应能力的已授权模型，避免根据模型名称或聊天可用性误判向量能力并产生不可追溯的隐式路由。

## Requirements

### Requirement: Chat model roles preserve explicit fallback order

系统 SHALL 按 `role` 选择聊天模型配置。`fast` 和 `reasoning` 任务可以回退到已启用的 `general` 配置，环境变量聊天配置可以作为最后兜底；这些聊天回退规则不得推断 embedding 能力。

#### Scenario: Reasoning task falls back to general chat model

- **WHEN** 系统请求 `reasoning` 角色且没有已启用的 `reasoning` 配置
- **THEN** 系统 SHALL 按优先级选择已启用的 `general` 配置
- **AND** 环境变量聊天配置 SHALL 继续作为最后兜底候选

### Requirement: Embedding calls require explicit embedding role

系统 MUST 只把 `/embeddings` 请求发送给已启用且 `role=embedding` 的数据库模型配置，不得使用 `general`、`fast`、`reasoning` 或环境变量聊天配置代替。

#### Scenario: Explicit embedding config is available

- **WHEN** 系统请求 embedding 且存在已启用的 `role=embedding` 配置
- **THEN** 系统 SHALL 只按优先级返回显式 embedding 配置
- **AND** 不得追加任何聊天角色配置

#### Scenario: Only chat configs are available

- **WHEN** 系统请求 embedding 但只有聊天角色或 `LLM_*` 环境变量配置
- **THEN** 系统 MUST 不向 provider 发送 `/embeddings` 请求
- **AND** 系统 SHALL 返回 `AI_EMBEDDING_NOT_CONFIGURED`
- **AND** 上层可以继续使用已经定义的本地语义降级路径

### Requirement: Model health reflects assigned capability

聊天模型配置的健康状态 SHALL 只由分配给聊天角色的请求更新，不得因为系统将其误用于 embedding 而被标记为失败。

#### Scenario: Activity assistant uses local semantic fallback

- **WHEN** 活动助手使用聊天模型完成意图或重排且没有显式 embedding 配置
- **THEN** embedding 未配置 SHALL 由本地语义路径处理
- **AND** 聊天模型配置不得产生 `/embeddings` 404 或因此变为 `failed`

### Requirement: Activity assistant uses bounded provider-aware time budgets

活动推荐 SHALL 为自建聊天模型提供足以完成结构化意图和候选重排的单任务时间预算，并优先使用流式响应持续接收长结构化输出，同时 MUST 通过整轮截止线限制用户等待时间。

#### Scenario: Self-hosted model responds slower than the legacy intent timeout

- **WHEN** 活动意图模型在 1.5 秒之后、8 秒以内返回有效结构化结果
- **THEN** 系统 SHALL 接受该结果而不是提前切换本地意图解析

#### Scenario: Streaming V2 recommendation completes within the bounded round

- **WHEN** 流式意图理解和候选重排在 25 秒整轮上限内完成
- **THEN** 系统 SHALL 返回 v2 模型结果并保留对应 runtime telemetry

#### Scenario: V2 recommendation exceeds the round deadline

- **WHEN** 活动推荐整轮超过 25 秒
- **THEN** 系统 SHALL 停止等待该轮结果并返回现有本地混合召回结果
- **AND** 响应 SHALL 标记 deadline fallback

### Requirement: Qwen3 structured tasks avoid hidden long thinking

系统 SHALL 在 Qwen3 执行结构化 JSON 任务且调用方没有显式指定 thinking 行为时关闭 thinking，以降低用户等待时间和不可见 completion token 消耗；非 Qwen3 模型的请求体 MUST 保持通用 OpenAI 兼容形状。

#### Scenario: Qwen3 model receives a structured runtime request

- **WHEN** 配置模型 ID 明确为 Qwen3 且统一 runtime 发起结构化任务
- **THEN** provider 请求 SHALL 包含 `chat_template_kwargs.enable_thinking=false`
- **AND** 调用方显式提供的 thinking 设置 SHALL 优先

#### Scenario: Non-Qwen3 model receives the same request

- **WHEN** 配置模型 ID 不是 Qwen3
- **THEN** 系统 MUST 不自动添加 `chat_template_kwargs`
