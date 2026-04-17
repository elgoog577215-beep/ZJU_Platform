## Context

移动端 UX 两处痛点，来源是真实用户（项目作者本人）使用过程的截图反馈：

1. **"我的" 404**：根因是 `MobileNavbar.jsx:27` 把未登录态路由硬编码为 `/me`，但 router 里没这条。项目登录一直是 AuthModal，不存在 `/login` 页面，所以该按钮在未登录态一直是废的。

2. **新闻抽屉难用**：`AICommunity.jsx:160-194` 的 bottom sheet（`max-h-[86vh]`、`rounded-t-3xl`、`absolute bottom-0`）在 mobile viewport 下实际可用区域只有屏幕 60-70%（掉掉 backdrop + safe area），还要被 `MobileNavbar` 从透明 backdrop 下"透"出来的 icons 干扰。用户明确要求"改成覆盖整页"。

两者本质都是"移动端层叠结构没收拢"的毛病，放一轮里解决更经济。

## Key Decisions

### 1. "我的" 未登录态：AuthModal 而不是新页面

放弃"新建 `/me` 引导页"的方案。

- 项目登录入口已经全站收拢到 `AuthContext` 控制的 `AuthModal`（桌面 Navbar 的"登录"按钮走的是它）
- 新建 `/me` 会引入第 N+1 个路由，且需要维护一个"未登录引导页"，空白大部分时间不可见
- 弹窗登录成功后 `AuthContext.user` 刷新 → `MobileNavbar` 的 `to={user ? \`/user/${user.id}\` : ...}` 自动走已登录分支，下次点击无缝进入个人页
- 落点：用 `useAuth()` 已有机制，**不强依赖** `openAuthModal`，等 plan 阶段落到代码再决定具体 API 形态（见下方第 5 项）

### 2. 新闻抽屉 → 全屏 modal

走全屏覆盖（full-screen takeover），不是"把抽屉拉高一点"：

- 用户要的是"覆盖整页"，半屏抽屉再调高是妥协，不是解决
- z-index 不变（当前 `z-[130]`，高于 `MobileNavbar` 的 `z-[100]`，只要背景不透明就能完整遮住导航栏）
- 关键 CSS 调整：
  - `inset-x-0 bottom-0` → `inset-0`（四边贴齐）
  - `max-h-[86vh]` → `h-dvh` 或去掉高度限制（动态视口高度，规避 iOS Safari 地址栏收起的 100vh 坑）
  - `rounded-t-3xl` → 全部去掉（全屏不需要圆角）
  - `y: '100%'` 滑入 → 改为淡入 + 轻微缩放（`opacity + scale 0.98→1`），匹配"全屏接管"的心理模型，而非"从底部抽屉推上来"
  - 背景 `bg-white/65` 或 `bg-black/80` → 不透明 `bg-white` 或 `bg-[#0f0f0f]`，彻底盖住 MobileNavbar

### 3. 关闭交互：useBackClose + X 按钮

和项目已有的 Lightbox / CommunityDetailModal 模式保持一致：

- 右上角 X 按钮（`absolute top-4 right-4`，触摸热区 ≥ 40×40，lucide `X` icon size 24）
- 集成 `src/hooks/useBackClose.js`，硬件返回键/浏览器 back 都能关掉
- **注意**：React StrictMode 下 `useBackClose` 有 double-mount race（见 brain `failures/2026-04-17-strict-mode-history-back-race.md`），必须用 `setTimeout(0)` 推迟 `pushState`，否则第二次挂载的清理逻辑会把刚 push 的 history entry 消掉，表现是"modal 打开后立即关"
- 去掉"点击 backdrop 关闭" —— 全屏后没有可点的 backdrop；保留也无意义
- 内层 `CommunityNewsRail` 里已有的"返回列表"之类的逻辑（如果有的话）不受影响

### 4. 外层标题删除

移除 `AICommunity.jsx:179-190` 的外层 `<h3>新闻热榜</h3>` + X 块，把 X 按钮作为 absolute 定位放到 modal 容器右上角。CommunityNewsRail 内部 `Newspaper` icon + "新闻热榜" 标题本身就够了。

### 5. openAuthModal API 形态（plan 阶段核实）

本轮不预设 AuthContext 的对外 API。常见两种：

- (a) Context 已暴露 `openAuthModal()` → 直接用
- (b) Context 未暴露，但暴露了 `setShowAuthModal` → 直接用
- (c) 都没有 → 新增一条，最轻量化

/plan 阶段先 grep `AuthModal` / `showAuth` / `setShowAuth` / `openAuthModal` 的使用点，决定走哪条路。本 change 的 spec 只约束"未登录态点击我的 → 触发 AuthModal 展示"这个可观察行为，不约束内部 API。

## Risks / Trade-offs

| 风险 | 概率 | 缓解 |
|---|---|---|
| `useBackClose` StrictMode race 复发 | 中 | 套用 `useBackClose.js` 现有的 setTimeout(0) 实现；复用同一个 hook 而非自建 history 逻辑 |
| 全屏后没有 backdrop 感，用户不知道还能返回 | 低 | 右上角 X 按钮明显、尺寸足够、有 hover 动效（rotate-90） |
| `100dvh` 在老 Android WebView 不支持 | 低 | fallback 到 `min-h-screen`；主要目标是 iOS Safari 的 addressbar 坑 |
| AuthModal 登录成功后用户停留在原页（没自动跳 profile） | 中 | AuthContext 更新后用户下次点击"我的"才会跳；本轮不做"登录成功后自动 navigate"，保持和桌面端一致的行为。若后续反馈强烈，单独开 change |

## Out of Scope

- 桌面端 CommunityNewsRail（固定左侧 rail，不受影响）
- 新闻详情弹窗 `CommunityDetailModal`（已经是全屏，不改）
- 移动端其他 tab（首页/活动/播客）的未登录行为（若有类似问题单独开 change）
- "登录成功后自动 navigate 到个人主页"（故意不做，见 Risks 第 4 行）
- 下一轮其他移动端优化（收藏页、消息页移动适配等）
