# 拓途浙享微信小程序 WebView 壳

## 目标

该目录是微信小程序第一期混合方案：用 `web-view` 承载现有网站，用原生页面预留微信登录、订阅消息等桥接能力。

默认入口：

```text
https://tuotuzju.com/events?miniapp=1&utm_source=wechat_miniprogram
```

## 导入方式

1. 打开微信开发者工具。
2. 选择导入项目。
3. 项目目录选择 `wechat-miniprogram/`。
4. 当前 `project.config.json` 使用 `touristappid` 占位；正式开发时替换为微信公众平台的小程序 AppID。

## 正式上线前置条件

- 小程序主体不能是个人主体。
- `https://tuotuzju.com` 必须完成 HTTPS、ICP 备案和微信业务域名配置。
- 将微信后台提供的业务域名校验文件部署到网站根路径。
- 不要把 `AppSecret`、代码上传密钥、订阅模板私密配置提交到仓库。

## 路径规则

允许打开：活动、文章、项目、Hackathon、关于、媒体库、公开主页等核心路径。

禁止打开：后台、下载页、API、上传文件目录、APK 下载目录。禁止路径会回退到活动入口。

## 后续桥接方向

- 微信登录：`wx.login` -> 后端 `code2Session` -> 一次性 ticket 回跳网站。
- 订阅消息：原生页调用 `wx.requestSubscribeMessage`，后端记录用户主动订阅意图。
- 分享：由小程序页面配置默认分享，后续可让网页通过 JSSDK 传递分享上下文。
