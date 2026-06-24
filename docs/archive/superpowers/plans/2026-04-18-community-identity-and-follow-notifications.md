---
openspec-change: community-identity-and-follow-notifications
created: 2026-04-18
---

# Plan: Community Identity & Follow Notifications

## Overview

把 4 件事收口到一个 change：
1. 修复 SQL 漏洞导致的"假匿名" — 作者身份用 `COALESCE(u.nickname, u.username)` 兜底
2. 为 `users.nickname` 补编辑入口 + 全局唯一约束
3. `community_posts` 加 `is_anonymous` opt-in + 服务端脱敏 helper + CI 覆盖 assertion
4. 6 种资源类型发布时 fan-out 通知给作者粉丝（社区帖不推；匿名求助贴不推；banned/deleted 粉丝跳过）

同时附带：PublicProfile 内容区改造为类型 tabs + 大图 grid（保留"已发布"风格）；资源详情头像可点跳主页；禁止 self-follow。

**Scope hard limits**:
- 后端只动 6 文件：`resourceController.js`, `newsController.js`, `userController.js`, `communityController.js`, `notificationController.js`, `runMigrations.js`
- 前端只动 4 文件：`PublicProfile.jsx`, `PostComposer.jsx`, `CommunityDetailModal.jsx`, `NotificationCenter.jsx`
- `getFollowingFeed` **不动**（保持其 `author_nickname` / `author_username` 分字段现状）
- Feed 端点不扩展（`/users/following/feed` 保持现范围）
- 资源卡片列表不加头像点击（仅详情弹窗）
- 不做通知聚合 / 防抖 / 静音 / 邮件推送
- 不重命名 `community_posts.author_id`（保留 author_id vs uploader_id 的不一致）

**字段命名提醒**（Eng-R3）：
- 资源表 6 张：作者字段名为 `uploader_id`
- `community_posts` 表：作者字段名为 `author_id`
- 每个涉及 SQL/代码的 Task 都已标注使用正确字段名

## Task 0: Rollback Checkpoint

**Files** (Modify): 无代码改动 —— 仅打 tag + 备份 DB。

### Step 0.1 — Git 工作区确认 + 打 tag

```bash
cd D:/xsh/cursor/zju/ZJU_Platform
git status
# 工作区不干净就停下来，先让用户提交/stash
git tag pre-identity-follow-v1
git tag --list pre-identity-follow-v1
```

### Step 0.2 — 数据库快照

```bash
cp server/database.sqlite "server/database.sqlite.bak.pre-identity-follow-$(date +%Y-%m-%dT%H-%M-%S)"
ls -la server/database.sqlite.bak.pre-identity-follow-*
```

---

## Task 1: Database Migration

**Files**:
- Modify: `server/src/config/runMigrations.js`

### Step 1.1 — 在 `users` 表 migration 之后追加 nickname UNIQUE partial index

找到 `runMigrations.js` 里 `if (!userColumns.includes('nickname'))` 块（约 line 285）。在该块之后追加：

```js
  // Migration: Nickname partial unique index.
  // See openspec/changes/community-identity-and-follow-notifications/ for full context.
  try {
    const nicknameCollisions = await db.all(
      `SELECT nickname, GROUP_CONCAT(id) AS ids, COUNT(*) AS cnt
       FROM users WHERE nickname IS NOT NULL AND nickname <> ''
       GROUP BY nickname HAVING cnt > 1`
    );
    if (nicknameCollisions.length > 0) {
      console.warn(
        '[Migration warning] nickname collisions detected, please resolve before UNIQUE enforcement:',
        nicknameCollisions,
      );
    }
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname
                   ON users(nickname) WHERE nickname IS NOT NULL`);
    console.log('✅ users.nickname partial UNIQUE index ready');
  } catch (err) {
    console.warn('Migration warning (users.nickname unique):', err.message);
  }
