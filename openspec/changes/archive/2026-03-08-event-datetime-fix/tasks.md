## 1. 修复日期展示与 isSameDay 逻辑（Events.jsx）

- [x] 1.1 重写 `isSameDay(d1, d2)`：改用字符串前缀比较（`substring(0, 10)`），彻底绕开 `new Date()` 时区问题
- [x] 1.2 重写 `formatDateTime(dateStr)`：从字符串中提取月日和时间部分，格式为 `M.D HH:MM`（有时间）或 `M.D`（无时间/旧格式），不依赖 `new Date()` 做日期解析
- [x] 1.3 验证活动卡片（EventCard）和详情页中日期范围展示逻辑，确认 `isSameDay` 修复后截止日期能正确显示

## 2. 修复活动状态判断逻辑（Events.jsx）

- [x] 2.1 重写 `getEventLifecycle(date, endDate, t)`：移除 `end.setHours(23, 59, 59, 999)` 补丁，直接用 `new Date(endDate)` 与当前时间比较（datetime 格式已含时间，旧格式 `YYYY-MM-DD` 补 `T23:59:59` 作为降级）
- [x] 2.2 验证：有 `end_date` 时，状态以 `end_date` 为准；无 `end_date` 时，以 `date` 当天结束为准

## 3. 升级活动表单日期输入（UploadModal.jsx）

- [x] 3.1 将活动表单中开始日期和截止日期的 `<input type="date">` 改为 `<input type="datetime-local" step="1800">`
- [x] 3.2 更新 `value` 绑定：`datetime-local` 的值格式为 `YYYY-MM-DDTHH:MM`，移除 `.split('T')[0]` 截断逻辑
- [x] 3.3 更新 `onChange` 处理：直接使用 `e.target.value`（已为 `YYYY-MM-DDTHH:MM` 格式），无需额外处理
- [x] 3.4 验证编辑模式（`initialData`）下，旧格式 `YYYY-MM-DD` 数据能正确回填到 `datetime-local` 控件（需补 `T00:00` 后缀）

## 4. 更新 AI 解析 prompt 和前端处理（wechat.js + UploadModal.jsx）

- [x] 4.1 修改 `server/src/utils/wechat.js` 中 `parseWithLLM` 的 prompt：将 `date` 和 `end_date` 的格式要求从 `YYYY-MM-DD` 改为 `YYYY-MM-DDTHH:MM`，要求 LLM 将提取到的 `time` 字段（如 `14:00-16:00`）合并进 datetime，不再单独返回 `time` 字段
- [x] 4.2 修改 `UploadModal.jsx` 中 `handleParseWeChat` 的结果处理：直接用 `data.date` 和 `data.end_date` 填充 `eventDate` 和 `eventEndDate`（已为 datetime 格式，无需合并）；移除或更新注释掉的"Smart Time Merging"代码

## 5. 更新日历导出功能（Events.jsx）

- [x] 5.1 修改 `handleAddToGoogleCalendar`：检测 `date` 是否含时间部分（`includes('T')`），若有则使用 `YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS` 格式；否则保持现有全天事件格式
- [x] 5.2 修改 `handleDownloadICS`：同上，有时间时使用 `DTSTART:YYYYMMDDTHHMMSS`，无时间时保持 `DTSTART;VALUE=DATE:YYYYMMDD`

## 6. 验证与收尾

- [x] 6.1 手动测试：新建一个带时间的活动，验证卡片展示、详情页展示、状态判断均正确
- [x] 6.2 手动测试：编辑一个旧格式（仅日期）的活动，验证回填正常、保存后展示正常
- [x] 6.3 手动测试：触发 AI 解析，验证解析结果填充到 datetime-local 控件正常
- [x] 6.4 检查 i18n 翻译文件，如有日期格式相关的提示文字（如 placeholder），更新为包含时间的说明
