# 管理员后台架构审计与重构路线

日期：2026-07-08

## 本轮定调

管理员后台不是前台之外的孤立工具，而是网站业务架构、内容关系、治理模型和权限模型的后台投影。当前前台观感尚可，但后台显得混乱，说明平台底层的管理对象、审核流、主体归属和 AI 能力边界没有完全收拢。

本轮目标不是给后台换一层视觉皮肤，而是借后台反查整个网站架构：

- 哪些功能是核心业务，应该升级为长期运营能力。
- 哪些功能只是历史工具，应该降级、收纳或下线。
- 哪些功能半活不活，尤其是 AI 治理、模型配置、归属迁移、项目/赛事管理。
- 哪些后台模块没有映射到“拓浙 AI 生态”的稳定业务主线。

## 已读取的依据

- 项目记忆：`docs/ai-memory/项目决策.md`
  - 拓途浙享是“拓浙 AI 生态”的数字底座和流量入口。
  - AI 社区稳定方向是“统一内容系统 + 分版面语义 + 用户中心投稿管理”。
  - 用户系统稳定模型是“账号主体类型 + 发布审核权限 + 后台访问角色”三轴分离。
  - 组织主体与合作身份通过 `profiles`、`profile_members` 和 `ecosystem_partners.partner_scope` 分层。
- 项目记忆：`docs/ai-memory/正向经验.md`、`docs/ai-memory/错误经验.md`
  - 架构统一类任务不能按小 UI 修补处理。
  - AI 社区统一改造不能只改主页面，必须清理旧入口、旧参数和死文案。
  - AI 助手 UI 要区分“后端需要的数据”和“用户界面必须看见的信息”。
- 当前代码：
  - `src/components/Admin/*.jsx` 共 19 个文件，约 11615 行。
  - 后台主入口是 `src/components/Admin/AdminDashboard.jsx`。
  - 后台 API 主要集中在 `server/src/routes/api.js` 的 `/admin/*`、资源 CRUD、社区、设置和 AI 路由。
- 当前 OpenSpec：
  - 已有 `admin-command-center`、`admin-console-systematization`、`admin-console-experience`、`admin-layout-organization`、`admin-resource-workflows`。
  - 这些规格主要处理后台壳、导航、资源工作台和基础体验，尚未处理“后台如何映射拓浙 AI 生态业务架构”。

## 当前后台事实盘点

### 1. 入口与模块

`AdminDashboard` 当前将后台分成 5 组、19 个 tab：

| 当前分组 | 当前模块 | 主要文件 |
| --- | --- | --- |
| 工作台 | 总览、审核中心 | `Overview.jsx`、`PendingReviewManager.jsx` |
| 活动运营 | 智能治理、Organization attribution、活动、黑客松、未来学习中心 | `AiAssistantManager.jsx`、`EventAttributionMigrationManager.jsx`、`ResourceManager.jsx`、`HackathonManager.jsx`、`FutureLearningManager.jsx` |
| 内容资产 | 文章、图片、视频、影像分类、音频、页面内容 | `ResourceManager.jsx`、`MediaCategoryManager.jsx`、`PageContentEditor.jsx` |
| 社区与用户 | 社区运营、用户、留言 | `AdminCommunity.jsx`、`UserManager.jsx`、`MessageManager.jsx` |
| 系统配置 | 生态伙伴、标签、设置 | `EcosystemPartnerManager.jsx`、`TagManager.jsx`、`SettingsManager.jsx` |

这个分组已经比原始堆叠好，但仍然是历史功能分组，不是生态业务分组。

### 2. 代码体量

后台最大模块大致如下：

- `EcosystemPartnerManager.jsx`：1111 行。
- `UserManager.jsx`：897 行。
- `ResourceManager.jsx`：879 行。
- `SettingsManager.jsx`：836 行。
- `AdminCommunity.jsx`：805 行。
- `AiAssistantManager.jsx`：782 行。
- `AdminDashboard.jsx`：771 行。
- `Overview.jsx`：717 行。

