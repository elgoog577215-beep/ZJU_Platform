## Why

活动推荐助手已经能记录推荐卡片的 `view_detail`，后端也已经能从推荐动作中学习。但用户打开活动详情后，如果继续收藏活动或点击报名/外部链接，这些后续动作目前会丢失 `assistantRunId`、推荐位次和来源，系统只能知道“用户收藏了活动”，却无法知道“这次收藏是否由某次推荐触发”。

本变更把推荐上下文从助手卡片穿透到活动详情页，让详情页内的收藏、取消收藏和报名外链点击也能写入 `event_recommendation_actions`，把推荐影响从“打开详情”推进到“详情后的真实决策动作”。

## What

- `EventAssistantPanel` 打开详情时向父组件传递推荐上下文，而不是只传活动对象。
- `Events` 保存当前详情的推荐上下文，并在详情重新拉取完整活动数据后保留该上下文。
- 详情页收藏/取消收藏成功后，如果存在推荐上下文，则静默记录 `favorite` / `unfavorite`。
- 详情页报名/外部链接点击时，如果存在推荐上下文，则静默记录 `register`。
- 动作请求携带 `assistantRunId`、推荐位次、来源、`visitorKey` 和有限 metadata。
- 扩展 e2e，验证桌面详情收藏和移动端详情收藏都能归因到推荐运行。

## Impact

- 前端：修改 `src/components/EventAssistantPanel.jsx`、`src/components/Events.jsx`。
- 测试：修改 `e2e/event-assistant-flow.spec.js`。
- 后端：不新增接口和数据表，复用已有 `/events/assistant/action` 和动作枚举。

## Non-Goals

- 本轮不改造 `/favorites/toggle` 或 `/events/:id/register` 的接口协议。
- 本轮不把普通列表收藏记录为推荐动作；只有从助手推荐打开的详情页才记录。
- 本轮不把匿名 `visitorKey` 写入长期用户画像，只用于动作链路归因。
- 本轮不强依赖外部链接真的打开成功；telemetry 失败不阻断用户跳转。
