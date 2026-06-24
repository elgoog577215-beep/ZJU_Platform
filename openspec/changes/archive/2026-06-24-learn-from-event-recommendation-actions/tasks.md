## 1. 目标与边界

- [x] 1.1 确认上一轮动作归因表、动作枚举、`assistantRunId` 和 golden 基线已经存在。
- [x] 1.2 明确本轮只处理登录用户动作学习，不把匿名 `visitorKey` 并入长期画像。

## 2. 后端动作学习

- [x] 2.1 在 `loadUserEventProfile` 中读取近期 `event_recommendation_actions`，兼容旧数据库缺表时安全降级。
- [x] 2.2 扩展 `buildActionEvidence`，把 `view_detail`、`favorite`、`register`、`feedback_up/down`、`unfavorite`、`unregister` 转成分层权重。
- [x] 2.3 扩展 `actionEvidence` 字段，暴露查看、推荐收藏、推荐报名、负向动作和动作类型计数。
- [x] 2.4 扩展 `scoreEvent` 与现有信号保留逻辑，让推荐动作证据可见但不覆盖硬约束。
- [x] 2.5 扩展 `buildAiRerankPrompt` 的候选级动作证据字段。
- [x] 2.6 扩展 `recordEventAssistantRun` 的聚合摘要字段。

## 3. 自动化评测

- [x] 3.1 扩展 golden eval schema 和样例，写入推荐动作后再发起下一次推荐。
- [x] 3.2 断言动作证据进入 `reasoningTrace`、推荐解释和运行摘要。
- [x] 3.3 断言运行摘要不保存原始 query 或动作 metadata 长文本。

## 4. 验证与收束

- [x] 4.1 运行 `openspec validate learn-from-event-recommendation-actions --strict`。
- [x] 4.2 运行 `npm --prefix server run eval:ai-golden`。
- [x] 4.3 运行 `node server/scripts/verify_event_assistant.js` 和 `npm --prefix server run check:ai-runtime`。
- [x] 4.4 运行 `npm --prefix server run bench:event-assistant-startup`。
- [x] 4.5 运行 `npm run lint -- --quiet` 和 `npm run build`。
- [x] 4.6 检查 git diff，确认没有混入数据库、密钥、构建产物或无关改动。