体量本身不是问题，但说明很多模块已经从“页面组件”长成了“业务工作台”。继续以单文件承载，会让后续修复更慢，也会让关系越来越难看清。

### 3. API 映射

当前后台覆盖的后台能力包括：

- 账号与组织：`/admin/users`、`/admin/user-organizations`、`/admin/profiles/*`。
- 历史活动归属迁移：`/admin/event-attribution/*`。
- 社区审核与统计：`/admin/community/*`，同时继续读取 `/articles`、`/news`、`/community/posts`、`/community/groups`。
- 资源管理：`/events`、`/articles`、`/photos`、`/videos`、`/music` 等通用资源接口。
- 项目广场：已有 `/admin/projects/:id/takedown`，但后台没有一等项目管理入口。
- AI 能力：`/admin/ai-assistant/overview`、`/admin/ai-assistant/event-governance/*`、`/admin/ai-model-configs/*`。
- 生态伙伴：`/admin/ecosystem-partners`。
- 赛事与成果：`/admin/hackathon/registrations`、`/admin/competition-works`、`/admin/competition-media` 等。
- 未来学习中心：`/admin/future-learning/registrations`。
- 设置与页面：`/settings`、`/upload`。

这说明后台已经不只是内容管理系统，而是一个生态运营台，只是界面和信息架构还没有按这个事实重新组织。

### 4. i18n 与文案债务

后台组件仍有大量硬编码中文。按 `rg -c "[\\u4e00-\\u9fff]" src/components/Admin/*.jsx` 粗扫，含中文行较多的模块包括：

- `SettingsManager.jsx`：102 行。
- `AdminCommunity.jsx`：101 行。
- `EcosystemPartnerManager.jsx`：89 行。
- `ResourceManager.jsx`：90 行。
- `FutureLearningManager.jsx`：74 行。
- `HackathonManager.jsx`：71 行。
- `AdminDashboard.jsx`：62 行。
- `Overview.jsx`：58 行。
- `AiModelConfigManager.jsx`：54 行。
- `AiAssistantManager.jsx`：52 行。

后台属于用户可见界面，后续改造必须同步 `public/locales/zh/translation.json` 与 `public/locales/en/translation.json`，不能继续扩大硬编码债务。

## 核心问题判断

### 问题 1：后台分组没有完全反映网站根业务

项目记忆已经确定根业务是“赛事选才、项目育人、社区聚人、产学就业闭环”。但后台现在仍按“活动运营、内容资产、社区与用户、系统配置”分组。

结果是：

- 黑客松、项目广场、未来学习中心、合作方和组织主体没有被放进同一个“生态运营”视角。
- 项目广场已有前台和 admin takedown API，但后台没有一等管理入口。
- 生态伙伴被放在“系统配置”，容易被误解为站点设置，而不是生态主体与合作关系管理。

### 问题 2：AI 治理名称过大，实际能力偏窄

`AiAssistantManager` 当前包含：

- Agent 体系成熟度概览。
- 活动治理建议扫描与应用。
- AI 模型配置管理。

这不是完整意义上的“AI 治理”。它更准确地说是“AI 能力与数据治理控制台”的早期形态，主要治理活动元数据、模型 key、运行健康和 Agent 缺口。

如果继续叫“智能治理”，管理员会以为这里能治理全站 AI、内容质量、推荐质量、搜索质量和模型安全，但目前能力并没有覆盖完整闭环。

### 问题 3：统一社区已经做了一半，但后台还残留多源拼接感

`AdminCommunity` 已经尝试用统一内容列表管理技术分享、求助问答、新闻热点和组队协作。但底层仍同时调用：

- `/articles`
- `/news`
- `/community/posts`
- `/community/groups`

这符合“先统一界面，复用现有接口”的阶段策略，但也带来问题：

- 后台操作者看到的是统一内容，代码层仍是多种接口拼接。
- 社群二维码维护仍在同一模块内，容易把“主内容系统”和“辅助社群目录”混在一起。
- 如果后续不继续收敛，旧社区心智会在后台复活。