```

### Step 1.2 — 在 `community_posts` 的 migration 之后追加 `is_anonymous` column

找到 `runMigrations.js` 里 `CREATE TABLE IF NOT EXISTS community_posts` 块（约 line 455）之后。追加：

```js
  // Migration: community_posts.is_anonymous opt-in flag (help posts only).
  try {
    const postsInfo = await db.all('PRAGMA table_info(community_posts)');
    const postsColumns = new Set(postsInfo.map((c) => c.name));
    if (!postsColumns.has('is_anonymous')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN is_anonymous INTEGER DEFAULT 0`);
      console.log('✅ Added community_posts.is_anonymous column');
    }
  } catch (err) {
    console.warn('Migration warning (community_posts.is_anonymous):', err.message);
  }
```

**注意**: SQLite 没有 BOOLEAN，用 INTEGER 存 0/1。JS 层读出时 `Boolean(row.is_anonymous)` 正常工作。

### Step 1.3 — 冒烟

```bash
cd D:/xsh/cursor/zju/ZJU_Platform/server
node -e "require('./src/config/runMigrations').runMigrations().then(() => { console.log('migrations OK'); process.exit(0); })"
# 看到 "✅ users.nickname partial UNIQUE index ready" 和 "✅ Added community_posts.is_anonymous column"
```

---

## Task 2: Resource Author SQL Fallback

**Files**:
- Modify: `server/src/controllers/resourceController.js`
- Modify: `server/src/controllers/newsController.js`
- Test: 手动 curl 新老用户的 article

**字段**: 仅涉及资源表的 `uploader_id`（6 张表 JOIN users 时），**不动** `community_posts.author_id`。**不动** `getFollowingFeed`。

### Step 2.1 — resourceController.js 的 author_name 改 COALESCE

打开 `server/src/controllers/resourceController.js`，搜索 `u.nickname AS author_name`（两处，分别在 `getOneHandler` 约 line 294 和 `getAllHandler` 约 line 376）。

改为：

```js
// line 294 原:
let query = `SELECT ${table}.*, u.nickname AS author_name, u.avatar AS author_avatar`;
// 改为:
let query = `SELECT ${table}.*, COALESCE(u.nickname, u.username) AS author_name, u.avatar AS author_avatar`;
```

两处同样的改动。

**不要** 去 `getFollowingFeed` 函数（约 line 323）里改 `author_nickname` / `author_username`—— 保持现有前端依赖。

### Step 2.2 — newsController.js 同样改

打开 `server/src/controllers/newsController.js`，搜索 `users.nickname AS author_name`（`listNews` 约 line 104, `getNews` 约 line 135）。

```js
// 原:
SELECT news.*, users.nickname AS author_name, users.avatar AS author_avatar
// 改为:
SELECT news.*, COALESCE(users.nickname, users.username) AS author_name, users.avatar AS author_avatar
```

两处同样的改动。

### Step 2.3 — 冒烟验证

```bash
# 起 dev server
cd D:/xsh/cursor/zju/ZJU_Platform/server
node index.js &
# 另一个终端
# 先确认现有 articles 的 author_name（或从 UI 看）
curl -s "http://localhost:3000/api/articles?limit=3" | python -c "import json,sys; print([{'id':a['id'],'author_name':a.get('author_name')} for a in json.load(sys.stdin)['data']])"
# 预期：历史文章 author_name 不再是 null/空
```

---

## Task 3: Backend · Nickname Editing API

**Files**:
- Modify: `server/src/controllers/userController.js`（`updateUser` 函数）

### Step 3.1 — 新增 validateNickname helper

在 userController.js 顶部或 `updateUser` 前，新增：

```js
const NICKNAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;

function validateNickname(raw) {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  const trimmed = String(raw).trim();
  if (trimmed === '') return { ok: true, value: null };
  if (trimmed.length < 2 || trimmed.length > 20) {
    return { ok: false, error: 'nickname 长度需为 2-20 字符' };
  }
  if (!NICKNAME_REGEX.test(trimmed)) {
    return { ok: false, error: 'nickname 仅允许中英文、数字和下划线' };
  }
  return { ok: true, value: trimmed };
}
```

### Step 3.2 — `updateUser` 里处理 nickname 分支

找到 `updateUser` 里 `if (nickname !== undefined) await db.run('UPDATE users SET nickname = ? WHERE id = ?', [nickname, id])`（约 line 75），替换为：

```js
if (nickname !== undefined) {
  const check = validateNickname(nickname);
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }
  try {
    await db.run('UPDATE users SET nickname = ? WHERE id = ?', [check.value, id]);
  } catch (err) {
    if (err && (err.code === 'SQLITE_CONSTRAINT' || /UNIQUE constraint failed/i.test(err.message || ''))) {
      return res.status(409).json({ error: '该昵称已被使用' });
    }
    throw err;
  }
}
```

**重要**: error message **固定为** `"该昵称已被使用"`，不能包含冲突用户的 id / username / nickname（CSO-S4）。

### Step 3.3 — curl 测试 5 种场景

```bash
# 假设已登录 token 在变量 TOKEN
AUTH="-H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json'"

# (a) 合法
curl -X PUT http://localhost:3000/api/users/me $AUTH -d '{"nickname":"夜航船"}'   # 200
# (b) 太短
curl -X PUT http://localhost:3000/api/users/me $AUTH -d '{"nickname":"A"}'         # 400
# (c) emoji
curl -X PUT http://localhost:3000/api/users/me $AUTH -d '{"nickname":"小明🎉"}'    # 400
# (d) 冲突 (先用户 B 设置了 '小明', 再 A 设置同值)
curl -X PUT http://localhost:3000/api/users/me $AUTH -d '{"nickname":"小明"}'      # 409 error:"该昵称已被使用"
# (e) 空字符串清空
curl -X PUT http://localhost:3000/api/users/me $AUTH -d '{"nickname":""}'          # 200, DB 行 nickname = NULL
```

---

## Task 4: Backend · serializeCommunityPost Helper + 读路径审计

**Files**:
- Create: `server/src/utils/serializeCommunityPost.js`
- Modify: `server/src/controllers/communityController.js`

**字段**: `community_posts.author_id`（非 uploader_id）。

### Step 4.1 — 写 helper（新文件）

`server/src/utils/serializeCommunityPost.js`:

```js
/**
 * Redact anonymous help posts for non-owner non-admin viewers.
 *
 * @param {object} post - raw row from community_posts join users
 * @param {object|null} viewer - { id, role } or null for anonymous viewer
 * @returns {object} serialized post safe to return
 */
function serializeCommunityPost(post, viewer) {
  if (!post) return post;

  const isAnonymous = Boolean(post.is_anonymous);
  if (!isAnonymous) return { ...post };

  const viewerId = viewer && viewer.id != null ? Number(viewer.id) : null;
  const viewerRole = viewer && viewer.role ? String(viewer.role) : null;
  const authorId = post.author_id != null ? Number(post.author_id) : null;
  const isOwner = viewerId !== null && authorId !== null && viewerId === authorId;
  const isAdmin = viewerRole === 'admin';

  if (isOwner || isAdmin) return { ...post };

  return {
    ...post,
    author_id: null,
    author_name: null,
    author_avatar: null,
    uploader_id: null,   // 防御性：某些 join 别名可能带此字段
  };
}

module.exports = { serializeCommunityPost };
```

### Step 4.2 — 找出所有 `FROM community_posts` 的读路径

```bash
cd D:/xsh/cursor/zju/ZJU_Platform/server
grep -n "FROM community_posts\|from community_posts" src --include="*.js" -r
# 对照每条：确认返回给 client 的那条是否过 helper
```

预计覆盖：
- `communityController.js` 的 list / detail / my-posts
- `userController.js` `getUserResources`（Task 6 一并）

### Step 4.3 — communityController.js 读路径接入 helper

打开 `server/src/controllers/communityController.js`，搜 `community_posts`，对每个返回 posts 的 endpoint：

示例（实际代码位置按搜索结果定位）:

```js
const { serializeCommunityPost } = require('../utils/serializeCommunityPost');

// ...在 list/detail handler 里
const posts = await db.all(sql, params);
const viewer = req.user ? { id: req.user.id, role: req.user.role } : null;
const safePosts = posts.map((p) => serializeCommunityPost(p, viewer));
res.json({ data: safePosts, ... });

// detail 用 .get:
const post = await db.get(sql, params);
res.json(serializeCommunityPost(post, viewer));
```

### Step 4.4 — createPost 处理 is_anonymous

在 `createPost`（或等效 handler）里，确保：

```js
const section = String(req.body.section || '').toLowerCase();
const isAnonymous = section === 'help' ? (req.body.is_anonymous ? 1 : 0) : 0;
// INSERT INTO community_posts (..., is_anonymous, ...) VALUES (..., ?, ...)
```

组队贴（`section === 'team'`）强制 0（忽略请求中的字段）。

### Step 4.5 — 单元测试 `__tests__/serializeCommunityPost.test.js`

`server/src/utils/__tests__/serializeCommunityPost.test.js`:

```js
const { serializeCommunityPost } = require('../serializeCommunityPost');

describe('serializeCommunityPost', () => {
  const post = {
    id: 100, author_id: 7, author_name: 'xsh', author_avatar: 'a.png',
    is_anonymous: 1, title: 't', content: 'c',
  };

  test('non-anonymous: returns as-is', () => {
    expect(serializeCommunityPost({ ...post, is_anonymous: 0 }, null).author_name).toBe('xsh');
  });

  test('anonymous + visitor: redacted', () => {
    const out = serializeCommunityPost(post, null);
    expect(out.author_name).toBeNull();
    expect(out.author_id).toBeNull();
    expect(out.author_avatar).toBeNull();
  });

  test('anonymous + other user: redacted', () => {
    const out = serializeCommunityPost(post, { id: 99, role: 'user' });
    expect(out.author_name).toBeNull();
  });

  test('anonymous + owner: full visibility', () => {
    const out = serializeCommunityPost(post, { id: 7, role: 'user' });
    expect(out.author_name).toBe('xsh');
  });

  test('anonymous + admin: full visibility', () => {
    const out = serializeCommunityPost(post, { id: 99, role: 'admin' });
    expect(out.author_name).toBe('xsh');
  });
});
```

---

## Task 5: Backend · fanOutNewContent Helper

**Files**:
- Modify: `server/src/controllers/notificationController.js`
- Modify: `server/src/controllers/resourceController.js`
- Modify: `server/src/controllers/newsController.js`

**字段**: 资源表用 `uploader_id`。

### Step 5.1 — 在 notificationController.js 里新增 helper

在 `notificationController.js` 的 `createNotification` 之后追加：

```js
const RESOURCE_TYPE_LABEL = {
  article: '文章',
  photo: '图片',
  music: '音乐',
  video: '视频',
  event: '活动',
  news: '新闻',
};

async function fanOutNewContent({ authorId, resourceType, resourceId, title }) {
  if (!authorId || !resourceType || !resourceId) return;
  const label = RESOURCE_TYPE_LABEL[resourceType];
  if (!label) return;   // 未知类型不 fan-out

  try {
    const db = await getDb();
    // Author display name (nickname || username)
    const author = await db.get(
      'SELECT username, nickname FROM users WHERE id = ?',
      [authorId]
    );
    if (!author) return;
    const authorName = author.nickname || author.username || '某用户';

    // Followers, filtering banned + deleted (if column exists)
    const userCols = await db.all('PRAGMA table_info(users)');
    const hasDeletedAt = userCols.some((c) => c.name === 'deleted_at');
    const followerQuery = hasDeletedAt
      ? `SELECT uf.follower_id FROM user_follows uf
         JOIN users u ON u.id = uf.follower_id
         WHERE uf.following_id = ?
           AND (u.role IS NULL OR u.role != 'banned')
           AND u.deleted_at IS NULL`
      : `SELECT uf.follower_id FROM user_follows uf
         JOIN users u ON u.id = uf.follower_id
         WHERE uf.following_id = ?
           AND (u.role IS NULL OR u.role != 'banned')`;
    const rows = await db.all(followerQuery, [authorId]);

    const safeTitle = title && String(title).trim() ? String(title).trim() : '（无标题）';
    const content = `${authorName} 发布了新${label}《${safeTitle}》`;

    for (const row of rows) {
      await createNotification(row.follower_id, 'new_content', content, resourceId, resourceType);
    }
  } catch (err) {
    console.error('[fanOutNewContent] error:', err);
  }
}

module.exports = {
  createNotification,
  fanOutNewContent,
  getNotifications,
  markAsRead,
  deleteNotification,
};
```

注意 module.exports 增加 `fanOutNewContent`。

### Step 5.2 — resourceController.createHandler 接入 fan-out

在 `resourceController.js` 顶部 import：

```js
const { createNotification, fanOutNewContent } = require('./notificationController');
```

在 `createHandler` 里 `db.run(sql, values)` 成功后（约 line 111），追加：

```js
// Fan-out follow notifications (skip for admin moderation updates etc.)
const FANOUT_TABLES = new Set(['photos', 'music', 'videos', 'articles', 'events']);
if (FANOUT_TABLES.has(table) && status !== 'rejected') {
  // fan-out async-ish: don't await if perf matters, but keep sync for now per design
  await fanOutNewContent({
    authorId: uploader_id,
    resourceType: table.slice(0, -1),   // 'articles' -> 'article'
    resourceId: result.lastID,
    title: req.body.title,
  });
}
```

### Step 5.3 — newsController 同样接入

`newsController.js` 的 createNews handler 里 INSERT 成功后追加：

```js
const { fanOutNewContent } = require('./notificationController');
// ...
await fanOutNewContent({
  authorId: req.user.id,
  resourceType: 'news',
  resourceId: result.lastID,
  title: req.body.title,
});
```

### Step 5.4 — 单元测试 `fanOutNewContent`

`server/src/controllers/__tests__/fanOutNewContent.test.js`:

```js
// 设置 mock db
// test cases:
//   (a) 0 粉丝 → 不调 createNotification
//   (b) 3 粉丝其中 1 banned → 调 2 次
//   (c) title null → content 包含 "（无标题）"
//   (d) 未知 resourceType → 直接 return
//   (e) nickname='夜航船', title='CUDA' → content='夜航船 发布了新文章《CUDA》'
```

具体 mock 框架按项目现有（看是否有 jest.mock('getDb')），保持风格一致。

---

## Task 6: Backend · Self-Follow Guard + getUserResources 扩展

**Files**:
- Modify: `server/src/controllers/userController.js`

**字段**: 资源表 `uploader_id`; `community_posts.author_id`。

### Step 6.1 — toggleFollowUser 加 self-follow 守卫

打开 `server/src/controllers/userController.js`，找 `toggleFollowUser`。在 handler 顶部（authenticate 之后、DB 查询之前）加：

```js
const targetId = Number(req.params.id);
const viewerId = Number(req.user.id);
if (Number.isFinite(targetId) && targetId === viewerId) {
  return res.status(400).json({ error: '不能关注自己' });
}
```

**关键**：此守卫对 POST 和 DELETE **两条**路由同时生效（因为 toggleFollowUser 共用 handler，守卫在顶部意味着自动覆盖两种方法）。

### Step 6.2 — getUserResources 扩展补 news

找 `getUserResources`（约 line 403）：

```js
const tables = ['photos', 'videos', 'music', 'articles', 'events'];
// 改为：
const tables = ['photos', 'videos', 'music', 'articles', 'events', 'news'];
```

循环体内保持原 `WHERE uploader_id = ?` 不变（news 也用 uploader_id）。

### Step 6.3 — getUserResources 追加 community_posts 查询

`getUserResources` 在 `for (const table of tables)` 循环**之后**、`allResources.sort` **之前**，追加：

```js
const { serializeCommunityPost } = require('../utils/serializeCommunityPost');

// community_posts: author_id (not uploader_id)
const viewerRole = req.user ? req.user.role : null;
const isAdmin = viewerRole === 'admin';
const isOwnerOfTarget = req.user && String(req.user.id) === String(id);

let postsQuery = `SELECT cp.*,
                    COALESCE(u.nickname, u.username) AS author_name,
                    u.avatar AS author_avatar,
                    cp.section AS type_section
                  FROM community_posts cp
                  LEFT JOIN users u ON u.id = cp.author_id
                  WHERE cp.author_id = ?`;
const postsParams = [id];

if (!isOwnerOfTarget && !isAdmin) {
  postsQuery += ` AND cp.status = 'approved' AND cp.deleted_at IS NULL`;
  // Anonymous filter: visitors 不看匿名求助贴
  postsQuery += ` AND NOT (cp.section = 'help' AND cp.is_anonymous = 1)`;
}
postsQuery += ` ORDER BY cp.id DESC`;

const postsRaw = await db.all(postsQuery, postsParams);
const viewer = req.user ? { id: req.user.id, role: req.user.role } : null;
const posts = postsRaw.map((p) => ({
  ...serializeCommunityPost(p, viewer),
  type: p.section, // 'help' or 'team'
}));
allResources = [...allResources, ...posts];
```

### Step 6.4 — 统一返回 schema 字段（加 type）

在 `for (const table of tables)` 循环内的返回行加 `type` 字段：

```js
let query = `SELECT *, '${table}' as type FROM ${table} WHERE uploader_id = ?`;
// 原本 query 已经 SELECT *，但需要把 type 显式设为单数形式（避免前端要 table 名）
// 改为：
const typeSingular = { photos: 'photo', videos: 'video', music: 'music',
                       articles: 'article', events: 'event', news: 'news' }[table];
let query = `SELECT *, ? as type FROM ${table} WHERE uploader_id = ?`;
const params = [typeSingular, id];
```

然后 `db.all(query, params)` 传入 params。

### Step 6.5 — 验证

```bash
# user B 发过 1 篇 article + 1 匿名 help
# visitor C 查看 B 的主页
curl http://localhost:3000/api/users/B_ID/resources  -H "Authorization: Bearer $C_TOKEN"
# 预期：只含 article，不含匿名 help

# B 自己查看自己主页
curl http://localhost:3000/api/users/B_ID/resources  -H "Authorization: Bearer $B_TOKEN"
# 预期：article + 匿名 help 都返回
```

---

## Task 7: Backend · Serializer Coverage Pre-commit Assertion

**Files**:
- Create: `server/scripts/check-community-post-serializer.sh`
- Modify: `package.json` (husky hook 或 CI 步骤)

### Step 7.1 — 写 grep assertion 脚本

`server/scripts/check-community-post-serializer.sh`:

```bash
#!/usr/bin/env bash
# Enforce: every raw SELECT against community_posts must be paired with serializeCommunityPost.
set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Allowlist: files that may query community_posts directly but are expected to
# pass result through serializeCommunityPost.
EXPECTED_CALLERS=(
  "src/controllers/communityController.js"
  "src/controllers/userController.js"
)

FAILURES=0
for file in $(grep -rln "FROM community_posts" src --include='*.js' || true); do
  rel="${file#$ROOT/}"
  if ! grep -q "serializeCommunityPost" "$file"; then
    echo "::error::$rel has FROM community_posts but does not import/use serializeCommunityPost"
    FAILURES=$((FAILURES + 1))
  fi
done

if [ $FAILURES -gt 0 ]; then
  echo ""
  echo "One or more files read community_posts without passing through the redaction helper."
  echo "Ensure serializeCommunityPost(post, viewer) is applied before returning to client."
  exit 1
fi

echo "✅ All community_posts read paths import serializeCommunityPost"
```

### Step 7.2 — 接入 npm script 或 husky

`server/package.json` 追加：

```json
"scripts": {
  "check:posts-serializer": "bash scripts/check-community-post-serializer.sh"
}
```

如项目已有 husky，在 `.husky/pre-commit` 里加一行 `cd server && npm run check:posts-serializer`。

### Step 7.3 — 本地跑一次

```bash
cd D:/xsh/cursor/zju/ZJU_Platform/server
chmod +x scripts/check-community-post-serializer.sh
npm run check:posts-serializer
# 应该打印 "✅ All community_posts read paths import serializeCommunityPost"
```

---

## Task 8: Frontend · Nickname Input in PublicProfile Settings

**Files**:
- Modify: `src/components/PublicProfile.jsx`

### Step 8.1 — profileData 增加 nickname 字段

找 `const [profileData, setProfileData] = useState(...)`（一般靠近 state 声明顶部），在初始化对象里追加：

```js
const [profileData, setProfileData] = useState({
  organization: user?.organization_cr || '',
  nickname: user?.nickname || '',
  // ... 其它字段保持
});
```

`useEffect` 同步 user 变化时也 sync nickname。

### Step 8.2 — 渲染 input（settings tab）

在 settings tab 的表单内（组件 `isOwner && activeTab === "settings"` 区块内、organization input 之前或之后），加：

```jsx
<div className="pt-2">
  <label className={`block text-sm font-medium mb-2 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
    {t("user_profile.fields.nickname", "显示名称")}
  </label>
  <input
    type="text"
    value={profileData.nickname}
    onChange={(e) => setProfileData({ ...profileData, nickname: e.target.value })}
    placeholder={t("user_profile.fields.nickname_placeholder", "2-20 字符，可选；不填则显示账号名")}
    maxLength={20}
    className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 ${
      isDayMode ? "bg-slate-50 border border-slate-200/80 text-slate-900"
                : "bg-black/20 border border-white/10 text-white"
    }`}
  />
  <p className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>
    {t("user_profile.fields.nickname_help", "允许中英文、数字、下划线；留空则清空。")}
  </p>
</div>
```

### Step 8.3 — handleProfileUpdate 提交 nickname

在 `handleProfileUpdate` 发的 PUT body 里加 `nickname: profileData.nickname.trim()`。

409 错误处理：

```js
try {
  await api.put(`/users/${user.id}`, body);
  toast.success(t('user_profile.saved', '已保存'));
  refetchUser();
} catch (err) {
  const status = err?.response?.status;
  const errMsg = err?.response?.data?.error || t('common.save_failed', '保存失败');
  toast.error(errMsg);   // 409 时展示 "该昵称已被使用"
}
```

### Step 8.4 — 浏览器验证

打开 `/profile/:selfId`，切到 settings tab，设 nickname 合法/空/冲突三种场景，观察 toast + header 显示是否同步刷新。

---

## Task 9: Frontend · Anonymous Checkbox in PostComposer

**Files**:
- Modify: `src/components/PostComposer.jsx`

### Step 9.1 — state 增加 isAnonymous

`PostComposer` 的 state 块追加：

```js
const [isAnonymous, setIsAnonymous] = useState(false);
```

`resetForm` 里加 `setIsAnonymous(false)`。

### Step 9.2 — handleSubmit 带 is_anonymous

找 `handleSubmit` 里组 body 的位置（约 line 142），追加：

```js
if (isHelp) {
  body.is_anonymous = isAnonymous ? 1 : 0;
}
```

组队贴（isTeam）不传。

### Step 9.3 — 在 footer 渲染 checkbox（仅 help 时）

找 `<!-- Footer -->` 区块（约 line 430）。原来是：

```jsx
<div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ...`}>
  <button ...>取消</button>
  <button ...>发布</button>
</div>
```

改为 `justify-between`，左侧加 checkbox：

```jsx
<div className={`flex items-center justify-between gap-3 px-6 py-4 border-t ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
  {isHelp ? (
    <label className={`flex items-center gap-2 text-sm cursor-pointer select-none ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
      <input
        type="checkbox"
        checked={isAnonymous}
        onChange={(e) => setIsAnonymous(e.target.checked)}
        className="w-4 h-4 accent-amber-500"
      />
      <span>{t('community.post_anonymous', '匿名发布')}</span>
    </label>
  ) : <span />}
  <div className="flex items-center gap-3">
    <button ...>取消</button>
    <button ...>发布</button>
  </div>
