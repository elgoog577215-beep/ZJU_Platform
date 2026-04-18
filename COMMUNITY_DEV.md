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

若前端与后端不同源，需在后端 `CORS_ALLOWED_ORIGINS` 中加入前端 origin；`CORS_ORIGIN` 仅保留兼容旧配置。生产环境建议显式填写完整 allowlist，而不是只补单个域名字段。

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

## 身份显示与关注通知（change: community-identity-and-follow-notifications）

- **作者显示**：`photos/music/videos/articles/events/news` 六种资源的作者字段统一走 `COALESCE(u.nickname, u.username) AS author_name`，用户没设昵称也会显示 username，不再出现"匿名用户"文案兜底。`getFollowingFeed` 保留现有 `author_nickname` / `author_username` 分字段，前端依赖未破坏。
- **昵称唯一性**：`users.nickname` 有 partial unique index（`WHERE nickname IS NOT NULL`），历史 NULL 值不参与约束。`PUT /users/:id` 冲突返 `409 { error: "该昵称已被使用" }`（固定文案，不含占用者 id/username）；长度 2-20、只允许中英数下划线；前端在 PublicProfile settings tab 暴露输入框。
- **匿名功能**：已撤销（2026-04-18）。由于 nickname 可自由编辑，opt-in 匿名没有实质隐私价值。`community_posts.is_anonymous` 列保留在 schema 里做 backward compat，但恒为 0；`serializeCommunityPost` helper 保留为 identity pass-through（签名稳定以便未来扩展）。
- **关注通知 fan-out**：6 种资源（photos/music/videos/articles/events/news）发布成功后，`notificationController.fanOutNewContent()` 同步写每个粉丝一条 `type='new_content'` 通知，content 固定 `"{作者名} 发布了新{类型}《{标题}》"`；`banned` 用户 + `deleted_at` 非空的粉丝跳过。**社区帖（help/team）不 fan-out**（范围外，避免高频刷屏）。前端零改动——`NotificationCenter` 复用既有 60 秒轮询 + 铃铛红点。
- **关注关系**：self-follow 禁止，`POST/DELETE /users/:id/follow` 在 `req.user.id === req.params.id` 时返 400 `"不能关注自己"`。前端 PublicProfile `isOwner` 时隐藏关注按钮。
- **主页内容聚合**：`GET /users/:id/resources` 返回 7 种内容（photos/videos/music/articles/events/news + community_posts 的 help/team），按 `created_at DESC` 混排。访客看到所有 `status='approved'` 的内容（匿名功能已撤销，无需脱敏）。PublicProfile 前端用类型 tabs 展示，卡片保留大图 grid 风格。
- **详情页头像跳转**：`CommunityDetailModal` 的作者头像可点击 `navigate('/user/:uploader_id')`；仅在 `uploader_id` 为 null 时（删号孤儿资源）灰底 `cursor: not-allowed`。
- **新通知路由**：`NotificationCenter` 的 `NEW_CONTENT_ROUTE_BUILDERS` 为 `new_content` 类型按 resource_type 映射：article→`/articles?id=X`, photo→`/gallery?id=X`, music→`/music?id=X`, video→`/videos?id=X`, event→`/events?id=X`, news→`/articles?tab=tech&news=X`。news 没独立路由，走 `/articles` 的 news 参数位。
