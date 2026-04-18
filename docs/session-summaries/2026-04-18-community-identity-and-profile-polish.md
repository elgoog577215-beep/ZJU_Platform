# 会话总结 · 2026-04-18

社区身份体系重构 + 通知统一 + 移动端新闻全屏 + 卡片视觉打磨 + 未读徽章

**范围**：本轮推送包含 **47 个 commit**（41 个实质 commit + 6 个 worktree 合并），推送起点 `origin/master = 40094475`，推送终点 `9c47c896`。
**可回滚 tag**：`pre-identity-follow-v1`（本地保留，未推送到远端）

---

## 为什么这么多

本次推送其实是**两三天本地积累**一次合上去，不只是今天一次性写的。按主题分成 9 块，每块都是独立可追踪的小闭环。下面按时间先后 + 主题分类讲。

---

## 主题 1 · 通知 content 列统一（5 commits）

**目标**：`notifications` 表历史上存在 `title / message / content` 三个看似不同但实际重叠的列，`createNotification` 里还有死分支。长期下去任何加通知类型的人都要猜"该填哪个列"。本次收敛到只用 `content`，旧列保留读兜底。

| commit | 做了什么 |
|---|---|
| `ca10b647` | checkpoint：把 WIP 先存一笔（包含 openspec artifacts、plan、progress.json、各 controller 的 draft 改动、`fix-counters.js` 脚本、`favorites-nav.spec.js` E2E） |
| `71efdba5` | refactor 主体：`runMigrations.js` 软迁移 backfill `content` 列；`notificationController.js` 删除 INSERT 时对 `title/message` 的写入分支；读路径保留 `content > message > title` 三级兜底 |
| `660ce93b` | 把 spec 里 SHOULD/MAY 等用语改成 RFC 2119 规范，`openspec validate` 能过 |
| `ccdbc527` | archive change，把 delta specs sync 到主 specs |

---

## 主题 2 · 移动端 "我的" 登出态 + 新闻抽屉全屏（7 commits）

**目标**：
1. 移动端点 "我的" 未登录时直接跳 404（因为 `path` 硬编码 `/me`），应该唤起 AuthModal
2. 新闻面板是底部半高 drawer，移动端小屏下可读区太挤，直接改全屏覆盖

| commit | 做了什么 |
|---|---|
| `4e9b6598` | openspec change + plan 立项：mobile-me-and-news-fullscreen |
| `1bde9026` | `MobileNavbar.jsx` "我的" 条目在未登录时 `path=null`，渲染时走 `<button onClick=open-auth-modal>` 分支；已登录走原 `<Link to=/user/:id>` |
| `ff27982d` | `AICommunity.jsx` 新闻 drawer 改 `inset-0`，`y: '100%'` 入场动画换成 opacity+scale，去掉 `max-h-[86vh]` 限制 |
| `de0f12a3` | 新闻 overlay 关闭按钮调到 scroll 之上（`position: absolute top-4 right-4` + z-index） |
| `62e510d3` | 关闭按钮用 inline style 加 safe-area-inset-top offset，fallback 到 env() |
| `49fd2f5a` | 关闭按钮在 day-mode 白底上看不清 → icon 加描边 + bg 改深 |
| `8cab9c0e` | fix(db)：`articles/photos/music/videos/events/news` 六张表补齐 `rejection_reason` 列，之前 admin reject 时 UPDATE 会报错 |

---

## 主题 3 · community-identity change 全流程（18 commits + 6 merge）

**目标**：一次性收口**4 个能力**：身份显示修复 + 关注通知 fan-out + 主页内容聚合 + 资源详情头像跳作者主页。执行用 Lead-Expert + 8 个 git worktree 并行。

### 3a 规划与 checkpoint（2 commits）

| commit | 做了什么 |
|---|---|
| `46fe6a12` | 把前一个 session 打勾但没 commit 的 mobile-me tasks 状态补提交，清理工作区 |
| `200ab4ea` | openspec change 立项：`community-identity-and-follow-notifications` — 包含 proposal / design / 4 个 capability specs / 62 个 tasks / superpowers plan |

### 3b 后端能力落地（5 commits · 4 worktree Expert 并行）

