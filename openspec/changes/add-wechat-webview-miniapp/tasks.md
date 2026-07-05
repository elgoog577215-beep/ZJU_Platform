# tasks

## 1. OpenSpec

- [x] 1.1 写入 `proposal.md`、`design.md`、`tasks.md`。
- [x] 1.2 新增 `wechat-webview-miniapp` 能力规格。
- [x] 1.3 运行 OpenSpec 校验。

## 2. 小程序壳

- [x] 2.1 新增 `wechat-miniprogram/` 工程骨架。
- [x] 2.2 新增 `pages/webview/index`，默认加载活动页。
- [x] 2.3 新增路径白名单和禁止路径回退逻辑。
- [x] 2.4 新增 `fallback`、`login`、`subscribe` 原生桥接占位页。

## 3. 网站小程序运行态

- [x] 3.1 新增小程序 WebView 环境识别工具。
- [x] 3.2 小程序模式下跳过 PWA 安装提示和 service worker 更新。
- [x] 3.3 小程序模式下隐藏下载和后台入口。
- [x] 3.4 小程序模式下拦截 `/download`、`/app`、`/admin`。

## 4. 验证

- [x] 4.1 运行 `npm run build`。
- [x] 4.2 运行与改动范围匹配的静态检查。
- [x] 4.3 检查 `git diff`，确认未提交微信密钥、上传密钥或真实 AppID。

## 5. 微信登录桥接

- [x] 5.1 新增后端 `/api/auth/wechat-miniapp/login`，由服务端调用 `code2Session`。
- [x] 5.2 新增 `wechat_miniapp_identities` 绑定表，复用现有 `users` 与 JWT。
- [x] 5.3 登录弹窗在小程序 WebView 中展示“微信一键登录”，并跳转原生登录页。
- [x] 5.4 小程序原生登录页调用 `wx.login`，登录成功后回到原 WebView 路径。
- [x] 5.5 运行构建、后端语法检查和敏感信息差异检查。
