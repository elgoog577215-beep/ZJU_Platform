## 0. Rollback Checkpoint

- [ ] 0.1 在动工前打 tag：`git tag pre-msg-refactor-v1`，作为整轮改动的回滚锚点。
- [ ] 0.2 备份当前 `server/database.sqlite` 到 `server/database.sqlite.bak.pre-msg-refactor-v1`（即使软迁移不丢数据，迁移脚本本身也可能写出非预期数据 — 多一层兜底）。

## 1. Schema Migration

- [ ] 1.1 在 `runMigrations.js` 中检测 `notifications` 表，若无 `content` 列则 `ALTER TABLE notifications ADD COLUMN content TEXT`。
- [ ] 1.2 写一条 idempotent 的回填语句：`UPDATE notifications SET content = COALESCE(content, message, title) WHERE content IS NULL OR content = ''`。
- [ ] 1.3 迁移必须在原有的迁移序列中幂等执行（重复跑不出错、不重复回填）。

## 2. Backend Controller Changes

- [ ] 2.1 `createNotification` 改为单路径 INSERT：`INSERT INTO notifications (user_id, type, content, data) VALUES (?, ?, ?, ?)`；`data` 继续序列化 `{related_resource_id, related_resource_type}` JSON（维持现状）。
- [ ] 2.2 删除 `createNotification` 里 `if (columns.has('content'))` 的 dead-code 分支，以及 `title`/`message` 写入路径。
- [ ] 2.3 删除模块级 `notificationColumnCache`（line 3）和 `getNotificationColumns` 函数（line 5-10），迁移后不再需要运行时表结构探测。
- [ ] 2.4 `normalizeNotificationRow` 读取顺序保持 `content ?? message ?? title`（过渡期保护，不改）。
- [ ] 2.5 确认 `getNotifications` / `markAsRead` / `deleteNotification` 接口返回字段结构不变。

## 3. Verification

- [ ] 3.1 迁移脚本幂等性：手动跑两次迁移，断言无报错、`content` 列无重复回填。
- [ ] 3.2 历史数据完整性：迁移前后 `SELECT id, content, message, title FROM notifications` 的行数一致，且 `content` 列覆盖率达 100%（除空正文的通知外）。
- [ ] 3.3 新通知写入路径：手动触发三种通知（收藏他人内容、评论他人内容、被关注），断言新行的 `content` 列有值、`message` / `title` 列为空。
- [ ] 3.4 前端展示：登录 `seed_admin` 打开铃铛 + 个人中心"消息"tab，确认旧通知与新通知的展示文本一致。
- [ ] 3.5 回滚演练：在本地把代码 `git reset --hard pre-msg-refactor-v1`，启动服务，确认旧 controller 能继续读出迁移后回填的数据（因 `message` / `title` 列未删）。

## 4. Follow-up Tech Debt

- [ ] 4.1 在 `codingsys-brain/` 记录"下一轮开 `drop-legacy-notification-columns` 删除 `title` / `message`"的 tech-debt 条目（待本轮在生产无异常跑满一周后再动）。

## 5. Server Deployment Verification（部署时执行，不在本地）

- [ ] 5.1 部署前在服务器 dump 一次 `PRAGMA table_info(notifications)` 到 `server/database.schema.pre-deploy.json`。
- [ ] 5.2 部署后在服务器启动日志中确认看到 `✅ Added notifications.content column` + `✅ Notifications content column backfilled`。
- [ ] 5.3 部署后抽查：`SELECT COUNT(*) FROM notifications WHERE content IS NULL AND (message IS NOT NULL OR title IS NOT NULL)` 必须为 0。
- [ ] 5.4 若 5.2 / 5.3 失败 → 不动服务器 DB，`git reset --hard pre-msg-refactor-v1` 重启即可（软迁移保证旧代码读 `message`/`title` 仍工作）。
- [ ] 5.5 可选：部署后再 dump 一次 schema，diff 前后两份 json，确认"只多出 content 列，其它零改动"。

---

> Plan: docs/superpowers/plans/2026-04-17-unify-notification-content.md
