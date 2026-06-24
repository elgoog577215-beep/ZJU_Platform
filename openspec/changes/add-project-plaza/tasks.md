# Tasks: add-project-plaza

> **执行状态（2026-06-13, /execute Inline @ feat/project-plaza）**：
> ✅ 后端 §1–§2 全部完成并 API 验证；✅ 前端 §3–§4 全部完成并浏览器验证（AC1/2/3/6 通过）。
> ✅ §5.2 API 验证、§5.4 lint（改动文件 exit 0）、§6.1 validate --strict 通过。
> ⏳ 待 `/verify`：§5.1 写 e2e spec 文件（happy path 已手动跑通）、§5.3 白天主题快照（playful CSS 同原型已验）、§6.2 diff review、§6.3 sync-specs + archive。

## 1. 后端 · 数据与实体
- [ ] 1.1 `runMigrations.js` 新增 `project_cards` 表 + 索引（status/progress/created, user_id, likes/created）
- [ ] 1.2 新增 `projectCardController.js`：create / update / delete（作者校验）
- [ ] 1.3 list（q/progress/need/page，只回 published）/ detail（views++，联系方式按登录态裁剪）
- [ ] 1.4 创建限流（customRateLimit，仿社区帖）+ repo_url https 校验 + 正文转义
- [ ] 1.5 图片上传复用现有 cover 上传基建（JPG/PNG/WebP·5MB）
- [ ] 1.6 路由接入 `api.js`（鉴权中间件 + 限流）

## 2. 后端 · 注册式复用（每处加一项）
- [ ] 2.1 `favoriteController.js`：`FAVORITE_RESOURCE_META['project']` + `resolveFavoriteTarget` + likes 重算表名
- [ ] 2.2 `notificationController.js`：`RESOURCE_TYPE_LABEL['project'] = '项目'`
- [ ] 2.3 `userController.js getUserResources`：聚合 `project_cards`（type:'project'，访客只见 published，本人见草稿）
- [ ] 2.4 举报：扩展 reports 支持 `target_type='project'` + 管理员下架（status=removed）

## 3. 前端 · 页面（由 /lab/projects 预览产品化）
- [ ] 3.1 `ProjectPlaza.jsx`（`/projects`）：header/搜索/筛选/网格 + 读 `?id=` 开详情 + fromFavorites 返回 + 跟随 uiMode 主题
- [ ] 3.2 `ProjectDetailModal.jsx`：画廊+缩略图 / 长正文 / 概要数据 / 需求 / 技术 / 联系(登录可见) / 看仓库 / 收藏；桌面弹窗+移动全屏+useBackClose
- [ ] 3.3 `ProjectCreateEdit.jsx`（`/projects/new`、`/projects/:id/edit`）：表单 + 实时预览 + 存草稿/发布
- [ ] 3.4 空状态 / 未登录可看引导登录 / 无封面占位

## 4. 前端 · 接入现有体系
- [ ] 4.1 `App.jsx`：新增 `/projects*` 路由；移除临时 `/lab/projects` + 删 `ProjectPlazaPreview.jsx`
- [ ] 4.2 `Navbar.jsx` / `MobileNavbar.jsx`：「项目广场」入口（非 AI 社区下）
- [ ] 4.3 `PublicProfile.jsx`：内容类型 + `favoriteTypeOptions` 加"项目"；`buildFavoriteTargetPath` 加 `project: "/projects"`
- [ ] 4.4 `services/api.js`：项目名片 CRUD/列表/详情/举报/收藏 调用
- [ ] 4.5 `i18n.js`：文案（进度 label、需求标签、按钮、空状态等）

## 5. 验证
- [ ] 5.1 e2e 主流程：发布→广场出现→收藏→收藏列表→从收藏进详情→关闭回到收藏
- [ ] 5.2 API：未登录无联系方式 / 非作者改删被拒 / 被收藏产生通知
- [ ] 5.3 白天+暗色两主题渲染快照
- [ ] 5.4 `eslint .` 通过；`/verify` Gate 1

## 6. 收尾
- [ ] 6.1 `openspec validate add-project-plaza --strict` 通过
- [ ] 6.2 diff review（5+ 文件必审）
- [ ] 6.3 sync-specs（确认后） + archive（问用户）

---

## 9. Commit 拆分（按修改安全性 feat→refactor→fix）

1. `feat(db): add project_cards table and migration` — 任务 1.1
2. `feat(api): project card CRUD + list/detail + report` — 1.2–1.6, 2.4
3. `feat(api): register project type in favorites/notify/profile aggregation` — 2.1–2.3
4. `feat(web): project plaza page + detail modal` — 3.1–3.2, 4.1–4.2
5. `feat(web): project create/edit page with live preview` — 3.3–3.4
6. `feat(web): wire project into profile categories + favorites return nav` — 4.3–4.5
7. `test(e2e): project plaza happy path` — 5.x

---
> Plan: docs/archive/superpowers/plans/2026-06-13-add-project-plaza.md
