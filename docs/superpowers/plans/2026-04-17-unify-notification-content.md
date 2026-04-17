---
openspec-change: unify-notification-content
created: 2026-04-17
---

# Plan: Unify Notification Content Column

## Overview

把 `notifications` 表的通知正文收拢到 `content` 单列，清除 `createNotification` 里的 dead-code 分支。软迁移（旧列保留）+ git tag 作回滚锚点。

**Scope hard limits**:
- 只触 2 个文件：`server/src/config/runMigrations.js`、`server/src/controllers/notificationController.js`
- 不改前端
- 不动 `createNotification` 的调用方
- 不 DROP 任何列

## Task 0: Rollback Checkpoint

**Files** (Modify): 无代码改动 —— 本步只打 tag + 备份数据库。

### Step 0.1 — 打 git tag

```bash
cd D:/xsh/cursor/zju/ZJU_Platform
git status      # 确认工作区干净，未 commit 的变动先提交或 stash
git tag pre-msg-refactor-v1
git tag --list pre-msg-refactor-v1   # 确认 tag 已创建
```

若工作区不干净，**停止**并询问用户。

### Step 0.2 — 数据库快照备份

```bash
cp server/database.sqlite server/database.sqlite.bak.pre-msg-refactor-v1
ls -la server/database.sqlite.bak.pre-msg-refactor-v1
```

---

## Task 1: Schema Migration (Add content Column + Backfill)

**Files**:
- Modify: `server/src/config/runMigrations.js`

### Step 1.1 — 在 notifications 表 CREATE 后追加迁移块

在 `runMigrations.js` 的 `CREATE TABLE IF NOT EXISTS notifications ... ✅ Notifications table ready` 紧随其后（第 140 行 `}` 之后、下一个 `try` 块之前），插入一段新的迁移块：

```js
  // Migration: Unify notification content to single `content` column.
  // See openspec/changes/unify-notification-content/ for full context.
  try {
    const notifInfo = await db.all('PRAGMA table_info(notifications)');
    const notifColumns = new Set(notifInfo.map((c) => c.name));
    if (!notifColumns.has('content')) {
      await db.exec(`ALTER TABLE notifications ADD COLUMN content TEXT`);
      console.log('✅ Added notifications.content column');
    }
    // Idempotent backfill: only fill rows where content is unset.
    // COALESCE order matches normalizeNotificationRow: message > title.
    await db.run(`
      UPDATE notifications
      SET content = COALESCE(message, title)
      WHERE content IS NULL
    `);
    console.log('✅ Notifications content column backfilled');
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (notifications.content):', err.message);
    }
  }
```

**Design notes**:
- 把这段放在 `notifications` 表创建之后、其他表创建之前，保证先建表后加列
- `PRAGMA table_info` 检查保证幂等（重复跑不重复 ADD）
- 回填 `WHERE content IS NULL` 避免覆盖新写入的 content
- 空字符串不被认为"未回填"，WHERE 只挡 NULL（设计决策：若某条通知正文本就是空字符串，无需回填占位）

### Step 1.2 — 手动幂等性验证

启动后端，看日志应当输出两次：
```
✅ Added notifications.content column           （首次）
✅ Notifications content column backfilled      （首次）
✅ Notifications content column backfilled      （第二次启动 — "Added" 不再出现）
```

```bash
cd D:/xsh/cursor/zju/ZJU_Platform
# 停掉运行中的后端后执行以下验证
node -e "const {getDb}=require('./server/src/config/db');(async()=>{const db=await getDb();const info=await db.all('PRAGMA table_info(notifications)');console.log('columns:',info.map(c=>c.name).join(', '));const row=await db.get('SELECT COUNT(*) as total, COUNT(content) as with_content FROM notifications');console.log('rows:',row);process.exit(0);})()"
```

**AC2 check**: `with_content` 应等于 `total`（或仅差空正文的行数）。

---

## Task 2: Controller Refactor (Single-Path INSERT + Dead Code Removal)

**Files**:
- Modify: `server/src/controllers/notificationController.js`

### Step 2.1 — 替换文件头部 import/helper 区域

当前（line 1-10）：
```js
const { getDb } = require('../config/db');

let notificationColumnCache = null;

const getNotificationColumns = async (db) => {
    if (notificationColumnCache) return notificationColumnCache;
    const info = await db.all('PRAGMA table_info(notifications)');
    notificationColumnCache = new Set(info.map((col) => col.name));
    return notificationColumnCache;
};
```

**替换为**：
```js
const { getDb } = require('../config/db');
```

删除 `notificationColumnCache` 和 `getNotificationColumns` —— 迁移后 `content` 列一定存在，无需运行时探测。

### Step 2.2 — 重写 createNotification 为单路径

当前（line 33-59）整块替换为：