</div>
```

组队贴 (`isTeam`) 的 `<span />` 占位保持 flex 对齐。

### Step 9.4 — 浏览器验证

开发模式打开求助贴发帖，勾选匿名发布提交，看接口请求体是否包含 `is_anonymous: 1`；用另一账号打开该求助贴，确认看不到作者名。

---

## Task 10: Frontend · Clickable Author Avatar in CommunityDetailModal

**Files**:
- Modify: `src/components/CommunityDetailModal.jsx`

### Step 10.1 — 引入 useNavigate

顶部：

```js
import { useNavigate } from 'react-router-dom';
// 组件内:
const navigate = useNavigate();
```

### Step 10.2 — 作者区块加 onClick

找 `{item.author_avatar ? ...}` 的作者区块（约 line 224）。把 avatar + author_name 包到一个带 onClick 的 `<button>` 或 `<div role="button">`：

```jsx
const uploaderId = item?.uploader_id ?? item?.author_id;
const canGoProfile = uploaderId != null;

<div
  role={canGoProfile ? 'button' : undefined}
  tabIndex={canGoProfile ? 0 : undefined}
  onClick={canGoProfile ? () => navigate(`/profile/${uploaderId}`) : undefined}
  onKeyDown={canGoProfile ? (e) => { if (e.key === 'Enter') navigate(`/profile/${uploaderId}`) } : undefined}
  className={`flex items-center gap-3 ${canGoProfile ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-70'}`}
