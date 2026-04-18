## 1. 数据库迁移

- [x] 1.1 在 `server/src/config/runMigrations.js` 追加 `ALTER TABLE community_posts ADD COLUMN is_anonymous BOOLEAN DEFAULT 0`（幂等：先 PRAGMA table_info 检测）
- [x] 1.2 在 `runMigrations.js` 追加 `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL`
- [x] 1.3 在 migration 前置 pre-check：扫描 `users.nickname` 非 NULL 去重冲突，冲突时 console.warn 并列出冲突用户 id，不中止 migration
- [x] 1.4 手动跑一次 `node server/index.js` 看 migration 日志，确认 column + index 都就位

## 2. 后端 · 身份显示

- [x] 2.1 `resourceController.js` 的 `getOneHandler` 和 `getAllHandler` SQL 将 `u.nickname AS author_name` 改为 `COALESCE(u.nickname, u.username) AS author_name`（同时处理 `getFollowingFeed` 已有的 `author_nickname` / `author_username` 分字段，保持一致）
- [x] 2.2 `newsController.js` 的 `listNews` 和 `getNews` 同样改 COALESCE（实际扩展到 5 处含 createNews/updateNews，满足 spec"任何作者 JOIN"）
- [x] 2.3 Admin 管理相关的 list / detail 查询（如 `AdminCommunity` 调用路径）一并核查：按现状是直接穿透同一个 handler，不需单独改，但加测试验证
- [ ] 2.4 写一个后端 e2e 测试：创建 username=`test_no_nickname` 但无 nickname 的用户，发一篇 article，GET /articles/:id 断言 `author_name = 'test_no_nickname'` — 留给 /verify Gate 2 做

## 3. 后端 · nickname 编辑

- [x] 3.1 `userController.updateUser` 在处理 `nickname !== undefined` 前加校验：trim、长度 2-20、字符集正则 `/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/`（或等价实现），不符合返 400 + 明确 message
- [x] 3.2 空字符串视为置 NULL 的意图：`nickname === ''` 时写入 NULL
- [x] 3.3 写入前用 try/catch 包 db.run；SQLite UNIQUE 冲突（error.code === 'SQLITE_CONSTRAINT'）时返 409，message 为 "该昵称已被使用"
- [ ] 3.4 手动测试：（a）合法昵称 200（b）emoji 400（c）冲突 409（d）空字符串清空 200 — 留给 /verify Gate 2 做

## 4. 后端 · 社区帖匿名 + 脱敏

- [x] 4.1 `communityController.createPost`（或等价接口）当 `body.section === 'help'` 且 `body.is_anonymous` 为 truthy 时写入 `is_anonymous = 1`；其它 section 忽略该字段强制 0
- [x] 4.2 新增统一的 `serializeCommunityPost(post, viewer)` helper，放在 `server/src/utils/serializeCommunityPost.js`
- [x] 4.3 Helper 内部：viewer 非 admin 非作者 + post.is_anonymous=1 时，将 `author_name / author_avatar / uploader_id / author_id` 设为 null（保留其它字段）
- [x] 4.4 改 `communityController` 所有返回 posts 的接口（list / detail / user timeline）都 pipe 通过 helper；额外覆盖 `communityLinks.js` 的 linked posts summary 和 `systemController` 全站搜索
- [x] 4.5 单元测试：8 个 case 覆盖 null/非匿名/访客/他人/owner/owner string-id/admin/uploader_id 防御性 null，全部通过

## 5. 后端 · 关注通知 fan-out

- [x] 5.1 `notificationController.js` 新增 `fanOutNewContent({ authorId, resourceType, resourceId, title })` export
- [x] 5.2 Helper 内部 query 粉丝：`SELECT uf.follower_id FROM user_follows uf JOIN users u ON u.id = uf.follower_id WHERE uf.following_id = ? AND (u.role IS NULL OR u.role != 'banned') AND u.deleted_at IS NULL`（若 users 无 deleted_at 列则 PRAGMA 检测后条件性省略）
- [x] 5.3 组装 content 字符串：按资源类型映射中文（article→文章, photo→图片, music→音乐, video→视频, event→活动, news→新闻）；作者名走 `nickname || username` fallback
- [x] 5.4 循环 `createNotification(followerId, 'new_content', content, resourceId, resourceType)`；错误吞掉不 throw
- [x] 5.5 `resourceController.createHandler` 在 `db.run INSERT` 成功后调用 fanOutNewContent（仅当 table 在白名单且 status 非 rejected 时）；使用既有 `getSingularType` helper 避免 `'music'→'musi'` off-by-one
- [x] 5.6 `newsController.createNews` 同样触发 fanOutNewContent
- [ ] 5.7 单元 / 集成测试：（a）作者无粉丝不写通知（b）作者 3 粉丝其中 1 banned，写 2 条（c）通知 content 格式正确 — 留给 /verify Gate 2 做

## 6. 后端 · self-follow 禁止 + getUserResources 扩展

- [x] 6.1 `userController.toggleFollowUser` 在 authenticate 后加 `if (Number(req.params.id) === Number(req.user.id)) return res.status(400).json({ error: '不能关注自己' })`（POST+DELETE 共用 handler，顶部守卫覆盖两种）
- [x] 6.2 `userController.getUserResources` 扩展：补 news 表查询（同 photos/videos 的 status 过滤模式）
- [x] 6.3 `getUserResources` 增加 `community_posts` 查询：JOIN users 拿 author_name；组队贴全部返回；求助贴按 `is_anonymous=0 OR uploader_id=viewer OR viewer_role=admin` 过滤；lazy require serializeCommunityPost 过 helper
- [x] 6.4 返回项统一 schema：`{ id, type, title, cover, created_at, likes }`，type 取 `photo|music|video|article|event|news|help|team`
- [x] 6.5 最终按 `created_at DESC` 排序后返回整合列表

