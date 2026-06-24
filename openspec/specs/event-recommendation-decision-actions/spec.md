# event-recommendation-decision-actions Specification

## Purpose
TBD - created by archiving change track-event-recommendation-decision-actions. Update Purpose after archive.
## Requirements
### Requirement: 推荐响应必须提供可归因上下文

活动推荐助手 SHALL 在完成推荐运行后提供可用于后续动作归因的推荐运行 ID。

#### Scenario: 推荐运行完成
- **WHEN** 活动推荐助手返回推荐、澄清或兜底响应
- **THEN** 响应 SHALL 包含 `assistantRunId`
- **AND** `assistantRunId` SHALL 对应一条 `ai_assistant_runs` 记录

### Requirement: 推荐动作必须有专用日志

系统 SHALL 将用户从推荐卡片触发的关键动作写入专用动作日志，形成推荐到决策动作的闭环。

#### Scenario: 用户从推荐卡片打开详情
- **WHEN** 前端从活动推荐卡片打开活动详情
- **THEN** 系统 SHALL 记录 `view_detail` 动作
- **AND** 动作 SHALL 关联 `assistantRunId`、`eventId`、来源和推荐位次

#### Scenario: 用户提交推荐反馈
- **WHEN** 用户对推荐结果提交适合或不适合反馈
- **THEN** 系统 SHALL 保留原有反馈记录
- **AND** 系统 SHALL 记录 `feedback_up` 或 `feedback_down` 动作

### Requirement: 推荐动作记录必须安全降级

推荐动作日志 SHALL 不阻断详情查看、收藏、报名或反馈主流程。

#### Scenario: 动作日志写入失败
- **WHEN** 业务动作已经成功但推荐动作日志写入失败
- **THEN** 用户主流程 SHALL 继续完成
- **AND** 后端 SHALL 避免把日志失败暴露成用户操作失败

### Requirement: 推荐动作闭环必须可评测

系统 SHALL 用自动化评测覆盖推荐运行 ID、动作记录和反馈动作归因。

#### Scenario: 运行 golden eval
- **WHEN** 运行活动推荐 golden eval
- **THEN** 评测 SHALL 断言推荐响应包含 `assistantRunId`
- **AND** 评测 SHALL 断言查看详情或反馈动作可以写入专用动作日志

