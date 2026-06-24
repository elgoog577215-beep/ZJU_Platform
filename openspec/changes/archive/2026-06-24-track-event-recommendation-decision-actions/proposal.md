## Why

活动推荐助手已经能给出结构化决策辅助，但系统还不知道用户是否真的采取了下一步动作。没有动作归因，后续很难判断“推荐是否帮助用户决策”，也无法把查看详情、正负反馈、收藏报名等行为稳定纳入长期学习和主动机会分发。

本变更建立最小但可扩展的动作闭环：当用户从推荐卡片查看详情或提交反馈时，后端记录一条独立的推荐决策动作，并通过 `assistantRunId` 关联到本次 `ai_assistant_runs`。这让推荐从“生成结果”进入“可观测、可评测、可迭代”的决策链路。

## What

- 新增 `event_recommendation_actions` 动作日志表，用于记录推荐卡片触发的关键动作。
- 让活动推荐响应暴露 `assistantRunId`，前端后续动作可归因到同一次推荐运行。
- 新增 `/events/assistant/action` 接口，记录 `view_detail` 等推荐动作。
- 扩展反馈写入逻辑，在原有反馈表之外同步记录 `feedback_up` / `feedback_down` 动作摘要。
- 前端在用户从推荐卡片打开详情时，携带活动 ID、推荐位次、来源和 `nextAction` 调用动作接口。
- 扩展 golden/e2e，验证动作记录不破坏推荐、反馈和详情打开主流程。

## Impact

- 后端：扩展 `server/src/config/runMigrations.js`、`server/src/utils/eventAssistant.js`、`server/src/controllers/eventAssistantController.js`、`server/src/routes/api.js`。
- 前端：扩展 `src/components/EventAssistantPanel.jsx` 的推荐卡片详情打开与反馈记录路径。
- 测试：扩展 `server/scripts/evaluate-ai-golden.js`、统一 AI 检查脚本和 `e2e/event-assistant-flow.spec.js`。

## Non-Goals

- 本轮不改造收藏、报名、详情页已有业务接口，只先记录推荐助手直接触发的详情打开和反馈动作。
- 本轮不接入首页、通知、个人中心等主动分发入口。
- 本轮不采集原始长 query 或完整隐私文本；动作 metadata 只保留短字段摘要。
