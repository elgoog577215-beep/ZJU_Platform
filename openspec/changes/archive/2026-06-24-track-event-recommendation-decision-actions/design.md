## Context

活动推荐助手目前已经具备 `decisionSupport.nextAction`，前端也会展示“下一步”。但这仍是单向建议：系统不知道用户是否点击了详情、是否反馈适合、是否因为某个原因拒绝。长期目标是校园机会操作系统，因此必须把推荐后的动作记录下来，形成“推荐 -> 决策辅助 -> 用户动作 -> 学习”的闭环。

## Goals

- 记录用户从推荐卡片触发的关键决策动作。
- 用 `assistantRunId` 将动作归因到一次具体推荐运行。
- 动作记录字段有限、可分析、不过度采集原始文本。
- 不破坏已有事件详情、反馈、收藏和报名流程。
- 让 golden/e2e 能持续验证动作闭环，而不是只验证推荐文本。

## Decisions

### 1. 使用独立动作表承接推荐归因

新增 `event_recommendation_actions`：

- `run_id` 关联 `ai_assistant_runs.id`。
- `user_id` / `visitor_key` 支持登录与匿名上下文。
- `event_id` 关联活动。
- `action_type` 使用有限枚举，例如 `view_detail`、`feedback_up`、`feedback_down`。
- `source` 标记动作来自卡片、全屏助手或评测。
- `recommendation_rank` 记录当时推荐位次。
- `metadata_json` 只保存短摘要，例如 `nextAction`、`surface`。

独立表比复用 `ai_assistant_runs.summary_json` 更清晰：运行日志仍负责模型调用与推荐结果，动作表负责推荐后的用户行为归因。这样后续接收藏、报名、主动分发统计时不会把运行日志变成混合事件流。

### 2. 响应暴露 `assistantRunId`

推荐运行写入 `ai_assistant_runs` 后，把生成的 ID 放到响应根字段 `assistantRunId`。前端不需要理解运行摘要结构，只需要把这个 ID 原样带到动作和反馈请求中。

如果运行日志写入失败，推荐主响应仍然返回；前端动作记录会因为缺少 `assistantRunId` 自动跳过，不阻断用户看推荐。

### 3. 前端只记录显式推荐动作

本轮先记录：

- `view_detail`：用户从推荐卡片打开详情。
- `feedback_up` / `feedback_down`：用户提交推荐反馈。

收藏和报名已有业务接口，本轮不劫持它们；后续可以通过推荐上下文参数或事件详情来源继续串联。

### 4. 失败不阻断主流程

动作接口失败不能影响详情打开或反馈提交。前端动作调用采用静默请求，后端写入失败返回 `recorded: false` 或抛出可控错误，由评测覆盖关键成功路径。

### 5. 推荐信号保持决策可解释

动作闭环会增加“用户曾正向反馈/点击”的个性化证据，但收益、主题、校区等硬约束仍应优先出现在 `opportunityMatch.matched` 中。实现上需要让硬约束信号优先于行为证据，避免动作学习反而遮住用户本轮明确目标。

## Risks / Trade-offs

- [Risk] 新动作表增加迁移面。-> 使用 `CREATE TABLE IF NOT EXISTS` 和索引，保持向后兼容。
- [Risk] 前端动作记录失败会造成统计缺口。-> 不影响主流程，后续后台统计可识别缺口。
- [Risk] 动作闭环只覆盖详情和反馈，还不是完整报名闭环。-> 下一轮再接收藏、报名和主动分发。
- [Risk] 动作证据可能过度影响推荐解释。-> golden 覆盖收益信号不被行为证据挤掉。

## Validation

- `openspec validate track-event-recommendation-decision-actions --strict`
- `npm --prefix server run eval:ai-golden`
- `node server/scripts/verify_event_assistant.js`
- `npm --prefix server run check:ai-runtime`
- `npm --prefix server run bench:event-profiles`
- `npm --prefix server run bench:event-assistant-startup`
- `npm run lint -- --quiet`
- `npm run build`
- `npx playwright test e2e/event-assistant-flow.spec.js --project=chromium`
