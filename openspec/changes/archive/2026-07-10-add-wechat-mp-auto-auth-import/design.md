# add-wechat-mp-auto-auth-import 设计

## 总体路径

本 change 将 `../scrape-hub` 中的微信 MP 登录与采集思路移植到 Node/Express 后端，而不是在本项目内再启动 Python sidecar。原因是当前平台后端已经是 Express，管理员后台也通过同一 API 层鉴权；把能力做成 Node 服务可以复用现有 `authenticateToken + isAdmin`、错误处理、上传目录和现有微信解析函数。

扫码登录是本 change 的硬依赖，不作为可选增强处理。后端依赖图必须包含 `playwright`，部署环境必须安装 Chromium；如果 Chromium 不存在，后台状态接口和登录启动接口都应明确暴露部署错误，方便运维修复。

生产部署在安装后端依赖后显式运行 `npx playwright install --with-deps chromium`，同时安装 Linux 系统依赖与浏览器，并在 PM2 重启前实际 launch/close 一次 Chromium；仅安装 npm 包或只下载浏览器都不视为部署完成。

核心流程：

```text
管理员后台
  -> POST /api/admin/wechat-mp/login/start
  -> 后端启动 Playwright persistent context
  -> 打开 mp.weixin.qq.com 登录页
  -> 截取二维码并缓存为 data URL
  -> 捕获 bizlogin 最终响应和 /cgi-bin token
  -> 读取同一 context 的 session cookies
  -> 私有文件保存 token/cookie
  -> 后台状态变成已登录
  -> 管理员搜索公众号/关键词
  -> 后端 searchbiz + appmsgpublish 获取文章列表
  -> 后端抓取文章正文
  -> 复用 parseWithLLM 解析活动字段
```

## 后端职责

新增 `server/src/services/wechatMpAdminService.js`：

- 强依赖 Playwright Chromium，并提供 runtime readiness 状态。
- 管理微信 MP 登录态文件。
- 启动和关闭 Playwright persistent context。
- 捕获二维码截图，返回给管理页显示。
- 捕获 token 与 session cookie。
- 通过 `/cgi-bin/searchbiz` 获取公众号 fakeid 候选。
- 通过 `/cgi-bin/appmsgpublish` 获取文章列表。
- 通过公开文章链接抓取正文 HTML/text/封面。
- 复用现有 `scrapeWeChat` 和 `parseWithLLM` 的解析能力，减少重复 AI prompt。

新增 `server/src/controllers/wechatMpAdminController.js`：

- 将服务错误映射成稳定 JSON。
- 保证 API 不返回 raw token/cookie。
- 将文章正文抓取和现有 AI 解析串起来。

新增路由：

- `GET /admin/wechat-mp/status`
- `POST /admin/wechat-mp/login/start`
- `GET /admin/wechat-mp/login/status`
- `POST /admin/wechat-mp/login/cancel`
- `POST /admin/wechat-mp/accounts/search`
- `POST /admin/wechat-mp/articles`
- `POST /admin/wechat-mp/article-content`
- `POST /admin/wechat-mp/parse`

## 前端职责

新增 `src/components/Admin/WeChatMpImportManager.jsx`：

- 显示登录态、凭据来源更新时间和最近错误。
- 发起扫码登录，轮询登录状态，并直接渲染二维码图片。
- 输入公众号名称、关键词、分页数量，获取文章列表。
- 展示文章标题、公众号、发布时间、摘要、封面和链接状态。
- 点击文章后抓取正文并渲染预览。
- 点击解析后调用后端解析接口，展示将回填到活动表单的结构化字段。

接入 `AdminDashboard`：

- 新增 tab `wechat-mp`，归入“活动运营”或“内容资产”分组。
- 所有新增文案写入 `public/locales/zh/translation.json` 与 `public/locales/en/translation.json`。

## 安全边界

- 前端只能看到二维码 data URL、登录阶段、脱敏状态和 Cookie 名称数量。
- 后端不在响应、toast、日志、OpenSpec 或测试快照中输出 raw token/cookie。
- 凭据文件写入 `server/data/wechat-mp/credentials.json`，写入时尽量使用 `0600` 权限。
- `server/data/wechat-mp/` 与浏览器 profile 使用 `0700` 目录权限，凭据文件使用 `0600` 权限；同一时间只允许一个登录任务。
- 携带 MP Cookie 的后台 API 请求不跟随重定向；公开文章抓取只允许在 `mp.weixin.qq.com` 内重定向，避免请求被导向其他主机。
- API 全部挂在 admin 路由下，必须经过 `authenticateToken` 和 `isAdmin`。

## 可访问性与体验

- 二维码图片需要有中文和英文 alt 文案。
- 登录状态使用 `aria-live` 展示阶段变化。
- 长正文预览使用可滚动区域，避免撑爆后台页面。
- 操作按钮在登录中、搜索中、抓取中、解析中有明确禁用和 loading 状态。

## 验证策略

- OpenSpec strict validate。
- 后端服务层单测覆盖 token 提取、Cookie header、MP payload 解析、凭据脱敏。
- 前端至少通过 lint/build；如环境允许，用 Playwright mock API 验证后台页面二维码、文章列表和正文预览。
- 不在自动测试中真实登录微信或访问生产微信接口。
