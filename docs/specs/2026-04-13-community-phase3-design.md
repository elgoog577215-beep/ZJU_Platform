# AI 社区 Phase 3 设计文档：帖子系统（求助 / 组队）

> 基于 Phase 1（前端壳 + 技术分享）和 Phase 2（后端 articles 分类 + 新闻面板）之上，实现帖子发布、展示、详情、回复的完整链路。

---

## 已完成工作回顾

### Phase 1（已完成）
- `CommunitySubNav.jsx` — 5 个 pill tabs（求助天地/技术分享/新闻/组队与会议/社群），CSS transition 切换，无 Framer Motion layoutId（避免与 AnimatePresence 冲突）
- `AICommunity.jsx` — 主容器，`useSearchParams` 管理 `?tab=` 切换，静态 header（无 motion.div）
- `CommunityTech.jsx` — 从 Articles.jsx 抽取的完整文章列表（ArticleCard、TagFilter、SortSelector、分页、文章详情 modal、上传）
- `CommunityHelp.jsx` — 占位面板（Phase 3 替换）
- `CommunityTeam.jsx` — 占位面板（Phase 3 替换）
- `CommunityGroups.jsx` — 静态二维码卡片页
- `CommunityNews.jsx` — 占位面板（Phase 2 替换）
- `App.jsx` — lazy import 从 Articles → AICommunity
- i18n — `nav.articles` → "AI社区"，HomeCategories 描述更新，社群 groups 翻译

### Phase 2（已完成）
- `server/src/config/runMigrations.js` — articles 表新增 `category TEXT NOT NULL DEFAULT 'tech'`
- `server/src/controllers/resourceController.js` — `getAllHandler` 新增 category WHERE 过滤（articles + events），articles 允许字段加入 category
- `CommunityNews.jsx` — 升级为完整新闻面板（`useCachedResource('/articles', { category: 'news' })`，NewsCard 蓝色主题，排序、分页、文章详情 modal、上传自动带 `category: 'news'`）
- i18n — 新增 `community.news_empty`、`community.news_empty_desc`

### Bug 修复
- **AnimatePresence 冲突**：CommunitySubNav 移除 Framer Motion `layoutId`，改用 CSS `transition-all duration-300`；AICommunity header 移除 `motion.div` 和 `whileInView`。解决从 AI 社区导航到其他页面时 PageTransition 退出动画卡住的问题。

---

## Phase 3 设计方案

### 设计决策总结

| 决策项 | 结论 |
|--------|------|
| 发帖入口 | **跟随页面** — 在求助天地点发帖自动为 `type=help`，在组队页点发帖自动为 `type=team` |
| 帖子内容格式 | **正文支持插图** — 使用 content_blocks（和文章相同的 JSON 结构），支持文字 + 图片混排 |
| PostCard 外壳 | **和 ArticleCard 完全一致** — `rounded-3xl backdrop-blur-xl bg-[#1a1a1a]/60 border-white/10`，hover 上浮 + 橙色阴影 + `-translate-y-1`，Framer Motion 入场动画 |
| PostCard 内部 | 状态徽章 + 时间 → 标题 → 摘要 → 作者头像/名字 · 回复数 · 标签（**无封面图**） |
| 帖子详情展示 | **方案 A：全屏弹窗** — 和文章详情一样的全屏 modal，底部回复区，支持深度链接 `?tab=help&post=42` |
| 发帖弹窗 | **新建 PostComposer 组件** — 轻量弹窗，标题 + content_blocks 编辑器 + 标签；组队帖额外加截止日期 + 招募人数 |

---

### 数据库设计

#### community_posts 表（已存在，需扩展）

当前表结构：
```sql
CREATE TABLE community_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,        -- 'help' | 'team'
  title TEXT NOT NULL,
  content TEXT NOT NULL,        -- 纯文本
  tags TEXT,
  status TEXT DEFAULT 'approved',
  author_id INTEGER NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);
```

需要新增的列（migration）：
```sql
ALTER TABLE community_posts ADD COLUMN content_blocks TEXT;  -- JSON array，和 articles 同结构
ALTER TABLE community_posts ADD COLUMN deadline TEXT;        -- 组队帖截止日期 ISO date
ALTER TABLE community_posts ADD COLUMN max_members INTEGER;  -- 组队帖招募人数上限
ALTER TABLE community_posts ADD COLUMN current_members INTEGER DEFAULT 0;  -- 当前报名人数
ALTER TABLE community_posts ADD COLUMN solved_at TEXT;       -- 求助帖解决时间
ALTER TABLE community_posts ADD COLUMN deleted_at TEXT;      -- 软删除
```

