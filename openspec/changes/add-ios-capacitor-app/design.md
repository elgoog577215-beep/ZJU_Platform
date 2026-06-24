# 设计

## 1. 总体路径

本轮采用 Capacitor 作为 iOS 壳层，核心思想是“Web 应用继续作为产品主体，iOS 工程只承载平台边界”。

推荐结构：

- Web 主体：React + Vite + TailwindCSS，继续由 `npm run build` 产出。
- iOS 壳层：Capacitor 生成 `ios/`，使用 WKWebView 承载站点。
- 生产入口：默认加载 `https://tuotuzju.com/`。
- 本地调试入口：通过 Capacitor `server.url` 临时指向本机或局域网开发服务。

这样可以复用 Android TWA 已经证明过的路线：先保证可安装、可启动、可诊断，再逐步补齐平台能力。

## 2. 为什么不用纯原生重写

当前项目核心资产在 Web：

- 活动、AI 社区、个人中心、内容库和后台都已在 React 中实现。
- 移动端已有 bottom nav、content toolbar、全屏覆盖层、PWA install prompt、`standalone` 运行态判断等经验。
- 后端 API 和认证流程已经围绕 Web 客户端稳定运行。

纯原生重写会带来路由、状态、样式、国际化、内容渲染、上传、富文本和权限体系的重复建设。当前阶段更适合用 WKWebView 先建立 iOS 发布通道，并把差异收敛在壳层和少量 Web 适配里。

## 3. Capacitor 配置原则

`capacitor.config.*` 应当显式声明：

- `appId`：建议使用反向域名，例如 `com.tuotuzju.app` 或后续确认的 iOS bundle id。
- `appName`：与现有品牌名一致。
- `webDir`：默认 `dist`。
- `server`：
  - 生产构建默认不写死本地地址。
  - 开发调试可以临时设置 `url` 指向 `http://localhost:5180` 或局域网地址。
  - iOS scheme 使用 Capacitor 默认安全配置，除非确有兼容问题再调整。

配置中不得提交个人 Team ID、证书、Provisioning Profile、Apple ID、密码或私有 token。

## 4. WKWebView 与域名边界

iOS App 应优先只承载可信域名：

- 主域名：`tuotuzju.com`
- API 域名：如果生产 API 与主站同域，优先继续同域。
- 外部链接：默认交给系统浏览器或 SFSafariViewController，不在 App 内无边界跳转。

如后续启用 WKWebView App-Bound Domains，应把可信域名写入 `Info.plist` 的 `WKAppBoundDomains`，并避免动态加载任意第三方站点。这样可以减少审核和安全风险，也让 WebView 行为更可控。

## 5. 登录、Cookie 与会话

当前 Web 登录逻辑需要在 WKWebView 中验证：

- 登录成功后 Cookie 或 token 是否在 WKWebView 内稳定保存。
- App 重启后会话是否符合预期。
- 登出是否能清理本地状态。
- 跨域 API 请求是否携带凭据。

如果生产 API 与页面不同域，需要明确 CORS、SameSite、Secure 和 HTTPS 配置。不得为了 WebView 便利降低 Cookie 安全级别。

## 6. iOS 交互适配

需要重点验证和必要时修正：

- 安全区：顶部刘海、底部 Home Indicator 不遮挡导航、按钮、toast 和 sheet。
- 键盘：登录、搜索、发布、评论、资料编辑时键盘不遮挡输入框和提交按钮。
- 返回：App 内路由返回、modal 关闭、详情页返回要符合移动端预期。
- 外链：外部网页、下载链接、邮件、电话、地图等 URL scheme 要有明确处理。
- 文件上传：头像、资料封面、投稿图片、文档上传在 WKWebView 中可用。
- 首屏：App 启动不主动加载桌面 3D 背景和大型 chunk。

## 7. 缓存与离线

现有 PWA Service Worker 已经做过首轮缓存收敛。iOS App 中需要继续遵守：

- Precache 只保留 App Shell 与必要静态文件。
- 大型页面 chunk、Three.js、PDF、Mammoth、后台管理等资源按访问 runtime cache。
- 若 App 使用远端站点，不把本地 `dist` 与远端资源混用为不可解释的状态。
- 遇到缓存异常时，文档要提供清理 WebView 缓存或重装 App 的排查路径。

## 8. 构建与文档

实现阶段应新增 `docs/guides/ios-capacitor-app-guide.md`，至少包含：

- 依赖安装。
- 初始化 / 同步 Capacitor。
- 本地开发连接方式。
- macOS + Xcode 构建步骤。
- 真机调试步骤。
- 常见故障排查。
- 证书、签名和隐私材料不得提交的边界。

Windows 环境可以完成代码和配置准备；真正的 iOS archive、签名、TestFlight 和 App Store Connect 操作需要在 macOS 上完成。

## 9. 验证策略

最小验证顺序：

1. Web 构建：`npm run build`。
2. Capacitor 同步：`npx cap sync ios`。
3. Xcode 打开 iOS 工程并构建。
4. iOS 模拟器打开首页、活动页、AI 社区、个人中心。
5. 真机验证登录、详情页、发布/上传、键盘、安全区、外链。
6. 对比 Android TWA 和 Web/PWA，确认没有引入共享配置回归。

## 10. 回滚

iOS 工程应作为独立新增能力。若出现问题：

- 删除或回滚 `ios/`、`capacitor.config.*`、Capacitor 依赖和脚本即可恢复 Web/Android 现状。
- 不涉及数据库迁移。
- 不修改 Android TWA 的签名和构建配置。
