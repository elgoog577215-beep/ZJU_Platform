## Context

上一轮新增了 `event_recommendation_actions`、`assistantRunId` 和前端查看详情/反馈上报。现在链路的断点在读取侧：`loadUserEventProfile` 仍主要依赖 `favorites`、`event_registrations` 和 `event_recommendation_feedback`，动作表没有进入下一次推荐画像。

本轮目标不是再增加一个日志接口，而是让动作日志产生推荐效果，同时控制噪声和隐私风险。

## Goals

- 近期推荐动作可以进入用户画像和排序证据。
- `view_detail` 作为弱信号，不能压过明确查询意图。
- `favorite/register/feedback_up` 作为强正向推荐来源证据。
- `unfavorite/unregister/feedback_down` 作为负向推荐来源证据。
- 运行摘要能回答“本次推荐是否使用了动作学习证据”。
- 自动化评测覆盖动作表从写入到下一次推荐的学习闭环。

## Decisions

### 1. 登录用户优先，匿名动作暂不并入长期画像

动作表支持 `visitor_key`，但当前推荐画像以 `userId` 为主。匿名动作如果直接读回，容易出现设备共享、清理缓存、访客串号等问题。本轮只读取 `user_id = ?` 的动作，并限制最近 60 天、最近 80 条。

### 2. 动作分层加权

动作证据会进入 `buildActionEvidence`，并和现有收藏/报名/反馈聚合到同一个 `actionEvidence` 对象。

建议权重：

- `view_detail`：0.35，弱正向，只补充同类兴趣。
- `favorite`：1.2，正向。
- `register`：2.0，强正向，但同一活动仍会被“已参加过”规则降权，避免重复推荐。
- `feedback_up`：1.5，正向。
- `unfavorite`：1.0，负向。
- `unregister`：1.6，负向。
- `feedback_down`：2.0，负向。

同一活动同一动作类型去重，避免同一次推荐重复点击把权重打爆。

### 3. 扩展但不破坏 `actionEvidence`

新增字段：

- `viewedEventIds`
- `recommendationFavoriteEventIds`
- `recommendationRegisterEventIds`
- `negativeActionEventIds`
- `actionTypeCounts`
- `recentRecommendationActionCount`

保留旧字段 `positiveEventIds`、`negativeEventIds`、`positiveCategories`、`negativeCategories`，让现有 `scoreEvent` 和排序逻辑继续工作。

### 4. Rerank prompt 提供候选级细分证据

`buildAiRerankPrompt` 目前只有 `priorPositiveAction` 和 `priorNegativeFeedback`。本轮扩展为：

- `priorViewDetail`
- `priorFavoriteAction`
- `priorRegisterAction`
- `priorNegativeAction`
- `categoryActionWeight`

模型仍然遵守已有规则：动作证据只是个性化信号，不得覆盖本轮明确的日期、校区、组织、收益和形式。

### 5. 运行摘要只存聚合指标

`ai_assistant_runs.summary_json` 新增：

- `actionEvidenceSourceCount`
- `viewDetailEvidenceCount`
- `favoriteActionEvidenceCount`
- `registerActionEvidenceCount`
- `negativeActionEvidenceCount`
- `actionEvidenceUsed`

这些字段来自本次响应的 `reasoningTrace` 和用户画像聚合，不存原始 metadata 或长文本。

## Risks / Trade-offs

- [Risk] `view_detail` 噪声大。-> 权重低，只作为弱正向和同类兴趣，不直接强推同一个活动。
- [Risk] 动作表与收藏/报名业务表重复计数。-> 按 `event_id + action_type` 去重，并设置权重上限。
- [Risk] 负向动作过度打压同类活动。-> 负向主要作用于同一活动和类别权重，不阻断明确查询命中的活动。
- [Risk] 运行摘要膨胀。-> 只保存数字聚合，不保存动作明细。

## Validation

- `openspec validate learn-from-event-recommendation-actions --strict`
- `npm --prefix server run eval:ai-golden`
- `node server/scripts/verify_event_assistant.js`
- `npm --prefix server run check:ai-runtime`
- `npm --prefix server run bench:event-assistant-startup`
- `npm run lint -- --quiet`
- `npm run build`
