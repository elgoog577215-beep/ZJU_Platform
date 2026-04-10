# event-filter-panel

## Purpose
定义活动页统一筛选面板的行为规范，保证筛选逻辑一致、状态可控、交互可理解，并提升筛选效率。

## Requirements

活动筛选面板能力——统一整合属性筛选、标签筛选、生命周期选择和排序控件。

### Requirement: 统一筛选面板整合所有筛选控件
活动页面 SHALL 使用单一的 `EventFilterPanel` 组件替代原有三个独立筛选区域（`AdvancedFilter`、`TagFilter`、生命周期 Dropdown + SortSelector）。面板 SHALL 在视觉上统一，所有筛选状态由父组件 `Events.jsx` 持有并通过 props 传入。

#### Scenario: 面板渲染所有筛选控件
- **WHEN** 用户访问活动页面
- **THEN** 页面 SHALL 显示单一筛选面板，包含属性筛选、标签筛选、生命周期选择和排序选择

#### Scenario: 全局清除按钮
- **WHEN** 用户激活了任意筛选条件（属性、标签、生命周期非 all）
- **THEN** 面板 SHALL 显示"清除所有筛选"按钮
- **WHEN** 用户点击该按钮
- **THEN** 所有筛选状态 SHALL 重置为默认值（filters 全 null，selectedTags 空数组，lifecycle 为 'all'，sort 保持不变）

---

### Requirement: 下拉框选项文字不被截断
`Dropdown` 组件的触发按钮和下拉菜单选项 SHALL 完整显示选项文字，不因容器宽度不足而截断图标或文字。长文字 SHALL 在按钮内以省略号截断（文字本身 truncate），但图标 SHALL 始终完整显示。下拉菜单 SHALL 允许宽度超出触发按钮，以容纳长名称。过长的选项 SHALL 在鼠标悬停后以自定义 tooltip 展示完整内容（延迟 200ms，仅在文字实际被截断时显示）。

#### Scenario: 长公众号名在触发按钮中显示
- **WHEN** 下拉框选中了一个长名称选项（如"哈佛大学燕京学社 / ..."）
- **THEN** 按钮内图标 SHALL 完整显示，不被截断
- **THEN** 文字部分 SHALL 以省略号截断，而非整个内容区被截断

#### Scenario: 下拉菜单选项文字完整显示
- **WHEN** 下拉菜单展开，选项列表中有长名称
- **THEN** 菜单宽度 SHALL 自适应内容（min-w-full，最大 320px）
- **THEN** 每个选项的文字 SHALL 以省略号截断，但勾选图标 SHALL 始终可见
- **WHEN** 用户悬停在被截断的选项上超过 200ms
- **THEN** SHALL 显示包含完整文字的 tooltip（通过 React Portal 渲染，不受 overflow-hidden 裁剪）

---

### Requirement: 标签计数响应属性筛选变化
`TagFilter` 组件 SHALL 接收当前属性筛选状态（`filters` prop），并在属性筛选变化时重新从服务端获取标签列表及计数。后端 `/tags` 接口 SHALL 支持 `organizer`、`location`、`target_audience` 过滤参数，返回仅属于满足条件活动的标签及其计数。

#### Scenario: 选择主办方后标签计数更新
- **WHEN** 用户在属性筛选中选择了某个主办方（organizer）
- **THEN** 标签筛选区域 SHALL 重新加载，只显示该主办方活动所拥有的标签
- **THEN** 每个标签旁的计数 SHALL 反映该主办方活动中该标签的出现次数

#### Scenario: 清除属性筛选后标签计数恢复
- **WHEN** 用户清除属性筛选（所有属性回到 null）
- **THEN** 标签筛选 SHALL 重新加载，显示所有活动的标签及完整计数

#### Scenario: 后端接口支持属性过滤
- **WHEN** 前端请求 `/tags?type=events&organizer=某主办方`
- **THEN** 后端 SHALL 只统计 `organizer = '某主办方'` 的活动中的标签计数
- **THEN** 响应格式 SHALL 与无过滤时相同（`[{ id, name, count }]`）

---

### Requirement: 默认排序为日期倒序
活动列表的默认排序 SHALL 为 `date_desc`（按活动日期从晚到早），使未来活动排在最前，已结束活动排在末尾。

#### Scenario: 首次加载活动列表
- **WHEN** 用户首次访问活动页面，未手动选择排序
- **THEN** 活动列表 SHALL 按 `date DESC` 排序（日期最晚的活动排最前）
- **THEN** 排序选择器 SHALL 显示"日期（最晚）"为当前选中项
