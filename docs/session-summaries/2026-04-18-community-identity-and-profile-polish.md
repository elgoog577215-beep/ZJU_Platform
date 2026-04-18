# Session Summary · 2026-04-18

社区身份体系重构 + 后续修复 + 卡片视觉打磨

**范围**：37 个文件 · +2042 / -1019 · 33 个原始 commit（含合并）
**起点 tag**：`pre-identity-follow-v1`（可回滚锚点）
**结束 commit**：`5de7d905`

---

## 背景

入口是一个 brainstorm："非管理员发技术分享时显示为匿名用户"。随便一拉发现根因是 `resourceController.js` 的 SQL 忘了 `nickname || username` fallback，而绝大多数用户的 nickname 又因为前端从未暴露编辑入口而是 NULL，两层相乘出了假象。修这个坑的同时，顺手把关注系统（关注表已有但缺 fan-out 通知）、匿名求助贴、主页内容聚合一起做了。

上完之后陆续发现 4 个产品反馈，改完这一圈又决定彻底撤销匿名功能（nickname 可编辑，匿名 opt-in 没实质价值）。最后打磨了 PublicProfile 的"已发布"卡片 + 补齐未读消息徽章。

---

## 阶段 1 · change `community-identity-and-follow-notifications`（/brainstorm → /plan → /execute → /verify → archive）

**4 个 capability 落地**：
- `community-author-identity` — nickname 字段 + 编辑入口 + 唯一约束 + 所有资源控制器 SQL COALESCE
- `follow-new-content-notifications` — 6 类资源发布后 fan-out 通知粉丝，`new_content` type，过滤 banned/deleted
- `user-profile-content-aggregation` — `getUserResources` 扩到 7 张表 + PublicProfile 类型 tabs + 大图 grid + 路由记忆
- `notifications-persistence`（delta）— 注册 `new_content` type + 前端路由映射

**执行策略**：Parallel（Lead-Expert + git worktree）。4 个 backend Expert（Task 2+5 / Task 3+6 / Task 4 / Task 7）和 4 个 frontend Expert（Task 8+11 / Task 9 / Task 10 / Task 12）分两批并行，主 session 做 rollback tag + DB migration + 收尾。

**执行中发现的真 bug**（静态审查漏掉的）：
- `PUT /users/:id` 路由不存在（实际是 `PUT /auth/profile`）— 前端 nickname 保存根本没工作
- `community_posts.deleted_at` 列不存在（Expert X 按资源表惯例假设了）— 访客调 `/users/:id/resources` 会 500
- 陈旧 5181 node 进程跑着 pre-COALESCE 代码 — 让 E2E test 误以为后端没改

**E2E**：7 个 scenario 写了 playwright spec，4 个 API-level 通过，2 个 fixme（UI selector 稳定后补），1 个重写为"community posts 不 fan-out"。

**验证**：`openspec validate` ✓ / build 17.23s ✓ / 8/8 serializer 单测 / CI grep 脚本捕获 systemController 的作者名搜索漏洞。

**知识沉淀（brain）**：
- `failures/2026-04-18-worktree-base-not-head.md` — Agent tool isolation=worktree 的 base 不是当前 HEAD
- `decisions/003-grep-ci-for-helper-coverage.md` — 用 grep CI script 强制 helper 覆盖
- `patterns/sync-then-parallel-worktrees.md` — 先串行合并 helper 再并行分发使用方
- `knowledge-base/zju-platform-routes.md` — `/user/:id`（不是 `/profile/:id`），`/news` 路径实际走 `/articles?tab=tech&news=X`

---

## 阶段 2 · 后续修复 4 个 bug（用户反馈）

1. **Bug 2 求助/组队贴 pending 显示不出来** — `createPost` 根据 role 设 status=pending（非 admin），改为恒 `approved`（社区贴免审，资源贴继续审核流程）
2. **Bug 3 详情返回不回主页** — `fromFavoritesRef` 模式扩展到 `fromUserProfileRef`，先补 CommunityTech，再扩到 Articles/Events/Gallery/Videos/CommunityHelp/CommunityNewsRail 共 7 处
3. **Bug 4 卡片不美观** — ProfileContentCard 改造：SmartImage + `events.image` 进 cover fallback + 求助/组队用 type='article' 走文章默认图 + 彩色 badge + ♥ 明显
4. **SmartImage null 坑** — `typeof null === 'object'` 的经典陷阱，加 `src &&` 守卫

---

## 阶段 3 · 匿名撤销

用户决策："既然 nickname 可以改，匿名 opt-in 也没什么关系"。

**全撤**：
- 前端 `PostComposer` 匿名 checkbox + state + resetForm 清理
- 后端 `createPost` 里 `is_anonymous` 恒 0（列保留做 schema backward compat）
- `getUserResources` / `systemController.search` 去掉匿名过滤
- `serializeCommunityPost` helper 变 identity pass-through（签名保留方便未来扩展）
- 删除 `server/src/utils/__tests__/serializeCommunityPost.test.js`、`server/scripts/check-community-post-serializer.sh`、`server/package.json` 的 `check:posts-serializer` script
- Spec `community-author-identity` 里 4 个匿名 requirement 加 deprecation note
- `COMMUNITY_DEV.md` + E2E spec 11.4 重写为"help 不 fan-out"

