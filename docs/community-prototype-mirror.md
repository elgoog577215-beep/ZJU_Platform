# 社区模块：原型 UI 高保真 mirror

本文记录将 `ui` 仓库中 **ZJU AI 社区静态原型**（`docs/superpowers/prototype/zju-ai-community*.html/css/js`）迁移到本平台 React 路由 **`/community/*`** 的实现要点，便于评审与后续迭代。

## 目标

- 仅在 **`.zju-community-mirror`** 作用域内应用皮肤与布局，避免污染全站。
- **昼夜**：`data-zcu-theme="light" | "platform"`，与 `SettingsContext` 的 `day` / `dark` 对齐。
- 排布、字阶、动效、播客浮窗等行为尽量贴近原型（含 Signal 层 Hero、列表 stagger、侧栏脉搏等）。

## 文件结构

| 路径 | 说明 |
|------|------|
| `src/community/CommunityLayout.jsx` | 根节点 `zju-community-mirror`、mirror CSS、面包屑、`Outlet`、侧栏、播客；dev 下健康检查冒烟 |
| `src/community/CommunityMirrorChrome.jsx` | 顶栏：`site-head` + **`site-head-inner`**（与主内容同宽居中）、`NavLink` 版块、主题、搜索、`details` 发帖菜单 |
| `src/community/CommunitySectionPage.jsx` | `help` / `tech` / `rules` 等版块：原型类名与结构 |
| `src/community/CommunitySidebar.jsx` | 侧栏卡片、脉搏、快捷链接、推荐作者 |
| `src/community/CommunityPodcastFloat.jsx` | 播客浮窗：折叠 + **方案 C**（拖动、贴边成球、`ORB=56`、小球纵向滑动、Enter 展开） |
| `src/community/constants.js` | 版块 slug、`HELP_PREVIEW_ROWS`、标签 key 列表 |
| `src/community/zju-community-mirror.css` | 集中样式：token、`--zcu-shell-max`、栅格、Hero、feed、侧栏、播客、`prefers-reduced-motion` |
| `src/services/platformClient.js` | 社区 dev 冒烟：`/api/health`、`/api/auth/me` 等轻量封装 |
| `index.html` | 补充原型字体：**Figtree、Newsreader、Syne**（与 CSS 变量一致） |

## 布局与居中

- **`--zcu-shell-max`**：`calc(100vw - clamp(2.25rem, 8vw, 6rem))`，控制顶栏内层、面包屑、主栅格统一最大宽度，整体略向视口中间收。
- **栅格**：`grid-template-columns: minmax(0, 1fr) min(24rem, 40%)`，主栏吃剩余、右侧栏加宽。
- **顶栏**：外层全宽毛玻璃条，**`.site-head-inner`** 使用与正文相同的 `max-width` + `margin: 0 auto`，避免「顶栏贴边、正文缩进」的错位感。

## 字阶与阅读

- 在 `.zju-community-mirror` 内定义 **`--fs-body` ~ `--fs-row-title`** 等；正文约 **18px** 级、列表标题 **24px** 级，区块间距 **`--section-gap`** 偏大，优先可读性（接受更长页面滚动）。
- 列表行：**`row-feed`** 纵向 padding 加大，色条略粗；**`.row-title`** 字重 600。

## 播客浮窗

- 展开态宽度约 **`min(340px, 100vw - 28px)`**。
- **桌面**：`bottom: calc(16px + safe-area)`，贴近原型贴底；**窄屏**：`88px` 避开移动底栏。
- 行为协议与原型 `zju-ai-community.js` 中 `initPodcastFloatSchemeC` 一致（Pointer Events、`pod-is-anim`、无障碍 `aria-label`）。

## 国际化

- 社区 mirror 文案集中在 **`public/locales/zh/translation.json`** 与 **`en/translation.json`** 的 `community.*`（含 `proto_*`、`sb_*`、`podcast_*`、`badge_*`、`tag_*`、`rules_*` 等）。
- 其它语言文件若仅有少量 fallback，以现有仓库改动为准。

## 联调与构建

- 本地全栈：`npm run dev`（或 `dev:full`），前端端口见 `package.json`/`vite.config`；社区路径 **`/community/help`** 等。
- 更详细的 API 与冒烟说明见同目录 **[COMMUNITY_DEV.md](../COMMUNITY_DEV.md)**。

## 后续可选项（未列入本次必做）

- 版块与 `articles`/标签存储映射确认后，接通真实列表与发帖（OpenSpec 等任务）。
- 若需与其它语言文案完全对齐，可批量补全 `ar`/`es`/… 下 `community` 键。
