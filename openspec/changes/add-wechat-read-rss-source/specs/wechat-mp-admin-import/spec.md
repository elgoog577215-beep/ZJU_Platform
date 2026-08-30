# wechat-mp-admin-import 规格变更

## ADDED Requirements

### Requirement: 系统支持微信读书 RSS 公众号来源

系统 SHALL 在现有微信公众号增量采集链路中支持 `wewe_rss` 来源类型，并复用现有文章、AI 提取、活动初筛和人工审核数据。

#### Scenario: 管理员配置 RSS 来源

- **GIVEN** 管理员已进入内容采集后台
- **WHEN** 管理员选择“微信读书 RSS”并填写合法 feed ID 和来源名称
- **THEN** 系统 SHALL 保存 `source_type=wewe_rss` 和 feed ID
- **AND** SHALL NOT 要求微信 MP 浏览器登录态
- **AND** SHALL NOT 保存微信读书 token 或登录 cookie

#### Scenario: RSS feed 进入现有文章库

- **GIVEN** 已启用的 RSS 来源可访问 `WEWE_RSS_BASE_URL`
- **WHEN** 增量任务读取 Atom 或 RSS feed
- **THEN** 系统 SHALL 保存标题、`https://mp.weixin.qq.com/...` 原文链接、作者、发布时间和可用封面元数据
- **AND** SHALL 使用原文链接去重
- **AND** SHALL 使用原文链接获取正文和图片，并将正文交给现有 AI 提取和活动初筛链路
- **AND** SHALL 将封面和正文图片本地化后保存

#### Scenario: RSS 作为默认主要来源

- **GIVEN** 管理员新增采集来源
- **WHEN** 来源表单首次打开
- **THEN** 系统 SHALL 默认选择 `wewe_rss`
- **AND** 当 `wewe_rss` 与 `wechat_mp` 来源同时启用时，任务 SHALL 先执行 `wewe_rss`
- **AND** SHALL 保留 `wechat_mp` 作为兼容和备用来源

#### Scenario: 管理员通过主平台管理 WeRead

- **GIVEN** 主平台后端已配置服务端 `WEWE_RSS_AUTH_CODE`
- **WHEN** 管理员进入 RSS 管理工作区
- **THEN** 系统 SHALL 通过主平台管理员 API 提供 WeRead 登录、账号、订阅源、刷新、历史文章和文章管理能力
- **AND** 浏览器 SHALL NOT 直接携带 WeWe RSS 授权码
- **AND** 微信读书 Token SHALL NOT 出现在 API 响应、日志或前端状态中

#### Scenario: RSS 读取不触发上游刷新

- **GIVEN** 系统执行普通定时或手动增量任务
- **WHEN** 系统请求 WeWe RSS feed
- **THEN** 请求 SHALL 默认不包含 `update=true`
- **AND** SHALL 使用 `limit` 和 `page` 获取轻量 metadata，不默认使用 `mode=fulltext`

#### Scenario: RSS 来源正文缺失

- **GIVEN** feed 项目没有可用正文
- **WHEN** 系统处理该项目
- **THEN** 系统 SHALL 保存文章元数据和正文缺失状态
- **AND** SHALL 使用 feed 项目中的 `mp.weixin.qq.com` 链接尝试获取正文
- **AND** SHALL NOT 使用 `rss.tuotuzju.com` 作为文章正文 URL
- **AND** SHALL 不因单篇正文缺失中断其他来源

#### Scenario: 图片型文章跳过 AI

- **GIVEN** 清洗后的正文有效字符少于 100 且正文图片至少 2 张
- **WHEN** 系统完成正文和图片本地化
- **THEN** 系统 SHALL 保留文章候选、原文链接、封面和正文图片
- **AND** SHALL 标记 `content_status=image_only`
- **AND** SHALL 跳过 AI 提取、活动初筛和导入

#### Scenario: RSS 来源失败

- **GIVEN** feed 请求超时、返回非成功状态或 XML 无法解析
- **WHEN** 增量任务处理该来源
- **THEN** 系统 SHALL 记录来源错误和运行失败统计
- **AND** SHALL 继续处理其他启用来源
- **AND** 后续手动或定时任务 SHALL 可以再次尝试

#### Scenario: 现有直连来源兼容

- **GIVEN** 已存在 `source_type=wechat_mp` 的来源
- **WHEN** 执行增量任务
- **THEN** 系统 SHALL 继续使用现有登录态和微信 MP API
- **AND** 新增 RSS 来源的实现 SHALL NOT 改变直连来源的采集行为

#### Scenario: RSS 原文链接安全校验

- **GIVEN** feed 项目提供的链接不是 HTTPS `mp.weixin.qq.com` 地址
- **WHEN** 系统准备获取正文
- **THEN** 系统 SHALL 拒绝该链接
- **AND** SHALL NOT 请求该链接或 RSS 服务地址作为正文

### Requirement: 管理后台按来源分组并隔离状态提醒

管理后台 SHALL 提供微信读书 RSS、微信公众号直连和公共测试与采集三个可切换的顶层模式，并将来源专属操作和提示限制在对应模式。

#### Scenario: 默认进入微信读书 RSS 主方案

- **GIVEN** 管理员打开内容采集后台
- **WHEN** 页面完成初始化
- **THEN** 系统 SHALL 默认显示微信读书 RSS 主方案模式
- **AND** SHALL 提供切换到微信公众号备用方案和公共测试与采集模式的入口

#### Scenario: 微信公众号登录状态只显示在备用方案

- **GIVEN** 微信公众平台登录态不可用
- **WHEN** 管理员查看微信读书 RSS 主方案模式
- **THEN** 页面 SHALL NOT 显示“微信公众平台登录态不可用，请重新扫码登录”提示
- **AND** 微信公众号备用方案模式 SHALL 显示登录、状态和脱敏诊断入口

#### Scenario: 公共测试与采集按来源显示提醒

- **GIVEN** 管理员进入公共测试与采集模式
- **WHEN** 单篇测试来源选择为 `wewe_rss`
- **THEN** 页面 SHALL 显示 RSS 来源配置状态
- **AND** SHALL NOT 要求或提示微信 MP 扫码登录
- **WHEN** 单篇测试来源选择为 `wechat_mp`
- **THEN** 页面 SHALL 显示微信 MP 运行环境和登录态提示

#### Scenario: 公共测试与采集保留既有能力

- **GIVEN** 管理员切换到公共测试与采集模式
- **THEN** 系统 SHALL 保留概况、采集源、候选内容和单篇测试工作区
- **AND** SHALL 继续使用现有增量采集、正文抓取、AI、审核和导入接口
