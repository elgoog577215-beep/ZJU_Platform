## Why

平台已经有活动、AI 社区、黑客松和个人主页，但学生"我正在做一个什么项目、它做到哪一步、还缺谁"这件事没有一个稳定的展示与被发现的地方。社区"组队"板块是临时招募帖，发完就沉；个人主页的"自定义卡片"是装饰性贴图，太浅，且语义是"人"不是"项目"。

我们需要一个**以项目为一等单位**的表达和发现层：每个人把自己的项目做成一张可编辑的"项目名片"（灵感来自 Bonjour 数字名片的"个人说明书 + 模块化 + 仪式感"），放到一个**全站项目广场**让对的人按状态找到你；每张名片同时沉淀到发起人个人主页的"项目"分类里，成为可持续积累的项目履历。

这个能力刻意**不放进 AI 社区**，而是长在用户资料/内容体系上，并最大化复用平台已有基建（收藏=点赞、收藏通知、个人主页内容聚合、从收藏返回详情的导航、图片上传、举报下架），把新建成本压到最低。

## What Changes

- 新增独立实体 `project_cards`：项目名片的持久化载体（封面多图、标题、一句话简介、长正文项目介绍、进度、需求标签、技术栈、仓库链接、联系方式、状态）。
- 新增「项目广场」独立页面（路由 `/projects`，**不在 AI 社区下**）：聚合所有已发布项目名片，支持按进度、需求标签筛选与关键词搜索，点击卡片打开详情弹窗（桌面弹窗 / 移动全屏）。
- 新增项目名片「发布/编辑页」：表单 + 实时预览，支持存草稿与发布；仅作者可编辑/删除。
- 将「项目」作为一种新的内容分类接入个人主页内容聚合，与相册/照片/视频/活动并列：本人发布的项目进入主页「项目」分类。
- 复用 `favorites`（点赞=收藏）：点名片 ♥ 即收藏，进入收藏者个人主页的「收藏」，`likes` 数从 favorites 重算。
- 复用 `createNotification`：当项目被他人收藏时，自动通知发起人（类型 `favorite`），行为与帖子一致。
- 复用"从收藏返回详情"导航（`fromFavorites` + `buildFavoriteTargetPath` + `useBackClose` + `navigate(-2)`）：从收藏点进项目名片，关闭后回到「收藏」，与 Events/Gallery/Videos 一致。
- 联系方式**仅登录用户可见**，未登录提示登录后查看；v1 通过名片上的联系方式联系（站内私信留 v2）。
- 公开内容安全网：复用举报机制 + 管理员下架（设为 `removed`）。
- 视觉跟随平台全局主题：暗色=赛博蓝黑、白天=活泼，沿用现有 token，不引入页面级风格开关。

明确不做（v1 Not Doing）：

- 不做站内私信（弹窗"私信"v1 = 展开/复制联系方式；真正站内私信留 v2）。
- 不做项目动态跟踪/进展订阅（v2；届时挂在收藏上 + 作者发动态 + 复用通知）。
- 不重做认证、收藏、通知、上传、举报系统，只做"注册式"接入。
- 不自动抓取/推断他人项目真实进度。

## Capabilities

### New Capabilities

- `project-cards`: 登录用户可创建、编辑、删除自己的项目名片，包含封面多图、标题、简介、长正文、进度、需求标签、技术栈、仓库链接和联系方式；含草稿与已发布状态，仅作者可改。
- `project-plaza`: 全站项目广场页面聚合已发布项目名片，支持按进度/需求标签筛选与关键词搜索，点击打开详情，并支持从收藏进入后正确返回收藏。
- `project-engagement`: 项目名片可被收藏（=点赞）并计入热度，被收藏时通知发起人；公开内容支持举报与管理员下架。

### Modified Capabilities

- `user-profile-content-aggregation`: 个人主页内容聚合新增"项目"内容类型；本人发布的项目出现在主页「项目」分类，收藏的项目出现在「收藏」并可按类型筛选。

## Impact

- 后端：
  - `server/src/config/runMigrations.js`：新增 `project_cards` 表 + 索引；`favorites` 沿用，无需改表。
  - `server/src/controllers/projectCardController.js`（新增）：CRUD + 列表/详情/搜索 + 举报。
  - `server/src/routes/api.js`：项目名片路由（含鉴权、限流）。
  - `server/src/controllers/favoriteController.js`：`FAVORITE_RESOURCE_META` / `resolveFavoriteTarget` 增加 `project`。
  - `server/src/controllers/notificationController.js`：`RESOURCE_TYPE_LABEL` 增加 `project`。
  - `server/src/controllers/userController.js`：`getUserResources` 聚合 `project_cards`。
- 前端：
  - `src/components/ProjectPlaza.jsx`、`ProjectDetailModal.jsx`、`ProjectCreateEdit.jsx`（新增，由 `/lab/projects` 预览原型产品化而来）。
  - `src/App.jsx`：新增 `/projects` 路由（移除临时 `/lab/projects` 预览）。
  - `src/components/Navbar.jsx` / `MobileNavbar.jsx`：新增「项目广场」入口。
  - `src/components/PublicProfile.jsx`：内容类型与收藏筛选增加"项目"；`buildFavoriteTargetPath` 增加 `project`。
  - `src/services/api.js`：项目名片相关调用。
  - `src/i18n.js`：文案。
