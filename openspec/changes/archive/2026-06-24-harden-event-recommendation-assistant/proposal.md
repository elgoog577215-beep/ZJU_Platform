## Why

活动推荐助手已经具备统一 AI runtime、活动画像、偏好保存、反馈记录和运行遥测，但核心能力仍偏“功能堆叠”：推荐主逻辑集中在巨型文件中，确定性排序、用户画像、负反馈学习、解释输出、前端主流程和评测闭环没有形成清晰边界。现在需要把它从“能推荐活动”加固为“可解释、可评测、可持续优化、可维护”的受控推荐 Agent。

这次变更不重做活动页，也不重新发明 AI runtime；重点是收束推荐助手的质量链路，让后续迭代可以基于清晰服务、明确指标和自动化验收推进。

## What Changes

- 将活动推荐助手主链路拆成边界清晰的服务层：意图理解、候选召回、确定性排序、用户画像、解释生成、反馈证据和响应组装。
- 强化确定性推荐核心：显式需求、活动生命周期、分类、校区、对象、收益、用户画像、负反馈和历史 fallback 都必须进入可测试评分。
- 规范模型职责：模型用于语义理解、解释和有限重排，不能绕过候选池、不能发明活动 ID、不能覆盖硬约束。
- 升级用户画像：区分显式偏好、行为信号、对话记忆和负反馈，并让画像影响排序时可解释。
- 升级反馈闭环：把赞踩、收藏、报名、打开详情等动作汇总成推荐质量证据，并产出可用于下一轮排序的调整信号。
- 收束前端体验：把活动助手主流程整理为“输入需求 → 展示理解 → 推荐理由 → 纠错反馈”，降低当前面板的信息噪音。
- 建立 golden eval 和运行健康验收：覆盖召回、排序、解释、fallback、非法模型输出、画像影响、移动端展示和运行遥测。

## Capabilities

### New Capabilities

- `event-recommendation-assistant-hardening`: 活动推荐助手质量加固，覆盖服务边界、确定性排序、用户画像、反馈闭环、可解释输出、前端收束和评测验收。

### Modified Capabilities

- 无。本仓库主线 specs 尚未归档活动推荐助手能力；本轮以新 capability 固化加固后的目标契约。

## Impact

- 后端：`server/src/utils/eventAssistant.js`、`server/src/controllers/eventAssistantController.js`、`server/src/services/eventAiProfileService.js`、`server/src/services/eventRecommendationEvidenceService.js`、`server/src/services/eventIntelligenceService.js` 及新增推荐服务模块。
- 前端：`src/components/EventAssistantPanel.jsx`、`src/components/MobileEventAssistantFullscreen.jsx`、活动页助手入口和反馈交互。
- 数据：复用 `user_event_preferences`、`assistant_memory`、`event_recommendation_feedback`、`event_ai_profiles`、`ai_assistant_runs`，优先不新增迁移；如实现中发现字段无法表达反馈原因或行为证据，再单独提出最小迁移。
- 评测：扩展 `server/scripts/verify_event_assistant.js`、`server/scripts/evaluate-ai-golden.js`、`server/scripts/stress-ai-assistants.js` 或新增定向脚本。
- 风险：推荐排序变更可能影响当前结果顺序，需要 golden case、fallback case 和 UI smoke test 同步保护。
