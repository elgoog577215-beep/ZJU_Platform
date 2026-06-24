## Why

活动推荐助手已经完成“推荐 -> 决策辅助 -> 动作归因”的第一层闭环，但 `event_recommendation_actions` 目前主要还是日志：它能证明用户从推荐卡片查看详情或提交反馈，却还没有成为下一次推荐画像和排序的稳定证据源。

如果动作表只写不读，系统仍然停留在“可观测”，没有进入“可学习”。本变更把推荐动作纳入用户画像、排序提示和运行摘要，让助手能区分“用户只是看过详情”“用户从推荐中收藏/报名”“用户明确负反馈”，并继续保证动作证据不能覆盖本轮明确的校区、时间、收益、主题等硬约束。

## What

- 在 `loadUserEventProfile` 中读取近期 `event_recommendation_actions`，按登录用户聚合推荐动作。
- 扩展 `buildActionEvidence`，把推荐动作转成弱正向、强正向和负向证据，并对重复来源做上限控制。
- 扩展 rerank prompt 的候选级 `actionEvidence` 字段，让模型区分 `view_detail`、`favorite/register`、`feedback_down/unfavorite/unregister`。
- 扩展 `ai_assistant_runs.summary_json`，记录动作证据使用情况的聚合指标，不保存原始 query 或长 metadata。
- 扩展 golden eval，验证动作表写入后会影响下一次推荐证据、摘要和解释，而不是只验证可写入。

## Impact

- 后端：修改 `server/src/utils/eventAssistant.js` 的画像加载、证据聚合、rerank prompt、运行摘要。
- 评测：修改 `server/scripts/evaluate-ai-golden.js`，补充动作学习闭环样例。
- 检查脚本：如临时 schema 需要动作表字段同步，则更新统一 AI runtime 检查脚本。

## Non-Goals

- 本轮不把匿名 `visitorKey` 动作并入长期用户画像，避免匿名串号和隐私边界扩大。
- 本轮不改造收藏、报名业务接口的请求体，也不强制让它们携带 `assistantRunId`。
- 本轮不把 `view_detail` 当作强偏好；它只能作为弱正向或兴趣探索证据。
- 本轮不保存原始长文本 metadata 到运行摘要。