#### 状态值域

| type (section) | status 值 | 说明 |
|---------|-----------|------|
| help | `open` | 待答（默认） |
| help | `solved` | 已解决（作者或管理员标记） |
| help | `closed` | 已关闭 |
| team | `recruiting` | 招募中（默认） |
| team | `full` | 已满（`current_members >= max_members`） |
| team | `closed` | 已结束（过了 deadline 或手动关闭） |

---

### API 设计

已有 endpoints（`communityController.js`）：

```
GET    /api/community/posts              — 列表（section, search, sort, page, limit）
GET    /api/community/posts/:id          — 详情（自动 +1 views）
POST   /api/community/posts              — 创建（auth required）
POST   /api/community/posts/:id/like     — 点赞
GET    /api/community/posts/:id/comments — 评论列表
POST   /api/community/posts/:id/comments — 发评论（auth required）
```

需要新增/修改：
```
PUT    /api/community/posts/:id          — 更新（owner/admin）
DELETE /api/community/posts/:id          — 软删除（owner/admin）
PUT    /api/community/posts/:id/status   — 改状态（owner: open→solved; admin: 任意）
POST   /api/community/posts/:id/join     — 报名组队（auth, current_members+1）
```

创建帖子时的 body 扩展：
```json
{
  "section": "help",
  "title": "CUDA 报错",
  "content": "纯文本内容",
  "content_blocks": [
    { "type": "text", "text": "描述...", "style": "paragraph" },
    { "type": "image", "url": "/uploads/xxx.jpg", "caption": "报错截图" }
  ],
  "tags": "PyTorch,CUDA",
  "deadline": "2026-05-01",       // 仅 team
  "max_members": 5                 // 仅 team
}
```

---

### 前端组件设计

#### 1. PostCard.jsx

```
外壳：和 ArticleCard 完全一致
  - rounded-3xl, backdrop-blur-xl, border, p-6
  - hover:border-orange-500/30, hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.15)]
  - hover:-translate-y-1, transition-all duration-300
  - Framer Motion: initial={{ opacity:0, y:14 }}, animate={{ opacity:1, y:0 }}

内部布局：
  ┌─────────────────────────────────────────────┐
  │ [待答/已解决/招募中] · 2小时前                │
  │                                             │
  │ 标题（text-2xl font-bold hover:text-orange-400）│
  │                                             │
  │ 摘要 line-clamp-2（text-gray-400）            │
  │                                             │
  │ 👤 匿名用户 · 15回复 · #PyTorch #CUDA        │
  └─────────────────────────────────────────────┘

  组队帖额外显示：
  │ 📅 截止: 2026-05-01 · 👥 3/5 已报名           │
  │ [进度条 current_members/max_members]          │

Props: { post, index, onClick, canAnimate, isDayMode }
```

#### 2. PostDetail（全屏 modal）

```
复用文章详情 modal 的结构，但有以下不同：
  - 无封面图区域 → header 使用纯渐变背景
  - 渐变色：求助帖 from-amber-900/30，组队帖 from-violet-900/30
  - 状态徽章显示在标题上方
  - 内容区渲染 content_blocks（和文章一样的 block 渲染逻辑）
  - 底部：回复列表 + 回复输入框
  - 求助帖：作者/管理员可标记「已解决」
  - 组队帖：显示报名进度 + 报名按钮

深度链接：
  - URL: /articles?tab=help&post=42
  - 打开页面后自动 fetch /api/community/posts/42 并弹出 modal
```

#### 3. PostComposer.jsx（发帖弹窗）

```
轻量级弹窗组件，不复用 UploadModal（太重）：

  ┌─────────────────────────────────────┐
  │  发布求助帖                    [×]  │
  │ ─────────────────────────────────── │
  │                                     │
  │  标题 *                             │
  │  ┌─────────────────────────────┐   │
  │  │ 输入标题...                  │   │
  │  └─────────────────────────────┘   │
  │                                     │
  │  内容 *                             │
  │  ┌─────────────────────────────┐   │
  │  │ 描述你的问题...              │   │
  │  │                             │   │
  │  │ [插入图片]                   │   │
  │  └─────────────────────────────┘   │
  │                                     │
  │  标签                               │
  │  ┌─────────────────────────────┐   │
  │  │ PyTorch, CUDA               │   │
  │  └─────────────────────────────┘   │
  │                                     │
  │  ┌─ 仅组队帖 ──────────────────┐   │
  │  │ 截止日期    招募人数         │   │
  │  │ [2026-05-01] [5]            │   │
  │  └─────────────────────────────┘   │
  │                                     │
  │          [取消]    [发布]           │
  └─────────────────────────────────────┘

内容编辑器：
  - 基础版：textarea + 底部插入图片按钮
  - 图片上传后生成 content_block { type:'image', url:... }
  - 纯文本部分作为 content_block { type:'text', text:... }
  - 提交时：content = 纯文本部分，content_blocks = 完整 blocks JSON
```

