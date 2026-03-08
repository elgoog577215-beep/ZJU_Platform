## Why

活动筛选界面存在三个独立的 UX 问题：下拉框中公众号名字被截断无法看全、标签旁的数量徽章在属性筛选变化后不更新、默认排序不符合用户预期（应按日期最晚优先）。三个筛选栏（属性筛选、标签筛选、生命周期+排序）各自独立、视觉割裂，需要整合重构为统一的筛选 UI。

## What Changes

- 修复 `Dropdown` 组件中选项文字被 `truncate` 截断的问题，改为允许换行或使用 tooltip 显示完整名称
- 修复 `TagFilter` 中 `tag.count` 不响应 `AdvancedFilter` 属性筛选变化的问题——当属性筛选（organizer、location、target_audience）变化时，标签列表及其计数应重新从服务端获取（传入当前 filters 作为参数）
- 将默认排序从 `'newest'`（按 id 倒序）改为 `'date_desc'`（按日期倒序），使未开始的活动排最前、进行中居中、已结束排末尾
- 将三个筛选区域（`AdvancedFilter`、`TagFilter`、生命周期 Dropdown + `SortSelector`）重构为一个统一的 `EventFilterPanel` 组件，共享状态、统一视觉风格，并提供整体清除功能

## Capabilities

### New Capabilities

- `event-filter-panel`: 统一的活动筛选面板，整合属性筛选、标签筛选、生命周期和排序，共享筛选状态，支持一键清除所有筛选条件

### Modified Capabilities

- `event-datetime`: 默认排序逻辑变更——从 `newest`（id 倒序）改为 `date_desc`（日期倒序），影响活动列表的默认展示顺序

## Impact

- `src/components/AdvancedFilter.jsx`：可能被新组件吸收或保留为子组件
- `src/components/TagFilter.jsx`：需接收 `filters` prop 以便在属性筛选变化时重新获取带过滤的标签计数
- `src/components/SortSelector.jsx`：整合进新面板
- `src/components/Dropdown.jsx`：修复下拉菜单选项的文字截断问题
- `src/components/Events.jsx`：默认 sort 状态从 `'newest'` 改为 `'date_desc'`；筛选区域替换为新的 `EventFilterPanel`
- 后端 `/tags` 接口：需支持接收 `location`、`organizer`、`target_audience` 等过滤参数，以返回过滤后的标签计数
