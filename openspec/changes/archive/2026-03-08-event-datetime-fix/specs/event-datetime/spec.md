## ADDED Requirements

### Requirement: 活动日期支持时间精度到30分钟

活动的开始日期和截止日期 SHALL 支持精确到分钟的时间输入，存储格式为 `YYYY-MM-DDTHH:MM`。系统 SHALL 向后兼容仅含日期的旧格式 `YYYY-MM-DD`，在展示时将其视为 `00:00`。

#### Scenario: 用户输入带时间的活动日期
- **WHEN** 用户在活动表单中填写开始日期和截止日期
- **THEN** 输入控件 SHALL 为 `datetime-local` 类型，步长为 30 分钟
- **THEN** 提交后存储的值格式为 `YYYY-MM-DDTHH:MM`（如 `2026-03-15T14:30`）

#### Scenario: 旧格式数据向后兼容
- **WHEN** 数据库中存储的日期为旧格式 `YYYY-MM-DD`
- **THEN** 系统 SHALL 正常展示该日期，不显示时间部分
- **THEN** 状态判断 SHALL 将其视为当天 `00:00` 处理

---

### Requirement: 活动日期范围正确展示

活动卡片和详情页 SHALL 在开始日期与截止日期不同时，同时展示两个日期。展示格式 SHALL 为 `M.D HH:MM`（有时间时）或 `M.D`（无时间时）。

#### Scenario: 开始和截止日期不同时展示范围
- **WHEN** 活动的 `date` 和 `end_date` 不是同一天
- **THEN** 展示格式 SHALL 为 `{开始M.D HH:MM} - {截止M.D HH:MM}`
- **THEN** 活动卡片和详情页 SHALL 均遵循此规则

#### Scenario: 开始和截止日期相同时展示单日
- **WHEN** 活动的 `date` 和 `end_date` 是同一天（日期部分相同）
- **THEN** 展示格式 SHALL 为单个日期 `M.D HH:MM`（或 `M.D`）
- **THEN** 不重复显示截止日期

#### Scenario: 仅有开始日期时展示单日
- **WHEN** 活动只有 `date`，`end_date` 为空
- **THEN** 展示格式 SHALL 为单个日期

---

### Requirement: 活动状态按截止日期判断

活动状态（即将开始 / 进行中 / 已结束）SHALL 以截止日期（`end_date`）为准判断"已结束"。当 `end_date` 存在时，当前时间超过 `end_date` 对应的 datetime 后，状态 SHALL 变为"已结束"。

#### Scenario: 有截止日期时状态判断
- **WHEN** 活动有 `end_date`，且当前时间早于 `date`
- **THEN** 状态 SHALL 为"即将开始"

#### Scenario: 活动进行中
- **WHEN** 活动有 `end_date`，且当前时间在 `date` 和 `end_date` 之间（含边界）
- **THEN** 状态 SHALL 为"进行中"

#### Scenario: 活动已结束（按截止日期）
- **WHEN** 活动有 `end_date`，且当前时间晚于 `end_date`
- **THEN** 状态 SHALL 为"已结束"
- **THEN** 不得因为当前时间晚于 `date` 就判断为"已结束"（当 `end_date` 存在时）

#### Scenario: 无截止日期时的降级判断
- **WHEN** 活动没有 `end_date`
- **THEN** 系统 SHALL 以 `date` 当天结束（23:59:59）作为截止时间进行判断

---

### Requirement: AI 解析链接返回带时间的 datetime

微信链接 AI 解析功能 SHALL 返回 `YYYY-MM-DDTHH:MM` 格式的 `date` 和 `end_date` 字段。前端 SHALL 将解析结果直接填充到 `datetime-local` 输入控件，无需额外转换。

#### Scenario: AI 解析成功返回 datetime
- **WHEN** 用户输入微信公众号链接并触发 AI 解析
- **THEN** 解析结果中的 `date` 和 `end_date` SHALL 为 `YYYY-MM-DDTHH:MM` 格式
- **THEN** 前端 SHALL 将其直接填充到开始时间和截止时间输入框

#### Scenario: AI 无法提取时间时的降级
- **WHEN** AI 解析无法从文章中提取具体时间
- **THEN** `date` 和 `end_date` SHALL 返回 `YYYY-MM-DDT00:00` 格式（日期已知，时间默认为 00:00）
- **THEN** 用户可手动修正时间部分

---

### Requirement: 添加到日历功能支持时间

"添加到 Google Calendar"和"下载 ICS"功能 SHALL 在活动有时间信息时，使用带时间的 datetime 格式（而非全天事件格式）。

#### Scenario: 有时间信息时导出为 datetime 事件
- **WHEN** 活动的 `date` 包含时间部分（格式为 `YYYY-MM-DDTHH:MM`）
- **THEN** Google Calendar URL 中的 dates 参数 SHALL 使用 `YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS` 格式
- **THEN** ICS 文件中 SHALL 使用 `DTSTART:YYYYMMDDTHHMMSS` 格式（不带 `VALUE=DATE`）

#### Scenario: 无时间信息时保持全天事件格式
- **WHEN** 活动的 `date` 仅含日期部分（旧格式 `YYYY-MM-DD`）
- **THEN** 导出格式 SHALL 保持现有的全天事件格式（`DTSTART;VALUE=DATE:YYYYMMDD`）
