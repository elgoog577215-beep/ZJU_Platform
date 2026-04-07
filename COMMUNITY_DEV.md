# 社区模块本地联调（`/community`）

## 原型高保真 UI

实现说明、文件清单、布局/token/播客/i18n 等详见 **[docs/community-prototype-mirror.md](docs/community-prototype-mirror.md)**。

## 前置

1. **后端**：`server` 默认端口 **5181**（见 `server/index.js` 中 `PORT`）。根路径挂载 `app.use('/api', apiRoutes)`。
2. **前端**：Vite 开发服务器将 `/api`、`/uploads` 代理到 `http://localhost:5181`，可通过环境变量覆盖：
   - `VITE_API_PROXY_TARGET`（例如 `http://127.0.0.1:5181`）
3. **生产构建**：前端使用相对路径 **`/api`**，应与静态资源同源或由网关反代。

## 启动示例

```bash
# 终端 1 — 后端
cd server
npm install   # 若尚未安装
node index.js # 或 npm run start，以仓库 scripts 为准

# 终端 2 — 前端
cd ..
npm install
npm run dev
```

浏览器访问 **`/community`**，应重定向至 **`/community/help`**；二层导航仅在该路径下显示。

## CORS / 环境变量

若前端与后端不同源，需在 `server` 的 `allowedOrigins`（或项目等价配置）中加入前端 dev origin，并核对 `FRONTEND_URL` 等文档字段。

## 冒烟

- `GET /api/health`：应返回 `status: healthy`（见 `server/src/routes/api.js`）。
- `GET /api/auth/me`：需在请求头带 `Authorization: Bearer <token>`（与 `src/services/api.js` 拦截器一致）。
- 开发环境下进入社区任意子路径时，控制台可对上述结果输出警告日志（见 `CommunityLayout`）。

## 待办（产品 / OpenSpec）

- **版块 ↔ 存储**：各子版块如何映射到 `articles.tag`、category 或新表，确认前不写生产发帖逻辑（任务 2.4）。

## 规格自检（tasks 5.2）

- `community-spa-integration`：嵌套路由、二层导航仅 `/community`、深链、令牌化样式、认证复用。
- `community-api-parity`：`/api` 前缀、生产同源、`platformClient` 结构化错误、无内嵌凭据、写操作依赖映射确认。

## BREAKING（5.3）

当前新增 **`/community/*`**，未改现有资源路径；若今后调整 slug，需配置重定向并更新发布说明。
