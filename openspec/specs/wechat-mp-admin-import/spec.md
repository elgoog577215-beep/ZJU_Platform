# wechat-mp-admin-import Specification

## Purpose
TBD - created by archiving change add-wechat-mp-auto-auth-import. Update Purpose after archive.
## Requirements
### Requirement: 管理员可发起微信 MP 二维码登录

后台 SHALL 提供仅管理员可访问的微信 MP 登录入口，并由后端无头浏览器生成或刷新登录二维码。

扫码登录 SHALL 是强依赖能力。后端 SHALL 明确依赖 Playwright Chromium；当 Chromium 不可用时，后台 SHALL 返回可操作的部署错误，而不是隐藏登录入口或降级为手动粘贴链接。

#### Scenario: 登录二维码显示在后台页面

- **GIVEN** 管理员已进入后台微信采集模块
- **WHEN** 管理员点击开始扫码登录
- **THEN** 后端 SHALL 启动或复用一个微信 MP 登录任务
- **AND** 前端 SHALL 在页面内显示后端截取到的二维码图片
- **AND** 前端 SHALL 持续显示当前登录阶段

#### Scenario: 登录成功后不暴露凭据

- **GIVEN** 管理员已扫码并确认登录
- **WHEN** 后端捕获到微信 MP token 和 session cookies
- **THEN** 后端 SHALL 将原始 token 和 Cookie 保存到服务器私有数据目录
- **AND** API 响应 SHALL NOT 返回原始 token 或 Cookie
- **AND** 前端 SHALL 只显示脱敏状态、更新时间或 Cookie 名称数量

### Requirement: 管理员可获取公众号文章列表

后台 SHALL 使用已保存的微信 MP 登录态获取公众号 fakeid 和文章列表。

#### Scenario: 按公众号名称拉取文章

- **GIVEN** 后端已有可用微信 MP 登录态
- **WHEN** 管理员输入公众号名称并请求文章列表
- **THEN** 后端 SHALL 调用微信 MP 后台账号搜索能力定位候选公众号
- **AND** 后端 SHALL 获取该公众号的文章列表
- **AND** 前端 SHALL 展示文章标题、摘要、发布时间、封面和原文链接

#### Scenario: 登录态失效时提示重新登录

- **GIVEN** 后端保存的微信 MP 登录态已失效
- **WHEN** 管理员请求公众号搜索或文章列表
- **THEN** 后端 SHALL 返回需要重新登录的错误状态
- **AND** 前端 SHALL 提示管理员重新扫码登录

### Requirement: 管理员可抓取并预览正文

后台 SHALL 支持对文章列表中的公开文章链接抓取正文，并在管理页渲染预览。

#### Scenario: 正文抓取成功

- **GIVEN** 管理员已获取文章列表
- **WHEN** 管理员选择一篇文章并请求正文
- **THEN** 后端 SHALL 抓取文章标题、作者、摘要、正文文本、正文 HTML 和图片候选
- **AND** 前端 SHALL 在管理页展示正文预览

### Requirement: 管理员可复用现有 AI 解析链路

后台 SHALL 将抓取到的微信正文送入现有活动解析逻辑，返回可用于活动表单的结构化字段。

#### Scenario: 解析为活动字段

- **GIVEN** 管理员已抓取某篇文章正文
- **WHEN** 管理员点击解析为活动字段
- **THEN** 后端 SHALL 调用现有 `parseWithLLM` 解析逻辑
- **AND** 返回标题、摘要、活动时间、地点、主办方、分类、面向对象和学院通知字段
- **AND** 不自动创建或修改活动记录
