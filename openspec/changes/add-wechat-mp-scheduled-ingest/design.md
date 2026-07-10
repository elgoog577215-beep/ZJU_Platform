# add-wechat-mp-scheduled-ingest 设计

## 后端模型

新增 `wechatMpScheduledIngestService`，负责 schema、配置、账号列表、导入解析、运行记录、文章持久化和定时调度。

新增 SQLite 表：

- `wechat_mp_ingest_settings`：单行配置，包含启用状态、每日开始时间、时区、查询随机间隔、分页暂停、正文间隔、分页数量和是否抓正文。
- `wechat_mp_ingest_accounts`：长期维护公众号列表，保存名称、fakeid、别名、关键词、启用状态和单账号覆盖参数。
- `wechat_mp_ingest_articles`：增量文章库，以 `link` 唯一约束去重，保存文章元数据、正文文本、正文 HTML 和图片列表。
- `wechat_mp_ingest_runs`：任务运行记录，保存触发来源、状态、统计、错误和执行配置快照。

## 调度方式

服务启动后注册 `startWechatMpIngestScheduler({ getDb })`。定时器默认每分钟检查一次配置：

- 配置未启用时不触发。
- 当前时区下的 `HH:mm` 等于 `daily_run_time` 时触发。
- 同一天同一时间只触发一次，避免一分钟内重复执行。
- 如果已有任务运行，返回冲突并跳过新任务。

可用 `WECHAT_MP_INGEST_SCHEDULER_DISABLED=1` 禁用本地调度，便于测试或多实例部署。

## 随机等待

`wechatMpAdminService` 增加通用等待工具：

- `normalizeDelayRangeSeconds(value, fallback)`：解析区间并限制最大等待。
- `waitDelayRange(range, runtime)`：在区间内随机等待；测试可注入 `runtime.sleep` 和 `runtime.random`。
- `fetchArticles` 支持 `pagePauseSeconds` 或 `pacing.page_pause_seconds`，自动翻页时在第二页及之后等待。

定时任务在以下位置插入等待：

- 相邻公众号账号查询之间使用 `query_delay_range`。
- 自动翻页之间使用 `page_pause_seconds`。
- 相邻正文抓取之间使用 `content_delay_range`。

## 管理员 API

新增仅管理员可访问接口：

- `GET /api/admin/wechat-mp/ingest`
- `GET /api/admin/wechat-mp/ingest/settings`
- `PUT /api/admin/wechat-mp/ingest/settings`
- `GET /api/admin/wechat-mp/ingest/accounts`
- `POST /api/admin/wechat-mp/ingest/accounts`
- `PUT /api/admin/wechat-mp/ingest/accounts/:id`
- `DELETE /api/admin/wechat-mp/ingest/accounts/:id`
- `POST /api/admin/wechat-mp/ingest/accounts/import`
- `POST /api/admin/wechat-mp/ingest/run`
- `GET /api/admin/wechat-mp/ingest/runs`
- `GET /api/admin/wechat-mp/ingest/articles`

## 前端体验

在现有微信采集后台中增加“每日增量采集”区域：

- 展示启用状态、每日时间、账号数量、最近任务和新增文章。
- 配置默认预填 55/120 秒查询间隔，并标注这是反风控专业参数。
- 支持上传账号文件、手动新增账号、删除账号、手动触发任务。
- 保持文案面向小白用户，不暴露内部调试信息。
