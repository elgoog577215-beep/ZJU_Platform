# 拓途浙享平台 — 代码库概览 Spec

## Purpose
以可执行规格的形式沉淀系统全貌，帮助开发者与 AI agent 快速理解平台边界、关键模块、数据模型与已知风险。

## Requirements

### Requirement: 代码库概览规范可用于快速上手
系统 SHALL 提供一份结构化概览，覆盖技术栈、架构、数据模型、认证、路由与主要风险点，作为后续变更提案与设计的基础上下文。

#### Scenario: 新成员或 AI agent 首次接触仓库
- **WHEN** 读者首次阅读 overview 规格
- **THEN** 读者可以在一次阅读中获得系统构成、核心约束和主要历史遗留问题
- **THEN** 读者能够据此制定后续 proposal/design/tasks

## Reference

> 这是一份描述性 spec，不是需求文档。目的是让任何人（包括未来的 AI agent）能快速理解这个系统是什么、怎么运作、哪里有坑。

---

## 一、这是什么

**拓途浙享**是浙江大学的一个信息聚合平台，定位是"打破信息差，共建信息网络"。

核心功能：让用户上传和浏览五类内容——照片、音乐、视频、文章、活动。管理员可以审核内容、管理用户、配置站点。

这个项目是 vibe coding 出来的：能跑，但内部有明显的技术债和不一致性。读代码时要带着这个预期。

---

## 二、技术栈

```
前端                          后端
─────────────────────         ─────────────────────
React 18 + Vite               Node.js + Express
React Router v6               SQLite (via sqlite/sqlite3)
Tailwind CSS                  JWT 认证
Framer Motion                 Multer 文件上传
Three.js / R3F (背景特效)      Sharp 图片处理
i18next (7语言)                bcryptjs 密码哈希
SWR (数据缓存)                 Helmet / HPP / rate-limit
react-hot-toast
```

部署方式：Express 同时 serve 前端 dist 和后端 API，单进程，单机。

---

## 三、系统架构

```
Browser
  │
  ├── /api/*  ──────────────────────────────────────────────────────┐
  │                                                                  │
  │                         Express Server                          │
  │   ┌──────────────────────────────────────────────────────────┐  │
  │   │  Security Middleware Stack                               │  │
  │   │  helmet → hpp → sanitize → rate-limit → cors → body     │  │
  │   └──────────────────────────────────────────────────────────┘  │
  │                              │                                   │
  │   ┌──────────────────────────▼───────────────────────────────┐  │
  │   │  Routes (api.js)                                         │  │
  │   │                                                          │  │
  │   │  /auth/*          authController                        │  │
  │   │  /photos|music|   resourceController (泛型 CRUD)        │  │
  │   │  videos|articles| ← 5个资源类型共用同一套 handler        │  │
  │   │  events/*                                               │  │
  │   │  /events/:id/register  eventController                  │  │
  │   │  /users/*         userController                        │  │
  │   │  /settings        settingsController                    │  │
  │   │  /search          systemController                      │  │
  │   │  /upload          systemController                      │  │
  │   │  /favorites       favoriteController                    │  │
  │   │  /comments        commentController                     │  │
  │   │  /notifications   notificationController                │  │
  │   │  /tags            tagController                         │  │
  │   │  /resources/parse-wechat  (inline in index.js)         │  │
  │   └──────────────────────────────────────────────────────────┘  │
  │                              │                                   │
  │   ┌──────────────────────────▼───────────────────────────────┐  │
  │   │  SQLite (database.sqlite)                                │  │
  │   │  users / photos / music / videos / articles / events    │  │
  │   │  comments / favorites / notifications / tags            │  │
  │   │  audit_logs / settings / migrations                     │  │
  │   └──────────────────────────────────────────────────────────┘  │
  │                                                                  │
  └── /*  ──── SPA fallback → dist/index.html ───────────────────────┘
```

---

## 四、数据模型

### 五类资源（共用 resourceController）

所有资源都有这些公共字段：
```
id, title, tags, featured, likes, status, uploader_id, deleted_at
```

各类型特有字段（来自 resourceController.fields）：
```
photos:   url, size, gameType, gameDescription
music:    artist, duration, cover, audio
videos:   thumbnail, video
articles: date, excerpt, content, cover
events:   date, end_date, location, image, description, content, link,
          score, target_audience, organizer, volunteer_time, category
```