## 7. 前端 · nickname 输入框

- [x] 7.1 `PublicProfile.jsx` 的 settings tab 表单里，在 organization 附近加 nickname `<input>`（受控，绑 `profileData.nickname`）
- [x] 7.2 字段约束：`maxLength={20}`，placeholder + helper 文案（含字符范围说明）
- [x] 7.3 `handleProfileUpdate` 把 nickname 一并带入 PUT 请求（`/users/${user.id}`）
- [x] 7.4 响应 409 时，前端 toast.error 展示后端固定文案 "该昵称已被使用"
- [x] 7.5 nickname 保存成功后刷新 useAuth 的 user 对象以更新 header 显示

## 8. 前端 · 匿名 checkbox

- [x] 8.1 `PostComposer.jsx` 当 `isHelp === true` 时在 footer 加 checkbox + "匿名发布" label（`accent-amber-500`，hover 变色，submitting 时 disabled）
- [x] 8.2 状态：新增 `const [isAnonymous, setIsAnonymous] = useState(false)`
- [x] 8.3 `handleSubmit` 里，仅当 `isHelp` 时把 `is_anonymous: isAnonymous ? 1 : 0` 加入 body
- [x] 8.4 `resetForm` 时把 isAnonymous 重置为 false
- [x] 8.5 Team 路径完全不渲染该 checkbox（组件内条件判断 + 空 `<span />` 保 flex 对齐）

## 9. 前端 · 详情弹窗作者头像可点击

- [x] 9.1 `CommunityDetailModal.jsx` 的作者头像 div 包一层 `role="button"`，绑 onClick + onKeyDown（Enter/Space）
- [x] 9.2 `const canGoProfile = uploaderId != null`；true 时 navigate `/user/:uploaderId`（修正 plan 里的 `/profile`，实际路由是 `/user/:id`）
- [x] 9.3 样式：`canGoProfile` 时 `cursor: pointer` + hover/focus ring；false 时 `cursor: not-allowed opacity-60` + 灰底 User icon
- [ ] 9.4 审计其它资源详情组件（如果有独立实现），一并加同样的入口行为 — 留给 /verify Gate 3 diff review 阶段确认

## 10. 前端 · PublicProfile 内容区改造

- [x] 10.1 替换现有的"已发布" tab 内容渲染逻辑，改为类型 tabs 结构
- [x] 10.2 Tabs 列表按 `[所有, 图片, 视频, 音乐, 文章, 活动, 新闻, 求助, 组队]`，每项带计数（从 getUserResources 返回数据聚合）
- [x] 10.3 0 条的 tab 显示为隐藏（除"所有"以外）
- [x] 10.4 内容卡片保持**大图 3 列 grid** 风格（移动端降到 2 列），不改成列表样式
- [x] 10.5 无 cover 的类型（求助 / 组队 / 纯文字 article）使用类型图标 + 类型色渐变占位
- [x] 10.6 卡片带：类型 badge（左上）、点赞数（右上）、底部标题 + 日期
- [x] 10.7 点击卡片：`navigate` 到对应资源详情（article 走 `/articles?id=X&tab=tech`，news 走 `/articles?tab=tech&news=X`，help/team 走 `/articles?tab=help|team&post=X`），带 state `{ fromUserProfile: { userId, scrollY, contentTab } }`
- [x] 10.8 详情页关闭或 back 时 `navigate(-1)`；PublicProfile 首次 mount 时读取 `location.state.fromUserProfile` 恢复 tab + scroll

## 11. E2E Smoke 测试（留给 /verify Gate 2）

- [ ] 11.1 playwright 用例：注册 user A，在 settings tab 设置 nickname，发一个 article，登出；user B 浏览 A 的文章详情确认 `author_name = A.nickname`
- [ ] 11.2 nickname 冲突场景：A 设置 nickname='小明'，B 再设置同名 → 断言 toast 出现且 B 保存失败
- [ ] 11.3 关注通知：B 关注 A，A 发一个 photo，1 分钟内 B 的铃铛红点增加，打开 NotificationCenter 看到"A 发布了新图片《X》"
- [ ] 11.4 匿名求助贴：A 勾匿名发求助贴，B 打开 A 的主页看不到该贴（不计入求助 tab 数量）；B 关注 A 期间 A 发匿名贴，B 不收到通知
- [ ] 11.5 Self-follow：A 尝试 POST /users/A/follow，接口返 400
- [ ] 11.6 详情页头像点击：B 在 A 的 article 详情点头像 → 跳 A 主页；B 返回 → 回到原详情
- [ ] 11.7 主页 tab 切换 + 路由记忆：B 在 A 主页选"图片" tab → 滚到中部 → 点一张 photo → 返回 → tab 依然是"图片"且滚动位置恢复

## 12. 文档 + 归档

- [x] 12.1 更新 `COMMUNITY_DEV.md` 补充身份显示规则、匿名机制、fan-out 规则、路由映射（9 条要点）
- [ ] 12.2 跑 `npm run lint` + `npm run build` + `npm run test:e2e:smoke` 全绿 — lint 有 pre-existing 遗留，build/e2e 留 /verify Gate 1 执行
- [x] 12.3 清理空壳 change `tech-article-author-identity/`（`rm -rf`）
- [ ] 12.4 /verify 四关通过后，`openspec archive community-identity-and-follow-notifications` 归档 change

---

> Plan: docs/superpowers/plans/2026-04-18-community-identity-and-follow-notifications.md
