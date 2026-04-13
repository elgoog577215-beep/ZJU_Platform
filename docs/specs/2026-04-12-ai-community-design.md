# AI 社区设计方案

> 将 `/articles`（AI专栏）升级为 AI 社区，加入二次导航，分为 5 个板块。

## 总体架构

### 路由

- URL **保持 `/articles`**，不改路由路径（避免破坏书签和 SEO）
- 使用 `?tab=help|tech|news|team|groups` query param 切换板块
- 默认 tab: `tech`（技术分享，即原来的文章列表）

### 导航标签

- Navbar 中 `nav.articles` 的 i18n 值从 "AI专栏" 改为 "AI社区"
- HomeCategories 中 articles 卡片的描述也相应更新

### 数据来源

| 板块 | 数据来源 | 说明 |
|------|---------|------|
| 技术分享 | `GET /api/articles?category=tech` | 复用 articles 表，加 category 字段 |
| 新闻 | `GET /api/articles?category=news` | 同上 |
| 求助天地 | `GET /api/posts?type=help` | 新建 posts 表 |
| 组队与会议 | `GET /api/posts?type=team` | 同上 |
| 社群 | 静态数据 | 纯前端，展示二维码 |

---

## 前端组件拆分

### 新增文件

```
src/components/
  AICommunity.jsx          ← 主容器（替代 Articles 在 App.jsx 中的角色）
  CommunitySubNav.jsx      ← Pill Tabs 二次导航
  CommunityTech.jsx        ← 技术分享面板（抽取自原 Articles.jsx 的列表逻辑）
  CommunityNews.jsx        ← 新闻面板（同样复用 ArticleCard，category=news）
  CommunityHelp.jsx        ← 求助天地面板（新 PostCard 组件 + posts API）
  CommunityTeam.jsx        ← 组队与会议面板（新 PostCard 组件 + posts API）
  CommunityGroups.jsx      ← 社群面板（静态二维码展示）
  PostCard.jsx             ← 帖子卡片（用于求助/组队）
```

### 修改文件

```
src/App.jsx                ← 将 lazy import 从 Articles 改为 AICommunity
src/components/Navbar.jsx  ← navLinks 不变（key 仍为 'articles'），仅 i18n 变
src/components/HomeCategories.jsx  ← 同上，仅 i18n 描述变
public/locales/zh/translation.json ← nav.articles: "AI专栏" → "AI社区"
public/locales/en/translation.json ← 对应英文
server/src/config/ensureCoreSchema.js ← articles 表加 category 列，新建 posts 表
server/src/routes/api.js   ← 新增 posts 路由
server/src/controllers/    ← posts 复用 resourceController 或新建
```

### 不变文件

- `ArticleCard` 保持原样（技术分享 & 新闻复用）
- `TagFilter`, `SortSelector`, `Pagination`, `FavoriteButton` 全部复用
- `UploadModal` 复用（技术分享/新闻发文章时用）
- 文章详情 modal（selectedArticle 弹窗）保持原样

---

## 组件设计

### 1. AICommunity.jsx（主容器）

```
功能：
- 读取 URL query param `tab`，默认 'tech'
- 渲染页面 header（标题 "AI社区" + 副标题）
- 渲染 CommunitySubNav
- 根据当前 tab 渲染对应面板组件
- 保持原来的 ambient background（橙色/红色模糊光晕）

状态：
- activeTab: string（从 searchParams 读写）
```

### 2. CommunitySubNav.jsx（Pill Tabs）

```
视觉设计：
- 水平排列的胶囊按钮
- 选中项有 orange 高亮背景 + framer-motion layoutId 滑块动画
- 日间模式：白色背景、slate 边框、选中 bg-orange-500 text-white
- 夜间模式：bg-white/5 边框 white/10、选中 bg-orange-500 text-black
- 每个 tab 带一个 lucide icon
- 移动端：水平滚动（overflow-x-auto, scrollbar-hidden）

Tab 定义：
  help:   { icon: HelpCircle,  label: t('nav.community_help') }
  tech:   { icon: Code2,       label: t('nav.community_tech') }
  news:   { icon: Newspaper,   label: t('nav.community_news') }
  team:   { icon: Users,       label: t('nav.community_team') }
  groups: { icon: QrCode,      label: t('nav.community_groups') }

Props: { activeTab, onTabChange, isDayMode }
```

### 3. CommunityTech.jsx（技术分享）

```
从原 Articles.jsx 中抽取的核心列表逻辑：
- useCachedResource('/articles', { category: 'tech', page, limit, sort, tags })
- 渲染 ArticleCard 列表
- TagFilter + SortSelector
- Pagination / 加载更多
- 文章详情 modal（selectedArticle）
- 上传按钮 + UploadModal（type='article', 默认 category='tech'）
- 移动端筛选/排序 bottom sheet

本质上就是原 Articles.jsx 的内容，只是 API 调用加了 category=tech 参数。
```

