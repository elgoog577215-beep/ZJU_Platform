## ADDED Requirements

### Requirement: Android APK 必须以 TWA 启动主站

Android 交付工程 SHALL 使用 Trusted Web Activity 封装 `https://tuotuzju.com/`，并保留网页自身的启动体验。

#### Scenario: 用户从 Android 桌面启动 App

- **Given** 用户已安装 `com.tuotuzju.app`
- **When** 用户点击桌面图标启动 App
- **Then** App 必须打开 `https://tuotuzju.com/`
- **Then** 网页侧启动动画必须由现有前端继续展示，而不是被原生层移除

### Requirement: Android APK 必须完成域名归属绑定

网站 SHALL 提供 Digital Asset Links 文件，使 Android 能验证 `com.tuotuzju.app` 与 `tuotuzju.com` 的归属关系。

#### Scenario: 线上站点部署 assetlinks

- **Given** 网站已部署最新前端静态产物
- **When** 访问 `https://tuotuzju.com/.well-known/assetlinks.json`
- **Then** 响应必须是 JSON
- **Then** JSON 必须包含 `package_name` 为 `com.tuotuzju.app` 的 Android 目标
- **Then** JSON 必须包含 release keystore 对应的 SHA-256 证书指纹

### Requirement: Android release 包必须可复建且可验签

仓库 SHALL 保存 Android TWA 工程、公开配置和构建说明，但 MUST NOT 提交 release keystore、密码、Gradle 缓存或本地构建产物。

#### Scenario: 开发者在已配置签名材料的机器上构建 APK

- **Given** 开发者本机已配置 Android SDK、JDK、Bubblewrap 和 release keystore
- **When** 开发者按文档执行 APK 打包命令
- **Then** 构建必须产出 release APK
- **Then** APK 必须通过 `apksigner verify --print-certs`
- **Then** 验签输出的 SHA-256 证书指纹必须与 `assetlinks.json` 中配置一致

#### Scenario: 开发者检查 Git 提交范围

- **Given** Android release APK 已在本机生成
- **When** 开发者查看 Git 待提交文件
- **Then** Git 中不得出现 release keystore、签名密码、APK、AAB 或 Gradle 构建缓存
