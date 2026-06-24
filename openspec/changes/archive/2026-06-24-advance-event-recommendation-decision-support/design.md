## Context

活动推荐助手当前已经完成第一阶段机会匹配：推荐结果包含 `opportunityMatch`、匹配项、缺失项、不确定项、决策提示和反馈学习状态；运行摘要记录机会匹配质量和性能耗时；golden eval 覆盖中文真实问法、硬约束、反馈学习和兜底。

但现有 `decisionHint` 仍是一句轻量解释，主要回答“为什么推荐它”。它还没有稳定回答三个更接近用户决策的问题：

- 我现在应该做什么？
- 这个活动相比其他候选的取舍是什么？
- 如果我还不确定，应该补充什么偏好？

## Goals

- 把每条推荐从“解释型卡片”升级为“决策型卡片”。
- 用确定性后端逻辑生成决策辅助，避免模型编造活动事实。
- 在前端展示下一步动作和取舍点，但不增加信息噪音。
- 将决策辅助覆盖情况写入运行摘要，并用自动化评测守住契约。

## Decisions

### 1. 将 `decisionSupport` 挂在 `opportunityMatch` 下

`opportunityMatch` 已经承载机会匹配信息，本轮在其中追加：

- `nextAction`: 用户下一步动作，例如查看详情、优先报名、收藏后比较、补充偏好。
- `tradeoffs`: 1 到 3 条取舍点，基于硬约束、缺失项、不确定项、历史状态和候选对比。
- `fitFor`: 1 到 3 条适合理由。
- `watchouts`: 0 到 3 条注意事项。
- `preferencePrompt`: 当缺失项或不确定项存在时，提示用户下一轮可补充什么。

这样旧调用方仍可忽略新字段，前端也能渐进展示。

### 2. 决策辅助由确定性逻辑生成

本轮不把 `decisionSupport` 交给模型自由生成。后端使用已有候选事实、`diagnostics`、`matchSignals`、`hardConstraintMisses`、`isHistorical`、`reasoningTrace.uncertainty` 和候选排序位置生成短文本。这样可以保证不编造时间、地点、报名状态或奖励。

### 3. 前端只展示最高价值信息

推荐卡片展示：

- 一条醒目的下一步动作。
- 最多两条取舍点。
- 最多两条适合理由或注意事项。

完整字段保留在响应和运行摘要中，避免卡片变成诊断报告。

### 4. 运行摘要记录覆盖度，不记录原始用户查询

`ai_assistant_runs.summary_json` 追加决策辅助统计，例如有下一步动作的推荐数、取舍点数量、注意事项数量和是否存在补充偏好提示。继续避免写入原始 query。

## Risks / Trade-offs

- [Risk] 决策辅助文案可能偏机械。→ 先保证真实、短、可验证，后续再做文案润色。
- [Risk] 卡片信息变多影响扫描。→ 前端只展示最少必要字段，完整诊断留在响应。
- [Risk] 下一步动作被误解为实际报名状态。→ 文案只说“查看详情”“优先确认报名信息”，不声称已经可报名。

## Validation

- `openspec validate advance-event-recommendation-decision-support --strict`
- `npm --prefix server run eval:ai-golden`
- `node server/scripts/verify_event_assistant.js`
- `npm --prefix server run check:ai-runtime`
- `npm --prefix server run bench:event-profiles`
- `npm --prefix server run bench:event-assistant-startup`
- `npm run lint -- --quiet`
- `npm run build`
- `npx playwright test e2e/event-assistant-flow.spec.js --project=chromium`
