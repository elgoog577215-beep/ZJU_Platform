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

第一期先提供桥接页骨架，不绑定真实微信密钥：

- `pages/login/index`：后续用于 `wx.login`，当前提示桥接能力待配置。
- `pages/subscribe/index`：后续用于 `wx.requestSubscribeMessage`，当前提示订阅能力待配置。
- `pages/fallback/index`：加载失败、路径非法或能力未配置时兜底。

后续接入真实微信登录时，必须由后端使用 `AppSecret` 调用 `code2Session`，网页和小程序端不得保存或暴露 `AppSecret`。

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
