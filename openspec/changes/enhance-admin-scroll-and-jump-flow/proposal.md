## Why

上一轮管理员后台已经完成视觉体系、资源表格、黑客松管理和基础回归测试，但实际运营会遇到更细的“长页面效率”问题：模块多、列表长、移动端抽屉长，管理员频繁切换时容易丢失当前位置，也缺少从当前模块快速跳到另一个模块的入口。

本轮深度扫描需要继续处理的问题：

- 顶部只展示当前模块信息，没有直接的快速跳转、上一模块、下一模块控制，长时间运营时切换路径偏长。
- 从页面底部或移动抽屉切换模块后，主内容区域不会显式回位和聚焦，容易停留在旧页面滚动位置。
- 管理端长页面缺少浮动回顶控制，用户必须手动滚动回顶部才能重新操作全局导航。
- 资源管理页搜索或状态筛选后，用户仍可能停在指标区或说明区，不能立即看到筛选结果。
- 桌面资源表格在数据较多时整页滚动，表头离开视口后会降低扫描效率。
- 现有管理员 e2e 尚未覆盖快速跳转、回顶、筛选定位和粘性表格等更细的操作行为。

## What Changes

- 新增 `admin-scroll-navigation-flow` 能力规格，定义管理员后台滚动、跳转、定位和长列表浏览要求。
- 优化后台外壳：增加顶部快速跳转选择器、上一/下一模块按钮、模块切换后的主内容回位和可聚焦锚点。
- 增加浮动回到顶部按钮，并在滚动到一定距离后显示，支持键盘与屏幕阅读器标签。
- 优化资源管理：搜索、清空搜索、状态筛选、分页后自动定位到列表区域，并提供列表跳转入口。
- 优化共享表格容器：支持最大高度、内部滚动、稳定滚动条和粘性表头。
- 扩展 Playwright 管理员回归，覆盖桌面快速跳转、回顶、资源筛选与移动端导航无滚动泄漏。

## Capabilities

### New Capabilities

- `admin-scroll-navigation-flow`: Defines scroll, jump, focus restoration, sticky table, and long-list navigation behavior for the admin console.

## Impact

- Affected frontend files:
  - `src/components/Admin/AdminDashboard.jsx`
  - `src/components/Admin/AdminUI.jsx`
  - `src/components/Admin/ResourceManager.jsx`
  - `src/index.css`
- Affected tests:
  - `e2e/admin-console.spec.js`
- Backend/API impact:
  - No API contract changes.
  - No data model changes.
- Rollback strategy:
  - Revert the frontend and e2e edits from this change. No server or database rollback is required.
