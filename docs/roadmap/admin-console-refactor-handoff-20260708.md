# 管理员后台重构交接文档

日期：2026-07-08

适用对象：接手修改管理员后台的同学。

## 1. 一句话结论

这次不要把管理员后台当成一个“界面太乱，需要重新排版”的问题。管理员后台是网站业务架构的投影。现在后台显得乱，说明平台底层的内容系统、用户与组织关系、生态项目、AI 能力和系统治理还没有被同一套后台心智组织起来。

前台看起来还可以，是因为页面视觉和单点功能已经被多次修过；后台乱，是因为后台把历史功能直接堆在一起，很多模块没有重新归类、没有标注成熟度，也没有说明它服务“拓浙 AI 生态”的哪条业务主线。

本轮建议把后台从“历史功能集合”改成“生态运营与治理控制台”。

## 2. 背景：为什么后台能反映网站架构

拓途浙享现在不是普通校园活动站，而是“拓浙 AI 生态”的数字底座和流量入口。这个生态大致有四条主线：

- 赛事选才：黑客松、比赛报名、作品展示、优秀项目沉淀。
- 项目育人：项目广场、产学项目、未来学习中心、真实问题揭榜。
- 社区聚人：AI 社区、新闻热点、技术分享、求助问答、组队协作、微信群社群导流。
- 产学就业闭环：学校、社团、企业、政府需求、合作方、组织主体、学生团队、实习就业机会。

前台页面负责把这些东西包装成用户能理解的入口；后台负责把它们变成可运营、可审核、可归属、可追踪、可治理的对象。

所以后台乱，通常不只是“按钮和表格乱”，而是以下几类问题一起出现：

- 管理对象不清楚：到底管理的是内容、用户、组织、活动、项目，还是合作关系。
- 权限关系不清楚：普通用户、组织账号、免审核、管理员后台权限混在一起。
- 内容系统不清楚：AI 社区到底是一个统一内容系统，还是文章、新闻、帖子、社群的拼接。
- AI 能力边界不清楚：哪些是已经可用的自动化能力，哪些只是诊断或实验能力。
- 生态主线不清楚：黑客松、项目广场、未来学习中心、生态伙伴没有形成一个运营闭环。

## 3. 当前代码事实

### 3.1 管理员后台入口

主入口：

- `src/components/Admin/AdminDashboard.jsx`

当前后台通过 `tab` query 参数切换模块，例如：

- `/admin?tab=overview`
- `/admin?tab=pending`
- `/admin?tab=intelligence`
- `/admin?tab=users`

注意：后续改导航分组时，不建议立刻改 tab id。tab id 已经用于 URL 深链、sessionStorage、测试和旧链接兼容。第一阶段应保留现有 tab id，只改分组、标题、说明和呈现层。

### 3.2 当前后台模块

当前 `AdminDashboard` 里有 5 组、19 个 tab：

| 当前分组 | 当前模块 | 主要组件 |
| --- | --- | --- |
| 工作台 | 总览、审核中心 | `Overview.jsx`、`PendingReviewManager.jsx` |
| 活动运营 | 智能治理、Organization attribution、活动、黑客松、未来学习中心 | `AiAssistantManager.jsx`、`EventAttributionMigrationManager.jsx`、`ResourceManager.jsx`、`HackathonManager.jsx`、`FutureLearningManager.jsx` |
| 内容资产 | 文章、图片、视频、影像分类、音频、页面内容 | `ResourceManager.jsx`、`MediaCategoryManager.jsx`、`PageContentEditor.jsx` |
| 社区与用户 | 社区运营、用户、留言 | `AdminCommunity.jsx`、`UserManager.jsx`、`MessageManager.jsx` |
| 系统配置 | 生态伙伴、标签、设置 | `EcosystemPartnerManager.jsx`、`TagManager.jsx`、`SettingsManager.jsx` |

这个分组不是完全错误，但它更像历史功能分组，还没有变成生态业务分组。

### 3.3 后台组件体量

`src/components/Admin/*.jsx` 目前约 11615 行。最大模块：

