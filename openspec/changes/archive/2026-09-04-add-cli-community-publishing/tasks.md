# 任务

- [x] 扩展文档导入器，支持 TXT、HTML 和 CLI 文件夹入口文件。
- [x] 新增后端 CLI 控制器，提供 `/api/cli/import`、`/api/cli/publish`、`/api/cli/submissions`。
- [x] 在路由中挂载受认证保护的 CLI 接口，并保留上传白名单和大小限制。
- [x] 新增 `zju` CLI 工具，实现登录、身份、预览、发布、状态和退出命令。
- [x] 补充部署/使用说明，明确服务器需要开放 HTTPS、上传体积和 `/api` 访问。
- [x] 运行语法、导入解析和接口级验证。

## 验证记录

- 2026-06-29：`node -c server/src/controllers/cliController.js && node --check bin/zju.js` 通过。
- 2026-06-29：`node bin/zju.js help` 通过，确认登录、身份、预览、发布、状态和退出命令可见。
- 2026-06-29：`node --test server/tests/community-document-import.test.js` 通过，覆盖 Markdown、TXT、HTML、非法格式和空内容。
- 2026-06-29：`server/src/routes/api.js` 已挂载 `/api/cli/import`、`/api/cli/publish`、`/api/cli/submissions`，均经过 `authenticateToken`，上传入口复用 `cliDocumentUpload`。
