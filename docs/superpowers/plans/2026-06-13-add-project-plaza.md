---
openspec-change: add-project-plaza
created: 2026-06-13
---

# Plan: 项目广场 / 项目名片

施工图。原则：**只新增 `project_cards` 一张表 + 它的 CRUD**，其余靠把 `'project'` 注册进现有系统。前端把 `/lab/projects` 预览原型（`src/components/ProjectPlazaPreview.jsx`）产品化为真实组件，去掉风格开关、改为跟随全局 `uiMode`。

平台无单测框架 → 每个后端任务以**手动 API 验证**为关，前端整链路以 **Playwright e2e** 为关。

---

## Task 1 — `project_cards` 表

**Files**: Modify `server/src/config/runMigrations.js`

在迁移序列末尾追加（仿现有 `CREATE TABLE IF NOT EXISTS` 风格）：

```sql
CREATE TABLE IF NOT EXISTS project_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  intro TEXT,
  content TEXT,
  progress TEXT DEFAULT 'idea',           -- idea|dev|live|pause
  need_tags TEXT DEFAULT '[]',            -- JSON array
  tech_tags TEXT DEFAULT '[]',            -- JSON array
  repo_url TEXT,
  contact_wechat TEXT,
  contact_email TEXT,
  cover_url TEXT,
  images_json TEXT DEFAULT '[]',          -- JSON array of /uploads/...
  status TEXT DEFAULT 'published',        -- draft|published|removed
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_project_cards_feed ON project_cards (status, progress, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_cards_user ON project_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_project_cards_likes ON project_cards (likes DESC, created_at DESC);
```

**Verify**: 重启 server，日志出现迁移成功；`sqlite3` 确认表存在。

---

## Task 2 — `projectCardController.js`（CRUD + 列表/详情 + 举报）

**Files**: Create `server/src/controllers/projectCardController.js`

要点（不写占位，关键逻辑给全）：

```js
const { getDb } = require('../config/db');

const PROGRESS = new Set(['idea', 'dev', 'live', 'pause']);
const parseArr = (raw) => { try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

const serialize = (row, { viewer } = {}) => {
  const isOwner = viewer && String(viewer) === String(row.user_id);
  const loggedIn = Boolean(viewer);
  return {
    id: row.id, user_id: row.user_id, title: row.title, intro: row.intro,
    content: row.content, progress: row.progress,
    need_tags: parseArr(row.need_tags), tech_tags: parseArr(row.tech_tags),
    repo_url: row.repo_url, cover_url: row.cover_url, images: parseArr(row.images_json),
    status: row.status, likes: row.likes, views: row.views,
    created_at: row.created_at, updated_at: row.updated_at,
    // 联系方式：仅登录可见
    contact_locked: !loggedIn,
    contact_wechat: loggedIn ? row.contact_wechat : null,
    contact_email: loggedIn ? row.contact_email : null,
  };
};

const validate = (body) => {
  if (!body.title || !String(body.title).trim()) return '项目名称必填';
  if (body.progress && !PROGRESS.has(body.progress)) return '进度取值非法';
  if (body.repo_url && !/^https:\/\//i.test(body.repo_url)) return '仓库链接需为 https';
  return null;
};

// POST /api/projects  (authenticateToken + rate limit)
const createProject = async (req, res, next) => { /* validate → INSERT → return serialize */ };
// PUT /api/projects/:id  (owner check)
const updateProject = async (req, res, next) => { /* owner check → UPDATE → updated_at */ };
// DELETE /api/projects/:id  (owner check)
const deleteProject = async (req, res, next) => { /* owner check → DELETE */ };
// GET /api/projects  list: WHERE status='published' + filters(q/progress/need) + pagination
const listProjects = async (req, res, next) => { /* build WHERE, need 用 json LIKE 或 EXISTS, map serialize(no contact for列表) */ };
// GET /api/projects/:id  detail: views++ then serialize with viewer = req.user?.id
const getProject = async (req, res, next) => { /* UPDATE views=views+1; return serialize({viewer}) */ };
// POST /api/projects/:id/report  → reports
const reportProject = async (req, res, next) => { /* insert report target_type='project' */ };

module.exports = { createProject, updateProject, deleteProject, listProjects, getProject, reportProject };
```

需求标签筛选用 `need_tags LIKE '%"缺人"%'`（JSON 数组里查值）；搜索 `title LIKE ? OR tech_tags LIKE ?` + join users 查 owner name。

**Verify**: curl 创建/列表/详情；未登录详情 `contact_locked:true` 且联系字段为 null。

---

## Task 3 — 路由 + 限流 + 上传

**Files**: Modify `server/src/routes/api.js`（复用现有 `authenticateToken` / `optionalAuth` / `isAdmin` / `customRateLimit` / 上传中间件）

```js
const pc = require('../controllers/projectCardController');
router.get('/projects', optionalAuth, pc.listProjects);
router.get('/projects/:id', optionalAuth, pc.getProject);
router.post('/projects', authenticateToken, projectCreateLimiter, pc.createProject);
router.put('/projects/:id', authenticateToken, pc.updateProject);
router.delete('/projects/:id', authenticateToken, pc.deleteProject);
router.post('/projects/:id/report', authenticateToken, pc.reportProject);
router.put('/admin/projects/:id/takedown', authenticateToken, isAdmin, pc.takedownProject);
```

封面/照片上传：复用个人名片封面上传同款 multer 端点（`uploadProfileCardCover` 路径），前端拿 `/uploads/...` 存入 `images_json`。`projectCreateLimiter` 仿 `communityPostCreateLimiter`。

**Verify**: 非作者 PUT/DELETE → 403；超限创建 → 429。

---

## Task 4 — 注册式复用（三处各加一项）

