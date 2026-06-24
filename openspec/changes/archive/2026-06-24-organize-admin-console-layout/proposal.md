## Why

管理员后台现在已经有完整功能、快捷跳转、滚动回位和较多运营信息，但界面开始显得“满”：顶部状态、跳转控件、说明文字、卡片、提示条和重复行动入口同时出现，管理员需要花时间判断哪里是导航、哪里是页面状态、哪里是主要操作。

本轮深度扫描需要处理的问题：

- 顶部区域同时承担标题、描述、模块元信息、退出、快速跳转、上一/下一模块，视觉重心偏散。
- 侧栏每个菜单项都有描述，桌面宽度下可读但显得厚重，移动端抽屉也增加滚动负担。
- 总览页重复出现“审核中心 / 活动管理 / 今天先做什么”等行动区，内容顺序偏像卡片堆叠。
- 总览页资源统计、运营快照、系统状态、活动数据都很有用，但缺少清楚的“待办优先 → 内容概况 → 活动与系统”的阅读路线。
- 资源管理页指标、提示条、筛选、列表区域之间边界较多，说明文案过长，工作流不够清爽。
- 共享后台组件的圆角和间距偏大，适合展示型页面，但对后台工作台来说可以更紧凑、更安静。

## What Changes

- 新增 `admin-layout-organization` 能力规格，定义管理员后台信息层级、导航密度、页面结构和整洁度要求。
- 重组管理员外壳顶部：标题和当前模块状态合并为更清晰的工作台头部，快速跳转放入独立工具行，减少信息堆叠。
- 精简侧栏导航：保留分组、图标、名称和当前状态，弱化或仅在当前项显示说明，提升扫描速度。
- 调整共享 Admin UI 组件：降低圆角、阴影和纵向间距，让后台更像操作工具而不是展示页面。
- 重排总览页：形成“今日优先事项 → 内容概况 → 活动与系统”三段式结构，去掉重复行动区。
- 收敛资源页：将筛选状态说明做成更紧凑的列表状态行，减少提示条重量。
- 更新管理员 e2e，覆盖新的工具行、整洁导航、总览结构和资源页状态行。

## Capabilities

### New Capabilities

- `admin-layout-organization`: Defines organized admin console layout, calmer navigation density, clearer page hierarchy, compact operational surfaces, and regression coverage.

## Impact

- Affected frontend files:
  - `src/components/Admin/AdminDashboard.jsx`
  - `src/components/Admin/AdminUI.jsx`
  - `src/components/Admin/Overview.jsx`
  - `src/components/Admin/ResourceManager.jsx`
  - `src/index.css`
- Affected tests:
  - `e2e/admin-console.spec.js`
- Backend/API impact:
  - No API contract changes.
  - No database changes.
- Rollback strategy:
  - Revert this frontend/test change set. No data migration or backend rollback is required.
