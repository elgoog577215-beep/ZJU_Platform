## Context

`wechatMpScheduledIngestService` 将公众号文章正文交给 `parseWithLLM`，把结构化结果存入 `extracted_event_json`，随后按活动候选判断写入 `events`。解析和活动入库是两个独立步骤：前者成功后，后者仍可能因数据库约束、临时连接问题或字段兼容性失败。

现有任务只处理 `activity_status = not_screened`，因此一次入库失败会永久跳过，即使下一次采集已重新读取到同一篇文章。后台列表也没有显示 `activity_status` 与 `activity_reason`，使三个阶段的故障不可辨别。

## Goals / Non-Goals

**Goals:**

- 让已完成 AI 解析但活动入库失败的文章，在后续采集时自动恢复。
- 复用 `extracted_event_json`，恢复过程不再次调用模型。
- 保持活动审核边界：自动写入只能为 `pending`，已处理活动不被自动覆写。
- 在后台文章列表展示活动候选处理结果和原因。

**Non-Goals:**

- 不改变公众号登录、账号发现、抓正文、模型 prompt 或活动置信度阈值。
- 不对 `rejected` 文章自动二次判定；管理员需要重新解析时仍沿用现有手动操作。
- 不新增队列、定时器、数据表、接口或公开发布步骤。

## Decisions

### 将 `failed` 纳入活动处理恢复集

自动任务在解析状态为 `completed` 时，允许 `activity_status` 为 `not_screened` 或 `failed` 的文章再次执行 `screenArticleActivity`。`accepted` 表示已获得 `event_id`，`rejected` 表示当前 AI 结果未满足活动准入条件，两者不自动重试。

替代方案是在下一次采集时重新调用 AI。该方案会增加模型费用，且模型输出可能变化，不能保证恢复只是修复入库失败，因此不采用。

### 使用已保存的解析 JSON 作为恢复输入

恢复分支直接解析 `extracted_event_json` 并调用现有 `screenArticleActivity`。该函数已经负责幂等按原文链接或 `event_id` 查找活动，以及将新建活动固定为 `pending`。

替代方案是复制一套“恢复入库”函数。复制会使候选阈值、幂等策略和审核状态产生漂移，因此复用既有函数。

### 在文章行同时显示三个阶段状态

列表继续显示正文状态和提取状态，并追加活动候选状态和原因。使用现有 i18n 键结构添加中英文文案，不把中文直接写入 JSX。原因仅作为次级文字展示，不新增接口或详情页。

## Risks / Trade-offs

- [反复数据库错误导致每次定时任务都重试] → 不重复调用模型；失败原因会持续可见，管理员可以定位数据层问题。
- [自动恢复误覆盖人工审核] → 只处理 `not_screened` 与 `failed`；`accepted`/`rejected` 不进入恢复分支；底层已避免覆盖非 `pending`/`draft` 活动。
- [状态文字挤压后台文章列表] → 使用可换行的次级文本，并保持文章标题和操作按钮的固定布局。

## Migration Plan

1. 部署后无需迁移；现有字段已提供恢复所需数据。
2. 下次定时或手动增量采集会自动尝试恢复历史 `activity_status = failed` 的文章。
3. 回滚只会停止后续恢复尝试，已有文章、解析 JSON 和 `pending` 活动不会被删除或改为公开状态。

## Open Questions

- 无。现有活动候选阈值和人工审核流程保持不变。