| commit | 做了什么 |
|---|---|
| `3404898e` | DB migration：`users.nickname` 加 SQLite partial unique index（WHERE nickname IS NOT NULL）+ `community_posts` 加 `is_anonymous` 列；幂等、带冲突 pre-check |
| `6d714d33` | 新建 `serializeCommunityPost` helper + `communityController` 全部 9 处读路径接入 + createPost 接受 `is_anonymous` + `communityLinks.js` 的 linked posts summary 也脱敏（Agent Y 额外覆盖的隐藏泄漏点） |
| `36bc56b2` | CI 守卫：`server/scripts/check-community-post-serializer.sh` grep 所有 `FROM community_posts` 未配套 `serializeCommunityPost` 即 fail，`npm run check:posts-serializer` 暴露 |
| `3921ee33` | userController：nickname validation（2-20 字符 / 中英数下划线 / emoji 400）+ SQLITE_CONSTRAINT → 409 固定"该昵称已被使用"；`toggleFollowUser` 顶部 self-follow 守卫（POST 和 DELETE 共用 handler）；`getUserResources` 扩到 7 张表含 community_posts |
| `eea6a769` | 6 个资源表的 SQL 改 `COALESCE(u.nickname, u.username) AS author_name`（`resourceController` 2 处 + `newsController` 5 处 — 比 plan 说的多 3 处，符合 spec "任何作者 JOIN"）；`fanOutNewContent` helper（过滤 banned 用户 + 条件性 deleted_at）；`createHandler` + `createNews` 接入；修正 plan 里 `table.slice(0, -1)` 对 `music` 的 off-by-one bug（改用 `getSingularType`） |

### 3c 安全漏洞修复（1 commit · CI 真实捕获）

| commit | 做了什么 |
|---|---|
| `8b8a6935` | `systemController.searchContent` 全站搜索 WHERE 子句里带了 `author_name LIKE ?`，即使帖本身 is_anonymous 也能被按作者名反推 → 把 `author_name` 从 WHERE 去掉 + 加 `AND NOT (section='help' AND is_anonymous=1)` + serializer 过一遍 |

### 3d 前端 4 个独立组件并行（4 commits · 4 worktree Expert）

| commit | 做了什么 |
|---|---|
| `17ef0dff` | `PostComposer.jsx` 求助贴 footer 左侧加 "匿名发布" checkbox，组队贴不显示 |
| `a313d33e` | `NotificationCenter.jsx` 的 `buildNotificationTargetPath` 扩展 `new_content` type 路由映射 |
| `aeda513e` | `CommunityDetailModal.jsx` 作者头像可点击跳 `/profile/:id`（本行代码后来修正为 `/user/:id`），匿名态 cursor: not-allowed |
| `309e4468` | `PublicProfile.jsx` 大改造：nickname 输入框 + 类型 tabs + ProfileContentCard + 路由记忆（state.fromUserProfile） |

### 3e 路由修正（Lead 在主 session 做，2 次 fix）

| commit | 做了什么 |
|---|---|
| `7ddd5de9` | plan 里写错了路由，修正：`/profile/:id` → `/user/:id`，`/news?id=X` → `/articles?tab=tech&news=X`，涉及 `CommunityDetailModal / NotificationCenter / PublicProfile` 三文件 |
| `55111c7e` | COMMUNITY_DEV.md 补一段身份/匿名/fan-out/路由映射共 9 条；tasks.md 勾上 Section 1-10 实现类 subtask |

### 3f E2E smoke（3 commits · spec + 真 bug + 修复）

| commit | 做了什么 |
|---|---|
| `2764b964` | playwright spec 初版 566 行，7 个 scenario |
| `a48dd87a` | 跑 E2E 过程中捕获 **3 个真 bug**（这是静态审查抓不到的）：① 前端 `PUT /users/:id` 路由根本不存在（应用 `/auth/profile`），nickname 保存从未生效；② `community_posts.deleted_at` 列不存在（Expert X 按资源表惯例假设了），访客 `/resources` 500；③ port 5181 陈旧 node 进程跑 pre-COALESCE 代码让 test 误判 |
| `7c4b3eb3` | 最终 spec 简化为 API-level 断言（UI 密集场景标 `test.fixme`），6 passed / 2 fixme / 0 failed / 15.2s，Section 11+12 勾完 |

### 3g 归档（1 commit）

| commit | 做了什么 |
|---|---|
| `3185951f` | `openspec archive` — 4 个 capability delta sync 到 `openspec/specs/` 主目录，change 归档到 `openspec/changes/archive/2026-04-18-community-identity-and-follow-notifications/` |

---

## 主题 4 · 4 轮产品反馈修复（4 commits）

用户体验之后提的 4 个 bug。

