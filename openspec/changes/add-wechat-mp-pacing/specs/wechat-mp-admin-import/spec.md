# wechat-mp-admin-import 规格变更

## ADDED Requirements

### Requirement: 微信 MP 采集必须支持服务端节奏控制

微信 MP 管理采集 SHALL 支持与 `scrape-hub` 对齐的服务端节奏控制，避免批量采集时连续请求微信公众平台后台。

#### Scenario: 账号间隔留空时继承默认随机等待

- **GIVEN** 后端收到批量公众号采集请求
- **AND** 请求未提供账号间隔配置或配置为空
- **WHEN** 后端完成一个公众号的文章列表获取并准备处理下一个公众号
- **THEN** 后端 SHALL 使用 55-120 秒随机等待后再继续

#### Scenario: 管理员可配置账号间隔

- **GIVEN** 管理员进入公众号文章导入页
- **WHEN** 管理员展开采集节奏高级配置
- **THEN** 前端 SHALL 预填账号间隔最小秒为 55
- **AND** 前端 SHALL 预填账号间隔最大秒为 120
- **AND** 前端 SHALL 显示该配置影响登录态稳定和平台访问节奏的专业提示

#### Scenario: 自动翻页之间执行页面间隔

- **GIVEN** 管理员请求同一公众号的多页文章列表
- **WHEN** 后端完成一页文章列表请求且仍需继续翻页
- **THEN** 后端 SHALL 等待 `pagePause` 秒后再请求下一页
- **AND** `pagePause` 未配置时 SHALL 默认使用 3 秒

#### Scenario: 批量正文抓取之间执行随机等待

- **GIVEN** 后端收到多个微信文章正文抓取请求
- **WHEN** 后端完成一篇文章正文抓取并准备抓取下一篇
- **THEN** 后端 SHALL 根据 `contentDelayRange` 执行随机等待
