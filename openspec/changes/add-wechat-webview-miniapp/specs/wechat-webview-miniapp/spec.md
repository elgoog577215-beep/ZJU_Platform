## ADDED Requirements

### Requirement: 小程序 WebView 上传必须提供原生上传通道

当网站运行在微信小程序 WebView 中时，文件上传 SHALL 提供微信原生上传通道，以避免移动端 WebView 文件选择器不可用或体验不稳定。

#### Scenario: 用户在小程序中上传主文件

- **GIVEN** 用户已在小程序 WebView 中登录网站
- **WHEN** 用户在上传弹窗点击“小程序上传文件”
- **THEN** 网站 SHALL 创建短期原生上传会话
- **THEN** 网站 SHALL 跳转到小程序 `pages/native-upload/index`
- **THEN** 小程序原生页 SHALL 使用 `wx.chooseMedia` 或 `wx.chooseMessageFile` 选择文件
- **THEN** 小程序原生页 SHALL 使用 `wx.uploadFile` 上传到 `/api/upload/native`
- **THEN** 网站 SHALL 在原表单中回填上传后的 `/uploads/...` 文件 URL

#### Scenario: 原生上传 token 被篡改或重复使用

- **GIVEN** 小程序原生上传请求携带无效、过期、篡改或已完成的上传 token
- **WHEN** 后端收到 `/api/upload/native` 请求
- **THEN** 后端 SHALL 拒绝请求
- **THEN** 后端 SHALL NOT 复用网站 JWT 或创建新的登录态
- **THEN** 后端 SHALL NOT 将文件标记为当前表单的有效上传结果

#### Scenario: 用户上传封面文件

- **GIVEN** 上传会话声明字段为 `cover`
- **WHEN** 小程序原生页提交上传
- **THEN** 后端 SHALL 要求上传字段名为 `cover`
- **THEN** 网站 SHALL 将返回的 `coverUrl` 回填到封面预览

### Requirement: 微信小程序必须优先通过 WebView 承载现有网站

微信小程序 SHALL 通过 `web-view` 加载现有网站核心公开页面，默认入口为活动页，并通过同一网站页面、同一后端 API、同一数据库实现内容同步。

#### Scenario: 用户打开小程序

- **GIVEN** 用户已打开微信小程序
- **WHEN** 小程序进入主页面
- **THEN** 小程序 SHALL 加载 `https://tuotuzju.com/events?miniapp=1&utm_source=wechat_miniprogram`
- **THEN** 用户 SHALL 能浏览现有网站的活动内容
- **THEN** 网站后台更新活动后，小程序 SHALL 在重新加载后展示同一数据源的最新内容

### Requirement: 小程序 WebView 必须限制可打开路径

小程序壳 SHALL 只允许打开核心公开页面，并 MUST 拦截后台、下载、API 和文件下载路径。

#### Scenario: 用户打开允许路径

- **GIVEN** 小程序收到 `/projects`、`/articles` 或 `/events?id=1` 等允许路径
- **WHEN** 小程序生成 WebView 地址
- **THEN** 地址 SHALL 指向 `https://tuotuzju.com` 同源路径
- **THEN** 地址 SHALL 自动附加 `miniapp=1`

#### Scenario: 用户打开禁止路径

- **GIVEN** 小程序收到 `/admin`、`/download`、`/api/health` 或 `/downloads/file.apk`
- **WHEN** 小程序生成 WebView 地址
- **THEN** 小程序 SHALL 回退到 `/events`
- **THEN** 小程序 SHALL NOT 在 WebView 中打开后台、API JSON 或下载页面

### Requirement: 网站必须识别微信小程序 WebView 运行态

网站 SHALL 在 `miniapp=1` 或微信小程序 WebView 会话中进入小程序模式，并调整不适合小程序的入口和缓存行为。

#### Scenario: 网站在小程序中打开

- **GIVEN** 网站 URL 包含 `miniapp=1`
- **WHEN** React 应用初始化
- **THEN** 网站 SHALL 将当前会话标记为小程序模式
- **THEN** 后续站内跳转 SHALL 保持小程序模式
- **THEN** 网站 SHALL 不显示 PWA 安装提示

#### Scenario: 用户访问小程序不支持页面

- **GIVEN** 网站处于小程序模式
- **WHEN** 用户访问 `/download`、`/app` 或 `/admin`
- **THEN** 网站 SHALL 重定向到 `/events?miniapp=1`

### Requirement: 微信原生 API 必须通过桥接页接入

微信登录、订阅消息等原生能力 SHALL 由小程序原生页面承载，网页不得直接保存微信密钥或假设可以调用全部 `wx.*` API。

#### Scenario: 登录桥接服务端未配置

- **GIVEN** 用户进入登录桥接页
- **WHEN** 后端尚未配置真实 `WECHAT_MINIAPP_APPID` 或 `WECHAT_MINIAPP_SECRET`
- **THEN** 小程序 SHALL 展示登录暂不可用提示
- **THEN** 用户 SHALL 能返回 WebView 主页面

#### Scenario: 用户使用微信账号登录

- **GIVEN** 用户在小程序 WebView 中打开网站登录弹窗
- **WHEN** 用户点击“微信一键登录”
- **THEN** 网站 SHALL 跳转到小程序原生登录页
- **THEN** 原生页 SHALL 调用 `wx.login`
- **THEN** code SHALL 发送到后端
- **THEN** 后端 SHALL 使用 AppSecret 调用 `code2Session`
- **THEN** 后端 SHALL 绑定 openid 到现有 `users` 账号并签发现有 JWT
- **THEN** 小程序 SHALL 回到原 WebView 路径
- **THEN** 网站 SHALL 消费登录 token、刷新 `/auth/me` 并清理 URL 中的 token
- **THEN** 小程序端和网页端 MUST NOT 暴露 AppSecret

### Requirement: 小程序工程不得包含微信敏感凭据

仓库 SHALL 提交可复用的小程序工程骨架，但 MUST NOT 提交真实 AppID、AppSecret、上传密钥、订阅模板密钥或微信后台私有配置。

#### Scenario: 开发者检查 Git 差异

- **GIVEN** 小程序工程已经新增
- **WHEN** 开发者查看待提交文件
- **THEN** Git 差异 SHALL 只包含占位配置、源码、文档和样式
- **THEN** Git 差异 SHALL NOT 包含真实微信密钥、上传私钥或账号凭据