#### 4. CommunityHelp.jsx（替换占位面板）

```
结构：
  - 顶部：筛选 tabs（全部 / 求助 / 讨论）+ 排序 + 发帖按钮
  - 列表：PostCard 组件
  - 分页 / 加载更多
  - 帖子详情 modal（PostDetail）
  - 深度链接支持（?post=id）

数据获取：
  useCachedResource('/community/posts', {
    section: 'help',
    page, limit, sort, status
  })
```

#### 5. CommunityTeam.jsx（替换占位面板）

```
结构：
  - 和 CommunityHelp 基本一致
  - PostCard 显示截止日期 + 人数进度条
  - 筛选 tabs（全部 / 招募中 / 已满 / 已结束）

数据获取：
  useCachedResource('/community/posts', {
    section: 'team',
    page, limit, sort, status
  })
```

---

### 实施顺序

#### 步骤 1：后端扩展
1. `runMigrations.js` — community_posts 表新增 content_blocks、deadline、max_members、current_members、solved_at、deleted_at 列
2. `communityController.js` — 更新 create handler 支持新字段；新增 PUT（更新）、DELETE（软删除）、PUT status（改状态）、POST join（报名）
3. 测试 API endpoints

#### 步骤 2：PostCard.jsx
1. 创建 `src/components/PostCard.jsx`
2. 外壳完全复制 ArticleCard 的样式和动画
3. 内部布局：状态徽章 + 标题 + 摘要 + 作者/回复/标签
4. 组队帖变体：截止日期 + 人数进度条

#### 步骤 3：PostDetail（帖子详情 modal）
1. 在 CommunityHelp/CommunityTeam 内实现
2. 复用文章详情 modal 的结构
3. 底部回复区（复用 comments API）
4. 求助帖：已解决标记按钮
5. 组队帖：报名按钮 + 进度显示

#### 步骤 4：PostComposer.jsx
1. 创建发帖弹窗组件
2. 标题 + 内容编辑器（支持插图）+ 标签输入
3. 组队帖模式：额外的截止日期 + 人数字段
4. 提交逻辑：POST /api/community/posts

#### 步骤 5：CommunityHelp.jsx 接通
1. 替换占位内容为完整帖子列表
2. 筛选 tabs + 排序 + 发帖按钮
3. PostCard 列表 + 分页
4. PostDetail modal + 深度链接（?post=id）

#### 步骤 6：CommunityTeam.jsx 接通
1. 同上，section='team'
2. 额外的截止日期/人数筛选
3. 报名功能

#### 步骤 7：验证和打磨
1. 前后端联调
2. 移动端适配
3. 状态转换测试（open→solved, recruiting→full）
4. 构建验证

---

### 文件清单

#### 新建文件
```
src/components/PostCard.jsx          — 帖子卡片
src/components/PostComposer.jsx      — 发帖弹窗
```

#### 修改文件
```
src/components/CommunityHelp.jsx     — 占位 → 完整求助面板
src/components/CommunityTeam.jsx     — 占位 → 完整组队面板
server/src/config/runMigrations.js   — community_posts 表新增列
server/src/controllers/communityController.js — 新增/修改 endpoints
server/src/routes/api.js             — 新增路由（PUT, DELETE, join）
public/locales/zh/translation.json   — 帖子相关翻译
public/locales/en/translation.json   — 同上英文版
```

#### 不变文件
```
src/components/AICommunity.jsx       — 主容器不需要改
src/components/CommunitySubNav.jsx   — 导航不需要改
src/components/CommunityTech.jsx     — 技术分享不需要改
src/components/CommunityNews.jsx     — 新闻不需要改
src/components/CommunityGroups.jsx   — 社群不需要改
```

---

### 设计参考

- PostCard demo：`.superpowers/brainstorm/368-1776010264/post-real-demo.html`
- 原始设计文档：`docs/specs/2026-04-12-ai-community-design.md`
- DESIGN.md（Linear 风格参考）：项目根目录
- 其他设计参考：`.design-refs/` 目录（notion, superhuman, stripe, cursor, claude）
