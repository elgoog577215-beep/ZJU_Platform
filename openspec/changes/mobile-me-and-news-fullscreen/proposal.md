## Why

移动端两个具体 UX 坑，用户在日常使用中反馈：

### 1. 底部导航"我的"在未登录态 → 404
`MobileNavbar.jsx:27` 写死：`path: user ? \`/user/${user.id}\` : "/me"`。但 `/me` 这个路由**从未在 router 中注册**，点击直接撞 404 "页面不存在"。项目没有 `/login` 页面，站内登录一直走 `AuthModal`（桌面 Navbar 的"登录"按钮走的就是它），所以未登录态应当打开 AuthModal 而不是导航到空路由。

### 2. AI 社区"新闻"入口在移动端是半屏抽屉，难操作
`AICommunity.jsx:160-194` 把 `CommunityNewsRail` 包在一个 `max-h-[86vh]` 的底部抽屉里（`absolute inset-x-0 bottom-0`，`rounded-t-3xl`）。移动端体验有三个问题：
- 抽屉只占下半屏，上半屏是半透明 backdrop + 一些"透"出来的 AI 社区页内容
- 底部 `MobileNavbar`（`z-[100]`）从半透明 backdrop 下透出来，压住抽屉底部的新闻列表，很容易误触到"我的/播客"等 tab
- 抽屉外层有一个"新闻热榜"标题 + X 关闭，内层 `CommunityNewsRail` 自己也有"新闻热榜"标题 —— 重复占行

用户明确要求："改成覆盖整页，点击右上角 X 返回"。

## What Changes

### Capability `mobile-ux`（新增）
- `MobileNavbar` "我的" 按钮：
  - 已登录：继续跳 `/user/${user.id}`（现状保留）
  - 未登录：不再跳 `/me`，改为打开全站复用的 `AuthModal`
- AI 社区"新闻"入口在移动端：
  - 从 bottom-sheet 抽屉改为**全屏覆盖 modal**（`fixed inset-0`，不透明背景）
  - X 关闭按钮位于**右上角**，触摸热区 ≥ 40×40px
  - 点击 X / 浏览器返回键（经 `useBackClose`）/ 点击背景（全屏后此项可去掉）→ 关闭
  - 去掉外层"新闻热榜"标题，只保留内层 `CommunityNewsRail` 自身的标题，消除冗余
  - 用 `100dvh` 代替 `86vh`，规避 iOS Safari 地址栏动态收起导致底部截断

### Out of Scope
- 桌面端任何表现（当前桌面端 `<CommunityNewsRail />` 是固定在左侧的 rail，不受影响）
- `CommunityNewsRail` 组件内部结构调整
- 其他移动端 tab（首页/活动/播客）的行为
- `CommunityDetailModal`（点具体新闻条目后的详情弹窗，本轮确认已经是全屏）

## Capabilities

### New Capabilities
- `mobile-ux`: 移动端导航与内容覆盖层的交互规范，本轮涵盖"我的"入口分流和"新闻"全屏化两条。

### Modified Capabilities
- None.

## Impact

- **受影响文件**：
  - `src/components/MobileNavbar.jsx` —— "我的" 分流逻辑
  - `src/components/AICommunity.jsx` —— 新闻抽屉 → 全屏 modal
  - 可能触及 `src/context/AuthContext.jsx` —— 若 `openAuthModal()` 尚未在 context 暴露，需新增一条导出（等 /plan 阶段核实）
- **受影响后端**：无
- **数据库**：无
- **回滚策略**：动工前打 `git tag pre-mobile-ux-v1`，改动全在前端，代码回滚即可，无迁移
- **风险**：
  - 低：`openAuthModal` 可能未从 context 暴露；需在 plan 阶段先确认，若缺失则加一条小修
  - 低：全屏 modal 的 `useBackClose` 集成需要和已有 Lightbox 一样小心处理 StrictMode double-mount（已有 `2026-04-17-strict-mode-history-back-race` 的 brain failure 经验，套用相同的 `setTimeout(0)` 模式）
