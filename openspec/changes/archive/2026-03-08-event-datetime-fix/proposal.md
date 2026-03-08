## Why

活动模块存在三个相互关联的日期/时间问题：展示层只显示单个日期（即使有截止日期）、活动状态"已结束"按开始日期而非截止日期判断、以及日期精度只到天级别（缺少时间），导致用户无法准确了解活动时间范围和当前状态。

## What Changes

- 修复活动卡片和详情页的日期展示逻辑，确保开始日期和截止日期都正确显示
- 修复活动状态判断逻辑，改为以截止日期（end_date）为准判断"已结束"
- 将活动日期精度从"天"升级为"30分钟粒度的时间"（datetime），支持 `YYYY-MM-DDTHH:MM` 格式
- 更新 UploadModal 中的日期输入控件，从 `type="date"` 改为 `type="datetime-local"`，步长设为 30 分钟
- 更新 AI 自动解析（微信链接解析）的 LLM prompt，要求返回带时间的 datetime 字段，并更新前端对解析结果的处理逻辑
- 更新 `formatDateTime` 展示函数，支持显示时间部分（HH:MM）
- 更新 `isSameDay` 逻辑，在有时间信息时仍能正确比较日期部分
- 数据库 `date` 和 `end_date` 字段保持 TEXT 类型，存储格式从 `YYYY-MM-DD` 升级为 `YYYY-MM-DDTHH:MM`（向后兼容旧数据）

## Capabilities

### New Capabilities

- `event-datetime`: 活动日期时间管理能力——支持带时间的开始/截止日期输入、展示与状态判断

### Modified Capabilities

（无独立 spec 需要修改，event-datetime 为新增能力）

## Impact

- `src/components/Events.jsx`：`getEventLifecycle`、`formatDateTime`、`isSameDay`、日期展示 JSX
- `src/components/UploadModal.jsx`：日期输入控件、AI 解析结果处理（`handleParseWeChat`）
- `server/src/utils/wechat.js`：`parseWithLLM` 的 LLM prompt，要求返回 `YYYY-MM-DDTHH:MM` 格式
- 数据库：无 schema 变更，TEXT 字段向后兼容
- i18n：可能需要更新日期相关的翻译 key（如时间格式提示）
