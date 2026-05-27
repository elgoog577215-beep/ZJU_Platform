## Why

活动推荐助手已经从“能推荐活动”加固到“可解释、可评测、可兜底”，但它的目标仍偏功能级：用户得到几条推荐，却还没有稳定形成“发现机会、判断取舍、反馈变准、沉淀需求”的长期闭环。

现在需要把它升级为校园机会匹配系统的第一阶段：不只回答“有什么活动”，而是帮助学生判断“我现在最值得参加什么、为什么、哪里不适合、下一次如何更懂我”。

## What Changes

- 建立活动推荐助手的北极星目标和阶段目标契约：推荐可信、解释可判断、反馈能改变结果、从推荐到决策、成为平台智能入口。
- 在推荐响应中增加机会匹配视角，稳定输出每条推荐的匹配项、缺失项、不确定项、决策提示和反馈学习状态。
- 让负反馈原因进入排序与解释，而不只是保存一条 `down` 记录。
- 增加“为什么推荐 A 而不是 B”的轻量决策解释，帮助用户在多个活动之间做选择。
- 扩展运行摘要，记录硬约束满足、fallback、规则补齐、反馈学习、机会匹配阶段等可观测指标。
- 扩展 golden eval，覆盖中文真实问法、负反馈原因、决策解释和运行摘要。

## Capabilities

### New Capabilities

- `event-opportunity-matching-system`: 活动推荐助手升级为校园机会匹配系统，覆盖目标契约、机会匹配响应、反馈学习、决策解释、运行观测和评测验收。

### Modified Capabilities

- 无。主线 `openspec/specs/` 尚未归档活动推荐助手能力，本轮以新 capability 固化目标体系与可执行契约。

## Impact

- 后端：`server/src/utils/eventAssistant.js`、`server/src/services/eventRecommendation/*`、`server/scripts/evaluate-ai-golden.js`、必要时补充验证脚本。
- 前端：`src/components/EventAssistantPanel.jsx` 和移动端全屏复用面板。
- 数据：复用 `event_recommendation_feedback`、`ai_assistant_runs`、`assistant_memory`、`favorites`、`event_registrations`；本轮不新增数据库迁移。
- API：保持 `/api/events/assistant` 与 `/api/events/assistant/feedback` 兼容，只在响应中追加字段。
- 验证：继续使用 `verify_event_assistant`、`eval:ai-golden`、`check:ai-runtime`、前端 lint/build 和活动助手 e2e。
