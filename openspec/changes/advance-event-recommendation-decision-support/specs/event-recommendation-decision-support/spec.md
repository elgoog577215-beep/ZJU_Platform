## ADDED Requirements

### Requirement: 推荐结果必须提供结构化决策辅助

活动推荐助手 SHALL 为每条推荐提供结构化决策辅助，帮助用户判断下一步动作、活动取舍、适合理由和注意事项。

#### Scenario: 用户收到活动推荐
- **WHEN** 活动推荐助手返回推荐结果
- **THEN** 每条推荐的 `opportunityMatch.decisionSupport.nextAction` SHALL 是可读的短文本
- **AND** 每条推荐的 `opportunityMatch.decisionSupport.tradeoffs` SHALL 是数组
- **AND** 每条推荐的 `opportunityMatch.decisionSupport.fitFor` SHALL 是数组
- **AND** 每条推荐的 `opportunityMatch.decisionSupport.watchouts` SHALL 是数组

### Requirement: 决策辅助不得编造活动事实

系统 SHALL 只基于候选活动事实、硬约束诊断、匹配信号、缺失项、不确定项和排序位置生成决策辅助。

#### Scenario: 生成下一步动作和取舍点
- **WHEN** 后端构建 `decisionSupport`
- **THEN** 文案 MUST NOT 声称未提供的报名状态、奖励、地点、时间或主办方事实
- **AND** 历史活动 SHALL 明确提示只能作为同类机会参考
- **AND** 存在缺失项或不确定项时 SHALL 给出可补充偏好提示

### Requirement: 推荐卡片必须展示决策辅助摘要

前端活动推荐卡片 SHALL 展示下一步动作和关键取舍点，同时保持原有机会匹配、诊断和反馈流程可用。

#### Scenario: 桌面和移动端查看推荐卡片
- **WHEN** 推荐响应包含 `decisionSupport`
- **THEN** 卡片 SHALL 展示下一步动作
- **AND** 卡片 SHALL 展示至少一条取舍点或适合理由
- **AND** 用户仍 SHALL 能提交适合或不适合反馈

### Requirement: 决策辅助必须可观测和可评测

系统 SHALL 在运行摘要和自动化评测中覆盖决策辅助，防止后续改动退化为仅有推荐解释。

#### Scenario: 推荐运行完成
- **WHEN** 活动推荐助手完成一次推荐
- **THEN** `ai_assistant_runs.summary_json` SHALL 记录有下一步动作的推荐数量
- **AND** `ai_assistant_runs.summary_json` SHALL 记录取舍点和注意事项数量

#### Scenario: 运行 golden eval
- **WHEN** 运行活动推荐 golden eval
- **THEN** 评测 SHALL 断言推荐结果包含 `decisionSupport`
- **AND** 评测 SHALL 断言运行摘要包含决策辅助指标
