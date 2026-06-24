## Goals / Non-Goals

**目标：**

- 将搜索能力从活动扩展到活动、AI 社区、影像库。
- 用统一服务输出 `results`、`groups`、`parsed_query`、`match_reasons`，为后续向量化和治理助手接入预留协议。
- 保留活动推荐助手，避免把“查找内容”和“画像推荐”混成一个入口。
- 把活动推荐画像归入用户系统，作为个人资料的一部分被推荐助手读取。

**非目标：**

- 不把活动推荐助手改造成全站搜索入口。
- 不在本阶段引入外部向量数据库或独立搜索数据库。
- 不直接引入目标分支中固定测试库路径的搜索实现。

## Architecture

新增 `globalSearchService`，作为全站搜索的唯一后端服务边界；新增 `resourceSearchIndexService`，作为治理助手写入全站资源索引的后台能力边界。

搜索服务分三层：

1. `parseGlobalSearchQuery`：解析用户自然语言，识别模块意图、时间范围、校区、活动类型、人群、收益、媒体类型和关键词。
2. `searchGlobalContent`：并行检索活动、文章/求助/社群、照片/视频等内容，并合并治理索引补充召回。
3. `serializeGlobalSearchResponse`：统一结果形态，输出匹配理由、分组统计、跳转链接和兼容的扁平结果。

索引服务分三层：

1. `loadIndexableResources`：只读取公开、已审核、未删除的活动、AI 社区和影像库资源。
2. `buildResourceIndexRow`：生成摘要、关键词、分面字段、embedding 输入文本和本地轻量向量。
3. `refreshResourceSearchIndex`：增量写入 `resource_search_index`，并把刷新记录写入 `ai_assistant_runs` 的 `global_search_index` 模块。

## Data Flow

前端 `SearchPalette` 调用：

```text
GET /api/search?q=...
```

后端返回：

```text
{
  query,
  parsed_query,
  total,
  search_time_ms,
  groups,
  results,
  legacy
}
```

`legacy` 用于短期兼容旧搜索弹窗的扁平数组思维；主 UI 使用 `groups` 和 `results`。

## Module Boundaries

- 活动：检索 `events`，使用时间、校区、分类、人群、收益和标题/描述等字段。
- AI 社区：检索 `articles`、`community_posts`、`community_groups`，跳转到 `/articles?tab=...`。
- 影像库：检索 `photos`、`videos`，跳转到 `/media?photo=...` 或 `/media?video=...`。
- 活动推荐助手：继续使用 `EventAssistantPanel` 与 `/api/events/assistant`，不进入全站搜索服务。
- 用户系统：个人资料设置页维护活动画像，保存到 `user_event_preferences`；推荐助手读取该表和个人名片、身份认证、行为证据，不在助手卡片内维护长期资料。

## Real Data Adaptation

真实库里的活动分类字段并不稳定，大量活动 `category` 为空。因此活动类型词不能只作为硬过滤条件，而要转成语义扩展召回词，例如“讲座”同时召回“报告、论坛、沙龙、分享会、研讨、讲堂”等文本线索。真实库里的影像分类也可能使用 `photo_categories` / `video_categories` 旧表，搜索服务需要优先使用统一 `media_categories`，失败时回退旧表或无分类字段查询。

## Structured Index

`resource_search_index` 存储活动、AI 社区、影像库的统一索引行：

- `resource_type` / `resource_id` / `group_key` 标识资源来源。
- `summary`、`keyword_terms`、`facet_json` 支撑结构化检索和匹配理由。
- `embedding_text`、`vector_json` 提供可替换的向量检索协议；当前实现用本地词元哈希向量，后续可替换成模型 embedding。
- `source_hash` 用于判断资源是否变化，避免重复刷新。

全站搜索仍保留原 SQL 召回；索引召回只做增强和补充。重复结果按资源类型和资源 ID 合并，前端不需要感知结果来自 SQL 还是治理索引。

## Future Hooks

后续可以把 `vector_json` 替换为真实 embedding 或外部向量库 ID，也可以把治理助手的模型摘要写入同一表。只要 `globalSearchService` 的输出协议不变，前端和全站搜索入口无需重构。

## Risks

- 全站搜索命名容易和活动推荐助手混淆，因此 UI 需要明确区分“全站 AI 搜索”和“活动推荐助手”。
- 当前阶段的 `vector_json` 是本地轻量向量，不等于真正 embedding/RAG；响应里只宣称“结构化索引/索引补充召回”。
- 搜索结果只返回公开、已审核、未删除内容，避免越权显示。
- 索引刷新会写入本地数据库，但数据库文件仍是 ignored 本地资产，不进入 git。