| 文件 | 行数 | 判断 |
| --- | ---: | --- |
| `EcosystemPartnerManager.jsx` | 1111 | 已经不是简单“合作方配置”，还包含 profile 和成员治理，应升级为主体关系管理的一部分 |
| `UserManager.jsx` | 897 | 已经接入三轴权限和组织聚合，应继续保持这个模型 |
| `ResourceManager.jsx` | 879 | 复用度高，但把活动、文章、图片、视频、音频压成同类资源，业务差异被抹平 |
| `SettingsManager.jsx` | 836 | 系统设置体量大，适合归到低频高风险的系统与审计域 |
| `AdminCommunity.jsx` | 805 | 正在做统一内容管理，但仍拼接 articles/news/posts/groups 多套接口 |
| `AiAssistantManager.jsx` | 782 | 已有 Agent、活动治理、模型配置，但“治理”命名过大 |
| `AdminDashboard.jsx` | 771 | 当前改造第一入口 |
| `Overview.jsx` | 717 | 应从资源统计页升级为生态运营总览 |

体量不是罪。问题是这些文件已经承担了业务工作台职责，但仍以“页面组件”方式堆在一个文件里。短期可以先不拆文件，先把 IA 和心智收住；后续再逐步拆 hooks、子组件和配置。

## 4. 当前后台 API 地图

### 4.1 账号、组织与关系

前端：

- `src/components/Admin/UserManager.jsx`
- `src/components/Admin/EcosystemPartnerManager.jsx`
- `src/components/Admin/EventAttributionMigrationManager.jsx`

后端：

- `GET /admin/users`
- `GET /admin/user-organizations`
- `PUT /admin/users/:id`
- `DELETE /admin/users/:id`
- `GET /admin/profiles`
- `PUT /admin/profiles/:id`
- `GET /admin/profiles/:id/members`
- `PUT /admin/profiles/:id/members/:userId`
- `DELETE /admin/profiles/:id/members/:userId`
- `GET /admin/ecosystem-partners`
- `POST /admin/ecosystem-partners`
- `PUT /admin/ecosystem-partners/:id`
- `DELETE /admin/ecosystem-partners/:id`
- `GET /admin/event-attribution/candidates`
- `POST /admin/event-attribution/apply`
- `GET /admin/event-attribution/logs`

稳定模型：

- `account_type`：个人账号或组织运营账号。
- `review_permission`：普通审核、免审核、管理员级发布能力。
- `users.role = 'admin'`：是否能进后台。
- `profiles + profile_members`：组织主体和组织成员。
- `ecosystem_partners.partner_scope`：生态/比赛合作方还是活动提供方。

这套模型是正确方向，不要重做一套新角色系统。

### 4.2 内容与审核

前端：

- `PendingReviewManager.jsx`
- `ResourceManager.jsx`
- `AdminCommunity.jsx`
- `MediaCategoryManager.jsx`
- `TagManager.jsx`
- `PageContentEditor.jsx`

后端：

- `GET /admin/pending`
- `PUT /:resource/:id/status`
- `GET /articles`
- `GET /news`
- `GET /community/posts`
- `GET /community/groups`
- `PUT /admin/community/posts/:id/review`
- `POST /admin/community/posts/batch-review`
- `GET /admin/community/stats`
- `GET /admin/community/metrics`
- `GET /admin/media-categories`
- `POST /admin/media-categories`
- `PUT /admin/media-categories/:id`
- `DELETE /admin/media-categories/:id`

重点判断：

- AI 社区的后台已经在尝试统一内容管理。
- 但底层仍然是文章、新闻、社区帖子、社群目录的拼接。
- 社群二维码目录应该被明确标注为辅助目录，不应和主内容系统混成同一层级。

### 4.3 生态项目与赛事

前端：

- `HackathonManager.jsx`
- `FutureLearningManager.jsx`
- 目前缺项目广场后台管理组件。

后端：