>
  {item.author_avatar ? (
    <img src={item.author_avatar} alt="" className="w-full h-full object-cover" />
  ) : (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${canGoProfile ? 'bg-white/10' : 'bg-white/5 text-gray-500'}`}>
      {canGoProfile ? '?' : '?'}
    </div>
  )}
  <span>{item.author_name || t('common.anonymous', '匿名用户')}</span>
</div>
```

**关键**: 匿名求助贴后端脱敏后 `uploader_id = null`，自动 `canGoProfile = false`，UI 不可点。

### Step 10.3 — 浏览器验证

- 正常 article 详情：点头像 → 跳 `/profile/:id`，页面加载 PublicProfile
- 匿名求助贴详情：头像灰色，cursor: not-allowed，点击无反应

---

## Task 11: Frontend · PublicProfile Content Tabs + Grid Cards + Route Memory

**Files**:
- Modify: `src/components/PublicProfile.jsx`

依赖 Task 6 的 `/users/:id/resources` 新 payload。

### Step 11.1 — 新增 activeContentType state + tab 定义

```js
const CONTENT_TYPES = [
  { key: 'all', label: '所有' },
  { key: 'photo', label: '图片' },
  { key: 'video', label: '视频' },
  { key: 'music', label: '音乐' },
  { key: 'article', label: '文章' },
  { key: 'event', label: '活动' },
  { key: 'news', label: '新闻' },
  { key: 'help', label: '求助' },
  { key: 'team', label: '组队' },
];

const [activeContentType, setActiveContentType] = useState('all');
```

### Step 11.2 — 聚合 counts + 过滤

```js
const contentByType = useMemo(() => {
  const map = { all: allResources };
  for (const t of CONTENT_TYPES) {
    if (t.key === 'all') continue;
    map[t.key] = allResources.filter((r) => r.type === t.key);
  }
  return map;
}, [allResources]);

const visibleContent = contentByType[activeContentType] || [];
const tabsWithCount = CONTENT_TYPES.map((t) => ({
  ...t,
  count: (contentByType[t.key] || []).length,
})).filter((t) => t.key === 'all' || t.count > 0);  // 0 条的 tab 隐藏
```

### Step 11.3 — 替换"已发布"tab 渲染为类型 tabs + grid 卡片

把原来的"已发布" tab 块换成：

```jsx
{activeTab === 'published' && (
  <>
    <div className="flex flex-wrap gap-2 mb-6">
      {tabsWithCount.map((t) => (
        <button
          key={t.key}
          onClick={() => setActiveContentType(t.key)}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
            activeContentType === t.key
              ? 'bg-indigo-600 text-white'
              : isDayMode ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-gray-300'
          }`}
        >
          {t.label} <span className="opacity-70">{t.count}</span>
        </button>
      ))}
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {visibleContent.map((item) => (
        <ProfileContentCard
          key={`${item.type}-${item.id}`}
          item={item}
          onClick={() => handleContentClick(item)}
          isDayMode={isDayMode}
        />
      ))}
    </div>
  </>
)}
```

### Step 11.4 — 写 ProfileContentCard 组件

可以就放在 `PublicProfile.jsx` 内或拆一个文件。卡片视觉保留"已发布"风格（大图 + cover + type badge + title + meta）。无 cover 的类型（help/team）用类型图标渐变占位。

```jsx
const TYPE_META = {
  photo:   { label: '图片', color: 'from-pink-500 to-rose-400', icon: '📷' },
  video:   { label: '视频', color: 'from-emerald-500 to-teal-400', icon: '📹' },
  music:   { label: '音乐', color: 'from-purple-500 to-fuchsia-400', icon: '🎵' },
  article: { label: '文章', color: 'from-orange-500 to-amber-400', icon: '📝' },
  event:   { label: '活动', color: 'from-blue-500 to-cyan-400', icon: '🎪' },
  news:    { label: '新闻', color: 'from-gray-500 to-slate-400', icon: '📰' },
  help:    { label: '求助', color: 'from-yellow-500 to-amber-400', icon: '💬' },
  team:    { label: '组队', color: 'from-indigo-500 to-violet-400', icon: '👥' },
};

