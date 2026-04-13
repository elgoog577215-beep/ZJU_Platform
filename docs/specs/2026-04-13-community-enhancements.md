# AI 社区增强设计方案

> 三项增强：统一评论系统、作者显示对齐、PostComposer 升级为块编辑器

## 一、评论系统 — 给文章加评论

### 现状
- `comments` 表已支持 `resource_type + resource_id` 多态关联
- 通用评论 API 已就绪：`GET/POST /comments`
- CommunityHelp / CommunityTeam 已有完整评论 UI
- CommunityTech / CommunityNews 的文章详情 modal **无评论**

### 改动

**后端：零改动。** 通用评论 API 已覆盖 `resource_type='article'`。

**前端：** 在 CommunityTech 和 CommunityNews 的文章详情 modal 底部加评论区。

改动文件：
- `CommunityTech.jsx` — 详情 modal 底部加评论列表 + 输入框
- `CommunityNews.jsx` — 同上

评论数据流：
```
GET  /comments?resourceType=article&resourceId={id}
POST /comments { resource_type: 'article', resource_id: {id}, content: '...' }
```

---

## 二、作者显示 — JOIN users 表

### 现状
- articles 表只有 `uploader_id`，无 author_name / author_avatar
- 前端硬编码"管理员"或不显示作者
- community_posts 表有 author_name + author_avatar，显示正常

### 方案：查询时 JOIN（不改表结构）

**后端改动：** `resourceController.js`

`getAllHandler` 和 `getOneHandler` 对所有资源表做 LEFT JOIN users：
```sql
SELECT a.*, u.nickname AS author_name, u.avatar AS author_avatar
FROM articles a
LEFT JOIN users u ON a.uploader_id = u.id
WHERE ...
```

**前端改动：**
- `ArticleCard.jsx` — 显示 `article.author_name`
- CommunityTech / CommunityNews 文章详情 modal — 显示作者头像 + 名字

---

## 三、PostComposer 升级 — 轻量块编辑器

### 现状
PostComposer：标题 + 单个 textarea + 最多5张图片追加在末尾。

### 升级目标
支持内容块穿插编辑（文字 + 图片 + 视频 + 文件），格式与 UploadModal 的 content_blocks 统一。

### 块类型矩阵

| 块类型 | 求助天地 | 组队会议 |
|--------|---------|---------|
| 文字段落 | ✅ | ✅ |
| 图片 | ✅ | ✅ |
| 视频 | ✅ | ❌ |
| 文件附件 | ✅ | ✅ |

### 表单字段矩阵

| 字段 | 求助天地 | 组队会议 |
|------|---------|---------|
| 标题 | ✅ | ✅ |
| 内容块编辑区 | ✅ | ✅ |
| 标签 | ✅ | ✅ |
| 活动链接（可跳转） | ❌ | ✅ |
| 截止日期 | ❌ | ✅ |
| 招募人数 | ❌ | ✅ |

### content_blocks 格式（统一）

```json
[
  { "type": "text", "text": "正文内容...", "style": "paragraph" },
  { "type": "image", "url": "/uploads/images/xxx.png", "caption": "错误截图" },
  { "type": "text", "text": "更多说明...", "style": "paragraph" },
  { "type": "video", "url": "/uploads/videos/xxx.mp4", "name": "demo.mp4" },
  { "type": "file", "url": "/uploads/documents/xxx.pdf", "name": "配置文件.pdf", "size": 12345 }
]
```

### 后端改动

**community_posts 表新增列：**
```sql
ALTER TABLE community_posts ADD COLUMN content_blocks TEXT;
ALTER TABLE community_posts ADD COLUMN link TEXT;
```

**communityController.js：**
- `createPost()` — 接收并存储 content_blocks、link
- `listPosts()` / `getPost()` — 返回这些字段

### 前端改动

**PostComposer.jsx 重写为块编辑器：**
- 块操作：添加 / 删除 / 上下移动
- 文字块：textarea
- 图片块：文件选择 + 预览
- 视频块（仅 help）：文件选择 + 预览
- 文件块：文件选择 + 文件名显示
- 组队专属：活动链接输入 + 截止日期 + 招募人数

**CommunityHelp.jsx / CommunityTeam.jsx：**
- 帖子详情从渲染纯文本改为渲染 content_blocks
- 组队详情额外显示活动链接（可点击跳转）

---

## 四、新闻管理员权限

CommunityNews.jsx 的发布按钮仅对 admin 角色可见。

---

## 五、实施顺序

### Phase 1: 基础对齐（后端 + 作者 + 评论）
1. 后端 resourceController getAllHandler/getOneHandler JOIN users
2. 前端 ArticleCard / 详情 modal 显示作者
3. CommunityTech / CommunityNews 详情 modal 加评论区
4. CommunityNews 发布按钮加 admin 权限判断

### Phase 2: PostComposer 升级
5. community_posts 表加 content_blocks、link 列（migration）
6. communityController 适配新字段
7. PostComposer 重写为块编辑器

### Phase 3: 展示端对齐
8. CommunityHelp 详情渲染 content_blocks
9. CommunityTeam 详情渲染 content_blocks + 活动链接

---

## 六、改动文件清单

```
后端:
  server/src/controllers/resourceController.js   ← JOIN users
  server/src/controllers/communityController.js   ← content_blocks, link
  server/src/config/runMigrations.js              ← community_posts 新增列

前端:
  src/components/PostComposer.jsx      ← 重写为块编辑器
  src/components/CommunityTech.jsx     ← 详情 modal 加评论
  src/components/CommunityNews.jsx     ← 详情 modal 加评论 + admin 发布权限
  src/components/CommunityHelp.jsx     ← 渲染 content_blocks
  src/components/CommunityTeam.jsx     ← 渲染 content_blocks + 活动链接
  src/components/ArticleCard.jsx       ← 显示 author_name
```
