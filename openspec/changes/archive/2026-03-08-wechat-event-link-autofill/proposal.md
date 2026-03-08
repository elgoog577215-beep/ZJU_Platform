## Why

当管理员通过微信链接解析活动时，解析完成后"活动链接"字段仍然是空的，需要手动复制粘贴原始微信 URL。这个字段本来就应该填原始来源链接，而来源链接在解析时已经存在，自动填入是零成本的体验改善。

## What Changes

- 微信解析成功后，自动将原始微信 URL 填入"活动链接"（`eventLink`）字段
- 仅在该字段当前为空时才自动填入（不覆盖用户已手动填写的值）
- 清除解析数据时，同步清空 `eventLink` 字段

## Capabilities

### New Capabilities

- `wechat-event-link-autofill`: 微信解析后自动回填活动链接字段

### Modified Capabilities

（无需求层面变更）

## Impact

- 仅影响 `src/components/UploadModal.jsx` 中的 `handleParseWeChat` 和 `handleClearParsedData` 函数
- 无后端改动，无 API 变更，无数据库变更