- `GET /admin/hackathon/registrations`
- `DELETE /admin/hackathon/registrations/:id`
- `GET /admin/competition-works`
- `PUT /admin/competition-works/:id/review`
- `GET /admin/competition-media`
- `PUT /admin/competition-media/:id/review`
- `GET /admin/future-learning/registrations`
- `PUT /admin/future-learning/registrations/:id`
- `DELETE /admin/future-learning/registrations/:id`
- `GET /projects`
- `GET /projects/:id`
- `PUT /admin/projects/:id/takedown`

明显缺口：

- 项目广场已经是前台一等页面。
- 后端只有公开列表、详情和 admin takedown。
- 后台没有项目列表、状态筛选、举报队列、作者/组织归属查看。

这会让“项目育人”这条业务线在后台缺席。

### 4.4 AI 能力治理

前端：

- `AiAssistantManager.jsx`
- `AiModelConfigManager.jsx`

后端：

- `GET /admin/ai-assistant/overview`
- `POST /admin/ai-assistant/event-governance/scan`
- `POST /admin/ai-assistant/event-governance/apply`
- `GET /admin/ai-model-configs`
- `POST /admin/ai-model-configs`
- `PUT /admin/ai-model-configs/:id`
- `DELETE /admin/ai-model-configs/:id`
- `POST /admin/ai-model-configs/:id/test`

后端 overview 里其实已经有不少治理数据：

- 活动总数和未分类活动数。
- 活动治理运行次数。
- 推荐助手运行次数和反馈。
- 黑客松助手运行次数。
- 微信解析运行次数。
- 活动画像索引覆盖。
- 全站搜索索引覆盖。
- 推荐行为证据。
- 模型健康状态。
- Agent runtime health。

问题在于前端表达仍像“Agent 体系 + 治理建议 + 模型配置”的拼盘，没有把它整理成“AI 能力是否可信、是否健康、是否能运营”的状态面板。

## 5. 核心问题诊断

### 5.1 问题一：后台分组没有对应生态业务主线

现在的后台分组是：

- 工作台
- 活动运营
- 内容资产
- 社区与用户
- 系统配置

建议改成：

- 运营总览
- 内容与审核
- 主体与关系
- 生态项目运营
- AI 能力治理
- 系统与审计

这不是换名字，而是换后台心智。

比如：

- 生态伙伴不应放在系统配置里，它是主体与关系治理。
- 未来学习中心不只是活动运营，它属于生态项目运营。
- 黑客松不只是报名管理，它是赛事选才和成果沉淀。
- 项目广场不应缺席后台，它是项目育人的核心对象。
- AI 治理不能只写“智能治理”，要说明它治理什么、没治理什么。

### 5.2 问题二：AI 治理半活，但名字太大

当前 `AiAssistantManager` 的 tab 是：

- Agent 体系
- 治理建议
- 模型配置

页面标题是“治理与模型配置”，导航里叫“智能治理”。

这个名字会让人误以为后台能治理全站 AI，但现在实际能力主要是：

- 查看 Agent 成熟度。
- 扫描活动元数据治理建议。
- 应用活动治理建议。
- 管理模型 key。

建议改成“AI 能力治理”或“AI 与数据治理”，并拆成更准确的四块：

- AI 运行健康：模型、失败率、最近运行、fallback。
- 活动元数据治理：当前已有 scan/apply。
- 搜索与推荐质量：索引覆盖、推荐反馈、行为证据。
- Agent 成熟度：哪些 live，哪些 partial，哪些 planned。

没有可操作闭环的能力必须标注“只读诊断”“实验性”或“待接入”。

### 5.3 问题三：AI 社区后台已统一，但底层仍拼接

`AdminCommunity` 现在读：

- `/articles`
- `/news`
- `/community/posts`
- `/community/groups`

这说明“统一内容系统”还处在界面统一阶段。后台看起来统一，但代码和数据接口仍是多源拼接。

短期不要强行重构数据库，也不要把新闻、帖子、文章立刻合一。第一阶段只做这几件事：

- 后台文案明确“统一内容管理”。
- 社群二维码维护明确是辅助目录。
- 不恢复旧的社群/新闻/帖子割裂入口。
- 继续清理旧 `tab=groups`、旧文案、旧参数。

