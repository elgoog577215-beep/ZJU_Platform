# 平台底座规则

这份文档记录第一版全栈底座统一规则。它不是大重写计划，而是后续写代码时必须先遵守的边界。

## 后端边界

后端默认分层为：

```text
route -> controller -> application service -> data/helper
```

- `route` 只组合 URL、中间件和 controller。
- `controller` 只做 HTTP 入参、状态码、调用 service 和返回 JSON。
- `service` 承担业务判断、跨表流程和应用用例。
- `data/helper` 承担 SQL、序列化、迁移辅助和外部基础设施。
- schema 变更只允许在 migration/config 层出现，不能放进 controller 或热请求路径。

## 数据迁移

- 继续使用 SQLite 和现有 `runMigrations`。
- 迁移必须幂等。
- 通用迁移函数放在 `server/src/config/migrations/`。
- controller 发现缺列时应失败并暴露问题，不应现场 `ALTER TABLE`。

## API 协议

- 错误响应统一为 `{ error, code?, details? }`。
- 前端共享 API client 只自动重试 GET。
- 写操作如果确实幂等，调用方必须显式开启重试。
- 第一版继续使用 Bearer JWT；默认 token 只存在 `sessionStorage`。

## 前端应用壳

- 新代码优先放进 `src/app`、`src/features`、`src/shared`。
- 旧大组件不一次性搬家，改到哪里，就把该处状态、数据和 UI 边界顺手收紧。
- 全屏弹层使用共享 body portal，移动端默认按 `100dvh` 和 body scroll lock 设计。

## i18n 与主题

- 新增用户可见文案必须同步 `public/locales/zh/translation.json` 与 `public/locales/en/translation.json`。
- 白天/黑夜主题优先复用现有 token/helper，避免散落颜色。

## AI 与搜索

- AI runtime 分为 provider 调用、JSON 解析/修复、结果装配/遥测。
- 活动推荐助手和全站搜索继续保持不同入口。
- `resource_search_index.vector_json` 是轻量词元索引，不是 embedding。接入真实 embedding 前，产品文案和注释都不能把它描述成向量语义检索。