**注意**：`articles` 表里同时存在 `tag`（单数）和 `tags`（复数）两个字段——这是历史遗留，两个字段并存，代码里有时用一个有时用另一个。

**注意**：`events` 表的 `end_date` 字段是通过 migration 在运行时 ALTER TABLE 加进去的（server/index.js 启动时），不在 seed.js 的建表语句里。

### 用户

```
id, username, password(bcrypt), role(admin|user),
avatar, nickname, gender, age, organization, created_at
```

`organization` 字段在 DB 里叫 `organization`，但 API 层用 `organization_cr` 传递——字段名不一致。

### 设置

key-value 表，无 schema 约束。前端 SettingsContext 里硬编码了一套默认值（包括联系方式、标题等），这些默认值直接写在源码里。

---

## 五、认证系统

```
两套登录路径：

1. 普通用户登录  POST /api/auth/login
   → 查 users 表，bcrypt 验证
   → 返回 JWT (7天有效期)

2. 管理员快速登录  POST /api/auth/admin-login
   → 对比 process.env.ADMIN_PASSWORD（明文比较）
   → 返回硬编码 { id: 1, username: 'admin', role: 'admin' } 的 JWT
   → 不查数据库
```

**坑**：`adminLogin` 生成的 token 里 `id` 硬编码为 `1`，但数据库里不一定有 id=1 的用户。`/auth/me` 里有特判处理这个情况。

**坑**：`SECRET_KEY` 有 fallback `'dev-secret-key-change-in-prod'`，如果 .env 没配置，生产环境 JWT 是不安全的。

前端 token 存在 `localStorage`，`api.js` 的 interceptor 也会读 `sessionStorage`（两处都读，优先 sessionStorage）。

---

## 六、资源 CRUD 模式

五类资源共用 `resourceController` 里的泛型 handler，通过 `api.js` 的 forEach 循环注册路由。

```
GET    /api/{resource}          getAllHandler  — 分页、搜索、过滤、排序
GET    /api/{resource}/:id      getOneHandler
GET    /api/{resource}/:id/related  getRelatedHandler
POST   /api/{resource}          createHandler  — 需要登录
PUT    /api/{resource}/:id      updateHandler  — 需要登录
DELETE /api/{resource}/:id      deleteHandler  — 软删除（设 deleted_at）
DELETE /api/{resource}/:id/permanent  permanentDeleteHandler  — 需要 admin
POST   /api/{resource}/:id/restore   restoreHandler  — 需要 admin
POST   /api/{resource}/:id/like      toggleLike  — 需要登录
PUT    /api/{resource}/:id/status    updateStatus  — 需要 admin
```

**内容审核流程**：
```
用户上传 → status='pending' → 管理员审核 → status='approved'/'rejected'
公开接口默认只返回 status='approved' 的内容
```

**软删除**：删除只设 `deleted_at`，不物理删除。管理员可以恢复。

**标签**：存为逗号分隔字符串（`"讲座,志愿活动"`），不是关联表。查询时用 LIKE 匹配，有专门的边界处理避免子串误匹配。

---

## 七、前端结构

```
src/
├── App.jsx              路由定义 + Provider 嵌套
├── context/
│   ├── AuthContext      用户登录状态，localStorage JWT
│   ├── SettingsContext  站点配置，从 /api/settings 拉取，有硬编码默认值
│   └── MusicContext     全局音乐播放器状态，useRef(new Audio())
├── services/
│   └── api.js           axios 实例，自动注入 token，3次重试
├── components/
│   ├── Admin/           管理后台（AdminDashboard + 各 Manager）
│   ├── Gallery.jsx      照片瀑布流
│   ├── Music.jsx        音乐列表
│   ├── Videos.jsx       视频列表
│   ├── Articles.jsx     文章列表
│   ├── Events.jsx       活动列表
│   ├── Hero.jsx         首页 Banner
│   ├── BackgroundSystem Three.js 背景特效
│   └── ...              其他 UI 组件
└── hooks/               自定义 hooks（useCachedResource 等）
```

**路由**：
```
/           Home (Hero + HomeCategories + About)
/gallery    Gallery
/music      Music
/videos     Videos
/articles   Articles
/events     Events
/about      About
/admin      AdminDashboard（无嵌套路由，单页面内 tab 切换）
/user/:id   PublicProfile
```

