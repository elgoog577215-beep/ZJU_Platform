# add-wechat-mp-auto-auth-import 任务

## 1. OpenSpec

- [x] 1.1 创建 proposal、design、tasks 和 capability spec。
- [x] 1.2 运行 `openspec validate add-wechat-mp-auto-auth-import --strict`。

## 2. 后端微信 MP 服务

- [x] 2.1 新增微信 MP 登录态服务，移植 token/cookie 捕获、二维码截图、凭据保存和脱敏逻辑。
- [x] 2.2 将 Playwright/Chromium 作为后端强依赖写入依赖图，并提供运行时预检。
- [x] 2.3 新增公众号搜索、文章列表获取、文章正文抓取和 MP payload 解析。
- [x] 2.4 新增管理员 API controller 与 `/admin/wechat-mp/*` 路由。
- [x] 2.5 将文章正文获取结果接入现有 `parseWithLLM`，避免重复 prompt。

## 3. 管理员后台

- [x] 3.1 新增微信采集管理组件，覆盖登录状态、二维码、搜索、列表、正文预览和解析结果。
- [x] 3.2 接入 `AdminDashboard` 导航。
- [x] 3.3 同步中文和英文翻译资源。

## 4. 测试与验证

- [x] 4.1 补充后端服务层测试，不访问真实微信接口。
- [x] 4.2 运行 OpenSpec 校验。
- [x] 4.3 运行后端相关测试。
- [x] 4.4 运行 lint/build 或说明环境限制。
- [x] 4.5 使用 Playwright mock API 验证桌面英文与移动中文页面无横向溢出，并走通文章列表、正文预览和解析结果展示。
