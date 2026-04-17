## Context

`notifications` 表当前真实列：`id, user_id, type, title, message, data, is_read, created_at` —— **没有 `content` 列**。但 `createNotification` 里有一条 `if (columns.has('content'))` 的 INSERT 分支，预期写入 `content + related_resource_id + related_resource_type` 三个**根本不存在**的列。这条分支从未被执行，是 dead code。所有真实通知走的是 `(title, message, data)` 路径，其中 `data` 是 JSON 字符串，容纳 `related_resource_id / related_resource_type`。

`normalizeNotificationRow` 做 `content ?? message ?? title` 三级兜底读，是因为开发者预期 content 列会存在，但从未落实到 schema 里。

本轮目标：把这条"代码预期了却没真正落实"的事情做完 —— 加 `content` 列、回填、把写入统一走 content、清除 dead code。

本轮目标：把"通知正文"这个概念的真相源收拢到 `content` 列。约束：**必须用 git tag 作为唯一回滚手段**（用户明确要求，不做 db backup 之外的其他措施），因此迁移必须非破坏性。

## Key Decisions

### 1. 软迁移 vs 硬迁移

选软迁移 —— `ADD COLUMN content` + 回填，**不** `DROP COLUMN title, message`。

- 硬迁移（一步到位删旧列）代价：
  - SQLite 老版本不支持 `DROP COLUMN`，需要"重建表 + 复制数据"套路，风险高
  - 一旦 revert 代码，旧 controller 找不到 `title` / `message` 列，服务启动就崩
  - git tag 救不了已执行的 DDL
- 软迁移代价：
  - 表日后会有两个半废字段占位
  - 需要下一轮单独处理（已在 tasks 4.1 记录 tech-debt）

软迁移让 `git reset --hard pre-msg-refactor-v1` 直接可行 —— 代码回滚后旧 controller 读 `message` / `title` 依然有数据（回填不破坏旧列）。

### 2. 保留 normalizeNotificationRow 的兜底读

即便所有通知都写进 `content`，`normalizeNotificationRow` 仍保留 `content ?? message ?? title` 的读顺序。

理由：
- **数据迁移窗口保护**：回填 SQL 在服务启动时跑；若某条通知在迁移未完成时被读，兜底读能保证旧数据可见
- **回滚保护**：若回滚到 tag，然后又重新 forward 到本版本，兜底能覆盖夹缝期写入的旧格式数据
- 代价几乎为零 —— 多两个 `||` 运算符

兜底读会在下一轮"删除旧列"的 change 里一起下掉，不是永久存在。

### 3. 不动 createNotification 的调用点

`favoriteController` / `commentController` / `communityController` / `userController` 里调用 `createNotification` 的地方**不改**。

- 函数签名保持不变：`createNotification(userId, type, content, resourceId, resourceType)`
- 本轮只改 `createNotification` 实现内部：删除 dead-code 分支，单路径写入 `content` 列；`resourceId / resourceType` 继续序列化进 `data` JSON（维持现状）
- 任何"通知模板化"（将拼字符串改成 `createNotificationByEvent`）是下一轮独立的改动

### 4. related_resource_id / related_resource_type 不升级为列

本轮**不**把这两个字段从 `data` JSON 里抽成独立列。

- 当前 `normalizeNotificationRow` 已经通过 `data.related_resource_id ?? data.resourceId` 兜底从 JSON 解出
- 前端消费端不感知存储位置，契约稳定
- 把 JSON 字段扁平化为列是一个独立的数据模型演进，不是本轮范围（YAGNI）

### 5. 迁移脚本的幂等性

迁移必须能被 `runMigrations.js` 重复调用而不出错、不重复回填。实现：

- `ADD COLUMN content` 前先查 `PRAGMA table_info(notifications)`，有 `content` 列就跳过
- 回填 SQL 带 `WHERE content IS NULL OR content = ''`，已回填的行不会被再次覆盖

## Risks / Trade-offs

| 风险 | 概率 | 缓解 |
|---|---|---|
| 回填 SQL 误覆盖已有 `content`（比如历史上某些行三列都有值） | 低 | `WHERE content IS NULL OR content = ''` 挡住 |
| `createNotification` 改成单路径后，某处旧调用传了 `title` 参数（没传 `content`）导致新通知正文为空 | 中 | tasks 3.3 手动触发三种通知验证；同时检查调用点有没有人还在传 `title` |
| 回滚后旧代码读到的仍然是空列（迁移不走回头路） | 低 | 回填不删旧列，`message` / `title` 仍保有历史值；tasks 3.5 做一次回滚演练 |
| SQLite WAL 文件未 checkpoint 导致 tag 回滚后数据库状态不一致 | 低 | tasks 0.2 做 `.sqlite` 文件备份作为第二层保险 |

## Out of Scope

- 前端 `NotificationCenter` 的 unreadCount 双事实源（P2，下一轮）
- 通知模板化 `createNotificationByEvent`（P2，后续）
- `markAsRead / deleteNotification` 的 `id === 'all'` 分支合并（P3，择机）
- 删除 `title` / `message` 旧列（下一轮 `drop-legacy-notification-columns`）
- 收藏系统任何改动（第二轮 brainstorm 单独立项）
