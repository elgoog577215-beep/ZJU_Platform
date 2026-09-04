## Why

管理员后台现在已经不只是内容管理页，而是拓浙 AI 生态的运营控制台雏形。它同时承载内容审核、活动管理、AI 社区、用户与组织、生态伙伴、赛事成果、未来学习中心、AI 模型配置和活动治理建议。

当前前台视觉基本可用，但后台仍显得混乱，原因不是单个页面样式陈旧，而是后台模块没有完整映射到网站的稳定业务架构。既有 admin OpenSpec 主要覆盖壳、导航、命令中心和资源工作流，无法回答“这些模块分别服务生态里的哪条主线、哪些能力半活、哪些入口该降级或合并”。

本 change 的目的，是把后台从历史功能集合重排为“生态运营与治理控制台”，让后续代码改造有统一边界。

## What Changes

- 重排后台信息架构，将模块归入六个运营域：运营总览、内容与审核、主体与关系、生态项目运营、AI 能力治理、系统与审计。
- 将“智能治理”语义收窄为“AI 能力治理”或“AI 与数据治理”，明确当前能力覆盖模型配置、活动元数据治理、运行健康和 Agent 缺口，不伪装成全站 AI 治理。
- 将生态伙伴、组织主体、组织成员、历史归属迁移和用户权限统一放入“主体与关系”治理心智，遵守既有三轴权限模型和 `partner_scope` 分层。
- 在总览页增加面向生态运营的模块状态表达，让管理员能区分可运营、维护中、实验性和仅工具模块。
- 将“微信采集”从技术工具入口提升为“内容采集”运营工作台，围绕采集源、定时运行、候选筛选、人工修正与发布组织界面。
- 将站点设置按基础与安全、公共外观、关于站点分类；关于站点的详细字段继续按内容区块二次收纳。
- 为项目广场补齐后台运营入口的设计边界，使项目育人不再只有前台和单个 takedown API。
- 统一重构所有管理员右侧工作区：页面头、状态/筛选和主体内容按固定层级排列，移除装饰性标题卡、指标卡阵列和嵌套面板，让表格、列表或表单在首屏尽快出现。
- 后续改动涉及用户可见文案时，同步维护中英文 i18n。

## Capabilities

### New Capabilities

- `admin-ecosystem-governance-console`：后台按生态运营域组织模块，展示模块状态，准确呈现 AI 能力边界，并把主体关系、内容审核、项目运营和系统审计放进一致的后台治理模型。

### Modified Capabilities

- `admin-console-systematization`：保留现有后台访问、URL tab、资源过滤和 AI 建议展示行为，但在更清晰的运营域中呈现。
- `admin-command-center`：保留搜索导航和最近模块能力，但导航搜索目标改为新的治理域和模块语义。
- `unified-ai-assistant`：继续提供 AI overview、事件治理和模型配置，但前端文案与状态表达不得暗示当前已覆盖完整全站 AI 治理。
- `ai-community-unified-content`：后台社区继续保持统一内容系统，社群二维码类目录能力明确为辅助目录，不恢复旧的割裂社区心智。

## Impact

- 前端：
    - `src/components/Admin/AdminDashboard.jsx`
    - `src/components/Admin/Overview.jsx`
    - `src/components/Admin/AiAssistantManager.jsx`
    - `src/components/Admin/UserManager.jsx`
    - `src/components/Admin/EcosystemPartnerManager.jsx`
    - `src/components/Admin/AdminCommunity.jsx`
    - `src/components/Admin/WeChatMpImportManager.jsx`
    - `src/components/Admin/SettingsManager.jsx`
    - `src/components/Admin/ProjectManager.jsx`
    - `src/components/Admin/AdminUI.jsx`
    - `src/components/Admin/ResourceManager.jsx`
    - 其余由 `AdminDashboard` 挂载的右侧管理工作区
- 后端：
    - 第一阶段不要求数据库迁移。
    - 项目后台入口复用 `projectCardController`，新增 `/admin/projects` 列表与恢复接口，并继续使用既有下架接口和审计日志。
    - AI 能力状态继续复用 `unifiedAiAssistantService`、`aiAgentRegistryService` 和搜索索引服务。
- 文档：
    - `docs/产品状态.md`
    - `docs/技术架构.md`
    - `docs/开发禁区.md`
- i18n：
    - `public/locales/zh/translation.json`
    - `public/locales/en/translation.json`

## Not Doing

- 不重写用户权限模型，不用单一 `role` 吸收账号主体、发布权限、后台权限和合作展示层级。
- 不把所有 AI 能力合并成一个超级 Agent 入口。
- 不做破坏性组织归属迁移。
- 不借本轮界面重排改写既有业务流程、API、权限合同或数据真源；右侧页面只重构信息结构与呈现层。
- 不把当前公众号采集实现描述成已经支持任意学院网站、社团网站或多平台爬虫；新增连接器需要后续独立设计数据合同和运行状态。
- 不删除历史功能，除非先有审计清单、替代入口和回滚路径。
