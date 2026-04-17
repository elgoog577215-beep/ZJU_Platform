# notifications-persistence Specification

## Purpose
TBD - created by archiving change unify-notification-content. Update Purpose after archive.
## Requirements
### Requirement: Notification Content Single Source

通知正文在服务端持久化层 SHALL 只通过 `notifications.content` 列表达。

- `createNotification` 写入时 MUST 填充 `content` 列，并且 MUST NOT 写入 `title` 或 `message` 列。
- `content` 列 MAY 为空字符串或 NULL（当通知无正文时），其他字段保持独立（如 `type`、`related_resource_*`）。

#### Scenario: Creating a new notification

- **GIVEN** 一次 `createNotification({ type: 'favorite', user_id, content, related_resource_id, related_resource_type })` 调用
- **WHEN** 记录被写入 `notifications` 表
- **THEN** 新行的 `content` 列等于传入的 `content` 值；`title` 和 `message` 列为 NULL 或保持默认空值

#### Scenario: Reading a notification after migration

- **GIVEN** 一条通过新路径写入的通知（`content` 有值，`title` / `message` 为空）
- **WHEN** 前端调用 `GET /notifications` 拉取
- **THEN** 响应中的通知对象含有从 `content` 列读取的正文文本

### Requirement: Legacy Column Fallback Read

在本轮软迁移期间，`normalizeNotificationRow` SHALL 对 `title` / `message` 列提供兜底读，以覆盖回滚、并发写入、迁移窗口等边缘场景。

- 读取优先级 MUST 为：`content` > `message` > `title`
- 该兜底在下一轮"删除旧列"的 change 中一并清除，不是永久行为

#### Scenario: Reading a legacy notification row

- **GIVEN** 一条迁移前的历史通知（`content` 为 NULL，`message` 有值）
- **WHEN** `normalizeNotificationRow` 处理该行
- **THEN** 返回对象的正文字段等于 `message` 列的值

### Requirement: Idempotent Backfill Migration

迁移脚本 SHALL 能被重复执行而不破坏已有数据、不重复回填。

- `ADD COLUMN content` 前 MUST 检查 `PRAGMA table_info(notifications)`，已有 `content` 列则跳过
- 回填 SQL MUST 仅针对 `content IS NULL` 的行

#### Scenario: Running migrations twice

- **GIVEN** `runMigrations.js` 已经跑过一次（`content` 列已添加并完成回填）
- **WHEN** 服务重启，`runMigrations.js` 再次运行
- **THEN** 无 SQL 报错；`notifications.content` 列的值与第一次运行后完全一致（未发生二次覆盖）

### Requirement: Git-Tag-Based Rollback Safety

本轮迁移 SHALL 保证"回滚到 `pre-msg-refactor-v1` tag 后服务仍可启动并正确读出历史通知"。

- 迁移脚本 MUST NOT 执行 `DROP COLUMN title` 或 `DROP COLUMN message`
- 迁移脚本 MUST NOT 清空 `title` / `message` 的既有数据
- 完整回滚路径 SHALL 包含两步：`git reset --hard pre-msg-refactor-v1` + `cp server/database.sqlite.bak.pre-msg-refactor-v1 server/database.sqlite`（/execute 阶段发现：仅代码回滚时旧 controller 的 dead INSERT 分支会激活，导致新通知写入静默失败）

#### Scenario: Rollback drill

- **GIVEN** 本轮迁移已执行、新通知已写入
- **WHEN** 代码 `git reset --hard pre-msg-refactor-v1` 后重启服务
- **THEN** 旧 controller 能通过 `message` / `title` 列读出迁移前与本轮写入的所有通知正文；服务无启动错误

