## Context

活动模块当前使用纯日期字符串（`YYYY-MM-DD`）存储开始和截止日期，数据库字段为 TEXT 类型。前端展示和状态判断逻辑分散在 `Events.jsx` 中，表单输入在 `UploadModal.jsx` 中，AI 解析在 `server/src/utils/wechat.js` 的 `parseWithLLM` 函数中。

当前已知问题（通过代码阅读确认）：

1. **日期展示 bug**：`formatDateTime` 函数在处理 `YYYY-MM-DD` 格式时，使用 `new Date(dateStr)` 解析，在某些时区下会因为 UTC 偏移导致日期提前一天，从而使 `isSameDay` 误判为同一天，导致截止日期不显示。
2. **状态判断**：`getEventLifecycle` 已经正确使用 `end_date` 判断状态（代码已读，逻辑正确），但 `end_date` 设为当天 `23:59:59` 的方式依赖于"全天"假设，引入时间后需要直接比较 datetime。
3. **时间精度**：输入控件为 `type="date"`，无时间信息；AI 解析 prompt 只要求 `YYYY-MM-DD` 格式。

## Goals / Non-Goals

**Goals:**
- 日期输入升级为 `datetime-local`，步长 30 分钟
- 存储格式升级为 `YYYY-MM-DDTHH:MM`（ISO 8601 local datetime，无时区后缀）
- 展示函数正确显示时间，并修复时区导致的 isSameDay 误判
- 状态判断直接比较 datetime，不再做 `setHours(23,59,59)` 补丁
- AI 解析 prompt 返回带时间的 datetime，前端正确填充
- 向后兼容旧的 `YYYY-MM-DD` 数据（解析时补 `T00:00`）

**Non-Goals:**
- 不做数据库 schema 迁移（TEXT 字段天然兼容）
- 不做历史数据批量更新
- 不引入时区支持（所有时间视为本地时间）
- 不修改 Google Calendar / ICS 导出逻辑（已有独立处理）

## Decisions

### 决策 1：存储格式用 `YYYY-MM-DDTHH:MM`，不带时区

**选择**：`YYYY-MM-DDTHH:MM`（如 `2026-03-15T14:30`）

**理由**：与 `<input type="datetime-local">` 的 `.value` 格式完全一致，无需转换即可双向绑定。数据库 TEXT 字段天然支持，字符串排序也正确。不带时区符合本项目"本地时间"的使用场景（校园活动，用户均在同一时区）。

**备选**：ISO 8601 with Z（UTC）→ 需要时区转换，增加复杂度，不适合本场景。

### 决策 2：`isSameDay` 修复方式

**选择**：改用字符串前缀比较（取 `dateStr.substring(0, 10)` 比较 `YYYY-MM-DD` 部分），完全绕开 `new Date()` 的时区问题。

**理由**：存储格式固定为 `YYYY-MM-DDTHH:MM` 或 `YYYY-MM-DD`，字符串前10位即为日期，无需解析。简单、可靠、无时区副作用。

### 决策 3：`formatDateTime` 展示逻辑

**选择**：从字符串中提取月日和时间，格式为 `M.D HH:MM`（有时间时）或 `M.D`（无时间时，兼容旧数据）。

**理由**：与现有 UI 风格一致（已用 `M.D` 格式），加时间后自然延伸为 `M.D HH:MM`。

### 决策 4：AI 解析 prompt 修改

**选择**：将 prompt 中 `date` 和 `end_date` 的格式要求从 `YYYY-MM-DD` 改为 `YYYY-MM-DDTHH:MM`，同时要求提取 `time` 字段并合并进 datetime。

**理由**：LLM 已经能提取 `time` 字段（如 `14:00-16:00`），直接要求返回完整 datetime 更简洁，避免前端再做合并。前端 `handleParseWeChat` 中注释掉的"Smart Time Merging"逻辑可以重新启用。

## Risks / Trade-offs

- **旧数据兼容**：数据库中已有 `YYYY-MM-DD` 格式的记录。`formatDateTime` 和 `getEventLifecycle` 需要在解析前检测格式并补 `T00:00`，否则 `new Date('2026-03-15')` 在部分环境下会被解析为 UTC 00:00，导致本地时间显示为前一天。→ 缓解：统一用字符串操作提取日期部分，不依赖 `new Date()` 做日期比较。
- **datetime-local 浏览器兼容性**：主流浏览器均支持，无风险。
- **30分钟步长**：`step="1800"`（秒）。用户仍可手动输入任意时间，step 只影响控件的步进按钮。→ 可接受。

## Migration Plan

1. 修改前端输入控件（UploadModal）→ 新建活动自动使用新格式
2. 修改展示和状态逻辑（Events.jsx）→ 兼容新旧格式
3. 修改 AI 解析 prompt（wechat.js）→ 新解析结果返回 datetime
4. 无需数据库迁移，旧数据在展示时自动降级为 `M.D`（无时间）

回滚：各文件独立修改，可逐文件回滚。

## Open Questions

- 是否需要在活动详情页的"添加到日历"（Google Calendar / ICS）功能中同步支持时间？当前该逻辑使用 `DTSTART;VALUE=DATE`（全天事件格式），引入时间后应改为 `DTSTART:YYYYMMDDTHHMMSS`。→ 建议在本次 tasks 中一并处理，避免日历导出时间错误。
