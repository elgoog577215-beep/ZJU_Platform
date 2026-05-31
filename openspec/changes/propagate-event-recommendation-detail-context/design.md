## Context

上一轮完成了推荐动作学习：`event_recommendation_actions` 已经能进入用户画像、排序和运行摘要。当前缺口在前端上下文穿透：助手推荐卡片打开详情时记录了 `view_detail`，但详情页内的收藏和外链报名没有携带推荐运行上下文。

## Goals

- 推荐详情页保留 `assistantRunId`、推荐位次、来源和 `nextAction`。
- 详情页收藏/取消收藏可归因到推荐。
- 详情页外部报名/访问链接点击可归因到推荐。
- 普通事件列表详情不产生推荐动作，避免污染归因。
- 动作记录失败不阻断收藏、取消收藏或跳转主流程。

## Decisions

### 1. 推荐上下文由助手传给父组件

`EventAssistantPanel` 在 `onOpenEvent` 时传第二个参数：

- `assistantRunId`
- `recommendationRank`
- `source`
- `nextAction`
- `surface`

父组件 `Events` 不需要理解推荐结果对象，只接收一个有限上下文对象。

### 2. 详情页用本地状态保存上下文

`Events` 新增 `selectedEventRecommendationContext`。当详情由助手打开时设置；当用户关闭详情或从普通列表打开详情时清空。拉取 `/events/:id` 的完整数据后仍保留上下文。

### 3. 动作用统一 helper 静默记录

`Events` 新增 `recordSelectedEventAssistantAction(actionType, metadata)`：

- 无推荐上下文时直接返回。
- 带上 `eventId`、`assistantRunId`、`recommendationRank`、`source`、`visitorKey`。
- metadata 只保留短字段：`surface`、`nextAction`、`hrefHost`。
- catch 后吞掉错误，不阻断主流程。

### 4. 收藏和外链分别归因

收藏成功后：

- `favorited === true` 记录 `favorite`。
- `favorited === false` 记录 `unfavorite`。

详情页外链点击时：

- 记录 `register`，metadata 带 `surface: detail_link` 和链接 host。
- 仍然让 `<a target="_blank">` 自然打开。

## Risks / Trade-offs

- [Risk] 外链点击不等于真实报名成功。-> 当前事件详情只有外部链接，先记录为“报名/访问意图”；后续如启用内部报名接口，再改为成功后记录。
- [Risk] helper 和两个详情布局重复调用。-> 保持一个统一 helper，两处 UI 只调用同一函数。
- [Risk] 匿名动作误入长期画像。-> 后端学习仍只读 `user_id`，本轮 `visitorKey` 只用于归因链路。

## Validation

- `openspec validate propagate-event-recommendation-detail-context --strict`
- `npx playwright test e2e/event-assistant-flow.spec.js --project=chromium`
- `npm run lint -- --quiet`
- `npm run build`
