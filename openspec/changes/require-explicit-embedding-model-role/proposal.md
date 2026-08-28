## Why

生产活动助手把 `general` 聊天模型同时用于 `/chat/completions` 和 `/embeddings`。当 OpenAI 兼容端点只提供对话生成时，聊天任务已经成功，随后发生的 embedding 404 仍会把同一模型配置标记为失败，并让推荐路径产生无意义的远程请求与降级状态。

## What Changes

- embedding 调用只选择明确标记为 `embedding` 的数据库模型配置，不再回退到 `general` 配置或环境变量聊天模型。
- 没有显式 embedding 配置时快速返回“未配置”失败，让现有本地语义向量降级路径继续工作，不向聊天端点发送 `/embeddings` 请求。
- 按生产实测延迟调整活动推荐的单任务和整轮时间预算，让自建 27B 模型可以完成意图理解与重排，同时保留有上限的本地降级。
- Qwen3 结构化 JSON 请求默认关闭内部 thinking，避免把大部分 token 与时间消耗在不可见推理上；其他模型不接收该厂商扩展字段。
- 活动意图与重排改为流式优先，让长结构化输出持续接收 token，并以 25 秒整轮截止线限制最长等待。
- 增加模型角色筛选和真实调用边界的后端回归测试，保证聊天任务继续使用 `general`、`fast`、`reasoning` 及环境变量兜底。
- 不修改管理端 API、`ai_model_configs` 表结构、推荐算法、页面交互或现有本地语义向量实现。

## Capabilities

### New Capabilities

- `ai-model-role-routing`: 规定聊天与 embedding 模型按显式角色选择，避免不支持的能力污染模型健康状态。

### Modified Capabilities

无。

## Impact

- 后端：`server/src/services/aiModelConfigService.js` 的模型筛选、Qwen3 请求参数与 embedding failover 路径，以及 `unifiedAiRuntimeService.js`、`eventAssistant.js` 的活动推荐时间预算。
- 测试：新增或扩展 `server/tests` 中的模型角色与调用边界测试。
- API 与数据：无接口或数据库结构变化；现有 `role` 字段继续作为能力真源。
- 生产：没有显式 embedding 配置时继续使用既有本地语义向量降级；聊天模型健康状态不再被 `/embeddings` 404 覆盖。
- 回滚：恢复原有 embedding 配置选择逻辑即可；生产环境变量和数据库配置无需迁移或回写。
