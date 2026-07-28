## ADDED Requirements

### Requirement: 增量采集可恢复活动入库失败

当公众号文章的 AI 解析已经完成、但活动候选入库失败时，系统 SHALL 在后续增量采集再次遇到该文章时复用已保存的解析结果重试活动入库。恢复 SHALL NOT 再次调用 `parseWithLLM`，且新建或可更新的活动 SHALL 保持 `pending` 审核状态。

#### Scenario: 已解析文章的活动入库在后续任务恢复
- **GIVEN** 增量文章的 `extraction_status` 为 `completed`、`activity_status` 为 `failed`，且已保存有效的 `extracted_event_json`
- **WHEN** 后续增量采集再次发现该文章
- **THEN** 系统 SHALL 使用已保存的解析结果重新执行活动候选处理
- **AND** 系统 SHALL NOT 再次调用 `parseWithLLM`
- **AND** 入库成功后 SHALL 将文章标记为 `accepted` 并关联对应活动
- **AND** 新建活动 SHALL 使用 `pending` 状态

#### Scenario: 已完成或被拒绝的候选不自动重试
- **GIVEN** 增量文章的 `activity_status` 为 `accepted` 或 `rejected`
- **WHEN** 后续增量采集再次发现该文章
- **THEN** 系统 SHALL NOT 自动重新执行活动候选处理
- **AND** 系统 SHALL NOT 覆盖既有活动的人工审核状态

### Requirement: 管理员可辨认增量文章的候选处理结果

微信采集后台 SHALL 在每篇增量文章上显示正文抓取状态、AI 提取状态和活动候选处理状态；当存在活动候选判断或入库原因时，后台 SHALL 显示可读原因。

#### Scenario: 管理员查看候选筛选状态
- **GIVEN** 增量文章已经完成 AI 提取
- **WHEN** 管理员打开微信采集后台的新增文章列表
- **THEN** 页面 SHALL 显示该文章的活动候选状态
- **AND** 页面 SHALL 显示筛选拒绝或入库失败原因（如存在）
