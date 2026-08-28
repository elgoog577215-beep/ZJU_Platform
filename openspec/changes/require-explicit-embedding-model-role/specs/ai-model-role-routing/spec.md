## ADDED Requirements

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