### 5.4 问题四：主体关系模型正确，但入口分散

项目已经形成正确方向：

- 用户账号是一层。
- 组织 profile 是一层。
- 组织成员关系是一层。
- 合作方展示层级是一层。
- 发布审核权限是一层。
- 后台管理员权限是一层。

但后台入口仍分散：

- `UserManager` 管账号和组织聚合。
- `EcosystemPartnerManager` 管合作方，也管 profile 成员。
- `EventAttributionMigrationManager` 管历史活动归属。

这些应统一到“主体与关系”域下，不一定要合成一个页面，但必须在导航和说明里让操作者知道它们是一套关系模型。

### 5.5 问题五：项目广场缺后台

项目广场前台存在，项目卡片后端存在，个人主页也接入项目内容，但后台没有一等项目管理视图。

至少要补：

- 项目列表。
- 状态筛选：published、draft、removed。
- 搜索：标题、作者、需求标签、技术栈。
- 查看作者和组织归属。
- 举报或下架。
- 恢复或重新发布是否做，第一期可以先不做。

如果短期不做完整 CRUD，也至少要把项目纳入审核/风险队列。

### 5.6 问题六：i18n 债务明显

后台大量组件仍有硬编码中文。后续触碰任何后台可见文案时，必须同步：

- `public/locales/zh/translation.json`
- `public/locales/en/translation.json`

不要再只在 JSX 里写中文 fallback。

但是也不要为了“清理全部硬编码”制造巨大 diff。原则是：改哪个模块，就把哪个模块的新文案和关键旧文案一起接入 i18n。

## 6. 目标后台架构

### 6.1 建议导航结构

| 新治理域 | 目的 | 建议包含 |
| --- | --- | --- |
| 运营总览 | 一眼看今天该处理什么 | 总览、审核中心、风险入口 |
| 内容与审核 | 管公开内容和内容状态 | 活动、社区内容、文章、图片、视频、音频、页面内容、标签、分类 |
| 主体与关系 | 管谁发布、谁拥有、谁背书、谁有权限 | 用户、组织、合作方、组织成员、历史归属迁移 |
| 生态项目运营 | 管赛事、项目和产学入口 | 黑客松、项目广场、未来学习中心、赛事作品、成果素材 |
| AI 能力治理 | 管 AI 是否可用、可信、有闭环 | AI overview、活动元数据治理、模型配置、搜索索引、推荐质量、Agent 成熟度 |
| 系统与审计 | 管低频高风险能力 | 设置、留言、审计日志、数据库备份、系统状态 |

### 6.2 当前 tab 到新域的映射

| 当前 tab | 建议新域 | 处理建议 |
| --- | --- | --- |
| `overview` | 运营总览 | 改成生态运营总览，不只是资源统计 |
| `pending` | 运营总览 / 内容与审核 | 保留为高优先入口 |
| `events` | 内容与审核 | 活动仍是内容，但要显示组织归属和 AI 治理关系 |
| `community` | 内容与审核 | 保持统一社区内容，不恢复旧分裂 |
| `articles` | 内容与审核 | 如果未来与社区内容更深合并，再降级为内容类型 |
| `photos` / `videos` / `music` | 内容与审核 / 生态项目运营 | 普通素材归内容；赛事成果素材应和黑客松关系更清楚 |
| `media-categories` | 内容与审核 | 作为媒体字典 |
| `pages` | 内容与审核 / 系统与审计 | 低频页面内容配置 |
| `users` | 主体与关系 | 保持三轴权限 |
| `partners` | 主体与关系 | 从系统配置中提升出来 |
| `attribution` | 主体与关系 | 历史归属迁移，必须高风险提示 |
| `hackathon` | 生态项目运营 | 不只是报名，也包括成果和作品审核 |
| `future-learning` | 生态项目运营 | 产学项目和问题揭榜入口 |
| `intelligence` | AI 能力治理 | 改名和重排内容 |
| `settings` | 系统与审计 | 保留低频系统配置 |
| `messages` | 系统与审计 | 用户反馈和联系消息 |
| `tags` | 内容与审核 | 内容字典 |

