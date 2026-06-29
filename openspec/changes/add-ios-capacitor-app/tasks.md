# tasks

## 0. 前置确认

- [x] 0.1 确认 iOS bundle id：默认候选 `com.tuotuzju.app`，如与 Android 包名共用需确认 Apple Developer 后台可用。
- [x] 0.2 确认 iOS App 名称、图标、启动页颜色和品牌文案。
- [x] 0.3 确认生产入口是否固定为 `https://tuotuzju.com/`。
- [ ] 0.4 确认 macOS + Xcode + Apple Developer 账号由谁负责。

## 1. Capacitor 基础工程

- [x] 1.1 安装 `@capacitor/core`、`@capacitor/cli`、`@capacitor/ios`。
- [x] 1.2 新增 `capacitor.config.*`，配置 `appId`、`appName`、`webDir` 和 iOS 基础选项。
- [x] 1.3 新增 npm scripts，例如 `cap:sync:ios`、`cap:open:ios`、`cap:build:web`。
- [x] 1.4 生成 `ios/` 工程，并确认 Git 中不包含个人签名、缓存和构建产物。

## 2. Web 运行态适配

- [x] 2.1 扩展 `src/utils/displayMode.js`，确认 Capacitor/WKWebView 运行态可被识别或至少不误判。
- [x] 2.2 检查 `src/index.css` 中移动端安全区变量，确保顶部、底部导航、toast、modal、sheet 不被 iOS 安全区遮挡。
- [x] 2.3 检查首屏和 App runtime 下是否避免加载桌面 3D 背景、自定义鼠标、桌面滚动进度等重资源。
- [ ] 2.4 检查登录、搜索、发布、资料编辑等输入场景的键盘遮挡问题。

## 3. WKWebView 边界

- [x] 3.1 明确允许在 App 内打开的域名列表。
- [ ] 3.2 外部链接默认交给系统浏览器或 SFSafariViewController。
- [x] 3.3 如启用 App-Bound Domains，补充 `Info.plist` 的可信域名配置。
- [ ] 3.4 验证 Cookie、token、登录态持久化和登出清理。

## 4. 文档

- [x] 4.1 新增 `docs/guides/ios-capacitor-app-guide.md`。
- [x] 4.2 文档写明 Windows 能完成的准备工作，以及 macOS/Xcode 必需的构建步骤。
- [x] 4.3 文档写明证书、Provisioning Profile、Apple ID、密码、Team ID 等敏感信息不得提交。
- [x] 4.4 文档写明真机调试、缓存清理、外链处理、登录失败和白屏排查路径。

## 5. 验证

- [x] 5.1 运行 `npm run build`。
- [x] 5.2 运行 `npx cap sync ios`。
- [ ] 5.3 在 macOS + Xcode 中构建 iOS 工程。
- [ ] 5.4 iOS 模拟器验证首页、活动页、AI 社区、个人中心、登录弹窗。
- [ ] 5.5 iOS 真机验证登录保持、键盘、安全区、上传、外链、返回、Service Worker 缓存。
- [x] 5.6 回归 Android TWA 相关配置，确认本轮没有破坏 `android-twa/`。

## 6. 后续能力候选

- [ ] 6.1 推送通知。
- [ ] 6.2 相机 / 相册上传增强。
- [ ] 6.3 扫码。
- [ ] 6.4 原生分享。
- [ ] 6.5 深链 / Universal Links。

## 验证记录

- 2026-06-29：`npm run cap:sync:ios` 通过，包含 `npm run build` 和 `cap sync ios`。
- 2026-06-29：检查 `capacitor.config.json`，确认 `appId=com.tuotuzju.app`、`appName=拓途浙享`、`webDir=dist` 和 iOS 基础选项。
- 2026-06-29：检查 `ios/App/App/Info.plist`，确认 `WKAppBoundDomains` 包含 `tuotuzju.com`。
- 2026-06-29：检查 `src/utils/displayMode.js`，确认 `isNativeCapacitor()` 纳入 `isStandaloneDisplay()`，避免 App runtime 被误判为普通浏览器。
- 2026-06-29：检查工作区未出现 `.p12`、`.mobileprovision`、`.cer`、`.ipa`、`.xcarchive` 等签名或构建敏感产物。
