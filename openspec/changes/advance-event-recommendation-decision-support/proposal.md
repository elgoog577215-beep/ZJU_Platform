## Why

活动推荐助手已经具备机会匹配结构、反馈学习、运行观测和速度基准。当前下一步瓶颈不是“能不能推荐”，而是推荐结果还不够像决策助手：用户能看到推荐理由，但仍需要自己判断哪个活动更适合、下一步该做什么、如果不确定应该补充什么信息。

本变更把活动推荐助手从“解释推荐结果”推进到“辅助用户做出选择”。目标是在不重写 API、不牺牲硬约束和速度观测的前提下，为每条推荐补充结构化决策辅助，并让前端、运行摘要和 golden eval 都能持续验证。

## What

- 为推荐结果新增结构化 `decisionSupport`，包含下一步动作、取舍摘要、适合理由、注意事项和可补充偏好。
- 在推荐卡片中展示下一步动作和关键取舍点，让用户能更快比较和行动。
- 将决策辅助覆盖情况写入 `ai_assistant_runs.summary_json`，便于后续分析推荐是否真正进入决策闭环。
- 扩展 golden eval 和 e2e，验证决策辅助字段、前端展示和既有反馈流程共存。

## Impact

- 后端：扩展 `server/src/utils/eventAssistant.js` 的机会匹配构建和运行摘要。
- 前端：扩展 `src/components/EventAssistantPanel.jsx` 的推荐卡片展示。
- 测试：扩展 `server/scripts/evaluate-ai-golden.js` 和 `e2e/event-assistant-flow.spec.js`。
- 文档：新增 OpenSpec capability `event-recommendation-decision-support`。

## Non-Goals

- 本轮不做首页、通知、个人中心的主动分发。
- 本轮不新增数据库迁移，不把反馈原因独立成新字段。
- 本轮不新增复杂协同过滤、向量数据库或长期模型训练。
- 本轮不改变 `/api/events/assistant` 的公开入口，只追加兼容字段。