## 7. 推荐实施顺序

### 第一阶段：只改后台心智和导航

目标：用较小风险先把后台从历史功能集合改成生态运营控制台。

建议改：

- `src/components/Admin/AdminDashboard.jsx`
- `src/components/Admin/Overview.jsx`
- `public/locales/zh/translation.json`
- `public/locales/en/translation.json`

具体任务：

1. 保留现有 tab id，不破坏 `/admin?tab=xxx`。
2. 重写 `menuGroups`，使用六个新治理域。
3. 给每个模块增加更准确的 description。
4. 增加模块状态概念，第一版可以是静态配置。
5. 总览页第一屏改为：
   - 当前待审内容。
   - 主体关系待处理。
   - 生态项目运营入口。
   - AI 能力健康。
6. 保留已有 admin e2e 可以测到的入口。

验收：

- 后台导航能清楚看出六个治理域。
- 英文模式下导航没有中文残留。
- `/admin?tab=intelligence`、`/admin?tab=users` 等旧深链仍可打开。

### 第二阶段：把 AI 面板从“半活”改成可解释

建议改：

- `src/components/Admin/AiAssistantManager.jsx`
- `src/components/Admin/AiModelConfigManager.jsx`
- `server/src/services/unifiedAiAssistantService.js` 仅在前端缺字段时再碰。

具体任务：

1. 导航名称从“智能治理”改成“AI 能力治理”或“AI 与数据治理”。
2. 页面内不要只用“Agent 体系 / 治理建议 / 模型配置”三段。
3. 加一层能力状态卡：
   - 模型健康。
   - 活动元数据治理。
   - 搜索索引覆盖。
   - 推荐质量证据。
   - Agent 成熟度。
4. 活动治理文案改为“活动元数据治理建议”。
5. 没有操作闭环的内容标为“只读诊断”。

验收：

- 管理员能看懂这里不是全站 AI 大脑。
- 管理员知道哪些 AI 能力可操作、哪些只是观察。
- 模型 key 管理不再喧宾夺主。

### 第三阶段：主体与关系治理收口

建议改：

- `src/components/Admin/UserManager.jsx`
- `src/components/Admin/EcosystemPartnerManager.jsx`
- `src/components/Admin/EventAttributionMigrationManager.jsx`

具体任务：

1. 不改底层三轴权限模型。
2. 在导航中把用户、生态伙伴、归属迁移放在同一个“主体与关系”域。
3. `UserManager` 文案继续强调：
   - 账号类型不等于后台权限。
   - 免审核不等于管理员。
   - 组织账号不等于合作方背书。
4. `EcosystemPartnerManager` 文案继续强调：
   - `core_partner` 是生态/比赛合作方。
   - `activity_provider` 是活动提供方。
5. `EventAttributionMigrationManager` 要显式高风险提示：这是历史内容所有权迁移，不是普通编辑。

验收：

- 三轴权限没有被简化回一个 `role`。
- 合作方和活动提供方没有混。
- 组织主体和合作背书没有混。

### 第四阶段：补项目广场后台入口

建议新增：

- `src/components/Admin/ProjectManager.jsx`

可能需要扩展：

- `server/src/controllers/projectCardController.js`
- `server/src/routes/api.js`

第一版能力：

- 列出项目。
- 搜索和筛选。
- 查看作者、联系方式可按权限处理。
- 查看项目状态。
- 执行下架。
- 跳转到前台项目详情。

第一版不做：

- 站内私信。
- 项目动态流。
- 复杂审核流。
- 项目进度自动判断。

验收：

- 项目广场不再是前台孤岛。
- 管理员能处理明显违规或过期项目。
- 项目能进入生态项目运营域。

### 第五阶段：社区与内容系统继续收敛

建议改：

- `src/components/Admin/AdminCommunity.jsx`
- `src/components/Admin/PendingReviewManager.jsx`
- `src/components/Admin/ResourceManager.jsx`

