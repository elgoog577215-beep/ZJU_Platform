## Context

Tuotu 当前已经有三个基础：

- `ai_assistant_runs.summary_json` 会记录各 Agent 的运行摘要。
- `unifiedAiRuntimeService.summarizeModelStatusTelemetry()` 能汇总单次模型调用的 duration、token 估计、retry 等信息。
- `unifiedAiAssistantService.getAssistantOverview()` 已经把全局 runtime telemetry 汇总到后台 health。

不足是这些数据仍偏全局聚合，不能回答运营上最关键的问题：哪个 Agent 慢、哪个 Agent 经常 fallback、哪个模型配置不健康、下一轮优化优先处理谁。

## Goals / Non-Goals

**Goals:**

- 按 Agent 聚合最近运行健康：run count、model-used rate、fallback rate、success/error count、平均耗时、最近异常。
- 增加模型配置健康摘要：enabled/healthy/error 状态、最近错误、建议动作。
- 给出轻量 circuit breaker 建议，但不自动禁用或修改配置。
- 把运行健康接入 Agent overview，使 registry 质量画像能结合真实运行信号。
- 保持 API endpoint 和请求形状不变，只在响应中增加字段。

**Non-Goals:**

- 不新增数据库表。
- 不自动熔断、禁用、重排模型配置。
- 不接入外部 APM 或日志平台。
- 不暴露 API key、原始用户 query 或隐藏 chain-of-thought。
- 不修改用户侧 AI 推荐、解析、教练的业务输出协议。

## Decisions

### Decision 1: 从 `ai_assistant_runs` 派生 Agent 健康

所有主要 Agent 已经写入 `ai_assistant_runs`。本轮直接扫描最近 80 到 120 条 run summary，按 module 聚合健康指标，不引入新表。

Alternative considered: 新增 `ai_agent_runtime_metrics` 表。该方案适合长期趋势，但本轮会带来迁移和数据一致性成本，超出“快速可用观测”的目标。

### Decision 2: Circuit breaker 只做建议，不做自动操作

后台返回 `healthy`、`watch`、`degraded`、`blocked` 建议状态。判断依据来自模型配置状态、fallback rate、error count 和 retry count。系统不自动禁用模型 Key。

Alternative considered: 自动禁用失败模型。风险太高，可能因为短时网络波动导致所有 AI 助手不可用。

### Decision 3: Agent status 保持兼容，新增 runtimeHealth

已有模块有 `status`、`metrics`、`maturityScore` 等字段。为避免前端破坏，保留原字段，只新增：

- `agentSystem.runtimeHealth`
- `agentSystem.modelHealth`
- `module.runtimeHealth`
- `health.runtimeHealthSummary`

Alternative considered: 重构现有 status 逻辑。现有后台已经依赖 status 展示，重构风险大。

### Decision 4: 检查脚本验证结构和关键推导

因为这轮主要是观测能力，验证重点不是 UI，而是：

- overview 是否暴露 per-Agent runtime health。
- fallback/error/retry 是否能影响建议状态。
- 生成文档是否包含 runtime health 维度。
- stress/golden 是否仍通过。

## Risks / Trade-offs

- [Risk] 最近运行样本少时，健康状态可能不稳定。  
  Mitigation: 返回 `sampleSize` 和 `NO_DATA` 状态，避免过度判断。

- [Risk] summary_json 结构来自不同 Agent，字段不完全一致。  
  Mitigation: 只读取通用字段：`modelUsed`、`fallbackUsed`、`runtimeTelemetry`、`modelReview.runtimeTelemetry`、`status`、`warnings`。

- [Risk] circuit breaker 建议被误认为自动执行。  
  Mitigation: 字段命名使用 `recommendation`/`suggestedAction`，文档明确“不自动禁用”。

- [Risk] 当前工作区有大量无关改动。  
  Mitigation: 本轮只修改 OpenSpec、AI 服务、检查脚本和生成文档。

## Migration Plan

1. 新增 OpenSpec capability `ai-agent-runtime-observability`。
2. 扩展 `unifiedAiAssistantService`，生成 per-Agent runtime health 和 model health。
3. 扩展 `aiAgentRegistryService`，把 runtime health 接入 overview modules 和 generated spec。
4. 更新 registry/runtime 检查脚本。
5. 运行 `check:ai-agents`、`eval:ai-golden`、`stress:ai`、`openspec validate --all`、`lint`、`build`。

Rollback：回退新增摘要逻辑和文档即可，无数据库回滚。
