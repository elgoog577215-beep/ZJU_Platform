# wechat-mp-admin-import 规格变更

## ADDED Requirements

### Requirement: 微信 MP 登录态必须可被网页自动验活

公众号导入页 SHALL 定期请求服务端登录态状态接口，并在不执行文章抓取的情况下识别微信 MP 登录态失效。

#### Scenario: 登录态有效

- **GIVEN** 服务端存在微信 MP token 与 Cookie
- **WHEN** 验活请求成功
- **THEN** 网页 SHALL 显示登录态有效

#### Scenario: 登录态失效

- **GIVEN** 服务端存在凭据但微信 MP 返回 invalid session 或等价失效信号
- **WHEN** 网页刷新或自动轮询状态
- **THEN** 网页 SHALL 显示登录态已过期
- **AND** 网页 SHALL 保留重新扫码登录入口
- **AND** 系统 SHALL NOT 展示 token 或 Cookie 原文

#### Scenario: 验活网络暂时失败

- **GIVEN** 验活请求超时、网络失败或微信 MP 返回 5xx
- **WHEN** 网页刷新或自动轮询状态
- **THEN** 网页 SHALL 显示暂时无法确认
- **AND** 系统 SHALL NOT 将该状态直接标记为登录态过期

### Requirement: 公众号文章必须先通过活动候选筛选才能进入活动列表

定时采集得到的公众号文章 SHALL 复用现有微信活动解析 AI 调用进行活动候选判断，只有通过服务端筛选的结果才能写入现有 `events` 表。

#### Scenario: 非活动文章被筛除

- **GIVEN** AI 判断文章不是适合活动栏目的内容，或活动候选置信度低于 0.70
- **WHEN** 定时采集完成信息提取
- **THEN** 系统 SHALL 保留公众号增量文章记录及筛选原因
- **AND** 系统 SHALL NOT 创建活动记录

#### Scenario: 活动文章进入待审核列表

- **GIVEN** AI 判断文章适合活动栏目
- **AND** 活动候选置信度大于等于 0.70
- **WHEN** 定时采集完成信息提取
- **THEN** 系统 SHALL 将解析结果写入现有 `events` 表
- **AND** 新建或更新活动的状态 SHALL 为 `pending`
- **AND** 活动 SHALL 保留公众号原文链接

#### Scenario: 重复采集保持幂等

- **GIVEN** 相同公众号原文链接再次被采集
- **WHEN** 文章已经关联活动记录
- **THEN** 系统 SHALL NOT 创建第二条活动
- **AND** 系统 SHALL 保留原活动的 `pending` 审核语义
