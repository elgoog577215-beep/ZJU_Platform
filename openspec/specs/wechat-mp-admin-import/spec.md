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

### Requirement: 增量采集可恢复活动入库失败

当公众号文章的 AI 解析已经完成、但活动候选入库失败时，系统 SHALL 在后续增量采集再次遇到该文章时复用已保存的解析结果重试活动入库。恢复 SHALL NOT 再次调用 `parseWithLLM`，且新建或可更新的活动 SHALL 保持 `pending` 审核状态。

#### Scenario: 已解析文章的活动入库在后续任务恢复

- **GIVEN** 增量文章的 `extraction_status` 为 `completed`、`activity_status` 为 `failed`，且已保存有效的 `extracted_event_json`
- **WHEN** 后续增量采集再次发现该文章
- **THEN** 系统 SHALL 使用已保存的解析结果重新执行活动候选处理
- **AND** 系统 SHALL NOT 再次调用 `parseWithLLM`
- **AND** 入库成功后 SHALL 将文章标记为 `accepted` 并关联对应活动
- **AND** 新建活动 SHALL 使用 `pending` 状态

#### Scenario: 已完成或被拒绝的候选不自动重试

- **GIVEN** 增量文章的 `activity_status` 为 `accepted` 或 `rejected`
- **WHEN** 后续增量采集再次发现该文章
- **THEN** 系统 SHALL NOT 自动重新执行活动候选处理
- **AND** 系统 SHALL NOT 覆盖既有活动的人工审核状态

### Requirement: 管理员可辨认增量文章的候选处理结果

微信采集后台 SHALL 在每篇增量文章上显示正文抓取状态、AI 提取状态和活动候选处理状态；当存在活动候选判断或入库原因时，后台 SHALL 显示可读原因。

#### Scenario: 管理员查看候选筛选状态

- **GIVEN** 增量文章已经完成 AI 提取
- **WHEN** 管理员打开微信采集后台的新增文章列表
- **THEN** 页面 SHALL 显示该文章的活动候选状态
- **AND** 页面 SHALL 显示筛选拒绝或入库失败原因（如存在）