具体任务：

1. `AdminCommunity` 保持统一内容管理。
2. 新闻热点、技术分享、求助问答、组队协作继续作为同一内容系统下的版面。
3. 社群二维码目录标为辅助目录。
4. PendingReview 逐步接入更多类型，例如项目或举报。
5. 不要恢复独立新闻后台、独立社群后台、独立组队后台的割裂心智。

验收：

- 后台社区模块和前台 AI 社区心智一致。
- 旧参数、旧文案没有复活。

## 8. 修改时的注意事项

### 8.1 不要破坏 URL tab

`AdminDashboard` 现在依赖：

- `KNOWN_TAB_IDS`
- `LEGACY_TAB_ALIASES`
- `sessionStorage`
- `tab` query 参数

第一阶段不要改现有 tab id。可以改 label、description 和 group。

### 8.2 不要绕开 i18n

新增或修改用户可见文案时，同步维护：

- `public/locales/zh/translation.json`
- `public/locales/en/translation.json`

如果只是短期 fallback，可以保留 `t("key", "中文 fallback")`，但正式文案应放进 locale。

### 8.3 不要重做权限模型

禁止把这些概念塞回单一 `role`：

- 账号主体类型。
- 发布审核权限。
- 后台访问。
- 组织成员权限。
- 生态合作背书。

### 8.4 不要把 AI 包装过度

如果某个 AI 能力只是数据诊断，就写“只读诊断”。

如果某个能力没有运行数据，就写“暂无运行数据”。

如果某个能力未完整接入，就写“待接入”。

不要写成“AI 已经全面治理平台”。

### 8.5 不要做破坏性迁移

历史归属迁移、组织绑定、合作方分层、项目下架都属于高风险操作。没有审计清单和回滚方案，不要批量改数据。

## 9. 建议验收命令

每个阶段至少跑：

```bash
npm run openspec:validate
git diff --check
```

涉及前端后台页面时跑：

```bash
npm run lint
npm run build
npm run test:e2e -- e2e/admin-console.spec.js --project=chromium
```

涉及 AI 能力时补充：

```bash
npm run check:ai-agents
npm run check:ai-assistant
```

涉及后端新增或修改 controller 时补充：

```bash
node -c server/src/controllers/<changed-controller>.js
```

## 10. 第一批建议交付范围

如果同学只先做一版，不建议一口气改所有模块。建议第一批只做：

1. 重排 `AdminDashboard` 导航分组。
2. 改 `Overview` 第一屏，让它变成生态运营总览。
3. 把“智能治理”改为“AI 能力治理”，但不大改 AI 后端。
4. 在导航和总览里加入模块状态：可运营、维护中、实验性、仅工具。
5. 同步中英文 i18n。
6. 跑 `npm run build` 和 admin e2e。

这一批完成后，后台的第一印象会从“堆了一堆功能”变成“这是一个生态运营控制台”。之后再进入项目广场后台、主体关系治理和 AI 能力治理的深改。

## 11. 对应的现有文档和规格

接手前建议先看这些文件：

- `docs/roadmap/admin-console-architecture-audit-20260708.md`
- `openspec/changes/reframe-admin-governance-console/proposal.md`
- `openspec/changes/reframe-admin-governance-console/design.md`
- `openspec/changes/reframe-admin-governance-console/tasks.md`
- `openspec/changes/reframe-admin-governance-console/specs/admin-ecosystem-governance-console/spec.md`
- `docs/ai-memory/项目决策.md`

如果只看一份，就看本文档。

## 12. 最后提醒

这次后台改造的核心不是“更好看”，而是让后台能解释网站现在到底是什么：

- 它不是普通内容站。
- 它不是单纯活动聚合站。
- 它不是把 AI 社区、黑客松、项目广场、合作方分开摆的集合。
- 它应该是拓浙 AI 生态的运营后台。

后台每个模块都应该能回答：我在帮助平台完成哪一个运营动作，是内容审核、主体归属、生态项目、AI 能力治理，还是系统审计。
