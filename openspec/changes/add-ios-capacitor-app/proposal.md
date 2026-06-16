# add-ios-capacitor-app

## 背景

项目当前已经具备 Web、PWA 和 Android TWA 三种交付形态。Android 侧已经通过 `android-twa/` 把 `https://tuotuzju.com/` 封装为可安装 App，并沉淀了域名绑定、签名、启动诊断、WebView fallback、首屏轻量化和缓存边界等经验。

现在需要补齐 iOS App 形态。考虑到现有产品主体仍是 React + Vite Web 应用，且已有移动端导航、PWA、`standalone` 运行态判断和安全区样式基础，本轮优先采用 Capacitor 生成 iOS 工程，并通过 WKWebView 承载现有 Web 应用，而不是重写 Swift 原生页面。

## 目标

- 使用 Capacitor 建立可复用的 iOS 工程，默认目录为 `ios/`。
- iOS App 通过 WKWebView 打开现有站点 `https://tuotuzju.com/`，并支持本地开发时指向 `http://localhost:5180` 或局域网调试地址。
- 复用现有 Web/PWA 的登录、活动、AI 社区、个人中心、媒体内容和移动端导航能力。
- 明确 iOS 壳层职责：启动、WebView 配置、外链处理、安全区、权限声明、构建说明、真机调试和上架前检查。
- 保留 Android TWA 与 Web/PWA 现有行为，不因 iOS 工程引入而破坏当前构建。

## 不做范围

- 不重写原生 iOS 页面。
- 不在本轮接入原生推送、相机、扫码、通讯录、文件系统、定位等能力；如需要，后续单独开 change。
- 不改变后端 API、数据库 schema 或认证协议。
- 不替换 Android TWA 工程。
- 不执行 App Store 上架、证书创建或远端发布操作。

## 能力

### 新增能力

- `ios-capacitor-app`：基于 Capacitor/WKWebView 的 iOS App 封装、配置、构建和验证规范。

### 修改能力

- 无。

## 影响范围

- 可能新增文件：
  - `capacitor.config.*`
  - `ios/`
  - `docs/ios-capacitor-app-guide.md`
  - `package.json` 中的 Capacitor 依赖和脚本
- 可能调整文件：
  - `src/utils/displayMode.js`
  - `src/index.css`
  - `vite.config.js`
  - `public/manifest.json` 相关产物规则
- 不影响：
  - `android-twa/`
  - `server/`
  - 现有 Web 路由和 API 合约

## 风险

- iOS WKWebView 与 Safari/PWA 在 Cookie、缓存、外链、文件上传、键盘和安全区表现上存在差异，必须用真机验证。
- 若 App 直接加载远端站点，审核时需要保证 App 不是只有一个无差别网页壳；至少要有稳定品牌、清晰功能路径、登录态处理和必要的原生配置说明。
- 如果后续接入原生能力，隐私权限文案和 App Store 隐私声明必须同步维护。
- Windows 环境可以生成和维护大部分配置，但 iOS 真机构建、签名和归档仍需要 macOS + Xcode。

## 验收

- OpenSpec 文档通过校验。
- 仓库包含清晰的 iOS Capacitor 方案、任务清单和验收标准。
- 后续实现时，`npm run build` 不因 Capacitor 配置破坏 Web 构建。
- 在 macOS + Xcode 环境中能够按文档生成、打开、构建 iOS 工程。
- 真机打开 App 后能够访问主站核心路径，并完成移动端主要流程的手动或自动验证。
