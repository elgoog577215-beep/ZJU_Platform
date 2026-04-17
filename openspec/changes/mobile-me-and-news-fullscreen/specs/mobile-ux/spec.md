## ADDED Requirements

### Requirement: Mobile Profile Tab Routing

移动端底部导航的"我的"按钮 SHALL 根据登录态分流，MUST NOT 在任何状态下导航到未注册的路由。

- 已登录（`useAuth().user` 非空）SHALL 导航到 `/user/${user.id}`。
- 未登录（`useAuth().user` 为空）SHALL 触发全站统一的登录弹窗（`AuthModal`），MUST NOT 导航到 `/me` 或其他未注册路径。

#### Scenario: Logged-in user taps "我的"

- **GIVEN** 用户已登录，`AuthContext` 暴露的 `user.id === 42`
- **WHEN** 在移动端底部导航栏点击"我的"
- **THEN** 路由导航到 `/user/42`，展示该用户的 `PublicProfile` 页面

#### Scenario: Logged-out user taps "我的"

- **GIVEN** 用户未登录，`AuthContext` 的 `user === null`
- **WHEN** 在移动端底部导航栏点击"我的"
- **THEN** 不发生路由跳转（`location.pathname` 不变），`AuthModal` 被触发展示在当前页之上

#### Scenario: Login succeeds from the modal

- **GIVEN** 未登录用户因点击"我的"而打开了 `AuthModal`
- **WHEN** 用户在弹窗内完成登录，`AuthContext.user` 刷新为已登录
- **THEN** `AuthModal` 关闭；用户停留在原页面；再次点击"我的"时按已登录分支走 `/user/${user.id}`

---

### Requirement: Mobile News Entry Full-Screen Overlay

移动端在 AI 社区页点击"新闻热榜"入口 SHALL 触发全屏覆盖层（full-screen takeover），MUST NOT 使用 bottom sheet / drawer 样式。

- 覆盖层 SHALL 占据整个视口（`position: fixed`，`inset: 0`，高度 `100dvh` 或等价的动态视口高度）。
- 覆盖层背景 MUST 不透明，以完全遮盖下方的移动端底部导航栏（`MobileNavbar`）。
- 覆盖层 MUST 位于 `MobileNavbar` 之上（z-index 高于 `MobileNavbar` 的层级）。
- 关闭按钮（X）SHALL 位于覆盖层的右上角，触摸热区尺寸 MUST ≥ 40×40 CSS px。
- 覆盖层 SHALL 集成项目已有的 `useBackClose` hook，使硬件返回键 / 浏览器 back 能关闭覆盖层。
- 覆盖层 MUST NOT 在打开/关闭时让 StrictMode 下的 double-mount 导致"打开后立即自关"（遵循 brain `failures/2026-04-17-strict-mode-history-back-race.md` 的 `setTimeout(0)` 防护模式）。

#### Scenario: Opening news entry on mobile

- **GIVEN** 用户在移动端的 AI 社区页面（`/articles`），屏幕可见 `MobileNavbar`
- **WHEN** 点击"新闻热榜"入口
- **THEN** 屏幕被不透明覆盖层完全占据；`MobileNavbar` 视觉上不可见；右上角可见 X 关闭按钮；覆盖层内渲染 `CommunityNewsRail` 的内容

#### Scenario: Closing via X button

- **GIVEN** 新闻全屏覆盖层已打开
- **WHEN** 用户点击右上角 X 按钮
- **THEN** 覆盖层关闭并消失；`MobileNavbar` 重新可见；URL 恢复到点击前的状态（无 `news=` 等残留）

#### Scenario: Closing via hardware back

- **GIVEN** 新闻全屏覆盖层已打开
- **WHEN** 用户按下硬件返回键 / 浏览器 back 按钮
- **THEN** 行为等同点击 X 关闭；不发生路由回退到上一个页面

#### Scenario: StrictMode double-mount safety

- **GIVEN** 开发环境 React 以 `StrictMode` 模式运行
- **WHEN** 用户触发打开新闻覆盖层
- **THEN** 覆盖层正常打开并保持打开状态，MUST NOT 在挂载后立即因 `useBackClose` 的 cleanup/remount 循环而自动关闭

---

### Requirement: Mobile News Overlay Header Deduplication

移动端新闻全屏覆盖层 MUST NOT 在容器外层额外渲染"新闻热榜"标题，以避免与内层 `CommunityNewsRail` 自身的标题重复。

- 覆盖层容器只 SHALL 包含 X 关闭按钮（绝对定位在右上角）+ `CommunityNewsRail` 组件本身
- 外层 `<h3>新闻热榜</h3>` + X 的包裹块 SHALL 被移除

#### Scenario: Overlay opens without duplicate title

- **GIVEN** 新闻全屏覆盖层被触发打开
- **WHEN** 渲染完成
- **THEN** 视觉上只出现一处"新闻热榜"标题（来自 `CommunityNewsRail` 内部），顶部仅剩 X 关闭按钮浮在右上角
