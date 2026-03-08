# 微信解析活动链接自动回填 Spec

## Requirements

### Requirement: 微信解析后自动回填活动链接
解析成功后，系统 SHALL 自动将用户输入的微信 URL 填入"活动链接"字段，前提是该字段当前为空。

#### Scenario: 活动链接为空时自动填入
- **WHEN** 用户输入微信 URL 并触发解析，且 `eventLink` 字段当前为空
- **THEN** 解析成功后，`eventLink` 被设置为用户输入的微信 URL

#### Scenario: 活动链接已有值时不覆盖
- **WHEN** 用户输入微信 URL 并触发解析，且 `eventLink` 字段已有内容
- **THEN** 解析成功后，`eventLink` 保持原有值不变

### Requirement: 清除解析数据时同步清空活动链接
用户点击清除按钮时，系统 SHALL 同步清空 `eventLink` 字段。

#### Scenario: 清除操作清空活动链接
- **WHEN** 用户点击清除解析数据按钮
- **THEN** `eventLink` 字段被清空
