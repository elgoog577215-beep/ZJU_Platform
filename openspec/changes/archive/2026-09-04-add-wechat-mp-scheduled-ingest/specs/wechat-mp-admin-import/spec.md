# wechat-mp-admin-import 规格变更

## ADDED Requirements

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
