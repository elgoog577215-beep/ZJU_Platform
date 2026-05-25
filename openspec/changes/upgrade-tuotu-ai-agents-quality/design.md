## Context

Tuotu 已经有 `agentic-ai-operating-system` 作为第一层 AI Agent 注册表：它能列出 6 个生产 AI Agent，生成文档，给出成熟度和下一步优化建议。当前不足是：这些信息仍偏“清单式”，还没有把每个 Agent 的质量画像、关联 Agent、协同依赖和下一轮优化闭环显式化。

当前约束：

- 真实仓库根目录是 `ZJU_Platform`。
- 当前工作区存在一批无关前端改动，本变更必须避免触碰社区页面和主题相关文件。
- 不迁移数据库，不修改模型密钥，不改变现有 API 请求形状。
- 质量信息的源头应继续是 `server/src/services/aiAgentRegistryService.js`，生成文档只作为派生结果。

## Goals / Non-Goals

**Goals:**

- 让每个 AI Agent 都暴露可维护的质量画像。
- 让 Agent 之间的协同关系显式可查，例如推荐助手依赖画像索引和模型运行时。
- 让后台 overview 和生成文档能展示下一轮优化优先级。
- 让注册表检查脚本能阻止低质量 Agent 混入生产系统。
- 保持当前端点、数据表和用户体验稳定。

**Non-Goals:**

- 不重写活动推荐、黑客松教练或微信解析的业务逻辑。
- 不引入向量数据库、外部队列或新的模型供应商。
- 不自动改写活动数据、用户数据或管理员治理结果。
- 不把隐藏 chain-of-thought 暴露给用户或后台。

## Decisions

### Decision 1: 质量画像从注册表派生，而不是另建配置文件

每个 Agent 已经在注册表里声明提示词、链路、标准库、索引、契约、校验、兜底、评测和观测。质量画像应从这些声明和 maturity 状态派生，避免第二份配置漂移。

Alternative considered: 新增独立 JSON/YAML 质量配置。这个方案看起来清晰，但会让 Agent 基础信息和质量信息分裂，后续维护成本更高。

### Decision 2: 协同关系使用显式 relatedAgents 声明

共享标准库和索引可以被自动推断，但真正的产品协同需要人工声明。例如活动推荐 Agent 与活动画像索引之间是召回依赖，和模型运行时之间是调用依赖，和后台治理之间是标准库/数据质量协同。显式声明能让文档和检查更准确。

Alternative considered: 完全自动从文件路径和 contextIndexes 推断关系。自动推断适合辅助展示，但无法表达“为什么相关”和“下一轮应该一起优化什么”。

### Decision 3: 下一轮计划从 partial maturity gaps 生成

当前高优先级缺口已经清零，所以优化重点应从 `partial` 状态中挑选。排序优先级为：可观测性、安全成本、记忆反馈、自动更新、上下文索引、标准库、提示词。这个顺序符合生产 AI 系统的风险：先看得见，再控风险，再学习和自动化。

Alternative considered: 人工写死下一轮计划。写死计划短期可读，但不能随着注册表更新自动变化。

### Decision 4: 生成文档展示“质量”和“协同”，后台 API 暴露结构化数据

`docs/ai-agent-operating-system.generated.md` 面向人读，适合展示 Agent 质量和协同关系。`/api/admin/ai-assistant/overview` 继续通过服务层返回结构化对象，前端后续可以直接消费，不需要解析 Markdown。

Alternative considered: 只改文档不改 API。这样不能服务后台和自动化检查。

## Risks / Trade-offs

- [Risk] 注册表字段增加后，未来新增 Agent 需要填写更多信息。  
  Mitigation: 检查脚本给出明确失败原因，字段都围绕真实质量门槛，不加入装饰性字段。

- [Risk] 协同关系如果长期不更新会误导后台判断。  
  Mitigation: 注册表检查校验 relatedAgents 的 ID 有效性，并在生成文档中直接暴露关系，便于 review。

- [Risk] 质量画像只是声明，不能自动证明真实效果。  
  Mitigation: 每个 Agent 仍必须声明 evaluation checks；本变更会把质量画像和检查脚本绑定。

- [Risk] 当前工作区已有无关改动，容易误纳入本轮提交。  
  Mitigation: 本轮只修改 OpenSpec、Agent 注册表、检查脚本和生成文档，不 stage 无关文件。

## Migration Plan

1. 新增 OpenSpec capability `tuotu-ai-agent-quality-loop`。
2. 扩展 Agent 注册表，增加质量画像、协同关系图和质量 backlog。
3. 更新注册表检查脚本，校验质量画像和关联 Agent。
4. 重新生成 AI Agent Operating System 文档。
5. 运行 Agent 检查、AI golden 检查、OpenSpec 校验、lint/build。

Rollback：回退本次新增字段、检查和生成文档即可；无数据库和用户数据回滚。

## Open Questions

- 后续是否要在后台 UI 中增加完整协同图可视化。本次只保证 API 和文档有结构化数据。
- 是否需要把真实线上匿名查询沉淀为 golden set。本次只保留为下一轮优化项。