```js
const createNotification = async (userId, type, content, resourceId = null, resourceType = null) => {
    try {
        const db = await getDb();
        const payload = JSON.stringify({
            related_resource_id: resourceId,
            related_resource_type: resourceType,
        });
        await db.run(
            'INSERT INTO notifications (user_id, type, content, data) VALUES (?, ?, ?, ?)',
            [userId, type, content, payload]
        );
    } catch (error) {
        console.error('[Notification] Create error:', error);
    }
};
```

**Design notes**:
- 签名保持不变：`(userId, type, content, resourceId, resourceType)` —— 调用方（favoriteController 等）一个字都不用改
- `data` JSON 继续承载 `related_resource_id / related_resource_type`，维持现状
- 不再写 `title` / `message` 列 —— 新通知这两列保持 NULL
- 不再有 `columns.has(...)` 运行时探测

### Step 2.3 — normalizeNotificationRow 保持不变

line 22-31 的 `normalizeNotificationRow` 一行不改。`content || message || title` 的兜底读是过渡期保护，设计故意保留。

### Step 2.4 — 验证其它 handler 未受影响

对 `getNotifications` / `markAsRead` / `deleteNotification`（line 61-128）做视觉复核：不得有任何引用 `getNotificationColumns` 或 `notificationColumnCache` 的地方。若 grep 有残留引用，编辑错了 —— 回去补。

```bash
cd D:/xsh/cursor/zju/ZJU_Platform
grep -n "notificationColumnCache\|getNotificationColumns" server/src/controllers/notificationController.js
# 期望：no matches
```

---

## Task 3: Verification

**Files**: 无代码改动。

### Step 3.1 — 启动后端，确认迁移日志

```bash
cd D:/xsh/cursor/zju/ZJU_Platform
npm run dev
# 日志中应看到：
#   ✅ Notifications table ready
#   ✅ Added notifications.content column        (首次) 或跳过 (后续)
#   ✅ Notifications content column backfilled
```

### Step 3.2 — AC1 + AC2 + AC3 数据库断言

```bash
node -e "
const {getDb}=require('./server/src/config/db');
(async()=>{
  const db=await getDb();
  const info=await db.all('PRAGMA table_info(notifications)');
  const cols=info.map(c=>c.name);
  console.log('AC1 columns:', cols.join(', '));
  console.assert(cols.includes('content'), 'FAIL: content column missing');

  const row=await db.get('SELECT COUNT(*) as total, COUNT(content) as with_content, COUNT(message) as with_message, COUNT(title) as with_title FROM notifications');
  console.log('AC2 coverage:', row);
  console.assert(row.with_content >= Math.min(row.with_message, row.with_title), 'FAIL: backfill incomplete');

  process.exit(0);
})();
"
```

### Step 3.3 — AC4 新通知写入路径（黑盒触发）

在浏览器中用 `seed_admin` 登录，对 `demo_user` 的任意一张照片点一个收藏（`FavoriteButton`）。这会触发 `favoriteController.toggleFavorite → createNotification`。

然后查库：
```bash
node -e "
const {getDb}=require('./server/src/config/db');
(async()=>{
  const db=await getDb();
  const row=await db.get('SELECT id, type, content, message, title FROM notifications ORDER BY id DESC LIMIT 1');
  console.log('latest notification:', row);
  console.assert(row.content && row.content.length > 0, 'FAIL: content empty');
  console.assert(row.message === null, 'FAIL: message should be NULL for new row');
  console.assert(row.title === null, 'FAIL: title should be NULL for new row');
  process.exit(0);
})();
"
```

### Step 3.4 — AC5 前端展示验证

浏览器中以 `demo_user` 身份登录，打开铃铛（Navbar.jsx:329 的 NotificationCenter）。
- 应看到刚才 seed_admin 收藏产生的通知条
- 通知正文应该读起来通顺，不是空的或带奇怪字符
- 若能同时看到旧通知（迁移前的），它们的文本也应正常显示（来自回填的 content 列）

### Step 3.5 — AC6 回滚演练（dry-run）

**不真的 reset**，只检查"如果 reset 会不会炸"：

```bash
cd D:/xsh/cursor/zju/ZJU_Platform
# 看 pre-refactor 版本对 notifications 的 SELECT 是不是还能跑
git show pre-msg-refactor-v1:server/src/controllers/notificationController.js | grep -A 3 "SELECT"
# 检查旧代码 SELECT 的列在新表里还存在（预期：是的，只是多了 content 列，SELECT * 继续工作）
```

关键断言：迁移只 ADD COLUMN，旧代码 `SELECT *` 会多一个 `content` 列，但 `normalizeNotificationRow` 忽略未知字段（实际上老版 normalize 已经在读 `row.content` 了），无硬性 break。

---

