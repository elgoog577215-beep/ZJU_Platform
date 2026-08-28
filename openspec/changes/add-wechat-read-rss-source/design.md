# add-wechat-read-rss-source 设计

## 来源边界

继续使用 `wechatMpScheduledIngestService` 作为任务、运行记录、增量文章、AI 提取和活动初筛的拥有者。新增 `wechatReadRssService` 只负责：

1. 根据受信任的基地址和 feed ID 生成请求地址；
2. 请求 Atom/RSS feed；
3. 解析 feed 项目并转换为现有采集服务使用的文章形状。

推荐生产配置：

```text
WEWE_RSS_BASE_URL=https://rss.tuotuzju.com
GET ${WEWE_RSS_BASE_URL}/feeds/${feed_id}.atom?limit=20&page=1&mode=fulltext
```

默认不附加 `update=true`。WeWe RSS 自己负责微信读书同步和定时更新，主仓库只读取已生成的 feed，避免一次采集同时触发上游刷新。

## 数据模型

在现有 `wechat_mp_ingest_accounts` 增加兼容字段：

- `source_type`：`wechat_mp` 或 `wewe_rss`，旧记录默认 `wechat_mp`；
- `rss_feed_id`：WeWe RSS feed ID，不能包含路径、协议或查询字符串。

现有字段继续复用：

- `name`：管理员可读的公众号/来源名称；
- `enabled`、`fetch_content`、`count_per_page`、`max_pages`：继续控制来源；
- `wechat_mp_ingest_articles.link`：作为跨来源唯一去重键；
- `wechat_mp_ingest_articles.content_text/content_html/images_json`：保存 RSS 全文映射；
- `extraction_*`、`activity_*`：继续保存 AI 提取、活动初筛和治理结果。

不在主平台业务数据库保存 WeRead token 或微信登录 cookie；WeWe RSS 的管理授权码只作为主平台服务端环境变量 `WEWE_RSS_AUTH_CODE` 使用，不进入前端状态或业务记录。

## Feed 解析

解析器需要兼容 Atom 和 RSS 2.0 的最小字段集合：

| 目标字段 | Atom                                     | RSS 2.0                           |
| -------- | ---------------------------------------- | --------------------------------- |
| 标题     | `entry > title`                          | `item > title`                    |
| 原文链接 | `link[rel=alternate].href` / `link.href` | `link`                            |
| 唯一标识 | `id`                                     | `guid`                            |
| 作者     | `author > name`                          | `dc:creator` / `author`           |
| 发布时间 | `published` / `updated`                  | `pubDate`                         |
| 全文     | `content` / `summary`                    | `content:encoded` / `description` |
| 封面     | feed 扩展图片                            | `media:content` / 正文首图        |

正文同时保存 HTML 和纯文本。纯文本用于 AI 提取，HTML 用于管理员预览；图片 URL 经过现有可信资源和本地化策略处理。若 feed 没有正文，不回退抓取原始微信页面，只记录正文缺失状态。

## 任务执行

现有任务循环按来源类型分支：

- `wechat_mp`：沿用登录态、分页、正文抓取和现有等待策略；
- `wewe_rss`：调用 RSS provider，一次获取 feed 项目及其全文，不调用 `fetchArticleContent`。

来源列表在执行前按“启用状态、来源优先级、更新时间”排序：启用的 `wewe_rss` 先于启用的 `wechat_mp`，同类来源仍按最近更新时间优先。这样 RSS 是默认和主要来源，但不会禁用已经配置的直连来源；RSS 失败后仍继续处理其他来源。

RSS 分页使用 `limit` 和 `page`，不使用上游刷新参数。每个来源的异常进入当前运行记录的错误统计，继续处理其他来源。文章写入和后续 `parseWithLLM`、活动初筛逻辑保持同一入口。

## API 与前端

增量采集继续使用现有路由：

- `GET/PUT /api/admin/wechat-mp/ingest/settings`；
- `GET/POST/PUT/DELETE /api/admin/wechat-mp/ingest/accounts`；
- `POST /api/admin/wechat-mp/ingest/run`；
- 文章、运行记录和解析重试接口。

WeWe RSS 的管理能力通过主平台后端代理，不让浏览器直接携带 WeWe RSS 授权码。主平台使用服务端环境变量 `WEWE_RSS_AUTH_CODE` 调用 WeWe RSS 的受保护 tRPC API，并对返回值做脱敏后提供以下管理员路由：

- `/api/admin/wechat-rss/login/*`：发起、轮询和取消微信读书扫码登录；登录成功后由服务端直接写入 WeWe RSS 账号，Token 不返回浏览器；
- `/api/admin/wechat-rss/accounts`：账号列表、启停和删除；
- `/api/admin/wechat-rss/feeds`：公众号订阅源解析、增删改和列表；
- `/api/admin/wechat-rss/feeds/:id/refresh`、`/refresh-all`：更新文章；
- `/api/admin/wechat-rss/feeds/:id/history`、`/history/status`：历史文章同步和状态；
- `/api/admin/wechat-rss/articles`：文章列表和删除。

后台在现有内容采集页面增加 RSS 管理工作区，直连微信 MP 工作区继续保留。生产 WeWe RSS 以 headless backend 运行：保留 `/feeds/*` 和受保护的 `/trpc/*`，`/dash*` 返回 404；`apps/web` 源码保留但不进入生产镜像。`WEWE_RSS_AUTH_CODE` 只存在主平台服务端环境变量中，WeWe RSS 的 MySQL 和微信读书登录态仍由独立服务保存。

账号返回值增加 `source_type` 和 `rss_feed_id`。后台来源表单增加来源类型选择：

- 选择直连微信 MP 时显示现有 fakeid、关键词和登录提示；
- 选择微信读书 RSS 时显示 feed ID 和基地址说明，不强制登录微信 MP；
- 手动运行按钮只有在存在可用的直连登录态或启用的 RSS 来源时才禁用。

中英文文案通过现有 locale 维护，不能把 token、完整 feed URL 或内部异常堆栈展示给普通用户。

## 安全、性能与回滚

- 仅允许 HTTPS `WEWE_RSS_BASE_URL`，启动时规范化并拒绝包含用户名、密码或非 HTTP(S) 协议的基地址；
- feed ID 使用有限字符集校验，并通过 URL path 构造，阻断任意路径和 SSRF；
- 请求设置超时、有限重试和响应大小上限；解析失败保留运行记录，不写入半成品文章；
- 默认读取 `mode=fulltext`，不主动触发 `update=true`，降低对 WeRead/WeWe 上游的额外压力；
- 回滚时关闭或删除 `wewe_rss` 来源即可，已有增量文章和审核结果保留；删除新增列不是回滚要求。

## 验证矩阵

- Atom、RSS 2.0、CDATA、HTML 实体、相对/无效链接和空正文 fixture；
- feed ID 校验、基地址校验、请求超时和 HTTP 错误；
- RSS 来源首次写入、重复写入、全文复用、空正文和失败重试；
- RSS 来源不调用直连微信 MP API，直连来源行为不变；
- 现有 scheduled ingest 测试、相关 backend test、lint、build；
- 配置至少一个真实 WeWe feed 后，再执行生产环境手动任务和文章内容/AI/审核 smoke。

当前服务器的 WeWe RSS feed 列表仍为空，真实 smoke 需要先在 WeWe RSS 后台登录微信读书并添加公众号订阅源。
