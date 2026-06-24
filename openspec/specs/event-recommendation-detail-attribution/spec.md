# event-recommendation-detail-attribution Specification

## Purpose
TBD - created by archiving change propagate-event-recommendation-detail-context. Update Purpose after archive.
## Requirements
### Requirement: 推荐详情必须保留推荐上下文

活动推荐助手 SHALL 在从推荐卡片打开活动详情时，把推荐运行上下文传递给详情页。

#### Scenario: 从推荐卡片打开详情
- **WHEN** 用户点击活动推荐卡片
- **THEN** 详情页 SHALL 保存 `assistantRunId`
- **AND** 详情页 SHALL 保存推荐位次和来源
- **AND** 详情页重新拉取完整活动数据后 SHALL 继续保留该上下文

#### Scenario: 从普通活动列表打开详情
- **WHEN** 用户从普通活动列表打开详情
- **THEN** 详情页 SHALL NOT 生成推荐动作归因上下文

### Requirement: 详情页后续动作必须可归因

当详情页存在推荐上下文时，系统 SHALL 将详情页内的关键后续动作记录为推荐动作。

#### Scenario: 用户在推荐详情页收藏活动
- **WHEN** 用户从推荐详情页成功收藏活动
- **THEN** 前端 SHALL 静默记录 `favorite` 动作
- **AND** 动作 SHALL 携带 `assistantRunId`、活动 ID、推荐位次、来源和 `visitorKey`

#### Scenario: 用户在推荐详情页取消收藏
- **WHEN** 用户从推荐详情页成功取消收藏活动
- **THEN** 前端 SHALL 静默记录 `unfavorite` 动作

#### Scenario: 用户点击推荐详情页报名或外部链接
- **WHEN** 用户点击推荐详情页的活动链接
- **THEN** 前端 SHALL 静默记录 `register` 动作
- **AND** 链接跳转 SHALL 不被 telemetry 失败阻断

### Requirement: 推荐详情动作归因必须可验证

系统 SHALL 用 e2e 覆盖推荐详情页内动作归因。

#### Scenario: 桌面端详情页收藏
- **WHEN** e2e 从桌面助手推荐打开详情并收藏
- **THEN** 测试 SHALL 观察到 `favorite` 动作请求
- **AND** 请求 SHALL 包含推荐运行上下文

#### Scenario: 移动端详情页收藏
- **WHEN** e2e 从移动端助手推荐打开详情并收藏
- **THEN** 测试 SHALL 观察到来自 `event_assistant_mobile` 的 `favorite` 动作请求