**Files**: Modify `server/src/controllers/favoriteController.js`, `notificationController.js`, `userController.js`

### 4a favoriteController.js（收藏=点赞 + 自动通知）
```js
// FAVORITE_TABLE_MAP 增加：
'project': 'project_cards',
// FAVORITE_RESOURCE_META 增加：
project: { table: 'project_cards', ownerColumn: 'user_id', label: '项目' },
```
> 加完这两行，收藏 toggle、likes 重算、`resolveFavoriteTarget`、`createNotification(owner,'favorite',…,'project')` 全自动生效（owner!=actor 才发，已有判断）。

### 4b notificationController.js
```js
// RESOURCE_TYPE_LABEL 增加：
project: '项目',
```

### 4c userController.js — `getUserResources` 聚合项目
仿 community_posts 段落，新增（注意 `user_id` 不是 `uploader_id`；访客只见 published，本人见草稿）：
```js
const projectRows = await db.all(
  `SELECT id, title, intro AS description, cover_url AS cover, likes, status, created_at
     FROM project_cards
    WHERE user_id = ? ${isOwner ? '' : "AND status = 'published'"}
    ORDER BY created_at DESC`, [targetUserId]);
const projects = projectRows.map((p) => ({ ...p, type: 'project' }));
// 合并进 resources 数组
```

**Verify**: GET `/api/users/:id/resources` 含 `type:'project'`；访客不见草稿。

---

## Task 5 — 举报表扩展 + 下架

**Files**: Modify `runMigrations.js`（reports 加 `project_id` 或在 `community_reports` 容许 `target_type='project'`），`projectCardController.takedownProject`（admin → `UPDATE project_cards SET status='removed'`）。

**Verify**: admin takedown 后该项目不在广场/主页聚合出现。

---

## Task 6 — 前端页面（产品化预览原型）

**Files**: Create `src/components/ProjectPlaza.jsx`, `ProjectDetailModal.jsx`, `ProjectCreateEdit.jsx`；参考 `src/components/ProjectPlazaPreview.jsx`（删之）。

产品化改造：
- 去掉 `variant` 风格开关 → `const { uiMode } = useSettings(); const isDayMode = uiMode === 'day';`，用 Tailwind 条件类（仿 AICommunity 的 `isDayMode ? ... : ...`）替换 scoped CSS。暗色=赛博蓝黑(青色 accent)、白天=活泼。
- mock 数据 → `getProjects()` / `getProject(id)`（api.js）。
- 卡片 `♥` → `toggleFavorite({itemId, itemType:'project'})`，未登录弹登录。
- 详情弹窗：长正文 `content` 分段渲染（文本转义）；概要数据保留；联系方式 `contact_locked` 时显示"登录后查看"。

### 6a 广场读 ?id= 开详情 + fromFavorites 返回（仿 Events.jsx）
```jsx
const [searchParams] = useSearchParams();
const location = useLocation();
const navigate = useNavigate();
const [selected, setSelected] = useState(null);
const fromFavoritesRef = useRef(location.state?.fromFavorites === true);

useEffect(() => {
  const id = searchParams.get('id');
  if (id) getProject(id).then((r) => setSelected(r.data));
}, [searchParams]);

const closeDetail = useCallback(() => {
  if (fromFavoritesRef.current) { fromFavoritesRef.current = false; navigate(-2); return; }
  setSelected(null);
}, [navigate]);
useBackClose(selected !== null, closeDetail);
```

**Verify**: e2e — 点卡开弹窗、关闭回广场；`/projects?id=X` 直达详情。

---

## Task 7 — 接入路由 / 导航 / 个人主页 / api / i18n

**Files**: Modify `src/App.jsx`, `Navbar.jsx`, `MobileNavbar.jsx`, `PublicProfile.jsx`, `services/api.js`, `i18n.js`；Delete `ProjectPlazaPreview.jsx`。

### 7a App.jsx
```jsx
const ProjectPlaza = lazy(() => import('./components/ProjectPlaza'));
const ProjectCreateEdit = lazy(() => import('./components/ProjectCreateEdit'));
// routes:
<Route path="/projects" element={<PageTransition><ProjectPlaza /></PageTransition>} />
<Route path="/projects/new" element={<PageTransition><ProjectCreateEdit /></PageTransition>} />
<Route path="/projects/:id/edit" element={<PageTransition><ProjectCreateEdit /></PageTransition>} />
// 删除临时 /lab/projects 与其 import
```

### 7b PublicProfile.jsx — 项目分类 + 收藏返回路由
```js
// buildFavoriteTargetPath routeMap 增加：
project: "/projects",
// → 生成 /projects?id={id}；点击已是 navigate(path,{state:{fromFavorites:true}})（无需改）
// favoriteTypeOptions 与内容类型筛选增加 { value:'project', label:'项目' }
```

### 7c Navbar：「项目广场」入口（与活动/AI社区平级，非其子项）；api.js 增加 getProjects/getProject/createProject/updateProject/deleteProject/reportProject；i18n 加进度 label（构思中/开发中/已上线/暂停）与文案。

**Verify**: 导航点「项目广场」→ `/projects`；个人主页收藏筛"项目"→ 点进 → 关闭回收藏（与 Events 一致）。

---

## Task 8 — e2e + 验证

**Files**: Create `e2e/project-plaza.spec.js`

主流程：登录 demo_user → /projects/new 发布 → 广场出现 → 收藏 → 个人主页收藏筛"项目"出现 → 点进详情 → 关闭回到收藏 tab。

```bash
npx eslint .                      # Gate 1 lint
npm run test:e2e -- project-plaza # 主流程
npx openspec validate add-project-plaza --strict
```

**Done when**: AC1–AC8 全绿 + 白天/暗色快照正常 + diff review（5+ 文件）。
