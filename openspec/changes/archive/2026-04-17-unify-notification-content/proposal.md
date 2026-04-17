## Why

当前 `notifications` 表实际只有 `title / message / data` 三列在用（真实 schema：`id, user_id, type, title, message, data, is_read, created_at`）。`createNotification` 里有一条"if content 列存在就写 content"的 dead-code 分支 —— 这条分支从来没有被执行过，因为 `content` 列根本没在 schema 里。`normalizeNotificationRow` 依然做 `content ?? message ?? title` 三级兜底读，这反映出开发者预期了 `content` 列但没落实。

结果：
- 代码里写着 "content 是通知正文的主字段"，实际存储里 content 列根本不存在
- 新增通知类型的开发者读代码会误解 schema
- 这条 dead-code 分支永远不会被执行，但它掩盖了"notifications 正文没有单一事实源"这个问题

这不影响用户可见功能，是一次纯内部数据模型收敛：把代码的预期和实际 schema 对齐 —— 落实 `content` 列、把写入统一到 `content`、清除 dead code。

## What Changes

- 在 `notifications` 表上新增 `content TEXT` 列作为正文单一来源。
- 新增数据回填迁移：`UPDATE notifications SET content = COALESCE(message, title) WHERE content IS NULL`，对历史行做一次性修复。
- `createNotification` 删除 dead-code 分支，单路径写入 `content` 列（`related_resource_id / type` 继续序列化进 `data` JSON，维持现状）。
- 顺手清理：删除 `notificationColumnCache` 模块级缓存和 `getNotificationColumns` 辅助函数（迁移后不再需要表结构探测）。
- `normalizeNotificationRow` 读取优先级保持 `content > message > title`（兜底在过渡期保护回滚窗口）。
- **不删除**旧列 `title` / `message`（留到下一轮）。
- **不升级** `related_resource_id / type` 为独立列（本轮范围外）。
- **不触**前端 `NotificationCenter` 和其他 controller 里的 `createNotification` 调用点（调用签名不变）。

## Capabilities

### Modified Capabilities
- `notifications-persistence`: 通知正文的写入与读取路径在服务端层面统一到 `content` 列。

### New Capabilities
- None.

## Impact

- 受影响后端：
  - `server/src/config/runMigrations.js` — 增加 `content` 列 + 一次性回填
  - `server/src/controllers/notificationController.js` — `createNotification` 单路径化、`normalizeNotificationRow` 读顺序调整
- 受影响前端：无（API 返回的 `content` 字段语义不变）
- 数据库：**非破坏性变更**，旧列保留
- 回滚点：动工前打 `git tag pre-msg-refactor-v1`；回滚只需 `git reset --hard pre-msg-refactor-v1`，无需数据库恢复（旧列还在）
- 遗留 tech-debt：待确认本轮无异常后，单独开一轮 `drop-legacy-notification-columns` 下掉 `title` / `message`
