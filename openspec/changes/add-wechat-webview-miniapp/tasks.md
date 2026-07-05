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