## Task 4: Brain Tech-Debt Entry

**Files**:
- Create: `C:/Users/xsh/.claude/codingsys-brain/decisions/003-notification-content-column-soft-migration.md`

### Step 4.1 — 写一条 decision 记录

```markdown
# 003: Notifications 表 content 列软迁移（保留旧列）

## 状态
Accepted · 2026-04-17

## 上下文
notifications 表历史上积累了 title/message/data 三列，代码里还有一条指向不存在的 content 列的 dead-code 分支。要收拢到单一 `content` 列，且用户明确要求"只靠 git tag 回滚"。

## 决策
软迁移：ADD COLUMN content + 回填 COALESCE(message, title)，但**不 DROP** 旧列 title / message。createNotification 改为单路径只写 content。

## 理由
- git tag 能回滚代码，不能回滚已执行的 DROP COLUMN
- SQLite 的 DROP COLUMN 需要重建表，风险高
- 保留旧列让 `git reset --hard pre-msg-refactor-v1` 后旧代码读 message/title 仍能看到数据
- 代价：表多出两列半废字段，下一轮单独清理

## 后续
- 生产跑满一周无异常 → 开 `drop-legacy-notification-columns` 把旧列和 normalize 的兜底读一起下掉
- 若期间发现新 bug → 回滚 tag，分析再做
```

---

## Task 5: Server Deployment Verification Checklist

**Files**: 无代码改动 —— 本步只是部署到服务器时的操作清单。

**前提**：本地 `database.sqlite` 是独立 dev 库（`.gitignore` 排除 `*.sqlite*`），**不会**随 git push 带到服务器。服务器有自己独立的 DB。

### Step 5.1 — 部署前在服务器留存 schema 快照

```bash
# 在服务器项目目录下执行
node -e "const {getDb}=require('./server/src/config/db');(async()=>{const db=await getDb();const info=await db.all('PRAGMA table_info(notifications)');console.log(JSON.stringify(info,null,2));process.exit(0);})()" > server/database.schema.pre-deploy.json
```

留作部署前后对比基线。

### Step 5.2 — 部署后确认迁移日志

服务器启动日志必须包含：
```
✅ Added notifications.content column           （首次部署）
✅ Notifications content column backfilled
```

后续重启只应看到 `✅ Notifications content column backfilled`（`Added` 不再出现 —— 幂等保证）。

### Step 5.3 — 部署后抽查回填覆盖率

```bash
node -e "
const {getDb}=require('./server/src/config/db');
(async()=>{
  const db=await getDb();
  const leak=await db.get(\`
    SELECT COUNT(*) as c FROM notifications
    WHERE content IS NULL
      AND (message IS NOT NULL OR title IS NOT NULL)
  \`);
  console.log('unbackfilled rows (expect 0):', leak.c);
  console.assert(leak.c === 0, 'FAIL: some rows have legacy text but no content');
  process.exit(0);
})();
"
```

`leak.c` 必须为 0 —— 存在 `message` 或 `title` 的行都已回填到 `content`。

### Step 5.4 — 服务器端异常回滚路径

若 Step 5.2 或 5.3 失败：

1. **不动服务器 DB** —— 软迁移只 ADD COLUMN，不破坏旧数据
2. `git reset --hard pre-msg-refactor-v1` + 重启服务
3. 旧 controller 读 `message` / `title` 继续工作（迁移过的 `content` 列被旧代码忽略）
4. 回报现象到 issue，分析后再做下一次尝试

### Step 5.5 — 服务器端 schema 对比验证（可选但推荐）

```bash
node -e "const {getDb}=require('./server/src/config/db');(async()=>{const db=await getDb();const info=await db.all('PRAGMA table_info(notifications)');console.log(JSON.stringify(info,null,2));process.exit(0);})()" > server/database.schema.post-deploy.json

diff server/database.schema.pre-deploy.json server/database.schema.post-deploy.json
```

diff 结果应当**只有一处新增**：`content TEXT`。其它列零改动。若有意外改动，停下排查。

---

## Execution Strategy

- **文件数**：2 个
- **策略**：Direct（当前会话直接做）
- **顺序**：Task 0 → 1 → 2 → 3 → 4（严格线性；Task 0 的 tag 必须先打）
- **Task 5** 是**部署时**的操作清单，不是本地执行的 Task
- **中断条件**：任一 Step 的 AC 不通过就停，不继续往后做

## Out of Scope (Do Not Do)

- ❌ 不 DROP title / message 列
- ❌ 不改前端 NotificationCenter
- ❌ 不改 favoriteController / commentController 等 createNotification 调用点
- ❌ 不把 related_resource_id / type 从 data JSON 提到独立列
- ❌ 不顺手做 P2 unreadCount 去重、通知模板化等下一轮的事
