## Goals / Non-Goals

**目标：**

- 将搜索能力从活动扩展到活动、AI 社区、影像库。
- 用统一服务输出 `results`、`groups`、`parsed_query`、`match_reasons`，为后续向量化和治理助手接入预留协议。
- 保留活动推荐助手，避免把“查找内容”和“画像推荐”混成一个入口。

**非目标：**

- 不改造活动推荐助手的推荐链路。
- 不迁移数据库 schema。
- 不直接引入目标分支中固定测试库路径的搜索实现。

## Architecture

新增 `globalSearchService`，作为全站搜索的唯一后端服务边界。

服务分三层：

1. `parseGlobalSearchQuery`：解析用户自然语言，识别模块意图、时间范围、校区、活动类型、人群、收益、媒体类型和关键词。
2. `searchGlobalContent`：并行检索活动、文章/求助/社群、照片/视频等内容。
3. `serializeGlobalSearchResponse`：统一结果形态，输出匹配理由、分组统计、跳转链接和兼容的扁平结果。

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

## Future Hooks

后续治理助手可以把资源质量、分类、关键词、摘要写成结构化索引；向量化能力也可以在 `globalSearchService` 内部替换或增强 SQL 召回。前端不需要感知索引实现变化。

## Risks

- 全站搜索命名容易和活动推荐助手混淆，因此 UI 需要明确区分“全站 AI 搜索”和“活动推荐助手”。
- 当前阶段仍是规则和 SQL 检索，不等于真正 embedding/RAG；响应里不宣称向量检索。
- 搜索结果只返回公开、已审核、未删除内容，避免越权显示。
