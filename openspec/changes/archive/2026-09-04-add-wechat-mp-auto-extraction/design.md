# add-wechat-mp-auto-extraction 设计

## 数据流

```text
公众号文章列表
  → 增量文章去重
  → 抓取正文
  → 现有 parseWithLLM({ title, author, content, coverImage })
  → wechat_mp_ingest_articles.extracted_event_json
  → 管理员复核后手动导入 events/articles
```

## 存储

`wechat_mp_ingest_settings` 新增 `auto_parse`，默认启用。

`wechat_mp_ingest_articles` 新增：

- `extraction_status`：`not_started`、`processing`、`completed`、`failed`。
- `extracted_event_json`：现有解析器返回的完整结构化 JSON，包含 AI 元信息。
- `extraction_error`：失败时保存可读错误信息。
- `extracted_at`：最近一次成功提取时间。

运行记录新增 `extracted_articles` 和 `extraction_failed_count`，与正文抓取失败统计分开。

## 服务边界

`wechatMpScheduledIngestService` 负责调度和持久化；`parseWithLLM` 仍是唯一的信息提取入口。自动任务向解析器传入同一数据库连接，避免重新打开连接；AI 审计复用现有 `wechat_event_parser` 记录格式。

提取只针对已有正文且状态不是 `completed` 的文章。解析失败记录后继续处理下一篇，后续任务再次遇到该文章时重试。

## 前端

每日增量采集配置增加“自动提取活动信息”开关。最近文章显示正文状态和提取状态，避免管理员误以为只有采集完成就已经生成活动候选。

## 风险与回滚

- 自动提取会增加模型调用量；可通过 `auto_parse` 关闭，原始文章和正文仍然保留。
- AI 输出仍然只是候选，不改变 `events` 表，不影响公开内容。
- 回滚代码后新增列保留，不影响旧采集数据读取；关闭 `auto_parse` 可立即停止模型调用。
