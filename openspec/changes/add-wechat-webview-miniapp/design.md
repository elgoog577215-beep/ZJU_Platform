# 设计

## 1. 总体架构

第一期采用“微信小程序壳 + 网站 WebView + 原生桥接页”的混合方案。

- 小程序主体：`wechat-miniprogram/`
- 主页面：`pages/webview/index`
- 默认入口：`https://tuotuzju.com/events?miniapp=1&utm_source=wechat_miniprogram`
- 网站模式标记：`miniapp=1`
- 内容同步：网站和小程序都使用同一网站页面、同一 Express API、同一数据库。

小程序不直接访问数据库，不复制后台，不维护第二套内容管理系统。

## 2. 路径策略

小程序 `web-view` 只允许打开平台核心公开路径：

- `/events`
- `/articles`
- `/projects`
- `/hackathon`
- `/about`
- `/profiles`
- `/u/*`
- `/org/*`
- `/user/*`
- `/media`
- `/gallery`
- `/videos`

以下路径在小程序内禁止或回退到 `/events`：

- `/admin`
- `/download`
- `/app`
- `/api`
- `/uploads`
- `/downloads`

这样可以减少审核风险，也避免小程序内出现后台、APK 下载、API JSON 或文件下载。

## 3. 网站端小程序运行态

网站端新增小程序 WebView 环境识别能力：

- URL 带 `miniapp=1` 时进入小程序模式。
- 当前会话保存小程序模式，避免站内跳转后丢失标记。
- 微信 WebView 可通过 `servicewechat.com` referrer 或 `__wxjs_environment=miniprogram` 辅助识别。

小程序模式下：

- 不注册或更新 PWA service worker。
- 不显示 PWA 安装提示。
- 导航隐藏下载入口和后台入口。
- `/download`、`/app`、`/admin` 在网站路由层重定向到 `/events?miniapp=1`。

## 4. 原生桥接页

第一期保留“WebView 承载主体 + 原生页调用微信 API”的边界：

- `pages/login/index`：承载微信登录。网页登录弹窗在小程序环境中跳转到该页，该页调用 `wx.login` 获取 code，再请求后端 `/api/auth/wechat-miniapp/login`。
- `pages/subscribe/index`：后续用于 `wx.requestSubscribeMessage`，当前仍作为订阅能力占位页。
- `pages/fallback/index`：加载失败、路径非法或能力未配置时兜底。

微信登录链路：

1. 网站登录弹窗在 `miniapp=1` 会话中展示“微信一键登录”。
2. 网页通过微信 JSSDK 的 `wx.miniProgram.navigateTo` 进入 `pages/login/index`。
3. 原生页调用 `wx.login`，只把临时 code 发给后端。
4. 后端从环境变量读取 `WECHAT_MINIAPP_APPID` 和 `WECHAT_MINIAPP_SECRET`，调用 `code2Session` 换取 openid。
5. 后端用 `wechat_miniapp_identities` 绑定 openid 与现有 `users` 记录；若首次登录，则创建普通用户。
6. 后端签发现有 JWT，小程序把 token 带回允许的 WebView 路径。
7. React 应用消费 `wechat_login_token` 后立即清理 URL，并通过 `/auth/me` 刷新登录态。

安全边界：

- `AppSecret` 只存在于服务端环境变量，不进入前端、小程序包或 Git。
- 小程序端不保存 `session_key`；后端也只保存 `session_key_hash` 便于后续排查和轮换。
- 当前 MVP 为了复用现有登录态，回跳时短暂携带 JWT query；React 首屏消费后会 `replace` 清理。后续若要进一步收紧，可将该 query 替换成一次性 web ticket。

## 5. 域名与配置

第一期配置只使用占位 `appid`，真实值由微信公众平台提供后替换：

- WebView 业务域名：`https://tuotuzju.com`
- 生产 API：继续使用同源 `/api`
- 小程序项目：不提交上传密钥、真实 AppSecret、订阅模板 ID。

域名上线前必须完成 HTTPS、ICP 备案、业务域名校验文件和微信后台配置。

## 6. 回滚策略

该方案不涉及数据迁移。若出现问题：

- 删除或回滚 `wechat-miniprogram/`。
- 回滚网站端小程序运行态识别和导航隐藏逻辑。
- 网站、后端、数据库和 Android/iOS WebView 既有能力不受影响。
