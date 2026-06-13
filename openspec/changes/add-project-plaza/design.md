# Design: 项目广场 / 项目名片

## 0. 设计来源

本设计在 brainstorm 阶段经过完整探索（参考 Bonjour bonjour.bio 数字名片美学 + 平台现有设计系统），并用 `/lab/projects` 真实预览原型 + Codex 生成的北极星参考图（`tmp/codex-gen/A1-A3`）确认了视觉方向。产品化时把原型的 scoped `<style>` + mock + 风格开关，转成平台 Tailwind 约定 + 真实 API + 跟随全局 `uiMode` 主题。

## 1. 架构总览：一个新实体 + 全部"注册式"复用

```
                         project_cards (新表 · 唯一新增持久化)
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   项目广场 /projects      个人主页「项目」分类        收藏 / 通知 / 举报
   (新页面)               (复用 getUserResources)    (复用 favorites /
   列表/筛选/搜索/弹窗                                 createNotification /
                                                      community_reports)
```

核心原则：**只新增 `project_cards` 一张表和它的 CRUD**，其余能力一律通过把 `'project'` 注册进现有系统获得，不重写收藏/通知/聚合/导航/上传/举报。

## 2. 数据模型

### `project_cards`（新表）

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | INTEGER FK→users | 发起人/作者 |
| `title` | TEXT NOT NULL | 项目名称（≤40） |
| `intro` | TEXT | 一句话简介（≤80，卡片展示） |
| `content` | TEXT | 长正文「项目介绍」（名片主体，按文本分段） |
| `progress` | TEXT | 进度枚举：`idea`/`dev`/`live`/`pause` |
| `need_tags` | TEXT | 需求标签 JSON 数组（缺人/缺设计/缺讨论/找测试…） |
| `tech_tags` | TEXT | 技术栈/特点标签 JSON 数组 |
| `repo_url` | TEXT | 仓库链接（https 校验） |
| `contact_wechat` | TEXT | 微信（仅登录可见） |
| `contact_email` | TEXT | 邮箱（仅登录可见） |
| `cover_url` | TEXT | 封面（images 的第一张，冗余便于列表） |
| `images_json` | TEXT | 项目照片 URL JSON 数组 |
| `status` | TEXT | `draft`/`published`/`removed`，默认 `published` |
| `likes` | INTEGER | 收藏/点赞数，从 `favorites` 重算（自愈，与现有表一致） |
| `views` | INTEGER | 浏览数 |
| `created_at` / `updated_at` | TEXT | |

索引：`(status, progress, created_at)`、`(user_id)`、`(likes, created_at)`。

> 进度枚举不存中文，存 key（`idea/dev/live/pause`），label 由前端 i18n 决定。需求标签存值（用于广场筛选）。

## 3. 复用映射（每一处只加一项）

| 现有系统 | 文件 | 接入点 |
|---|---|---|
| 收藏=点赞 | `favoriteController.js` | `FAVORITE_RESOURCE_META['project'] = {label:'项目', table:'project_cards', ownerCol:'user_id', titleCol:'title'}`；`resolveFavoriteTarget` 处理 `project`；`likes` 重算 SQL 复用 |
| 收藏通知 | `favoriteController.js` 已自动 | 收藏 add 时 `createNotification(owner,'favorite',…,itemId,'project')`，owner!=actor 才发；无需新代码 |
| 通知文案 | `notificationController.js` | `RESOURCE_TYPE_LABEL['project'] = '项目'` |
| 主页聚合 | `userController.js getUserResources` | 增加 `project_cards` 查询，映射 `type:'project'`，访客只见 `status='published'`，本人可见草稿 |
| 收藏筛选/类型 | `PublicProfile.jsx` | `favoriteTypeOptions` / 内容类型筛选增加"项目" |
| 收藏→详情→返回 | `PublicProfile.jsx buildFavoriteTargetPath` | 增加 `project: "/projects"` → 生成 `/projects?id={id}`，`navigate(path,{state:{fromFavorites:true}})` |
| 返回栈 | `ProjectPlaza.jsx` | 仿 `Events.jsx`：`fromFavoritesRef = useRef(location.state?.fromFavorites)`；`useBackClose(open, close)`；close 时 `fromFavoritesRef` → `navigate(-2)` |
| 图片上传 | 现有 `uploadProfileCardCover` 同款 | 复用 multer 上传 + `/uploads/` 校验（JPG/PNG/WebP·5MB） |
| 举报 | `community_reports` 模式 | 扩展支持 `target_type='project'`（加 `project_id` 或复用通用 report）；管理员下架 = `status='removed'` |

## 4. API

```
GET    /api/projects                列表（q, progress, need, page）只回 status=published
GET    /api/projects/:id            详情（含 views++；联系方式按登录态裁剪）
POST   /api/projects                创建（authenticateToken + 限流）
PUT    /api/projects/:id            更新（authenticateToken + 作者校验）
DELETE /api/projects/:id            删除（authenticateToken + 作者校验）
POST   /api/projects/:id/report     举报（authenticateToken）
PUT    /api/admin/projects/:id/takedown  下架（isAdmin → status=removed）
POST   /api/favorites               复用现有收藏 toggle，item_type='project'
```

**联系方式裁剪**：`GET /:id` 与列表中，未登录请求把 `contact_wechat/contact_email` 置空并返回 `contact_locked:true`，前端显示"登录后查看联系方式"。

## 5. 前端

- `ProjectPlaza.jsx`（`/projects`）：header + 搜索 + 筛选(进度/需求) + 卡片网格；读 `?id=` 自动打开 `ProjectDetailModal`；`fromFavorites` 返回逻辑。跟随 `uiMode`：暗色=赛博蓝黑(青色 accent)、白天=活泼(紫罗兰)。
- `ProjectDetailModal.jsx`：左图片画廊+缩略图，右标题/进度/团队/**概要数据**/**长正文项目介绍**/需求/技术/联系(登录可见)/看仓库/收藏。桌面弹窗、移动全屏，走 `useBackClose`。
- `ProjectCreateEdit.jsx`（`/projects/new`、`/projects/:id/edit`）：左表单（封面多图上传/名称/简介/长正文/进度分段/需求多选/技术标签/仓库/联系）+ 右实时预览；存草稿/发布。
- `PublicProfile.jsx`：内容类型 + 收藏筛选加"项目"；`buildFavoriteTargetPath` 加 `project`。
- 路由：新增 `/projects*`，移除临时 `/lab/projects` 预览组件 `ProjectPlazaPreview.jsx`。

## 6. 安全（CSO 加固，已采纳）

- 正文/简介按文本转义渲染（不解析 HTML）；`repo_url` 仅允许 `https://`。
- 上传复用现有类型/大小校验。
- 创建/改/删强制鉴权 + 作者校验；收藏需登录；查看公开但联系方式仅登录可见。
- 创建名片 `customRateLimit`（仿社区帖，如 10/10min）。
- 公开内容：举报 + 管理员下架兜底。

## 7. 测试策略

平台无单测套件，以 **Playwright e2e + 手动 API 验证**为主：

- e2e 主流程：登录 → 发布项目 → 广场出现 → 收藏 → 收藏列表出现 → 从收藏进详情 → 关闭回到收藏。
- API 手动/脚本：未登录拿不到联系方式；非作者改/删被拒；被收藏产生通知。
- 主题：白天/暗色两套渲染快照（playwright 截图）。

## 8. v2 待办（本变更不做）

站内私信 · 项目动态跟踪（作者发动态 + 订阅通知）· 审核预审（若举报+下架不够再上）。
