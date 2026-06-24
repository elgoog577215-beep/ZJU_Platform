# event-recommendation-action-learning Specification

## Purpose
TBD - created by archiving change learn-from-event-recommendation-actions. Update Purpose after archive.
## Requirements
### Requirement: 推荐动作必须进入用户画像证据

活动推荐助手 SHALL 将登录用户近期推荐动作纳入推荐画像，但 SHALL 不把匿名 `visitorKey` 动作并入长期用户画像。

#### Scenario: 登录用户有近期推荐动作
- **WHEN** 登录用户触发过 `event_recommendation_actions`
- **THEN** 下一次活动推荐画像 SHALL 读取这些动作
- **AND** 画像 SHALL 只聚合最近一段时间内的有限动作
- **AND** 画像 SHALL 不读取原始 query 或长 metadata

#### Scenario: 匿名访客有推荐动作
- **WHEN** 动作记录只有 `visitorKey` 而没有 `user_id`
- **THEN** 长期用户画像 SHALL 不使用该动作
- **AND** 推荐主流程 SHALL 继续只根据本次 query 和公开活动信息工作

### Requirement: 推荐动作证据必须分层加权

系统 SHALL 区分查看详情、收藏、报名、正反馈、取消和负反馈等动作强度，避免把所有动作当作同等偏好。

#### Scenario: 用户只是查看详情
- **WHEN** 用户曾从推荐卡片查看某活动详情
- **THEN** 系统 SHALL 将该动作作为弱正向证据
- **AND** 该动作 SHALL NOT 覆盖本轮明确的时间、地点、收益、主题或组织约束

#### Scenario: 用户从推荐中收藏或报名
- **WHEN** 用户曾从推荐中收藏或报名某活动
- **THEN** 系统 SHALL 将该动作作为强正向推荐来源证据
- **AND** 同一活动的重复动作 SHALL 去重或受上限控制

#### Scenario: 用户取消或负反馈
- **WHEN** 用户曾取消收藏、取消报名或提交负反馈
- **THEN** 系统 SHALL 将该动作作为负向证据
- **AND** 负向证据 SHALL 进入候选诊断或排序信号

### Requirement: 推荐动作学习必须对排序与解释可见

活动推荐助手 SHALL 在排序提示、解释信号和运行摘要中暴露动作学习是否被使用。

#### Scenario: 动作证据参与推荐
- **WHEN** 推荐候选命中用户近期动作证据
- **THEN** rerank prompt SHALL 提供候选级动作证据字段
- **AND** 推荐解释 SHALL 能体现行动证据
- **AND** `reasoningTrace.actionEvidenceUsed` SHALL 为 `true`

#### Scenario: 记录推荐运行摘要
- **WHEN** 系统写入 `ai_assistant_runs.summary_json`
- **THEN** 摘要 SHALL 包含动作证据聚合计数
- **AND** 摘要 SHALL NOT 包含动作 metadata 原文或原始 query

### Requirement: 推荐动作学习必须可评测

系统 SHALL 用自动化评测覆盖“动作写入 -> 画像读取 -> 推荐使用”的闭环。

#### Scenario: 运行 golden eval
- **WHEN** golden eval 先写入推荐动作再发起推荐
- **THEN** 评测 SHALL 断言动作证据进入下一次推荐
- **AND** 评测 SHALL 断言运行摘要包含动作证据聚合字段
- **AND** 评测 SHALL 断言原始 query 不被写入摘要

