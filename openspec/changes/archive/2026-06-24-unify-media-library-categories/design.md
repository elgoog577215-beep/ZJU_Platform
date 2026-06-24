## Context

当前系统已经有两套稳定资源模型：`photos` 负责图片，`videos` 负责视频。两者共享 `resourceController` 的 CRUD、审核、收藏和上传链路，但前台分别由 `/gallery` 与 `/videos` 展示。

用户确认本轮原则为：**后端分开，前端合并**。因此本轮不会合并数据表，也不会把影像库升级为比赛成果资源包。影像库只负责按分类浏览图片和视频。

## Goals / Non-Goals

**Goals:**

- 新增“影像库”作为图片与视频的统一前台入口。
- 影像库桌面端左侧 2/3 展示该分类下的图片，右侧 1/3 展示该分类下的视频。
- 移动端改为上下结构，避免硬压两栏。
- 管理员可以维护影像分类。
- 用户上传图片或视频时可以选择分类。
- 后端资源仍保持 `photos` 与 `videos` 分离。

**Non-Goals:**

- 不做精选、置顶到成果页、比赛成果联动。
- 不合并 `photos` 与 `videos` 表。
- 不删除 `/gallery` 与 `/videos`。
- 不做多层分类、专辑详情页或资源包下载。
- 不改比赛成果、黑客松成果页的展示逻辑。

## Decisions

### Decision 1: 用共享分类表连接图片与视频

新增 `media_categories` 表，图片和视频各自增加 `category_id` 字段。分类表只表达一个维度：影像库分类。

原因：这符合“后端分开，前端合并”的边界。图片和视频继续各自走原上传、审核、文件字段和资源 API，但能共享同一套分类筛选。

### Decision 2: 影像库页面分别请求图片和视频

`/media` 页面不引入新的聚合后端接口，先分别请求 `/photos` 与 `/videos`，并传入相同的 `category_id`。页面负责把两类资源放入左右区域。

原因：现有资源控制器已经支持分页、排序和状态过滤。分别请求可以减少后端改动，并保留图片和视频各自的数据字段。

### Decision 3: 分类筛选只负责筛选，不负责精选

分类筛选影响左右两栏的数据范围。例如选择“黑客松第一季”，左侧只展示该分类下图片，右侧只展示该分类下视频。

原因：用户已明确本轮不需要精选。分类就是上传和浏览时的基本归档方式。

### Decision 4: 后台新增轻量分类管理

后台新增“影像分类”入口，管理员可以新增、编辑、启停、排序分类。删除或停用分类不得删除历史资源。

原因：分类是运营配置，不应写死在代码或 locale 中。启停可以控制上传可选项，历史资源仍保留引用。

### Decision 5: 保留旧页面兼容

`/gallery` 与 `/videos` 暂时保留。导航主入口切到 `/media`，但通知、收藏、个人主页和历史链接可以继续使用旧路由。

原因：旧深链已经在通知、收藏、个人主页和搜索结果中被使用。立即重定向可能扩大回归面，本轮先保证新入口可用。

## Data Model

新增表：

```sql
media_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
)
```

新增字段：

```sql
photos.category_id INTEGER
videos.category_id INTEGER
```

`category_id` 可以为空，表示未分类。未分类资源仍在影像库“全部”中展示。

## API Shape

- `GET /api/media-categories`：返回启用分类，供前台上传和筛选使用。
- `GET /api/admin/media-categories`：返回全部未删除分类，供后台管理使用。
- `POST /api/admin/media-categories`：创建分类。
- `PUT /api/admin/media-categories/:id`：更新分类名、说明、排序、状态。
- `DELETE /api/admin/media-categories/:id`：软删除分类。
- `GET /api/photos?category_id=1`：按分类过滤图片。
- `GET /api/videos?category_id=1`：按分类过滤视频。

## Frontend Layout

桌面端：

```text
影像库
[分类筛选]  [上传影像]

┌──────────────────────────────┬──────────────┐
│ 现场照片  2/3                │ 视频记录 1/3 │
│ 该分类下的图片               │ 该分类下的视频 │
└──────────────────────────────┴──────────────┘
```

移动端：

```text
影像库
[分类筛选]
[上传影像]

视频记录
该分类下的视频

现场照片
该分类下的图片
```

## Migration Plan

1. 在核心 schema 和运行迁移中补齐 `media_categories` 表、`photos.category_id`、`videos.category_id`。
2. 新增分类控制器和路由。
3. 扩展资源字段与列表过滤。
4. 新增 `/media` 页面。
5. 更新上传弹窗和后台分类管理入口。
6. 更新导航入口。
7. 运行 OpenSpec 校验、后端测试或构建、前端构建和浏览器检查。

## Risks / Trade-offs

- [Risk] 老数据没有分类，分类筛选为空时页面可能显得内容少。
  Mitigation: “全部”默认展示所有资源，分类为空时给出清晰空状态。

- [Risk] 后台分类删除后历史资源仍引用旧 ID。
  Mitigation: 删除只软删除分类；资源查询时不依赖分类 JOIN，历史资源仍可读取。

- [Risk] 上传弹窗已承载多类型内容，分类选择容易影响其他资源类型。
  Mitigation: 只在 `image` 与 `video` 类型显示分类选择。

- [Risk] 新影像库与旧画廊/视频页面存在重复入口。
  Mitigation: 本轮先以导航主入口收束，旧路由作为兼容入口保留。