### 问题 4：主体、组织、合作方和权限已经有正确模型，但后台入口仍分散

项目决策已经明确：

- `account_type` 表示个人/组织账号主体。
- `review_permission` 表示发布审核能力。
- `users.role='admin'` 只表示后台访问。
- 组织主体由 `profiles + profile_members` 承载。
- 合作展示层级由 `ecosystem_partners.partner_scope` 承载。

当前后台有 `UserManager` 和 `EcosystemPartnerManager`，并且后者还承担 profile 成员管理。这说明后台已经在向正确模型靠拢，但操作者心智仍然容易混：

- 用户管理像账号权限台。
- 生态伙伴像合作方配置台。
- 组织主体管理夹在两边。
- 历史活动归属迁移又是第三个入口。

这些入口应该统一进入“主体与关系治理”域，再按任务拆分。

### 问题 5：通用 ResourceManager 承载太多不同业务

文章、图片、视频、音频、活动都复用 `ResourceManager`。这降低了开发成本，但也压平了业务差异：

- 活动有时间、地点、组织归属、推荐画像、治理建议。
- 文章和新闻属于 AI 社区内容系统。
- 图片、视频、音频属于媒体资产和赛事成果资产。
- 项目广场不是普通资源列表，而是项目育人和成果沉淀入口。

后续不一定要立刻拆掉 `ResourceManager`，但后台 IA 不能继续把所有资源都当成同类资产。

### 问题 6：多个 OpenSpec change 已完成但未归档，增加后台工作噪音

`npm run openspec:list` 显示：

- `add-wechat-webview-miniapp`：25/25，complete。
- `unify-user-organization-system`：8/8，complete。
- `add-cli-community-publishing`：6/6，complete。

这些完成项未归档，会让后续判断当前工作状态时增加噪音。后台改造前应先处理与本轮直接相关的完成规格，尤其是 `unify-user-organization-system`。

## 目标后台架构

后台应从“历史页面集合”重排成“生态运营控制台”。建议第一版目标域如下：

| 目标域 | 负责什么 | 对应当前模块 |
| --- | --- | --- |
| 运营总览 | 今日待办、内容队列、生态指标、AI 健康、异常入口 | `Overview`、`PendingReviewManager`、AI overview |
| 内容与审核 | 活动、AI 社区内容、媒体资产、页面内容、标签、分类、投稿审核 | `ResourceManager`、`AdminCommunity`、`MediaCategoryManager`、`TagManager`、`PageContentEditor` |
| 主体与关系 | 账号、组织主体、组织成员、合作层级、历史归属迁移、发布权限 | `UserManager`、`EcosystemPartnerManager`、`EventAttributionMigrationManager` |
| 生态项目运营 | 黑客松、项目广场、未来学习中心、赛事成果、产学项目需求 | `HackathonManager`、`FutureLearningManager`、项目管理缺口 |
| AI 能力治理 | 模型 key、运行健康、活动元数据治理、搜索索引、推荐质量、Agent 成熟度 | `AiAssistantManager`、`AiModelConfigManager`、search/index scripts |
| 系统与审计 | 站点设置、消息反馈、审计日志、备份、风险操作 | `SettingsManager`、`MessageManager`、`audit_logs`、`db backup` |

这里的关键不是一次性改完，而是让每个后台入口都回答一个问题：它在“赛事选才、项目育人、社区聚人、产学就业闭环”里服务哪个运营动作。

## 分阶段路线

### P0：固定架构边界

产出：

- 本审计文档。
- OpenSpec change：`reframe-admin-governance-console`。

验收：

- 后续后台代码改造都能回到这份域划分。
- 不再把“AI 治理”当成全能模块。
- 不再把生态伙伴当成普通系统配置。

### P1：重排后台导航与总览心智

目标：

