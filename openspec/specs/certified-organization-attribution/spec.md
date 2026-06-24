# certified-organization-attribution Specification

## Purpose
TBD - created by archiving change transition-certified-organization-attribution. Update Purpose after archive.
## Requirements
### Requirement: Certified Organization Attribution Preview

系统 SHALL 为管理员提供历史活动归属候选预览，候选来源包括活动主办方文本、活动标题、活动描述、来源链接和认证组织别名。

- 预览 MUST 是只读操作。
- 候选 MUST 包含 `event_id`、目标组织 `profile_id`、匹配等级、置信度、证据和当前归属状态。
- 匹配等级 MUST 至少包含 `strong`、`medium`、`weak`、`conflict`。
- 地点文本 MAY 作为证据，但 MUST NOT 单独生成强匹配。

#### Scenario: Organizer alias creates strong candidate

- **GIVEN** 认证组织“浙江大学学生会”有归属匹配别名“学生会”
- **AND** 一条历史活动的 `organizer = '学生会'`
- **WHEN** 管理员生成归属候选预览
- **THEN** 该活动 SHOULD 返回 `match_level = 'strong'`
- **AND** evidence SHOULD 包含命中的主办方文本

### Requirement: Attribution Application Keeps Uploader Audit

管理员确认候选后，系统 SHALL 只更新活动公开发布主体和主办主体，不覆盖原始上传账号。

- 应用迁移 MUST 要求管理员身份。
- 应用迁移 MUST 写入迁移日志。
- 应用迁移 MUST NOT 修改 `events.uploader_id`。
- 应用迁移 MUST NOT 修改 `events.created_at`。
- 已有不同组织归属的活动 MUST 标记为冲突；除非显式允许覆盖，否则 MUST 跳过。

#### Scenario: Official upload is attributed to certified organization

- **GIVEN** 一条活动由平台官方账号上传，`uploader_id = 1`
- **AND** 管理员确认它归属“浙江大学学生会”
- **WHEN** 系统应用迁移
- **THEN** `events.publisher_profile_id` SHOULD 指向学生会 profile
- **AND** `events.organizer_profile_id` SHOULD 指向学生会 profile
- **AND** `events.uploader_id` SHOULD remain `1`
- **AND** 迁移日志 SHOULD 记录变更前后的主体 ID

### Requirement: Organization Claim Continuity

认证组织 SHALL 可以先于真实组织账号存在，并以平台代管状态承接历史内容。

- 未入驻组织 MAY 作为认证组织 profile 接收历史内容归属。
- 组织入驻后，管理员 MAY 通过成员绑定让组织用户接管该 profile。
- 组织接管 MUST NOT 删除或改写历史迁移日志。

#### Scenario: Platform-managed organization receives history

- **GIVEN** “浙江大学团委” profile 已认证但尚未绑定组织成员
- **WHEN** 管理员确认历史活动归属到该 profile
- **THEN** 该活动 SHOULD 出现在团委组织主体聚合中
- **AND** 后续绑定组织成员 SHOULD NOT require reimporting the activity

