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
- **THEN** 系统 SHALL 保存标题、原文链接、作者、发布时间、封面和全文内容
- **AND** SHALL 使用原文链接去重
- **AND** SHALL 将正文交给现有 AI 提取和活动初筛链路

#### Scenario: RSS 作为默认主要来源

- **GIVEN** 管理员新增采集来源
- **WHEN** 来源表单首次打开
- **THEN** 系统 SHALL 默认选择 `wewe_rss`
- **AND** 当 `wewe_rss` 与 `wechat_mp` 来源同时启用时，任务 SHALL 先执行 `wewe_rss`
- **AND** SHALL 保留 `wechat_mp` 作为兼容和备用来源

#### Scenario: RSS 读取不触发上游刷新

- **GIVEN** 系统执行普通定时或手动增量任务
- **WHEN** 系统请求 WeWe RSS feed
- **THEN** 请求 SHALL 默认不包含 `update=true`
- **AND** SHALL 使用 `limit`、`page` 和 `mode=fulltext` 控制读取

#### Scenario: RSS 来源正文缺失

- **GIVEN** feed 项目没有可用正文
- **WHEN** 系统处理该项目
- **THEN** 系统 SHALL 保存文章元数据和正文缺失状态
- **AND** SHALL NOT 回退抓取 `mp.weixin.qq.com`
- **AND** SHALL 不因单篇正文缺失中断其他来源

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
