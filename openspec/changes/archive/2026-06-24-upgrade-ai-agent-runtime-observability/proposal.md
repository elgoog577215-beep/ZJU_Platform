## Why

Tuotu AI Agent 体系已经能声明质量画像和协同关系，但后台还缺少足够清晰的真实运行质量视图。下一步需要把 `ai_assistant_runs` 和 runtime telemetry 汇总成每个 Agent 的健康状态，让优化从“看文档判断”升级为“看真实延迟、失败、兜底和模型健康判断”。

这次变更优先解决可用性和运营判断问题：管理员应能知道哪个 Agent 慢、哪个 Agent fallback 多、哪个模型配置连续失败，以及下一轮优化应优先处理什么。

## What Changes

- 增加 Agent runtime health 摘要：按 Agent 聚合最近运行次数、模型使用率、fallback 率、平均耗时、失败/警告信号和最近异常。
- 增加模型健康摘要：基于已有模型配置状态和 runtime telemetry 推导 provider/config 层面的健康、风险和建议。
- 增加轻量 circuit breaker 建议：本轮不自动禁用模型 Key，只在后台 overview 中给出 `healthy`、`watch`、`degraded`、`blocked` 等建议状态。
- 将 runtime health 接入 AI Agent registry overview，让每个 Agent 的 status 和 next improvement 能结合真实运行信号。
- 更新生成文档和检查脚本，确保后续 Agent 必须暴露运行观测维度。
- 不改变现有 AI API 请求形状，不新增数据库表，不自动修改模型配置或密钥。

## Capabilities

### New Capabilities

- `ai-agent-runtime-observability`: 描述 AI Agent 运行健康、模型健康、fallback/失败观测、熔断建议和后台 overview 输出要求。

### Modified Capabilities

- None.

## Impact

- Backend:
  - `server/src/services/unifiedAiAssistantService.js`
  - `server/src/services/aiAgentRegistryService.js`
  - `server/src/services/unifiedAiRuntimeService.js` 如需补充轻量摘要 helper
  - AI 检查脚本和 golden/stress 断言
- Docs/OpenSpec:
  - `openspec/changes/upgrade-ai-agent-runtime-observability/**`
  - `docs/ai-agent-operating-system.generated.md`
- Admin overview:
  - 通过已有 `/api/admin/ai-assistant/overview` 返回新增运行健康结构
- Data model:
  - 复用已有 `ai_assistant_runs`、`ai_model_configs`、运行 summary JSON
  - 不新增迁移，不自动写入模型配置状态
- Rollback:
  - 本变更是 additive。若出现问题，回退新增 health summary、检查和生成文档即可。
