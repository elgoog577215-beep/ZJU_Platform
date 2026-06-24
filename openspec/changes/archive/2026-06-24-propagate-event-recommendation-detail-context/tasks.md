## 1. 目标与边界

- [x] 1.1 确认已有 `/events/assistant/action` 支持 `favorite`、`unfavorite`、`register`。
- [x] 1.2 确认本轮只做推荐详情页动作归因，不改收藏/报名业务接口。

## 2. 前端上下文穿透

- [x] 2.1 修改 `EventAssistantPanel`，打开详情时传递推荐上下文。
- [x] 2.2 修改 `Events`，保存和清理 `selectedEventRecommendationContext`。
- [x] 2.3 在详情数据重新拉取后保留推荐上下文。
- [x] 2.4 复用 `getOrCreateEventVisitorKey`，动作请求携带 `visitorKey`。

## 3. 详情页动作归因

- [x] 3.1 详情页收藏成功后记录 `favorite` / `unfavorite`。
- [x] 3.2 详情页外部链接点击时记录 `register`。
- [x] 3.3 确保动作记录失败不阻断收藏、取消收藏或外链跳转。

## 4. 验证与收束

- [x] 4.1 扩展桌面 e2e，断言推荐详情页收藏会记录 `favorite`。
- [x] 4.2 扩展移动端 e2e，断言推荐详情页收藏会记录移动端来源。
- [x] 4.3 运行 `openspec validate propagate-event-recommendation-detail-context --strict`。
- [x] 4.4 运行 `npx playwright test e2e/event-assistant-flow.spec.js --project=chromium`。
- [x] 4.5 运行 `npm run lint -- --quiet` 和 `npm run build`。
- [x] 4.6 检查 git diff，确认没有混入数据库、密钥、构建产物或无关改动。
