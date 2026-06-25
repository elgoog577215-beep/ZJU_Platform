## Why

ZJU_Platform 长期按功能增量扩张：运行时 schema 补丁散落在 controller 中，API 错误形状按端点各写各的，前端弹层行为由页面重复实现，AI JSON runtime 把 provider 调用、修复和 telemetry 混在一起，i18n 合规也依赖人工记忆。

本 change 建立一组小而稳定的平台底座，让后续功能优先遵守统一边界，而不是继续发明局部模式。

## What Changes

- 定义后端边界为 `route -> controller -> application service -> data/helper`，schema 变更只进入 migration。
- 保留 SQLite 和现有 migration runner，但把可复用 migration helper 移出请求处理器。
- 统一 API 错误响应为 `{ error, code?, details? }`。
- client 自动重试默认只允许 GET，写操作除非调用方显式选择。
- auth token 默认存入 `sessionStorage`；只有显式持久登录才使用 `localStorage`。
- 增加共享 body-level overlay portal，作为移动端安全弹层底座。
- 建立第一批 `src/app`、`src/features`、`src/shared` 目录，不做全仓搬家。
- 从 provider/repair flow 中拆出 AI JSON runtime 返回组装。
- 将 `resource_search_index.vector_json` 明确记录为轻量词元索引，而不是真实 embedding。
- 增加 migration、API retry policy、错误形状和标签更新的聚焦回归检查。

## Non-Goals

- 不切换 SQLite。
- 不引入微服务、TypeScript 或新 UI 框架。
- 不一次性重写所有大组件。
- 不改变公开 `/api/search` 或活动助手 API 响应协议。
- 本轮不把 auth 迁移到 httpOnly cookie。

## Impact

- 后端：migration helper、tag/profile-card controller、全局错误处理器、AI runtime 内部结构。
- 前端：API client retry/auth storage 策略，以及共享 overlay portal 工具。
- 文档/OpenSpec：后续工作的底座规则。
- 测试：聚焦 node 测试和轻量 source-policy 测试。
