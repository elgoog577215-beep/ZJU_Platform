# 拓途浙享微信小程序 WebView 壳

## 目标

该目录包含第一期混合小程序壳。它使用 `web-view` 加载现有网站，并保留原生页面用于诊断、微信登录、订阅消息和后续微信 API 集成。

默认网页入口：

```text
https://tuotuzju.com/events?miniapp=1&utm_source=wechat_miniprogram
```

## 导入

1. 打开微信开发者工具。
2. 选择导入已有项目。
3. 目录选择 `wechat-miniprogram/`。
4. 本地调试配置使用微信开发者工具测试 AppID；生产上传前请替换为正式小程序 AppID。

## 生产发布前

- 小程序主体必须是支持 `web-view` 的非个人主体。
- `https://tuotuzju.com` 必须配置到微信业务域名白名单。
- `https://tuotuzju.com` 也必须配置到微信 request 合法域名，因为原生登录页会请求 `/api/auth/wechat-miniapp/login`。
- 按微信后台要求，将业务域名校验文件部署到网站根目录。
- 服务端必须配置 `WECHAT_MINIAPP_APPID` 和 `WECHAT_MINIAPP_SECRET` 环境变量。
- 不要提交 `AppSecret`、上传密钥、订阅模板密钥或其他凭据。

## 路由策略

允许路由包括活动、文章、项目、黑客松、关于、用户主页、媒体、图库和视频。

禁止路由包括后台、下载、API、上传文件和安装包路径。禁止路由会回退到默认活动入口。

## 原生桥接

- 微信登录：已实现 `wx.login` -> 后端 `code2Session` -> 现有网站 JWT -> WebView 回跳后清理 URL。后续加固可把 JWT query 交接替换为一次性 web ticket。
- 订阅消息：后续由原生页调用 `wx.requestSubscribeMessage`，再把订阅状态记录到后端。
- 分享：小程序页面负责默认分享配置，网站后续可通过安全桥接通道传递分享上下文。
