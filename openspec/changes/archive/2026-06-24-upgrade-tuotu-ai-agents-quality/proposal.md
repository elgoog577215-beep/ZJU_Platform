## Why

Tuotu 目前已经有活动推荐、黑客松教练、微信解析、后台治理、模型运行时和活动画像索引等多个 AI 助手，但它们的质量提升仍主要靠逐个功能补强。下一步需要把这些助手作为一组协同 Agent 管理：每个 Agent 都要有可维护的提示词模板、逻辑链路、标准库依赖、上下文索引、关联 Agent、评测与观测闭环。

这次变更的目标不是重写所有 AI 功能，而是在现有 Agentic AI Operating System 之上补上“质量画像、协同关系、优先级计划和自动检查”，让后续优化可以按同一套目标-任务-完成度-继续优化循环推进。

## What Changes

- 为每个生产 AI Agent 增加质量画像，包括提示词成熟度、链路成熟度、标准库依赖、上下文索引、记忆反馈、评测覆盖、观测状态和成本安全状态。
- 为 Agent 注册表增加协同关系声明，说明哪些 Agent 依赖同一标准库、同一索引、同一运行时或同一反馈数据。
- 生成更完整的 AI Agent 质量 spec，让后台和文档能同时展示“当前做到了什么”和“下一轮应该优化什么”。
- 增加可执行的质量检查，防止新增或修改 Agent 时遗漏提示词版本、输出契约、评测、观测或关联关系。
- 增加跨 Agent 优化计划，让系统能从所有部分成熟项中自动挑选下一轮最值得做的任务。
- 不改变现有用户侧和管理员侧 API 的请求形状，不迁移数据库，不触碰密钥、上传文件或已有活动数据。

## Capabilities

### New Capabilities

- `tuotu-ai-agent-quality-loop`: 描述 Tuotu 多 Agent AI 助手体系的质量画像、协同关系、自动更新文档、可执行检查和持续优化闭环。

### Modified Capabilities

- None.

## Impact

- Backend:
  - `server/src/services/aiAgentRegistryService.js`
  - 可能新增 Agent 质量辅助服务或检查脚本
  - AI 相关 npm scripts
- Docs/OpenSpec:
  - `openspec/changes/upgrade-tuotu-ai-agents-quality/**`
  - `docs/ai-agent-operating-system.generated.md`
- Admin overview:
  - 通过已有 `/api/admin/ai-assistant/overview` 暴露更完整的 Agent 质量与协同摘要
- Validation:
  - Agent registry check
  - AI golden/stress checks
  - OpenSpec validation
  - lint/build
- Rollback:
  - 本变更是 additive。若出现问题，可回退新增的质量字段、检查脚本和生成文档，不需要回滚数据库。
