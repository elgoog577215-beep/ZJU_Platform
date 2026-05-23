## Why

当前站点正处在从圆角视觉向直角视觉过渡的阶段，首页和 AI 社区已经出现较好的硬朗方向，但活动页、视频页、导航、移动底栏和高频控件仍混用大圆角、玻璃拟态、强发光和渐变阴影，导致整体显得不统一。

本变更的目标是在不改业务逻辑、不改接口和不改数据模型的前提下，把站点统一成更漂亮、更克制、更有信息平台感的直角设计系统。

## What Changes

- 建立全站直角视觉规则：主容器、卡片、筛选栏、表单、弹窗和导航默认使用硬边或极小圆角，避免旧版 `rounded-2xl`、`rounded-3xl`、`rounded-full` 泛滥。
- 清理旧玻璃拟态和发光渐变：降低 `backdrop-blur`、强阴影、紫蓝渐变和发光 hover 的存在感，改用边框、块面、层级和轻量交互状态表达质感。
- 重做桌面导航和移动导航的形态：让顶部导航、移动顶部栏和底部导航成为全站直角系统的基准组件。
- 重点打磨活动页和视频页：把活动页从圆角卡片墙收束成清晰的信息发现工具，把视频页从旧娱乐平台卡片风格收束成硬边内容资产展示。
- 统一高频表单与弹层入口：优先覆盖管理员登录、搜索、筛选、上传入口等高频控件的直角语言，上传弹窗深度重构作为后续专项，不在本轮一次性大改。

## Capabilities

### New Capabilities

- `rectilinear-ui-system`: 定义站点直角视觉系统的用户可见要求，包括形状、表面、导航、活动列表、视频列表、移动端和高频交互控件的一致性。

### Modified Capabilities

- 无。本变更不改变现有业务能力、接口契约或数据模型。

## Impact

- 主要影响前端组件和样式：
  - `src/index.css`
  - `src/components/Navbar.jsx`
  - `src/components/MobileNavbar.jsx`
  - `src/components/Events.jsx`
  - `src/components/Videos.jsx`
  - `src/components/Admin/AdminAccessGate.jsx`
  - 可能涉及 `SearchPalette.jsx`、`EventFilterPanel.jsx`、`UploadModal.jsx` 中少量高频入口样式。
- 不涉及后端 API、SQLite 表结构、鉴权逻辑、上传流程和路由语义。
- 风险主要来自 Tailwind 类名变更导致的响应式布局偏差，需要通过桌面端、移动端截图和 `npm run build` 验证。
- 回滚策略：本轮改动保持在前端样式和局部布局内，如出现明显视觉或交互回归，可按文件级 diff 回退对应组件，不需要数据库或接口回滚。
