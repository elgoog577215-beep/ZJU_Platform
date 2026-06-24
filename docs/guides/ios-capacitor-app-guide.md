# iOS Capacitor App 开发与验收说明

## 目标

本项目的 iOS 端采用 Capacitor + WKWebView 封装现有 React Web 应用。生产包默认使用 `dist/` 中的本地 Web bundle，并通过线上 API `https://tuotuzju.com/api` 访问后端。

当前目标是先形成可在 macOS + Xcode 中打开、构建和真机调试的 iOS 工程；TestFlight 和 App Store 上架另行处理。

## 当前配置

- iOS 工程目录：`ios/`
- Capacitor 配置：`capacitor.config.json`
- App ID / Bundle ID：`com.tuotuzju.app`
- App 名称：`拓途浙享`
- Web 产物目录：`dist`
- iOS WebView scheme：`capacitor://localhost`
- 生产 API 默认地址：`https://tuotuzju.com/api`
- 可信域名候选：`tuotuzju.com`

## Windows 上可以完成的工作

Windows 可以完成：

- 修改 Web 代码。
- 运行 `npm run build`。
- 运行 `npm run cap:sync:ios` 同步 Web 产物到 iOS 工程。
- 维护 `capacitor.config.json`、`ios/` 工程文件和文档。

Windows 不能完整完成：

- 打开 Xcode。
- 运行 iOS Simulator。
- 连接 iPhone 真机调试。
- 归档 `.ipa`。
- 上传 TestFlight / App Store。

这些步骤需要 macOS + Xcode + Apple Developer 账号。

## 常用命令

安装依赖后，在项目根目录执行：

```bash
npm run build
npm run cap:sync:ios
```

在 macOS 上打开 Xcode 工程：

```bash
npm run cap:open:ios
```

如果首次生成 iOS 平台：

```bash
npm run cap:add:ios
```

## 本地开发调试

默认生产配置不提交本地开发地址。需要让 iOS Simulator 或真机连接本地开发服务时，可以临时在本机修改 `capacitor.config.json`：

```json
{
  "server": {
    "url": "http://你的局域网IP:5180",
    "cleartext": true
  }
}
```

调试完成后必须移除 `server.url` 和 `cleartext`，再提交代码。生产配置不能固定到 `localhost` 或个人局域网 IP。

## macOS + Xcode 构建步骤

1. 安装 Xcode，并打开一次完成组件安装。
2. 在项目根目录执行 `npm install`。
3. 执行 `npm run cap:sync:ios`。
4. 执行 `npm run cap:open:ios`。
5. 在 Xcode 中选择 Team、Bundle ID 和签名配置。
6. 选择 iOS Simulator 或连接的 iPhone。
7. 点击 Run。

如果准备真机安装，Apple Developer 账号、证书和 Provisioning Profile 只保存在本机或 Apple 后台，不得提交到 Git。

## 验收清单

### 工程验收

- `capacitor.config.json` 存在。
- `ios/` 工程存在。
- `package.json` 中存在 `cap:add:ios`、`cap:sync:ios`、`cap:open:ios`。
- Git 中没有 `.ipa`、`.xcarchive`、`.mobileprovision`、`.p12`、`.cer`、私钥、密码或 Apple ID。

### 构建验收

- `npm run build` 通过。
- `npm run cap:sync:ios` 通过。
- macOS 上 Xcode 能打开 `ios/App/App.xcodeproj`。
- iOS Simulator 能启动 App。
- iPhone 真机能安装并启动 App。

### 产品流程验收

- 首页能打开。
- 活动页 `/events` 能打开并滚动。
- AI 社区能打开。
- 个人中心未登录时能唤起登录流程。
- 登录成功后 App 重启，登录态表现符合 Web 预期。
- 登出后本地状态被清理。
- 底部导航不被 Home Indicator 遮挡。
- 顶部导航不被刘海遮挡。
- 登录、搜索、发布、资料编辑时键盘不遮挡输入框和提交按钮。
- 活动详情、新闻详情、上传弹窗等覆盖层可以关闭，返回键/手势行为符合预期。
- 外部链接不在 WKWebView 内无边界跳转。
- 头像、图片或文件上传在真机上可用。

### 首屏和缓存验收

- 冷启动不白屏。
- `dist/index.html` 不主动 preload `three-vendor`。
- `dist/sw.js` 的 precache 不包含 Three.js、PDF、Mammoth 或后台大 chunk。
- 弱网时页面有合理加载或错误提示。
- 如出现白屏，能通过 Xcode 控制台看到网络和 JS 错误。

## 常见问题

### App 打开后 API 全部失败

确认当前是否是本地 Web bundle。Capacitor 原生运行时不会走 Vite 代理，API 默认使用 `https://tuotuzju.com/api`。如果要连接本地后端，需要临时设置 `VITE_API_BASE_URL` 后重新构建，或使用调试 `server.url` 直接加载 Vite dev server。

### Simulator 可以用，真机不能访问本地服务

真机不能访问电脑的 `localhost`。需要使用同一 Wi-Fi 下电脑的局域网 IP，例如 `http://192.168.x.x:5180`，并确认防火墙允许访问。

### 页面被底部 Home Indicator 遮挡

优先检查对应页面是否使用了 `env(safe-area-inset-bottom)`。本项目大部分移动端页面已经有安全区 padding，但新增页面和弹窗仍需要单独确认。

### 提交前发现签名文件

不要提交。删除本地签名文件或把它们移动到仓库外。`.gitignore` 已经忽略常见 iOS 签名材料，但提交前仍必须执行：

```bash
git status --short
```

确认没有敏感材料。
