## 0. Rollback Checkpoint

- [x] 0.1 动工前打 tag：`git tag pre-mobile-ux-v1`，作为本轮回滚锚点。
- [x] 0.2 工作区干净确认；若有未提交改动，先 commit 或 stash（参照上一轮 `unify-notification-content` 的 Task 0 流程）。

## 1. AuthModal 接口核实（前置调研 — /plan 阶段已完成）

- [x] 1.1 已确认：`Navbar.jsx:159-163` 监听 `window` 上的 `"open-auth-modal"` 自定义事件（`setIsAuthOpen(true)`）。AuthContext 未暴露 `openAuthModal`，但已有事件总线机制。
- [x] 1.2 决策：**不改 AuthContext**。`MobileNavbar` 调用 `window.dispatchEvent(new Event('open-auth-modal'))` 即可。Navbar 在移动端也挂载（仅 DOM 用 `md:hidden` 隐藏），AuthModal 始终在 DOM 中可被唤起。

## 2. Mobile "我的" 按钮分流

- [x] 2.1 修改 `src/components/MobileNavbar.jsx:27`：`navItems` 里"我的"条目的 `path` 字段在未登录态设为 `null`（不再硬编码 `/me`）。
- [x] 2.2 渲染侧在 `navItems.map` 内对 "me" 做条件分支：已登录渲染 `<Link to={\`/user/${user.id}\`}>`，未登录渲染 `<button type="button" onClick={() => window.dispatchEvent(new Event('open-auth-modal'))}>`，复用同一套视觉样式（icon + label + active 状态）。
- [x] 2.3 `isItemActive` 的 "me" 分支更新：去掉对 `/me` 的判断（路径永不匹配），只保留 `location.pathname.startsWith('/user/')`。未登录态下 AuthModal 浮起时不标记 active。
- [x] 2.4 确保 `aria-label` 和 `focus-visible:ring-*` 样式在 button/Link 两种分支下一致；`<button>` 不受路径导航影响（no href / no `<a>`）。

## 3. 新闻入口全屏覆盖

- [x] 3.1 `src/components/AICommunity.jsx:160-194` 外层 `motion.div` 的 className：
  - `inset-x-0 bottom-0` → `inset-0`
  - 去掉 `max-h-[86vh]`、`rounded-t-3xl`
  - 背景 `bg-black/80` / `bg-white/65` → 不透明 `bg-[#0f0f0f]` / `bg-white`
- [x] 3.2 入场动画：`y: '100%'` → `opacity + scale 0.98→1`（或纯 `opacity`）。
- [x] 3.3 删除外层 `<h3>新闻热榜</h3>` + X 的容器（`AICommunity.jsx:179-190`）。
- [x] 3.4 X 按钮改成 `absolute top-4 right-4`，尺寸 40×40，lucide `X` size 24；触摸热区用 `p-2` 以上。
- [x] 3.5 集成 `useBackClose` hook：`useBackClose(isMobileNewsOpen, () => setIsMobileNewsOpen(false))`（两参数签名；hook 内部用 `useId()` 生成唯一 hash，无需传 key）。
- [x] 3.6 高度兼容：容器再嵌一层 `h-[100dvh]`（或 inline style fallback `min-height: 100vh`），防 iOS Safari addressbar 收起截断。
- [x] 3.7 保留原 `searchParams.get('news')` → `setIsMobileNewsOpen(true)` 的副作用（深链可打开），确认关闭时 URL 清理 `news=` 参数（现状应该已处理，走 `updateParams({ tab: currentTab })` 路径）。

## 4. Verification

- [ ] 4.1 Chrome DevTools iPhone 16 Pro 预设：
  - 未登录点"我的" → AuthModal 弹出，不跳 `/me`
  - 登录成功后再点"我的" → 跳 `/user/${id}`
- [ ] 4.2 同预设：点 AI 社区"新闻热榜"入口 → 全屏覆盖，底部 MobileNavbar 不可见；右上角 X 点击关闭；硬件返回（或 devtools 的 back 按钮）也能关闭。
- [ ] 4.3 StrictMode 自检：dev 模式打开覆盖层，观察是否存在打开后立即关闭的 double-mount race；若有，对 `useBackClose` 的调用套 `setTimeout(0)` 模式。
- [ ] 4.4 iOS Safari 真机（或 Safari macOS 响应式设计模式）确认 `100dvh` 下地址栏显隐都不截断内容。
- [ ] 4.5 深链测试：直接访问 `/articles?news=<id>` → `isMobileNewsOpen` 自动为 true，覆盖层自动打开。
- [ ] 4.6 Accessibility：`aria-label` 在 X 按钮 / "我的" button（未登录态）上存在；focus-visible ring 正常。

## 5. Follow-up

- [ ] 5.1 本轮在真实设备上跑满两天无回归反馈 → 考虑下一轮把其他移动端 overlay（收藏页、消息页等）统一到同一套"全屏 + useBackClose"模式。
- [ ] 5.2 若用户反馈"登录成功后希望自动跳到个人主页"，开单独 change `mobile-auth-success-auto-navigate`。

---

> Plan: docs/superpowers/plans/2026-04-17-mobile-me-and-news-fullscreen.md（/plan 阶段生成）
