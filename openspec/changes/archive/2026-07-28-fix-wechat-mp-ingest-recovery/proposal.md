## Why

当前每日公众号采集已经能抓取文章、保存正文并调用现有 AI 解析器。但当解析成功后写入 `events` 失败时，文章会停留在 `activity_status = failed`，后续定时任务不会再尝试恢复，导致“正文已解析”与“待审核活动未生成”之间出现不可见断链。

同时，后台文章列表只显示正文和提取状态，管理员无法直接区分活动候选被拒绝、已写入待审核活动或入库失败，难以及时确认解析链路的真实结果。

## What Changes

- 允许每日增量任务对 `activity_status = failed` 且 AI 解析结果已完成的文章重试活动入库。
- 恢复时复用已保存的解析 JSON，不重新调用 `parseWithLLM`，避免重复模型开销和同一文章的结果漂移。
- 保持自动生成的活动状态为 `pending`；已人工处理的活动不被自动覆盖。
- 在微信采集后台文章列表展示活动候选处理状态和失败/筛选原因，便于区分抓取、解析和入库三阶段。
- 增加服务回归测试，覆盖“首次入库失败、后续任务恢复成功且未二次解析”。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `wechat-mp-admin-import`: 增量采集的活动候选处理需要在入库失败后安全恢复，并向管理员暴露候选处理状态。

## Impact

- 后端：`server/src/services/wechatMpScheduledIngestService.js` 的自动采集恢复判断与状态处理。
- 前端：`src/components/Admin/WeChatMpImportManager.jsx` 和中英文翻译文案。
- 测试：`server/tests/wechat-mp-scheduled-ingest-service.test.js`。
- 数据模型和 API 路径不变；现有 `activity_status`、`activity_reason` 与 `extracted_event_json` 字段将作为恢复依据。
- 回滚时仅停止失败活动的自动恢复；已存在的文章、解析结果和待审核活动保持不变。
