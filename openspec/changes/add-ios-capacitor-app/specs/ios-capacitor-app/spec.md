## ADDED Requirements

### Requirement: iOS App 必须使用 Capacitor/WKWebView 承载主站

iOS App SHALL 使用 Capacitor 生成原生 iOS 工程，并通过 WKWebView 承载现有 Web 应用，而不是在本轮重写原生页面。

#### Scenario: 用户从 iOS 桌面启动 App

- **GIVEN** 用户已经安装 iOS App
- **WHEN** 用户点击桌面图标启动 App
- **THEN** App SHALL 打开 `https://tuotuzju.com/` 或当前环境配置的主站入口
- **THEN** 用户 SHALL 能进入现有 Web 的首页、活动页、AI 社区和个人中心
- **THEN** App SHALL 保留 Web 侧已有移动端导航和首屏体验

### Requirement: iOS 工程必须可复用构建且不提交敏感签名材料

仓库 SHALL 保存可复用的 Capacitor 配置、iOS 工程和构建说明，但 MUST NOT 提交 Apple 账号、证书、Provisioning Profile、私钥、密码、个人 Team ID 或 Xcode 构建产物。

#### Scenario: 开发者检查 Git 提交范围

- **GIVEN** iOS 工程已经生成并在本地构建过
- **WHEN** 开发者查看 Git 待提交文件
- **THEN** Git 中 SHALL NOT 出现 `.xcarchive`、`DerivedData`、签名证书、Provisioning Profile、私钥、密码或个人 Apple 账号信息
- **THEN** Git 中 SHALL 包含可复用的配置、源码和说明文档

### Requirement: iOS App 必须支持开发与生产两种入口

Capacitor 配置 SHALL 支持生产入口和本地调试入口，且生产配置 MUST NOT 固定到开发机地址。

#### Scenario: 生产构建使用线上站点

- **GIVEN** 开发者准备生产构建
- **WHEN** 执行 Web 构建和 Capacitor 同步
- **THEN** App SHALL 默认加载 `https://tuotuzju.com/`
- **THEN** 配置中 SHALL NOT 固定提交 `localhost`、局域网 IP 或个人开发机地址作为生产入口

#### Scenario: 本地调试连接开发服务

- **GIVEN** 开发者正在本地运行 `npm run dev`
- **WHEN** 开发者按文档配置 Capacitor 开发入口
- **THEN** iOS 模拟器或真机 SHALL 能连接本地或局域网开发服务
- **THEN** 该调试配置 SHALL 能在提交前恢复为生产安全配置

### Requirement: WKWebView 域名和外链必须有明确边界

iOS App SHALL 明确哪些域名可以在 WKWebView 内打开，外部链接 MUST 使用系统浏览器、SFSafariViewController 或明确的外链处理策略。

#### Scenario: 用户点击站内链接

- **GIVEN** 用户正在 iOS App 内浏览 `tuotuzju.com`
- **WHEN** 用户点击站内路由或同域链接
- **THEN** 链接 SHALL 在 App 内继续打开

#### Scenario: 用户点击外部链接

- **GIVEN** 用户正在 iOS App 内浏览内容
- **WHEN** 用户点击非可信域名链接
- **THEN** App SHALL 使用明确的外链策略打开该链接
- **THEN** App SHALL NOT 在 WKWebView 内无边界加载任意第三方站点

### Requirement: iOS App 必须保持登录态与安全配置正确

iOS App SHALL 验证 Web 登录、会话持久化、登出和跨域请求在 WKWebView 中的行为，并不得为了 WebView 兼容降低 Cookie 或认证安全级别。

#### Scenario: 用户登录并重启 App

- **GIVEN** 用户在 iOS App 内完成登录
- **WHEN** 用户关闭并重新打开 App
- **THEN** 登录态 SHALL 按产品预期保留或失效
- **THEN** 会话行为 SHALL 与 Web/PWA 的安全策略一致

#### Scenario: 用户登出

- **GIVEN** 用户已经在 iOS App 内登录
- **WHEN** 用户点击登出
- **THEN** App SHALL 清理本地登录状态
- **THEN** 再次进入个人中心 SHALL 触发登录流程或显示未登录态

### Requirement: iOS App 必须适配安全区、键盘和移动端覆盖层

iOS App SHALL 保证顶部刘海、底部 Home Indicator、软键盘和全屏覆盖层不会遮挡关键操作。

#### Scenario: 用户浏览底部导航页面

- **GIVEN** 用户在带 Home Indicator 的 iPhone 上打开 App
- **WHEN** 用户浏览首页、活动页、AI 社区和个人中心
- **THEN** 底部导航和主要按钮 SHALL 不被系统安全区遮挡
- **THEN** 页面 SHALL 不出现横向滚动

#### Scenario: 用户输入文本

- **GIVEN** 用户打开登录、搜索、发布或资料编辑表单
- **WHEN** iOS 键盘弹出
- **THEN** 当前输入框和主要提交按钮 SHALL 仍可见或可滚动到可操作区域

### Requirement: iOS App 首屏和缓存必须保持轻量可诊断

iOS App SHALL 复用现有 PWA 的缓存收敛原则，避免首屏加载桌面重资源，并提供白屏、缓存异常和启动失败的排查说明。

#### Scenario: 开发者检查生产构建产物

- **GIVEN** 开发者执行生产构建
- **WHEN** 检查 `dist/index.html` 和 Service Worker 产物
- **THEN** 首屏 SHALL NOT 主动 preload Three.js、PDF、Mammoth 或后台管理大 chunk
- **THEN** 大型资源 SHALL 通过 runtime cache 按访问缓存

#### Scenario: iOS 真机启动后白屏

- **GIVEN** iOS 真机安装 App 后出现白屏或启动失败
- **WHEN** 开发者按文档排查
- **THEN** 开发者 SHALL 能检查 WKWebView 网络请求、控制台错误、缓存状态、入口 URL 和外链拦截策略
- **THEN** 文档 SHALL 提供清理缓存、重装 App 和切换调试入口的步骤

### Requirement: iOS App 必须提供可执行验证清单

项目 SHALL 提供覆盖 Web 构建、Capacitor 同步、Xcode 构建、模拟器验证和真机验证的清单。

#### Scenario: 开发者完成 iOS 封装实现

- **GIVEN** iOS 工程和配置已经完成
- **WHEN** 开发者按任务清单验证
- **THEN** `npm run build` SHALL 通过
- **THEN** `npx cap sync ios` SHALL 通过
- **THEN** macOS + Xcode SHALL 能构建 iOS 工程
- **THEN** iOS 模拟器或真机 SHALL 能访问核心页面并完成登录相关流程
