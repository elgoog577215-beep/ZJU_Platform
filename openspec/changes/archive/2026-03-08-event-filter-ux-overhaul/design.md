## Context

活动页面（`Events.jsx`）目前有三个独立的筛选区域：

1. `AdvancedFilter`：属性筛选（organizer、location、target_audience），有自己的卡片容器
2. `TagFilter`：标签筛选，有自己的卡片容器，标签计数从 `/tags?type=events` 获取，**不感知当前属性筛选状态**
3. 生命周期 `Dropdown` + `SortSelector`：并排放在一个 `grid` 里，无容器

三个区域各自独立，视觉上割裂，且存在以下已知 bug：
- `Dropdown` 的触发按钮内 `<span>` 没有 `min-w-0`，外层 `div` 有 `truncate`，导致长名字（如公众号名）被截断
- `TagFilter` 的 `fetchTags` 只依赖 `type`，不传入当前 `filters`，所以属性筛选变化后标签计数不更新
- 默认 `sort` 为 `'newest'`（按 id 倒序），不反映活动时间顺序

## Goals / Non-Goals

**Goals:**
- 修复 Dropdown 长文本截断 bug
- 修复 TagFilter 计数不响应属性筛选变化的 bug
- 将默认排序改为 `date_desc`
- 将三个筛选区域整合为单一 `EventFilterPanel` 组件，统一视觉、统一状态、提供全局清除

**Non-Goals:**
- 不改变后端 API 结构（仅利用现有的 query param 机制）
- 不重构 `Dropdown` 组件本身的其他行为
- 不改变 `TagFilter` 和 `AdvancedFilter` 的内部逻辑（可复用为子组件）
- 不引入新的状态管理库

## Decisions

### 1. Dropdown 截断修复：去掉外层 truncate，改为 `overflow-hidden text-ellipsis` 作用于 span

当前 `Dropdown.jsx` 触发按钮结构：
```
<div className="flex items-center gap-3 truncate">   ← truncate 在这里
  <Icon />
  <span>{label}</span>                               ← span 没有 min-w-0
</div>
```
`truncate` 是 `overflow-hidden + text-overflow: ellipsis + whitespace-nowrap` 的组合，但它作用在 flex 容器上，会把整个内容区（含图标）一起截断。

修复方案：将 `truncate` 从外层 div 移除，改为在 `<span>` 上加 `truncate min-w-0 flex-1`，让图标固定宽度、文字自适应截断。下拉菜单选项的 `<span className="truncate pr-2">` 同理，加 `min-w-0`。

### 2. TagFilter 计数修复：接收 `filters` prop，传入 `/tags` 请求

`TagFilter` 当前 `fetchTags` 只传 `{ type }`。修复方案：增加 `filters` prop（与 `AdvancedFilter` 的 `filters` 对象相同），在 `fetchTags` 时将非空的 filter 值作为额外 query params 传给 `/tags`。

后端 `/tags` 路由需要确认是否支持这些额外参数——查看 `tagController.js`。如果不支持，需要在 tag 查询中加入 JOIN 或子查询过滤。

> **待确认**：`/tags` 接口当前实现是否支持 `organizer`、`location`、`target_audience` 过滤参数。

### 3. 默认排序改为 `date_desc`

`Events.jsx` 中 `const [sort, setSort] = useState('newest')` 改为 `useState('date_desc')`。
`date_desc` 后端已实现（`ORDER BY date DESC`），按日期倒序排列，未来活动（date 最大）排最前。

### 4. 整合为 EventFilterPanel

新建 `src/components/EventFilterPanel.jsx`，接收所有筛选状态作为 props，内部渲染：
- `AdvancedFilter`（属性筛选）
- `TagFilter`（标签筛选，传入当前 filters）
- 生命周期 Dropdown
- SortSelector
- 全局"清除所有筛选"按钮（当任意筛选激活时显示）

`Events.jsx` 中将现有三个独立筛选区域替换为单个 `<EventFilterPanel>`，所有状态仍在 `Events.jsx` 管理，通过 props 传入。

```
Events.jsx (state owner)
  └── EventFilterPanel
        ├── AdvancedFilter (filters, onChange)
        ├── TagFilter (selectedTags, onChange, filters)  ← 新增 filters prop
        ├── Lifecycle Dropdown (lifecycle, onChange)
        └── SortSelector (sort, onChange)
        └── Clear All button
```

这样 `EventFilterPanel` 是纯展示/组合组件，不持有状态，便于测试和复用。

## Risks / Trade-offs

- `/tags` 接口可能不支持属性过滤参数 → 需要先读 `tagController.js` 确认，可能需要后端改动
- `EventFilterPanel` 整合后，`AdvancedFilter` 和 `TagFilter` 的内部 collapse/expand 逻辑在移动端可能需要协调，避免两个独立的折叠状态造成混乱 → 可在 panel 层统一控制移动端折叠
- `date_desc` 排序对于没有 `date` 字段的活动（date 为 NULL）会排到最后 → 可接受，NULL 日期的活动本身数据不完整

## Migration Plan

无数据迁移。纯前端改动（+ 可能的后端 tagController 小改动）。可直接部署，无需回滚策略。