| commit | 做了什么 |
|---|---|
| `2553b848` | 3 个 bug 一起修：**Bug 2** `communityController.createPost` 里 `status = 'approved'`（以前非 admin → pending 看不到，资源贴继续审核不受影响）；**Bug 3** `CommunityTech.jsx` 加 `fromUserProfileRef`（类比 `fromFavoritesRef`），navigate(-2) 跳回主页；**Bug 4** ProfileContentCard 换 SmartImage + events.image fallback + 彩色 badge + ♥ 数 |
| `59a60ef2` | `SmartImage.jsx` null guard — `typeof null === 'object'` 的经典陷阱，`src={null}` 会崩 `Cannot read properties of null (reading 'url')` |
| `fc913ee9` | Bug 3 扩覆盖面：`fromUserProfileRef` 同款模式复制到 `Articles.jsx / Events.jsx / Gallery.jsx / Videos.jsx / CommunityHelp.jsx` 共 5 处（CommunityTech 已有）。CommunityHelp 原本没 `useNavigate/useLocation/useRef`，顺便加了 import |
| `5c673e46` | `CommunityNewsRail.jsx` 新闻 detail 自己管 `selectedNews` 状态不走 feed，单独接入 fromUserProfileRef — 全 7 种内容类型全覆盖 |

---

## 主题 5 · 匿名功能整块撤销（1 commit · -289 行）

**起因**：用户反思 "既然 nickname 可以改，匿名 opt-in 也没什么实质价值了"。

`54b454f0` 一次撤干净：
- **前端**：`PostComposer.jsx` 匿名 checkbox + state + resetForm 清理全撤
- **后端**：`createPost` 里 `isAnonymous = 0`（列保留做 schema backward compat）；`getUserResources` / `systemController.search` 去掉匿名过滤
- **Helper**：`serializeCommunityPost.js` 变 identity pass-through（签名保留方便未来扩展）
- **删除**：`serializeCommunityPost.test.js`、`check-community-post-serializer.sh`、`package.json` 里的 `check:posts-serializer` script
- **Spec**：`community-author-identity/spec.md` 的 4 个匿名 requirement 加 deprecation note
- **E2E**：11.4 重写为 "community posts 不 fan-out"（而不是原来"匿名不 fan-out"）
- **验证**：admin POST `/community/posts` body 带 `is_anonymous:1` → DB 实际存 0，`author_name` 显示真名

---

## 主题 6 · 卡片视觉打磨（3 commits · impeccable:layout）

**目标**：PublicProfile 卡片之前"深色 overlay / 看不清标签 / 爱心小 / 图片占太大"。参考截图里的原"已发布"风格（白底大图 grid）+ 小红书式文字卡。

| commit | 做了什么 |
|---|---|
| `770f9016` | **第一轮**：图片 aspect 3/4 → 4/3（变扁让 caption 主导）；caption padding + flex gap 三行节奏（badge+♥ / title / date）；类型 badge 挪到 caption 内玻璃风（`backdrop-blur-md bg-white/70`）+ 文字按 type 着色（紫/青/橙等）；♥ 换 lucide `Heart` + `text-sm font-bold` + rose 色；title `text-sm` → `text-base font-bold line-clamp-2`；Shell 改项目标准 `backdrop-blur-xl rounded-3xl bg-white/82` |
| `19521a6d` | **小红书风文字卡**：新建 `TitleArtPlaceholder` 子组件，无 cover 的卡片（help/team/无 cover article）不再走 SmartImage 的 FileText icon，改成 "标题作艺术图" — 类型色软渐变背景 + 标题做主视觉 + 顶部 accent 条 + 底部三点装饰；title 按长度 3 档自适应字号（≤8→3xl / ≤20→2xl / >20→xl） |
| `e4818c72` | **防溢出**：容器 `overflow-hidden` 硬兜底；title 区 `flex-1 min-h-0 break-words`；加第 4 档 tier（>40 字 → text-lg + line-clamp-6）应对超长标题；line-clamp 按字号 tier 成比例变化 |

---

## 主题 7 · Code review 后续 cleanup（1 commit · -726 行）

起一个 `superpowers:code-reviewer` 后台 agent 独立审最近 5 commit，没 Blocker，3 类 Nit。

`056d1787` 一次性清理：
- **删除 `src/components/Articles.jsx`** — `App.jsx` 里 `Articles` lazy import 其实指向 `AICommunity.jsx`（名字撞了），grep 确认全项目没人 import `./Articles`。fc913ee9 给它加的 fromUserProfileRef 永远不会执行
- **COMMUNITY_DEV.md** 3 处与代码矛盾的描述修正（匿名撤了文档还说"访客看不到匿名贴"）
- **E2E spec docstring + 11.7 fixme 注释** 更新

