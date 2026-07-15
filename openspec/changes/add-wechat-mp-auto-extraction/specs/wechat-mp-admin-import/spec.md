# wechat-mp-admin-import 规格变更

## ADDED Requirements

### Requirement: 自动采集文章进入信息提取链路

系统 SHALL 将每日增量采集成功获取正文的文章送入现有 `wechat_event_parse` 信息提取能力。

#### Scenario: 正文采集成功后自动提取

- **GIVEN** 增量任务已启用自动提取且公众号文章正文已成功获取
- **WHEN** 任务保存该文章
- **THEN** 系统 SHALL 调用现有公众号活动信息提取器
- **AND** SHALL 保存结构化活动候选和提取完成状态
- **AND** SHALL 保留原文链接供管理员复核

#### Scenario: 提取失败不阻断采集

- **GIVEN** 某篇文章的 AI 提取调用失败
- **WHEN** 增量任务继续处理文章列表
- **THEN** 系统 SHALL 记录失败状态和错误原因
- **AND** SHALL 继续处理后续文章
- **AND** 后续增量任务 SHALL 可以再次尝试该文章

#### Scenario: 已完成文章不重复提取

- **GIVEN** 某篇文章已经保存 `completed` 提取结果
- **WHEN** 后续任务再次发现相同文章链接
- **THEN** 系统 SHALL NOT 重复调用 AI 提取器

#### Scenario: 管理员关闭自动提取

- **GIVEN** 管理员关闭每日采集的自动提取开关
- **WHEN** 任务采集文章和正文
- **THEN** 系统 SHALL 保留原始文章和正文
- **AND** SHALL NOT 调用 AI 提取器
