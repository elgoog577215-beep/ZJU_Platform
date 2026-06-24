# global-ai-search-platform Specification

## Purpose
TBD - created by archiving change global-ai-search-platform. Update Purpose after archive.
## Requirements
### Requirement: 全站语言解析式搜索

系统 SHALL 通过统一搜索入口解析自然语言查询，并检索活动、AI 社区和影像库资源。

#### Scenario: 用户搜索跨模块资源

- **WHEN** 用户在全站搜索中输入自然语言查询
- **THEN** 系统返回统一的 `results`、`groups`、`parsed_query` 和 `match_reasons`
- **AND** 结果可跳转到活动、AI 社区或影像库的对应内容

#### Scenario: 搜索真实库中的活动类型词

- **WHEN** 用户搜索“讲座”等活动类型词
- **THEN** 系统不只依赖活动 `category` 字段做硬过滤
- **AND** 系统使用报告、论坛、沙龙、研讨等语义扩展词召回活动线索

#### Scenario: 搜索真实库中的影像资源

- **WHEN** 用户搜索“影像库 视频”或影像库相关查询
- **THEN** 系统返回已审核且未删除的视频或照片
- **AND** 系统兼容统一媒体分类表和历史照片、视频分类表

### Requirement: 用户系统活动画像

系统 SHALL 将活动推荐画像作为用户系统资料的一部分维护。

#### Scenario: 用户维护活动画像

- **GIVEN** 用户已登录
- **WHEN** 用户打开个人资料设置中的活动画像页
- **THEN** 系统允许用户维护学院或组织、方向、年级、常用校区、空闲时间、兴趣关键词、偏好活动类型、偏好收益和参与形式
- **AND** 系统将这些字段保存到 `user_event_preferences`

#### Scenario: 推荐助手读取用户画像

- **GIVEN** 用户已登录且维护了活动画像
- **WHEN** 用户使用活动推荐助手请求推荐
- **THEN** 推荐助手读取用户系统画像
- **AND** 推荐结果的画像摘要包含可用的学院、年级、校区、空闲时间和兴趣信息

#### Scenario: 推荐助手不再维护长期画像

- **WHEN** 用户在活动推荐助手中查看画像来源
- **THEN** 助手展示用户系统中的画像摘要
- **AND** 助手引导用户前往个人资料设置页维护长期画像

### Requirement: 全站资源结构化索引

系统 SHALL 通过治理刷新任务为活动、AI 社区和影像库生成统一结构化索引，并让全站搜索使用该索引增强召回。

#### Scenario: 治理刷新任务生成统一索引

- **WHEN** 后台执行全站资源索引刷新任务
- **THEN** 系统只读取公开、已审核、未删除的活动、AI 社区和影像库资源
- **AND** 系统为每个资源写入摘要、关键词、分面字段、embedding 输入文本和向量兼容字段
- **AND** 系统记录刷新数量、跳过数量、失败数量和索引覆盖率

#### Scenario: 全站搜索使用索引补充召回

- **GIVEN** 资源索引中存在可用索引行
- **WHEN** 用户通过全站搜索输入自然语言查询
- **THEN** 系统在原有 SQL 召回之外使用结构化索引进行补充召回
- **AND** 系统合并重复资源，保留统一的 `results`、`groups`、`legacy` 和 `match_reasons` 输出协议

#### Scenario: 向量实现可替换

- **WHEN** 后续接入真实 embedding 或外部向量库
- **THEN** 系统可以替换 `embedding_text` / `vector_json` 的生成和检索实现
- **AND** 全站搜索 API 和前端结果协议不需要变化

