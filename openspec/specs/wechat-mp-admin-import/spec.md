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

### Requirement: 微信 MP 采集必须支持服务端节奏控制

微信 MP 管理采集 SHALL 支持与 `scrape-hub` 对齐的服务端节奏控制，避免批量采集时连续请求微信公众平台后台。

#### Scenario: 账号间隔留空时继承默认随机等待

- **GIVEN** 后端收到批量公众号采集请求
- **AND** 请求未提供账号间隔配置或配置为空
- **WHEN** 后端完成一个公众号的文章列表获取并准备处理下一个公众号
- **THEN** 后端 SHALL 使用 95-125 秒随机等待后再继续

#### Scenario: 管理员可配置账号间隔

- **GIVEN** 管理员进入公众号文章导入页
- **WHEN** 管理员展开采集节奏高级配置
- **THEN** 前端 SHALL 以 placeholder 展示账号间隔最小秒为 95
- **AND** 前端 SHALL 以 placeholder 展示账号间隔最大秒为 125
- **AND** 前端 SHALL 以 placeholder 展示翻页间隔为 10-25 秒
- **AND** 前端 SHALL 以 placeholder 展示正文间隔为 10-20 秒
- **AND** 前端 SHALL 显示不了解参数作用时应保持默认且不要随意变更的警告提示

#### Scenario: 自动翻页之间执行页面间隔

- **GIVEN** 管理员请求同一公众号的多页文章列表
- **WHEN** 后端完成一页文章列表请求且仍需继续翻页
- **THEN** 后端 SHALL 在 `pagePause` 随机区间内等待后再请求下一页
- **AND** `pagePause` 未配置时 SHALL 默认使用 10-25 秒随机区间

#### Scenario: 批量正文抓取之间执行随机等待

- **GIVEN** 后端收到多个微信文章正文抓取请求
- **WHEN** 后端完成一篇文章正文抓取并准备抓取下一篇
- **THEN** 后端 SHALL 在 `contentDelayRange` 随机区间内执行等待
- **AND** `contentDelayRange` 未配置时 SHALL 默认使用 10-20 秒随机区间

### Requirement: 后台可维护长期公众号列表

后台 SHALL 提供仅管理员可访问的公众号列表管理能力，用于长期保存需要每日增量采集的公众号。

#### Scenario: 管理员新增或更新公众号

- **GIVEN** 管理员已进入微信采集后台
- **WHEN** 管理员提交公众号名称、fakeid、关键词和启用状态
- **THEN** 后端 SHALL 保存或更新该公众号
- **AND** 后续定时任务 SHALL 只采集启用的公众号

#### Scenario: 管理员上传公众号列表

- **GIVEN** 管理员准备了 JSON、CSV、TSV 或 TXT 公众号列表
- **WHEN** 管理员上传文件
- **THEN** 后端 SHALL 解析文件中的公众号名称、fakeid、别名、关键词和启用状态
- **AND** 后端 SHALL 将有效账号写入长期公众号列表

### Requirement: 后台可配置每日增量采集任务

后台 SHALL 支持管理员配置每日增量采集任务的启用状态、开始时间、时区、分页数量、正文抓取开关和等待参数。

#### Scenario: 保存每日采集配置

- **GIVEN** 管理员已进入微信采集后台
- **WHEN** 管理员保存每日采集配置
- **THEN** 后端 SHALL 持久化配置
- **AND** 查询随机间隔留空或无效时 SHALL 使用 55-120 秒保守默认值
- **AND** 前端 SHALL 对等待参数显示专业性提示，避免误改为过短间隔

#### Scenario: 到达配置时间自动触发

- **GIVEN** 每日采集已启用且存在启用的公众号
- **WHEN** 当前时区时间到达配置的 `daily_run_time`
- **THEN** 后端 SHALL 自动启动一次增量采集任务
- **AND** 同一天同一配置时间 SHALL NOT 重复启动多次

### Requirement: 增量采集应保留随机等待

定时和手动批量采集 SHALL 在批量账号、自动翻页和正文抓取之间插入可配置等待，以贴近 scrape-hub 的访问节奏。

#### Scenario: 批量采集时随机等待

- **GIVEN** 采集配置包含 `query_delay_range`、`page_pause_seconds` 和 `content_delay_range`
- **WHEN** 后端执行批量公众号增量采集
- **THEN** 相邻公众号查询之间 SHALL 使用 `query_delay_range` 随机等待
- **AND** 自动翻页之间 SHALL 等待 `page_pause_seconds`
- **AND** 相邻正文抓取之间 SHALL 使用 `content_delay_range` 随机等待

### Requirement: 管理员可手动触发增量采集并查看结果

后台 SHALL 支持管理员手动触发一次增量采集，并查看任务记录和新增文章。

#### Scenario: 手动触发增量采集

- **GIVEN** 后端已有可用微信 MP 登录态
- **WHEN** 管理员点击立即采集
- **THEN** 后端 SHALL 创建一条运行记录并在后台执行采集
- **AND** API SHALL 返回运行记录
- **AND** 前端 SHALL 能展示任务状态、统计和错误信息

#### Scenario: 重复文章不重复入库

- **GIVEN** 某篇微信文章链接已经存在于增量文章表
- **WHEN** 后续任务再次抓取到该文章
- **THEN** 后端 SHALL NOT 创建重复文章记录
- **AND** 如果该文章缺少正文且本次成功抓取正文，后端 SHALL 补齐正文内容

### Requirement: 自动采集文章进入信息提取链路

系统 SHALL 将每日增量采集成功获取正文的文章送入现有 `wechat_event_parse` 信息提取能力。

#### Scenario: 正文采集成功后自动提取

- **GIVEN** 增量任务已启用自动提取且公众号文章正文已成功获取
- **WHEN** 任务保存该文章
- **THEN** 系统 SHALL 调用现有公众号活动信息提取器
- **AND** SHALL 保存结构化活动候选和提取完成状态
- **AND** SHALL 保留原文链接供管理员复核

#### Scenario: 提取失败不阻断采集

- **GIVEN** 某篇文章的 AI 提取调用失败
- **WHEN** 增量任务继续处理文章列表
- **THEN** 系统 SHALL 记录失败状态和错误原因
- **AND** SHALL 继续处理后续文章
- **AND** 后续增量任务 SHALL 可以再次尝试该文章

#### Scenario: 已完成文章不重复提取

- **GIVEN** 某篇文章已经保存 `completed` 提取结果
- **WHEN** 后续任务再次发现相同文章链接
- **THEN** 系统 SHALL NOT 重复调用 AI 提取器

#### Scenario: 管理员关闭自动提取

- **GIVEN** 管理员关闭每日采集的自动提取开关
- **WHEN** 任务采集文章和正文
- **THEN** 系统 SHALL 保留原始文章和正文
- **AND** SHALL NOT 调用 AI 提取器

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
