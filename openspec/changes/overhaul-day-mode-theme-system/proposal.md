## Why

当前白天模式的主要问题不是单点配色失误，而是整套界面仍沿用黑夜模式的视觉结构，再通过局部 `isDayMode` 分支和全局类名覆写把页面“漂白”。这带来了三个直接后果：

- 首页首屏、内容卡片和详情弹层在白天模式下出现可读性不足、层级发雾、夜间残留压边等问题。
- 白天模式依赖 `.text-white`、`.bg-black/20`、`.border-white/10` 这类反向覆写，导致主题系统不可预测，新增页面容易继续复制补丁。
- 前台与管理后台没有共享的主题语义层，审美和功能界面都难以稳定维护。

这次改造需要把白天模式提升为一套独立成立、具有艺术感和精致感的主题表达：允许它与黑夜模式在关键区块上明显分化，但仍建立统一的主题 token 和回归边界，避免后续再次退化为临时修补。

## What Changes

- 为前台与管理后台建立统一的语义化主题 token 层，覆盖背景、容器、边框、文本、遮罩、阴影和强调色，减少对白天模式补丁类的依赖。
- 重构白天模式的关键视觉区块，包括首页首屏、导航、内容卡片、列表页、详情弹层、搜索/上传面板、个人页和后台高频容器，确保白天模式不再沿用夜间结构的强发光、强暗罩和重雾化。
- 保留昼夜切换入口与现有组件边界，但允许白天模式在首页首屏、导航、卡片和后台容器等关键区块采用与黑夜模式明显不同的层级和视觉组织。
- 为背景系统和首屏特效建立按模式区分的约束，白天模式默认降级 Bloom、Vignette、发光球和高对比暗罩，优先保证焦点、阅读性和精致感。
- 为高频共享组件建立主题使用规则，新增或改造组件优先消费语义 token，而不是继续堆叠 `isDayMode` 里的硬编码色值。
- 增加白天模式的视觉回归验证，覆盖前台关键页和至少一个后台页面，确保黑夜模式不回归，白天模式在桌面端与移动端都稳定。

## Capabilities

### New Capabilities
- `ui-theme-system`: Provide a shared semantic theme layer for public-site and admin UI, with distinct day/night expressions and reusable tokens for surfaces, text, overlays, borders, shadows, and accent states.

### Modified Capabilities
- `overview`: The repository overview now includes a cross-app theme system that governs public pages and admin surfaces, rather than relying on page-local day-mode overrides.

## Impact

- Affected frontend foundation:
  - `src/index.css`
  - `src/context/SettingsContext.jsx`
  - `src/components/BackgroundSystem.jsx`
- Affected public UI areas:
  - `src/components/Hero.jsx`
  - `src/components/Navbar.jsx`
  - `src/components/HomeCategories.jsx`
  - content listing and detail components such as `Articles.jsx`, `Videos.jsx`, `Gallery.jsx`, `Events.jsx`, `SearchPalette.jsx`, `PublicProfile.jsx`
- Affected admin UI areas:
  - `src/components/Admin/*`
- No database migration is required.
- Main risk areas are visual regressions, insufficient contrast in white surfaces, and theme drift between legacy components and token-driven components.
- Rollback remains straightforward: revert the theme-system change set and restore the prior CSS/token mapping without data loss.
