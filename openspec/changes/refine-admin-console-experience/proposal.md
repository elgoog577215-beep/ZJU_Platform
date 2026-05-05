## Why

管理员后台已经覆盖内容、审核、用户、留言、社区和黑客松等核心运营工作，但界面细节仍像多个模块的集合：高频页面的视觉语言、移动端结构、表格扫描效率、批量操作反馈和回归验证不够一致。现在需要把后台从“能管理”推进到“精细、稳定、可持续运营”，让管理员能更快判断状态、更少误操作，并在桌面和移动视口下都有可信体验。

本轮深度扫描列出需要优先处理的问题：

- 后台首页与资源页已经有共享组件，但部分页面仍使用局部深色类名，白天模式和后台主题 token 的一致性不足。
- 移动端导航抽屉可用，但缺少更明确的当前模块上下文、模块密度提示和全局操作入口分层。
- 资源管理页的客户端状态筛选与服务端总数表达容易混淆，批量选择后缺少足够清晰的范围提示。
- 资源列表在移动端和桌面端分别渲染，但卡片/表格没有完全消费共享主题，浅色模式下存在残留深色样式。
- 黑客松报名管理仍是独立浅色页面风格，和 AdminPageShell/AdminPanel/AdminButton 等后台系统不一致。
- 确认弹窗、空状态、加载状态和危险操作反馈能用，但缺少更细的焦点、键盘关闭和 aria 语义。
- 现有 e2e 只覆盖前台 smoke 和少量公共流程，没有管理员界面的自动回归，无法保证后续优化不破坏后台。

## What Changes

- 新增 `admin-console-experience` 能力规格，定义管理员后台在信息架构、视觉精细度、响应式、操作反馈、可访问性和验证上的要求。
- 优化后台外层仪表盘：增强当前模块上下文、导航层级、移动端抽屉状态、顶部状态栏和返回前台/退出操作的清晰度。
- 强化共享 Admin UI 组件：补齐精细的加载、空状态、指标、按钮、筛选 chip、表格、确认弹窗、图标操作按钮和辅助文本样式。
- 优化资源管理页：明确筛选统计范围、选中范围、批量操作风险、移动卡片/桌面表格视觉一致性和分页信息。
- 将黑客松报名管理迁移到共享后台 UI 体系，统一搜索、筛选、指标、表格、分页、导出和删除确认体验。
- 增加管理员后台 Playwright 回归，使用前端路由和 API mock 覆盖总览、导航、资源页、移动抽屉与关键操作入口。
- 不引入新的后端 API、数据库字段或外部依赖。

## Capabilities

### New Capabilities

- `admin-console-experience`: Defines the refined admin console requirements for navigation, dashboard context, management tables, responsive behavior, action feedback, accessibility, and regression coverage.

### Modified Capabilities

- `overview`: Repository overview is extended by an implementation change that improves the existing admin console, without altering the descriptive overview requirement itself.

## Impact

- Affected frontend files:
  - `src/components/Admin/AdminDashboard.jsx`
  - `src/components/Admin/AdminUI.jsx`
  - `src/components/Admin/Overview.jsx`
  - `src/components/Admin/ResourceManager.jsx`
  - `src/components/Admin/HackathonManager.jsx`
  - `src/index.css`
- Affected tests:
  - New or updated Playwright coverage under `e2e/`.
- Backend/API impact:
  - No API contract changes.
  - No data model changes.
  - Existing admin endpoints continue to be consumed as-is.
- Rollback strategy:
  - Revert this change set to restore the prior admin UI. Because no data migration or backend contract change is introduced, rollback has no data recovery step.
