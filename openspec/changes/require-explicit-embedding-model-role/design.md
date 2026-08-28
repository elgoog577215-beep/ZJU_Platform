## Context

`ai_model_configs.role` 已区分 `general`、`fast`、`reasoning` 和 `embedding`。当前 `getEnabledConfigs` 对所有非 `general` 角色都会追加 `general` 配置，并始终追加环境变量兜底；因此 `callEmbeddingWithFailover` 会把聊天模型发送到 `/embeddings`。活动推荐已经有本地语义向量降级，但远程 404 会覆盖同一模型配置的健康状态。

本次只修正后端模型路由。前端、管理端接口、数据库字段和本地语义算法均保持不变。

## Goals / Non-Goals

**Goals:**

- 只有 `role=embedding` 的数据库配置可以收到 `/embeddings` 请求。
- 没有 embedding 配置时立即返回可识别的未配置错误，不产生网络请求。
- 保持聊天任务的现有角色回退：`fast`、`reasoning` 可以回退到 `general`，聊天环境变量仍作为最后兜底。
- 让聊天模型健康状态只反映它负责的对话请求。

**Non-Goals:**

- 不为当前千问端点增加其未提供的 embedding 能力。
- 不新增 embedding 环境变量、数据库迁移或管理端表单。
- 不改变活动推荐的本地向量构建、候选召回和排序逻辑。
- 不修改模型失败后的页面文案或交互。

## Decisions

1. `getEnabledConfigs` 在请求 `embedding` 角色时只返回显式的 embedding 配置，不追加 `general` 配置和环境变量配置。其他聊天角色保持原有选择顺序。相比在 `callEmbeddingWithFailover` 末端过滤，这一做法让角色筛选真源集中在同一个函数，测试和其他调用者得到一致结果。

2. `callEmbeddingWithFailover` 在配置列表为空时抛出 `AI_EMBEDDING_NOT_CONFIGURED`，`attempts=[]`，且不调用 provider。相比返回空向量，这能保留失败事实，由已经存在的上层本地语义降级决定怎样恢复。

3. 不给环境变量聊天配置推断 embedding 能力。当前环境变量只有一组 `LLM_*`，没有明确的能力角色；把“接口兼容 OpenAI”推断成“支持 embeddings”会重复本次问题。

4. 回归测试直接覆盖模型选择结果和无配置错误，不依赖外部 provider。生产验收再通过真实千问请求与网站活动助手路径证明集成有效。

## Risks / Trade-offs

- [已有部署曾依赖 `general` 模型兼做 embedding] → 必须把该配置显式改为或新增为 `embedding` 角色；角色字段已经存在，无需迁移。
- [没有 embedding 配置时仍会进入上层降级] → 保留现有本地语义向量路径，并通过活动助手真实请求确认能完成推荐。
- [单一配置不能同时声明聊天与 embedding 两种能力] → 当前数据模型每条配置只有一个角色；如未来 provider 同时承担两种能力，应建立两条显式配置，而不是隐式复用。

## Migration Plan

1. 部署代码并保持现有聊天模型配置不变。
2. 运行模型角色单测和统一 AI runtime 相关测试。
3. 在生产调用活动助手，确认聊天模型状态保持 `ok`，且不再出现 `/embeddings` 404。
4. 如出现未预期回归，回滚本次代码提交；环境变量和 `ai_model_configs` 不需要迁移或回写。

## Open Questions

无。未来是否接入专用 embedding provider 作为独立变更处理。
