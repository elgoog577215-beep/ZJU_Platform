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

### Requirement: Android 启动故障必须可诊断

项目 SHALL 提供真机启动故障排查命令，帮助区分原生启动失败、Chrome 首次运行阻塞、TWA 域名验证失败和网页首屏卡住。

#### Scenario: 最新 Android 真机黑屏或启动页卡住

- **Given** 用户在最新 Android 系统安装 `com.tuotuzju.app`
- **When** 点击 App 后出现黑屏、启动页卡住或无法进入首页
- **Then** 开发者必须能通过文档命令确认 APK 是否安装、`LauncherActivity` 是否可解析、顶部 Activity 是否进入 Chrome/TWA 承载层
- **Then** 开发者必须能抓取包含 `com.tuotuzju.app`、`TrustedWeb`、`CustomTabs`、`Chrome`、`cr_` 和 `AndroidRuntime` 关键词的日志

### Requirement: Android APK 必须提供浏览器不可用 fallback

Android APK SHALL 在没有可用 Chrome、Custom Tabs 或 TWA provider 的设备上回退到内置 WebView，并保持联网能力。

#### Scenario: 设备没有可用 TWA 承载浏览器

- **Given** 设备已安装 `com.tuotuzju.app`
- **And** Chrome 或其它支持 TWA 的浏览器不可用
- **When** 用户点击桌面图标启动 App
- **Then** App 必须进入 `WebViewFallbackActivity`
- **Then** App 必须具备 `android.permission.INTERNET`
- **Then** 用户仍能看到 `https://tuotuzju.com/` 首页内容，而不是停留桌面、黑屏或反复启动 `LauncherActivity`

### Requirement: Web Manifest 必须使用稳定 JSON 入口

网站 SHALL 发布 `manifest.json` 作为新版 Android APK 的 Web Manifest URL，并保留旧 manifest 入口兼容浏览器。

#### Scenario: 线上站点部署 Web Manifest

- **Given** 网站已部署最新前端静态产物
- **When** 访问 `https://tuotuzju.com/manifest.json`
- **Then** 响应必须是 JSON
- **Then** JSON 必须包含 `name`、`start_url`、`display` 和图标配置
- **Then** 首页 `<link rel="manifest">` 必须指向 `/manifest.json`

### Requirement: Android App 首屏必须避免桌面装饰资源

Android App / TWA 运行时 SHALL 使用移动端轻量启动路径，MUST NOT 在首屏加载桌面专用 3D 背景、自定义鼠标或桌面滚动进度。

#### Scenario: Android App 访问活动首页

- **Given** App 以 TWA、standalone 或移动视口启动
- **When** 用户进入首屏活动页面
- **Then** 页面必须保留网页开屏动画
- **Then** 页面不得加载 Three.js 背景系统作为首屏依赖
- **Then** 路由切换不得依赖旧页面退出动画完成后才挂载新页面

### Requirement: PWA 缓存必须保持首轮安装轻量

Service Worker precache SHALL 只包含核心 App Shell 与公开验证文件，大型页面 chunk MUST 通过 runtime cache 按访问缓存。

#### Scenario: 构建生产产物

- **Given** 开发者执行生产构建
- **When** 检查 `dist/index.html` 和 `dist/sw.js`
- **Then** `dist/index.html` 不得主动 preload `three-vendor`
- **Then** `dist/sw.js` 的 precache manifest 不得包含 Three.js、PDF、Mammoth 或后台管理大 chunk
- **Then** 脚本、样式、图片和上传资源仍可通过 runtime cache 在访问后缓存