- 把后台导航从历史分组改为生态运营域。
- 在总览页明确展示四条主线：内容待审、主体关系、生态项目、AI 能力健康。
- 把“智能治理”改为更准确的“AI 能力治理”或“AI 与数据治理”。
- 在模块说明中标注能力状态：可运营、维护中、实验性、仅工具。

建议文件：

- `src/components/Admin/AdminDashboard.jsx`
- `src/components/Admin/Overview.jsx`
- `src/components/Admin/AiAssistantManager.jsx`
- `public/locales/zh/translation.json`
- `public/locales/en/translation.json`

验证：

- `npm run lint`
- `npm run build`
- `npm run test:e2e -- e2e/admin-console.spec.js --project=chromium`
- 中英文后台关键页面无中文残留或布局破坏。

### P2：收拢主体与关系治理

目标：

- 保留三轴权限模型，不另建角色体系。
- 将账号、组织主体、合作展示层级和历史归属迁移放在同一管理域里表达。
- 将 `EcosystemPartnerManager` 从“系统配置”提升为“主体与关系治理”的核心入口。
- 将已完成的 `unify-user-organization-system` 归档，减少规格噪音。

建议文件：

- `src/components/Admin/UserManager.jsx`
- `src/components/Admin/EcosystemPartnerManager.jsx`
- `src/components/Admin/EventAttributionMigrationManager.jsx`
- `openspec/changes/unify-user-organization-system/`

验证：

- `npm run openspec:validate`
- 用户管理 e2e 或现有 admin console smoke。
- 手动检查普通用户、组织账号、免审核、管理员后台权限的文案不混淆。

### P3：整理内容与项目运营入口

目标：

- 将 AI 社区后台继续维护为统一内容系统，社群二维码明确降级为辅助目录。
- 给项目广场补一等后台运营入口，至少覆盖项目列表、状态、举报/下架、归属查看。
- 将媒体资产与黑客松/成果体系的关系说清，避免图片、视频只是通用素材池。

建议文件：

- `src/components/Admin/AdminCommunity.jsx`
- `src/components/Admin/ResourceManager.jsx`
- 新增或扩展项目后台管理组件。
- `server/src/controllers/projectCardController.js`
- `server/src/routes/api.js`

验证：

- 社区统一内容 e2e。
- 项目广场后台 takedown smoke。
- 旧 `tab=groups`、旧新闻/社群死文案扫描。

### P4：AI 能力治理从“半活”变成可解释状态

目标：

- 明确 AI 治理不是全能后台，而是几个可观测能力：模型配置、事件治理、搜索索引、推荐质量、Agent 运行健康。
- 每个 AI 能力显示状态、数据来源、最后运行时间、失败率或缺口，不展示无法操作的虚假入口。
- 模型 key 管理作为基础配置，但不喧宾夺主。

建议文件：

- `src/components/Admin/AiAssistantManager.jsx`
- `src/components/Admin/AiModelConfigManager.jsx`
- `server/src/services/aiAgentRegistryService.js`
- `server/src/services/unifiedAiAssistantService.js`
- `server/src/services/resourceSearchIndexService.js`

验证：

- `npm run check:ai-agents`
- `npm run check:ai-assistant`
- 后台 AI overview API smoke。
- 无可操作能力的模块必须显示“实验性/待接入/只读诊断”，不能伪装成已完成。

## 暂不做

- 不重新设计一套用户权限模型。
- 不把后台一次性拆成很多新路由或微前端。
- 不删除历史数据或迁移组织归属，除非有单独审计清单和可回滚方案。
- 不把所有 AI 能力合并成一个“超级 Agent”入口。
- 不为了清理硬编码文案而先做大规模无业务收益的纯 i18n 搬运；优先跟随被改造模块同步处理。

## 下一步建议

第一批执行应从 P1 开始：重排后台导航和总览心智。原因是它影响最大、风险较低、不碰数据库，又能马上让后台从“功能堆叠”变成“生态运营控制台”。随后再进入 P2 和 P3，处理主体关系和项目运营缺口。