**分页**：由 `settings.pagination_enabled` 控制。`'true'` 时分页，否则 limit=1000 一次拉全部。这是个全局开关，所有资源类型共用。

---

## 八、特色功能

### 微信文章解析
`POST /api/resources/parse-wechat`（路由直接写在 index.js 里，不在 api.js）

流程：
```
WeChat URL → scrapeWeChat (cheerio) → parseWithLLM (OpenAI-compatible API)
→ downloadWeChatImage (绕过防盗链) → 返回结构化活动数据
```

LLM 用于从文章正文提取活动信息（日期、地点、主办方等），有浙大校历上下文注入。需要配置 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`。

### 全局音乐播放器
`MusicContext` 持有一个 `useRef(new Audio())` 实例，跨页面保持播放状态。`GlobalPlayer` 组件悬浮在页面底部。

### 三维背景
`BackgroundSystem` 用 Three.js / React Three Fiber 渲染背景特效，有多个场景（cyber 等），由 `SettingsContext.backgroundScene` 控制。

### 国际化
i18next，支持 7 种语言：zh / en / ar / es / fr / ja / ko。翻译文件在 `public/locales/`。

### PWA
vite-plugin-pwa，有 manifest 和 service worker。

---

## 九、已知技术债和不一致性

这些是读代码时实际观察到的，不是推测：

**数据库 Schema 管理混乱**
- 没有正式的 migration 系统（虽然 db.js 里有 `migrate()` 方法，但实际 migration 是在 index.js 启动时用 `ALTER TABLE` 硬写的）
- `seed.js` 的建表语句和实际运行时的表结构不同步（如 `end_date` 字段）
- `event_registrations` 表在 eventController 里被使用，但不在 seed.js 里建表，也不在 index.js 的 migration 里——这个表可能不存在

**字段命名不一致**
- `organization` vs `organization_cr`（DB 字段名 vs API 传参名）
- `articles` 表同时有 `tag` 和 `tags` 两个字段

**认证双轨**
- 普通用户走数据库，管理员快速登录走环境变量，两套逻辑并存
- adminLogin 硬编码 id=1，与数据库解耦

**路由注册不一致**
- 微信解析路由直接写在 index.js 里，不在 api.js 的路由文件里
- 事件注册路由在 api.js 里用 eventController，但 `event_registrations` 表的存在性存疑

**前端状态管理**
- 没有全局状态管理库（无 Redux/Zustand/Pinia）
- 用 React Context + SWR 组合，但各页面组件自己管理本地状态，没有统一模式
- `SettingsContext` 里有硬编码的联系方式（手机号、邮箱）

**安全**
- `SECRET_KEY` 有不安全的 fallback
- `adminLogin` 用明文字符串比较密码（不是 bcrypt）
- 上传文件存在 `uploads/` 子目录（images/videos/audio），但 `server/uploads/` 根目录下也直接有文件（历史遗留）

**前端 token 存储**
- `api.js` interceptor 同时读 `sessionStorage` 和 `localStorage`
- `AuthContext` 只写 `localStorage`
- 两处逻辑不完全对称

---

## 十、部署

```
Docker Compose:
  - 单容器，Node.js
  - 挂载 server/uploads 和 server/database.sqlite
  - 端口 3001

环境变量（server/.env）：
  PORT, NODE_ENV, SECRET_KEY, ADMIN_PASSWORD
  DATABASE_FILE, UPLOAD_DIR
  FRONTEND_URL, CORS_ORIGIN
  LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
  RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS
```

---

## 十一、读代码的建议

1. **不要相信 seed.js 的表结构**——实际表结构以运行时 migration（index.js）为准，两者不同步。

2. **`event_registrations` 表的存在性未确认**——eventController 用了它，但没有建表语句，可能是个潜在的运行时错误。

3. **`articles.tag` vs `articles.tags`**——遇到文章相关 bug 时，先确认代码用的是哪个字段。

4. **管理员 id=1 的假设**——adminLogin 生成的 token 里 id 是 1，如果数据库里没有 id=1 的用户，某些需要 JOIN users 的查询会出问题。

5. **分页开关是全局的**——`pagination_enabled` 影响所有资源类型，不能单独控制某一类。
