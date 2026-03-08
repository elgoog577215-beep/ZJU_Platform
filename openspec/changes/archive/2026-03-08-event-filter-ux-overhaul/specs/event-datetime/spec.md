## MODIFIED Requirements

### Requirement: 活动状态按截止日期判断

活动状态（即将开始 / 进行中 / 已结束）SHALL 以截止日期（`end_date`）为准判断"已结束"。当 `end_date` 存在时，当前时间超过 `end_date` 对应的 datetime 后，状态 SHALL 变为"已结束"。活动列表的默认排序 SHALL 为 `date_desc`（按活动日期从晚到早），使状态为"即将开始"的活动自然排在最前，"已结束"的活动排在末尾。

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

#### Scenario: 默认排序使未来活动排最前
- **WHEN** 用户访问活动列表，未手动选择排序
- **THEN** 活动 SHALL 按 `date DESC` 排序，日期最晚（最远未来）的活动排最前
- **THEN** 已结束的活动（date 最早）SHALL 排在列表末尾