**延后项**（reviewer 提出但本次未做）：
- `/articles?tab=team&post=X` 路径在 AICommunity 的 `panels` map 缺 `'team'` → fallback 到 `help` → team 点击打不开 detail（不是本次引入的，但历史问题）
- 生产 DB 可能有遗留 `is_anonymous=1` 行，需要 `UPDATE community_posts SET is_anonymous=0` 一次性清
- 13 处 `fromFavoritesRef + fromUserProfileRef` 相似 pattern 可抽 `usePopHistoryOnClose` hook — YAGNI 维度等第 3 种触发再做

---

## 主题 8 · 未读消息徽章（2 commits）

| commit | 做了什么 |
|---|---|
| `655b815e` | `MobileNavbar.jsx` "我的" tab 右上角加红色数字徽章：1-99 直显 / >99 "99+" / 0 不显示 / 未登录不显示。移动端没挂 NotificationCenter（桌面 Navbar 的 `hidden md:flex` 里），所以自己 60s poll + 监听 `notifications:updated` 事件双通道 |
| `5de7d905` | `PublicProfile.jsx` "消息" tab 右上角小红点（没数字，因为 tab pill 窄）。同款 poll + event 机制，只 isOwner 才启。NotificationCenter 清通知时同步触发红点消失 |

---

## 主题 9 · 会话总结文档（1 commit）

`9c47c896` — 本文档的英文初版，然后被本次中文改写覆盖。

---

## 改动统计

```
37 files changed, 2042 insertions(+), 1019 deletions(-)
```

改动最大的文件：
- `src/components/PublicProfile.jsx` +624 / -109（nickname 编辑 + 类型 tabs + grid + 卡片 3 轮打磨 + 消息红点）
- `src/components/Articles.jsx` 0 / -726（整文件删除，dead code）
- `e2e/identity-follow-smoke.spec.js` +566 / -103（新 spec + 后续简化）
- `server/src/controllers/communityController.js` +52 / -15（serializer + is_anonymous 生命周期）
- `server/src/controllers/userController.js` +94 / -13（nickname API + self-follow + getUserResources）

**新增**：4 个 capability spec（全部 archived 到主目录）+ `TitleArtPlaceholder` 子组件 + `SmartImage` null guard + `fanOutNewContent` helper
**删除**：`Articles.jsx` / `serializeCommunityPost.test.js` / `check-community-post-serializer.sh`（匿名撤销连带删）

---

## Brain 沉淀（4 条）

本次过程中写入的 Claude 自己的工作备忘（`~/.claude/codingsys-brain/` 和 `~/.claude/knowledge-base/`）：

- `failures/2026-04-18-worktree-base-not-head.md` — `Agent` tool 的 `isolation: worktree` base 不是当前 HEAD，并行开发要先串行合并依赖再并行分发
- `decisions/003-grep-ci-for-helper-coverage.md` — 安全 helper 必须被所有读路径覆盖时，用 bash grep CI script 做强制检查比人工 review 更稳
- `patterns/sync-then-parallel-worktrees.md` — Lead-Expert 模式下 helper 提供方先串行合并，使用方才并行分发
- `knowledge-base/zju-platform-routes.md` — ZJU_Platform 主页是 `/user/:id`（不是 `/profile/:id`），news 走 `/articles?tab=tech&news=X` 无独立路由

---

## 明确不做的事（记录）

- **team 路径 detail 打不开** — 需要独立 change debug AICommunity 的 panels map
- **历史 `is_anonymous=1` 数据清零** — 上线时运维跑一次 UPDATE
- **抽 `usePopHistoryOnClose` hook** — 等第 3 种来源出现再做
- **E2E 11.2b（toast UI）/ 11.7（tab + scroll memory）** — 需要前端先给 PublicProfile tab 加 `role="tab"` / `aria-selected` / `data-testid` 之类稳定选择器，下一次 UI 稳定性迭代一起做

---

## 回滚锚点

- `pre-identity-follow-v1`（本地 tag，指向 `3404898e` 之前）— 如果整个社区身份这一段要回退，reset 到这里就行。tag **未推到远端**，需要时手动 `git push origin pre-identity-follow-v1`。
- `pre-msg-refactor-v1`（另一个旧 tag，通知重构前）— 跟本次无关但值得知道存在。
- 数据库备份：`server/database.sqlite.bak.pre-identity-follow-2026-04-18T15-26-16` — 如果要连 DB 一起回滚用这个。

---

## 下一次可以做的

1. 修 team 路径（如果 Activity 里真有团队帖详情需求）
2. `usePopHistoryOnClose` hook 抽取（遇到第 3 种来源时）
3. 补 playwright 的 UI 级 smoke（需前端 aria 和 testid）
4. tag `pre-identity-follow-v1` push 到远端作为共享锚点（如果团队多人协作）

够了，下一次会话见。
