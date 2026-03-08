## 1. 前端回填逻辑

- [x] 1.1 在 `UploadModal.jsx` 的 `handleParseWeChat` 成功分支中，添加：若 `eventLink` 为空，则调用 `setEventLink(wechatUrl)`
- [x] 1.2 在 `handleClearParsedData` 函数中，添加 `setEventLink('')` 以同步清空活动链接字段
