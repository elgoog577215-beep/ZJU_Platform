# text-ai-provider-policy Specification

## Purpose
把主站通用、快速和推理文本角色统一约束到浙大自建 Qwen，并让后台选择、环境配置、最终请求、真实探针和失败处理执行同一政策，防止历史配置或公网提供方在运行时重新成为文本主路或备路。

## Requirements

### Requirement: 主站文本 AI 只使用浙大自建 Qwen

系统 MUST 将 `general`、`fast` 和 `reasoning` 文本角色只发送到私有 Qwen 锚点，且模型 ID MUST 精确为 `qwen3.8-27b`。

#### Scenario: 合规文本配置参与调用

- **WHEN** 文本配置的规范化 base URL 等于 `ZJU_QWEN_BASE_URL` 且模型为 `qwen3.8-27b`
- **THEN** 系统 MUST 允许该配置参与文本调用
- **AND** Qwen3 请求 MUST 关闭隐藏 thinking

#### Scenario: 缺少私有锚点

- **WHEN** `ZJU_QWEN_BASE_URL` 与过渡兼容的 `LLM_BASE_URL` 都未配置
- **THEN** 系统 MUST 将文本 AI 视为未配置
- **AND** 系统 MUST NOT 使用任何默认公网端点

### Requirement: 错误或外部配置必须在网络请求前失败

后台写入、配置测试、运行时选路和最终调用 MUST 共用同一提供方政策，不得静默修正或切换到外部文本提供方。

#### Scenario: 后台写入错误文本模型

- **WHEN** 管理员创建或更新文本配置为其他模型或其他端点
- **THEN** API MUST 返回稳定的配置政策错误
- **AND** 数据库 MUST NOT 保存该错误变更

#### Scenario: 历史数据库存在漂移配置

- **WHEN** 已启用的历史文本配置不符合私有端点或模型政策
- **THEN** 运行时 MUST 排除该配置
- **AND** 系统 MUST NOT 向该端点发起请求

### Requirement: 魔搭与 DeepSeek 不得承载主站 AI 配置

所有模型角色 MUST 拒绝魔搭与 DeepSeek 主机；赛事作品与伙伴展示数据不属于模型调用配置。

#### Scenario: embedding 配置指向被禁止外部主机

- **WHEN** `embedding` 角色配置指向魔搭或 DeepSeek
- **THEN** 后台写入、配置测试和运行时选择 MUST 拒绝该配置
- **AND** embedding MUST NOT 自动借用 general 文本配置

### Requirement: 生产验收必须证明真实用户路径使用指定模型

发布验收 MUST 使用一条公开且有代表性的主站 AI 请求，不能用配置列表、构建成功或健康接口代替真实模型证据。

#### Scenario: 活动助手生产验收

- **WHEN** 新版本部署完成
- **THEN** 活动助手真实响应 MUST 报告模型已使用
- **AND** 模型 MUST 为 `qwen3.8-27b`
- **AND** 外部或本地业务降级 MUST NOT 被标记为已使用模型