**验证**：admin POST body 带 `is_anonymous:1` → DB 实际存 0，author_name 显示真名。

---

## 阶段 4 · 卡片视觉打磨（impeccable:layout 风格）

**770f9016 · 第一轮**
- 图片 aspect 3/4 → 4/3（变扁让 caption 突出）
- Caption 加 padding + flex gap + 3 行节奏（badge+♥ / title / date）
- 类型 badge 挪到 caption 内玻璃风（`backdrop-blur-md bg-white/70 border`），type 彩色文字
- ♥ 换 lucide Heart + text-sm font-bold
- Title text-sm → text-base font-bold line-clamp-2
- Shell 换项目标准 glass（`backdrop-blur-xl rounded-3xl`）

**19521a6d · 小红书-style TitleArtPlaceholder**
- 无 cover 的卡片（help / team / 没 cover 的 article）不再走 SmartImage 的 FileText icon
- 自己渲染 text-as-image：类型色软渐变 + 大字标题做主视觉 + 顶部 accent 条 + 底部三点装饰
- Title 按长度 3 档自适应字号（≤8→3xl, ≤20→2xl, ≤40→xl, >40→lg）

**e4818c72 · 防溢出**
- 外层 `overflow-hidden` 硬兜底
- Title 区 `flex-1 min-h-0 break-words` + line-clamp 按字号 tier（3/4/5/6）
- 加第 4 档 tier 应对马拉松标题

---

## 阶段 5 · Code review cleanup

`superpowers:code-reviewer` 独立 review 后发现的问题：

**056d1787**：
- **删除 `src/components/Articles.jsx`**（726 行 dead code）— `App.jsx` 的 `Articles` lazy import 实际指向 `AICommunity.jsx`，grep 确认全项目没人 import `./Articles`
- **`COMMUNITY_DEV.md`** 3 处过时描述修正（匿名撤了但文档还说"访客看不到匿名贴"）
- **`e2e/identity-follow-smoke.spec.js`** docstring + 11.7 fixme 注释更新

**未做**（reviewer 提但延后的）：
- `/articles?tab=team&post=X` 路径在 `AICommunity.jsx` 的 panels 映射缺 `'team'` → fallback 到 `help` → team 点击打不开 detail。**独立 change 处理**。
- `UPDATE community_posts SET is_anonymous=0 WHERE is_anonymous=1` — 历史匿名贴会暴露作者，上线前运维跑一次。
- 抽 `usePopHistoryOnClose` hook — 13 处相同 pattern，YAGNI 维度接受到第 3 种触发时再抽。

---

## 阶段 6 · 未读消息徽章

**655b815e · MobileNavbar 我的 tab 角标**
- MobileNavbar 没挂 NotificationCenter（桌面 Navbar 的 `hidden md:flex` 里），移动端从前看不到未读红点
- 新增 60s poll + `notifications:updated` 事件监听
- "我的"tab icon 右上叠红色 badge：1-99 直显数字 / >99 显示 "99+" / 0 不显示 / 未登录不显示
- 带 `aria-label` "{count} 条未读通知"

**5de7d905 · PublicProfile 消息 tab 红点**
- PublicProfile 里 NotificationCenter 只在 messages tab 激活时挂载 — 未激活时 unreadCount 不刷新
- 同款 poll + listener 模式
- 消息 tab pill 右上 2.5×2.5 红点（没数字，因为 tab pill 窄）

---

## 不处理（明确记录）

- **team 路径 detail 打不开**（reviewer 的 QUESTION）— 需要独立 change debug AICommunity 的 panels map 或者 PublicProfile 的 path map
- **历史 is_anonymous=1 数据暴露** — 上线时运维 UPDATE
- **抽 hook YAGNI** — 等第 3 种触发场景
- **E2E 11.2b/11.7 fixme** — UI 选择器稳定后再补（需要给 PublicProfile tab 加 `role="tab"` + `aria-selected`，data-testid 等）

---

## 改动面摘要

```
37 files changed, 2042 insertions(+), 1019 deletions(-)
```

最大改动点：
- `src/components/PublicProfile.jsx` +624 / -109（nickname 编辑 + 类型 tabs + grid + 卡片重构 + 消息红点）
- `src/components/Articles.jsx` 0 / -726（整文件删除）
- `server/src/controllers/communityController.js` +52 / -15（serializer + is_anonymous 生命周期）
- `server/src/controllers/userController.js` +94 / -13（nickname API + self-follow + getUserResources）
- `e2e/identity-follow-smoke.spec.js` +566 / -103（新 smoke spec + 后续简化）

4 个 brain 沉淀 + 1 个 spec capability 归档 + 13 个文件改动 + 3 个文件新建 + 4 个文件删除。
