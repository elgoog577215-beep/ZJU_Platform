## 1. 修复 Dropdown 文字截断 bug

- [x] 1.1 在 `src/components/Dropdown.jsx` 触发按钮中，将 `truncate` 从外层 `div.flex.items-center.gap-3` 移除，改为在 `<span>` 上加 `truncate min-w-0 flex-1`，确保图标不被截断
- [x] 1.2 在下拉菜单选项的 `<span className="truncate pr-2">` 上加 `min-w-0`，确保勾选图标始终可见

## 2. 修复默认排序

- [x] 2.1 在 `src/components/Events.jsx` 中将 `useState('newest')` 改为 `useState('date_desc')`

## 3. 后端：/tags 接口支持属性过滤

- [x] 3.1 在 `server/src/controllers/tagController.js` 的 `getTags` 函数中，当 `targetTable === 'events'` 时，读取 `req.query` 中的 `organizer`、`location`、`target_audience` 参数，将其追加到 `whereClause`（参数化查询，防止 SQL 注入）
- [x] 3.2 验证：请求 `/tags?type=events&organizer=某主办方` 时，返回的标签计数仅统计该主办方的活动

## 4. TagFilter 接收 filters prop

- [x] 4.1 在 `src/components/TagFilter.jsx` 中增加 `filters` prop（默认值 `{}`）
- [x] 4.2 修改 `fetchTags` 函数，将 `filters` 中非空的键值对作为额外 query params 传入 `api.get('/tags', { params: { type, ...activeFilters } })`
- [x] 4.3 将 `filters` 加入 `useCallback` 的依赖数组，确保 filters 变化时重新获取

## 5. 新建 EventFilterPanel 组件

- [x] 5.1 新建 `src/components/EventFilterPanel.jsx`，接收 props：`filters`、`onFiltersChange`、`selectedTags`、`onTagsChange`、`lifecycle`、`onLifecycleChange`、`sort`、`onSortChange`、`refreshTrigger`
- [x] 5.2 在面板内依次渲染：`AdvancedFilter`、`TagFilter`（传入 `filters` prop）、生命周期 `Dropdown`、`SortSelector`
- [x] 5.3 实现全局"清除所有筛选"按钮：当 `filters` 有非空值或 `selectedTags.length > 0` 或 `lifecycle !== 'all'` 时显示；点击后调用各自的 reset 回调
- [x] 5.4 统一面板视觉容器（单一卡片背景、圆角、边框），与现有 `AdvancedFilter` 卡片风格一致

## 6. 在 Events.jsx 中替换筛选区域

- [x] 6.1 在 `src/components/Events.jsx` 中 import `EventFilterPanel`，移除对 `AdvancedFilter`、`TagFilter`、生命周期 `Dropdown`、`SortSelector` 的直接引用（在 JSX 渲染部分）
- [x] 6.2 将原有三个筛选区域的 JSX 替换为单个 `<EventFilterPanel>` 并传入所有状态 props
- [x] 6.3 确认 `filterVersion`（refreshTrigger）仍正确传入 `EventFilterPanel` → `AdvancedFilter`

## 7. 验证

- [x] 7.1 在浏览器中验证：选择一个长名称主办方，下拉按钮中图标和文字均正常显示（文字省略号截断，图标完整）
- [x] 7.2 验证：选择主办方后，标签筛选区域的标签列表和计数发生变化
- [x] 7.3 验证：首次加载活动页面，排序选择器显示"日期（最晚）"，活动按日期倒序排列
- [x] 7.4 验证：点击"清除所有筛选"后，所有筛选条件重置，活动列表恢复完整显示
