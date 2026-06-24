## ADDED Requirements

### Requirement: 微信解析直接产出标准活动分类
微信活动解析 SHALL 在调用模型时提供共享活动标准库上下文，并要求模型直接返回标准 `category` 值。系统 MUST NOT 依赖先返回旧版自由分类、再由另一个流程二次映射为标准分类的主路径。

#### Scenario: 模型收到标准分类选项
- **WHEN** 用户提交微信公众号链接并触发活动解析
- **THEN** 服务端 SHALL 在模型提示中提供标准活动大类及其含义
- **THEN** 模型输出协议 SHALL 要求 `category` 只能是标准大类值之一

#### Scenario: 解析结果通过标准库校验
- **WHEN** 模型返回活动 JSON
- **THEN** 服务端 SHALL 使用共享活动智能服务校验 `category` 和 `target_audience`
- **THEN** 返回给前端的解析结果 SHALL 包含标准化后的 `category`

#### Scenario: 旧版标签不再成为主分类来源
- **WHEN** 模型返回 `tags`
- **THEN** `tags` SHALL 作为补充主题信号
- **THEN** 系统 MUST NOT 使用旧版标签列表替代标准 `category`

### Requirement: 微信解析保留置信度和归类原因
微信活动解析 SHALL expose classification confidence and reason metadata when available so admins can understand uncertain parsing results before publishing.

#### Scenario: 模型或服务提供归类原因
- **WHEN** 模型返回归类原因或服务端完成归类推断
- **THEN** 解析结果 SHALL include category confidence or reason metadata when available
- **THEN** missing metadata MUST NOT block successful parsing if the normalized category is valid