function ProfileContentCard({ item, onClick, isDayMode }) {
  const meta = TYPE_META[item.type] || TYPE_META.article;
  const cover = item.cover || item.url || item.thumbnail;
  const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';
  return (
    <div onClick={onClick} className="group cursor-pointer rounded-2xl overflow-hidden border border-white/10 hover:border-orange-400/40 transition bg-white/5">
      <div className="aspect-[3/4] relative">
        {cover ? (
          <img src={cover} alt={item.title || ''} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-60 flex items-center justify-center text-5xl`}>
            {meta.icon}
          </div>
        )}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-bold bg-black/60 backdrop-blur text-white">
          {meta.label}
        </div>
        {!!item.likes && <div className="absolute top-3 right-3 px-2 py-1 rounded-md text-[11px] bg-black/60 backdrop-blur text-white">♥ {item.likes}</div>}
      </div>
      <div className="px-3 py-2 bg-black/50 backdrop-blur">
        <div className="text-sm font-semibold line-clamp-1">{item.title || '(无标题)'}</div>
        <div className="text-[10px] text-gray-400 mt-1">{dateStr}</div>
      </div>
    </div>
  );
}
```

### Step 11.5 — handleContentClick 带路由 state

```js
const handleContentClick = (item) => {
  const path = {
    photo: `/gallery?id=${item.id}`,
    video: `/videos?id=${item.id}`,
    music: `/music?id=${item.id}`,
    article: `/articles?id=${item.id}&tab=tech`,
    event: `/events?id=${item.id}`,
    news: `/news?id=${item.id}`,
    help: `/articles?tab=help&post=${item.id}`,
    team: `/articles?tab=team&post=${item.id}`,
  }[item.type];
  if (!path) return;
  navigate(path, {
    state: {
      fromUserProfile: {
        userId: user?.id,
        scrollY: window.scrollY,
        contentTab: activeContentType,
      },
    },
  });
};
```

### Step 11.6 — 路由返回时恢复

PublicProfile 组件 mount 或 `location.state` 变化时：

```js
useEffect(() => {
  const state = location.state?.fromUserProfile;
  if (state && String(state.userId) === String(user?.id)) {
    if (state.contentTab) setActiveContentType(state.contentTab);
    if (typeof state.scrollY === 'number') {
      setTimeout(() => window.scrollTo(0, state.scrollY), 0);
    }
  }
}, [location.state, user?.id]);
```

### Step 11.7 — 浏览器验证

- 打开 B 的主页 → 看到 tabs + grid
- 点图片 → 跳 gallery 详情 → 返回 → 主页 tab 保持选中 + 滚动位置保持
- B 本人看自己主页：匿名求助贴出现在"求助" tab；访客：不出现

---

## Task 12: Frontend · NotificationCenter new_content Routing

**Files**:
- Modify: `src/components/NotificationCenter.jsx`

### Step 12.1 — 扩展 buildNotificationTargetPath

找 `buildNotificationTargetPath` 函数（约 line 15）。在现有 type switch 里新增 `new_content`：

```js
const RESOURCE_PATH = {
  article: 'articles',
  photo: 'gallery',
  music: 'music',
  video: 'videos',
  event: 'events',
  news: 'news',
};

// 在函数里:
if (notification?.type === 'new_content') {
  const resourceType = notification?.related_resource_type;
  const resourceId = notification?.related_resource_id;
  const base = RESOURCE_PATH[resourceType];
  if (!base || !resourceId) {
    console.warn('[Notification] Unknown resource type:', resourceType);
    return null;
  }
  return `/${base}?id=${resourceId}`;
}
```

### Step 12.2 — XSS 防御审查（CSO-S2）

```bash
# 跑 grep 确认 NotificationCenter + 所依赖组件都没 dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" D:/xsh/cursor/zju/ZJU_Platform/src/components/NotificationCenter.jsx
# 预期：无输出
```

若有命中，替换为安全的 React 文本节点（`{content}` 而非 `dangerouslySetInnerHTML={{__html: content}}`）。

### Step 12.3 — 浏览器验证

关注 B，用 B 的账号发一篇 article，等≤60s，铃铛红点刷新，点击通知 → 跳 article 详情。

---

## Task 13: E2E Smoke + 文档 + 清理

**Files**:
- Create: `e2e/specs/identity-follow.spec.js`
- Modify: `COMMUNITY_DEV.md`

### Step 13.1 — 写 E2E smoke（按 tasks.md section 11 的 7 个场景）

参考项目现有 playwright 配置（`playwright.config.js`）和既有 spec（e2e 目录下的 *.spec.js），新建：

```js
// e2e/specs/identity-follow.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Identity & Follow Notifications', () => {
  test('new user publishes article without nickname', async ({ page }) => {
    // 注册 → 发 article → 另一账号看作者显示为 username
  });
  test('nickname collision returns 409', async ({ page }) => {});
  test('follow triggers new_content notification within 60s', async ({ page }) => {});
  test('anonymous help post does not trigger notification', async ({ page }) => {});
  test('self-follow rejected 400', async ({ request }) => {});
  test('detail avatar click navigates to profile, back restores', async ({ page }) => {});
  test('profile tab memory: change tab + scroll + detail back', async ({ page }) => {});
});
```

### Step 13.2 — 文档更新

`COMMUNITY_DEV.md` 追加小节：

```markdown
### 身份显示与关注通知 (2026-04-18)

- 所有资源控制器用 COALESCE(nickname, username) 作为 author_name
- users.nickname 全局唯一（partial unique index，NULL 不参与）
- community_posts.is_anonymous 仅对 section=help 生效
- 6 种资源类型 create 时 fan-out 通知给粉丝（新 type='new_content'）
- 所有 community_posts 读路径 MUST 过 serializeCommunityPost helper，
  pre-commit script scripts/check-community-post-serializer.sh 做 CI 防护
```

### Step 13.3 — 清理空壳 change

```bash
cd D:/xsh/cursor/zju/ZJU_Platform
# 先确认目录确实只有 .openspec.yaml
ls -la openspec/changes/tech-article-author-identity/
# 若只有 .openspec.yaml 则安全删除
rm -rf openspec/changes/tech-article-author-identity
```

### Step 13.4 — 全量验证

```bash
cd D:/xsh/cursor/zju/ZJU_Platform
npm run lint
npm run build
cd server && npm run check:posts-serializer
# 若有 jest：server npm test
cd .. && npm run test:e2e:smoke
```

---

## Risks / 注意事项（从四视角审视汇总）

- **字段命名**（Eng-R3）: 资源表用 `uploader_id`，`community_posts` 用 `author_id`。每次写 SQL 前先核对字段
- **getFollowingFeed 不动**（Eng-R1）: 该函数已有 `author_nickname` / `author_username` 分字段，前端已依赖，**不要**顺手改成 `author_name`
- **serializer coverage**（Eng-R2 + CSO-S1）: 所有 `FROM community_posts` 的读路径必须过 helper，pre-commit grep 做 CI 防线
- **XSS**（CSO-S2）: NotificationCenter 渲染不用 `dangerouslySetInnerHTML`；Task 12.2 有 grep 校验
- **self-follow**（CSO-S3）: toggleFollowUser 顶部守卫同时拦 POST 和 DELETE
- **nickname 409 文案**（CSO-S4）: 固定"该昵称已被使用"，不暴露占用者 id/username
- **fan-out 状态过滤**（CSO-S5）: SQL JOIN users 排除 banned + deleted_at
- **大 V 阻塞风险**: 当前粉丝规模可控；如 p99 > 1s 再拆异步队列
- **数据库回滚**: SQLite 不支持 DROP COLUMN，回滚依赖 Task 0.2 的 DB 备份

## Done Criteria

- 所有 Task 的 Step 都完成，CI 全绿（lint + build + check:posts-serializer + e2e smoke）
- tasks.md 的 62 个 checkbox 全勾
- `openspec validate community-identity-and-follow-notifications` 通过
- 手动过一遍 tasks.md Section 11 的 7 个 smoke 用例