### 4. CommunityNews.jsx（新闻）

```
结构与 CommunityTech 几乎一致：
- useCachedResource('/articles', { category: 'news', ... })
- 复用 ArticleCard
- 可能不需要 TagFilter（新闻通常不按技术标签过滤）
- 保持 SortSelector（按时间排序即可）
```

### 5. CommunityHelp.jsx（求助天地）

```
UI：
- 顶部：筛选 tabs（全部 / 求助 / 讨论）+ 标签过滤
- 列表：PostCard 组件
  - 标题
  - 元信息行：作者 · 回复数 · 标签 · 时间
  - 状态徽章：待答 / 已解决 / 置顶
- 发帖按钮

数据：GET /api/posts?type=help&status=&tags=&page=&sort=
```

### 6. CommunityTeam.jsx（组队与会议）

```
UI：
- 列表：PostCard 组件（略有变体）
  - 标题
  - 截止日期 + 已报名/总人数
  - 状态：招募中 / 已满 / 已结束
- 发帖按钮

数据：GET /api/posts?type=team&page=&sort=
```

### 7. CommunityGroups.jsx（社群）

```
UI：
- 卡片网格布局
- 每张卡片：二维码图片 + 群名 + 简介
- 纯静态数据（可以放在组件内或 i18n 中）
- 风格：backdrop-blur 玻璃卡片，和 ArticleCard 同系

数据来源：组件内静态数组，或后续接管理后台
```

### 8. PostCard.jsx（帖子卡片）

```
与 ArticleCard 风格一致但字段不同：
- 同样的 rounded-3xl、backdrop-blur、border、hover 效果
- 不显示封面图（帖子通常无图）
- 显示：标题、元信息（作者·回复数·时间）、标签、状态徽章
- 求助帖额外：solved/pending 状态
- 组队帖额外：截止日期、人数进度条
```

---

## 后端设计

### articles 表变更

```sql
ALTER TABLE articles ADD COLUMN category TEXT NOT NULL DEFAULT 'tech';
-- 值域: 'tech', 'news'
-- 已有文章全部默认 'tech'
```

API 变更：
- `GET /api/articles` 新增 `category` query 参数
- `POST /api/articles` body 中可带 `category` 字段
- 其他端点不变

### posts 表（新建）

```sql
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'help',       -- 'help' | 'team'
  status TEXT NOT NULL DEFAULT 'open',     -- 'open' | 'solved' | 'closed'
  tags TEXT,                                -- JSON array string
  reply_count INTEGER DEFAULT 0,
  uploader_id INTEGER REFERENCES users(id),
  
  -- team-specific fields
  deadline TEXT,                            -- ISO date
  max_members INTEGER,
  current_members INTEGER DEFAULT 0,
  
  -- timestamps
  solved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);
```

### posts API

```
GET    /api/posts              — 列表（type, status, tags, sort, page, limit）
GET    /api/posts/:id          — 详情
POST   /api/posts              — 创建（auth required）
PUT    /api/posts/:id          — 更新（auth required, owner/admin）
DELETE /api/posts/:id          — 软删除
POST   /api/posts/:id/like     — 点赞
PUT    /api/posts/:id/status   — 改状态（owner/admin）
```

可复用 `resourceController.js` 的工厂模式来生成。

---

## 实施顺序

### Phase 1: 前端壳 + 技术分享直接可用
1. 创建 `CommunitySubNav.jsx`
2. 创建 `AICommunity.jsx` 作为主容器
3. 将 `Articles.jsx` 的列表逻辑抽取到 `CommunityTech.jsx`
4. 其他 4 个面板先用占位内容（i18n 中已有 demo 数据）
5. `App.jsx` 改 lazy import
6. 更新 i18n（nav.articles → "AI社区"）
7. `CommunityGroups.jsx` 做成静态二维码页

### Phase 2: 后端 articles 分类
8. articles 表加 category 列 + migration
9. API 加 category 查询参数
10. `CommunityNews.jsx` 接通真实数据

### Phase 3: posts 表 + 求助/组队
11. 新建 posts 表 + migration
12. 新增 posts API 路由
13. `PostCard.jsx` 组件
14. `CommunityHelp.jsx` 接通
15. `CommunityTeam.jsx` 接通

---

## 移动端适配

- Sub-nav: 水平滚动，当前选中项自动 scrollIntoView
- 各面板继承原 Articles 的移动端 bottom sheet 模式
- 社群页二维码：单列卡片，长按可保存

## 无障碍

- Sub-nav 使用 `role="tablist"` + `role="tab"` + `aria-selected`
- 面板使用 `role="tabpanel"` + `aria-labelledby`
- 键盘：左右箭头切换 tab
