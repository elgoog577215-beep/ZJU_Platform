## 1. 目标契约

- [x] 1.1 验证 OpenSpec 变更结构，确认 proposal、design、spec、tasks 能被 strict validate 识别。
- [x] 1.2 读取当前推荐运行摘要、反馈、详情打开和前端推荐卡片链路，确认动作闭环接入点。

## 2. 后端动作闭环

- [x] 2.1 新增 `event_recommendation_actions` schema 和索引，用于记录推荐动作归因。
- [x] 2.2 让活动推荐响应暴露 `assistantRunId`，并确保它对应 `ai_assistant_runs`。
- [x] 2.3 新增 `recordEventAssistantDecisionAction`，校验动作类型、事件 ID、运行 ID、来源和 metadata。
- [x] 2.4 新增 `/events/assistant/action` 接口，记录 `view_detail` 等推荐动作。
- [x] 2.5 在推荐反馈写入后同步记录 `feedback_up` / `feedback_down` 动作，且日志失败不阻断反馈主流程。

## 3. 前端动作归因

- [x] 3.1 推荐卡片打开详情时携带 `assistantRunId`、推荐位次和 `nextAction` 调用动作接口。
- [x] 3.2 推荐反馈请求携带 `assistantRunId`、推荐位次和来源信息。
- [x] 3.3 保持桌面和移动端全屏助手视觉不增加额外噪音。

## 4. 自动化评测

- [x] 4.1 扩展 golden eval，断言推荐响应包含 `assistantRunId`。
- [x] 4.2 扩展 golden eval，断言 `view_detail` 和 feedback 动作可写入 `event_recommendation_actions`。
- [x] 4.3 扩展活动助手 e2e，验证从推荐卡片打开详情会调用动作接口，反馈流程仍可用。

## 5. 验证与收束

- [x] 5.1 运行 `openspec validate track-event-recommendation-decision-actions --strict`。
- [x] 5.2 运行 `npm --prefix server run eval:ai-golden`、`node server/scripts/verify_event_assistant.js` 和 `npm --prefix server run check:ai-runtime`。
- [x] 5.3 运行 `npm --prefix server run bench:event-profiles` 和 `npm --prefix server run bench:event-assistant-startup`。
- [x] 5.4 运行 `npm run lint -- --quiet`、`npm run build` 和活动助手 e2e。
- [x] 5.5 检查 git diff，确认没有混入数据库、密钥、构建产物或无关改动。
