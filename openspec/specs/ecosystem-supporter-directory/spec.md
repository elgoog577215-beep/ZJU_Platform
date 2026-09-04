# ecosystem-supporter-directory Specification

## Purpose
用明确的支持关系、展示分类和组织主体边界维护拓浙 AI 生态支持方名录，让公开页面能够准确呈现真实协作网络，同时避免把普通活动提供方、Logo、历史记录或组织主页自动解释为正式支持关系。

## Requirements

### Requirement: 支持方关系与组织身份分离

系统 SHALL 以 `ecosystem_partners.partner_scope` 判断公开支持关系，以 profile 承载组织身份；存在组织主页、活动记录或 Logo 不得自动产生支持方关系。

#### Scenario: 普通活动提供方不进入支持方名录

- **WHEN** 一个已启用合作方的 `partner_scope` 为 `activity_provider`
- **THEN** 系统 MUST 保留其活动筛选和主办方关联能力，但 MUST NOT 在全部支持方名录中展示它

### Requirement: 五类支持方分类

系统 SHALL 使用学院、技术企业、行业企业、资本、社团五类支持方分类，并将该分类与 school、organization、enterprise 等 profile 主体类型分开保存。

#### Scenario: 旧数据兼容显示

- **WHEN** 公开合作方缺少新的支持方分类
- **THEN** 系统 MUST 按旧主体类别提供 college、club 或 technology_enterprise 的可预测兼容分类，不得丢失该合作方

#### Scenario: 后台维护支持方分类

- **WHEN** 运营者创建或编辑生态支持方
- **THEN** 后台 MUST 允许选择五类支持方之一并通过 API 持久化

### Requirement: About 提供完整名录入口

About 的资源与合作区域 SHALL 使用校内支持、企业合作、资本合作、组织合作四个展示入口，保留代表性支持方展示，并提供通往完整支持方名录的清晰入口；其中企业合作 SHALL 聚合底层的技术企业与行业企业，不改变五类正式数据。

#### Scenario: 从 About 查看全部支持方

- **WHEN** 访客点击资源与合作区域的“查看全部支持方”
- **THEN** 系统 MUST 导航到 `/about/partners`，且浏览器返回能够回到 About

#### Scenario: 从 About 进入指定分组

- **WHEN** 访客点击校内支持、企业合作、资本合作或组织合作入口
- **THEN** 系统 MUST 导航到带有对应 `category` query 的 `/about/partners`，详情页首次显示该分组，且刷新和分享后仍可恢复

#### Scenario: 企业分组聚合两类正式数据

- **WHEN** 访客进入 `category=enterprise`
- **THEN** 名录 MUST 同时显示 `technology_enterprise` 与 `industry_enterprise` 支持方，并保留条目自身的正式分类标签

#### Scenario: 概览与详情连续过渡

- **WHEN** 浏览器支持视图过渡且访客未启用减少动态效果
- **THEN** 被点击的分类入口 MUST 与详情页对应分类节点保持连续视觉关系，其他内容不得阻塞导航或造成旧页面残留

#### Scenario: 返回 About 支持区域

- **WHEN** 访客从名录页使用“返回生态介绍”
- **THEN** 系统 MUST 回到 `/about#resource-support`，恢复支持区域，并在可用时反向呈现分类节点到入口卡片的连续过渡

### Requirement: 完整支持方名录

`/about/partners` SHALL 只展示已启用的核心支持方，并提供四个展示分组、名称搜索、分组计数和真实数据状态；底层五类分类仍用于数据维护和条目标识。

#### Scenario: 首屏由真实支持方构成

- **WHEN** 访客打开支持方名录
- **THEN** 首屏 MUST 使用真实支持方的名称或 Logo 预览构成四分组空间入口，抽象图形不得取代名录内容；选中分组后该入口 MUST 连续推进为详情工作区，其余入口 MUST 收拢为栏目导航

#### Scenario: 详情保持空间叙事

- **WHEN** 访客进入或切换到一个支持方分组
- **THEN** 页面 MUST 以真实 Logo、名称、合作方向和说明组织可浏览的协作网络与详情卡片，不得退化为表格、赞助商 Logo 墙或整块高亮分类按钮

#### Scenario: 按展示分组浏览

- **WHEN** 访客选择校内、企业、资本或组织分组
- **THEN** 页面 MUST 仅显示该分组包含的核心支持方，并明确当前分组和匹配数量

#### Scenario: 旧五类深链继续兼容

- **WHEN** 访客打开已有的 `technology_enterprise` 或 `industry_enterprise` 深链
- **THEN** 页面 MUST 恢复对应正式分类结果，不得因四分组展示而失效

#### Scenario: 搜索无结果

- **WHEN** 名称、英文名、说明和合作方向均不匹配搜索词
- **THEN** 页面 MUST 显示可恢复的无结果状态，并允许清除搜索或切换分类

#### Scenario: 数据加载与降级

- **WHEN** 支持方接口仍在加载或请求失败
- **THEN** 页面 MUST 分别显示加载状态或可理解的降级/重试状态，不得呈现无反馈的空白区域

### Requirement: 支持方详情跳转

支持方条目 SHALL 优先连接组织主页，其次连接经过校验的官方网站；没有可信目标时 SHALL 保持为不可点击的信息条目。

#### Scenario: 进入组织主页

- **WHEN** 支持方拥有 `profile_handle`
- **THEN** 点击条目 MUST 在站内进入对应 `/org/:handle`

#### Scenario: 打开官方网站

- **WHEN** 支持方没有组织主页但拥有安全的 `link_url`
- **THEN** 点击条目 MUST 以安全外链方式打开官方网站并说明目标类型

### Requirement: 多语言、主题与响应式体验

About 入口和支持方名录 SHALL 同时维护中文与英文，并适配日间、夜间、桌面和移动端，尊重减少动态效果设置。

#### Scenario: 移动端访问名录

- **WHEN** 访客在窄屏设备打开 `/about/partners`
- **THEN** 搜索、分类、列表和返回入口 MUST 无页面级横向溢出，分类操作可触达且内容顺序与桌面一致

#### Scenario: 键盘与减少动态效果

- **WHEN** 访客使用键盘导航或启用 `prefers-reduced-motion`
- **THEN** 所有可操作元素 MUST 有可见焦点，且页面 MUST 禁用非必要位移动画

#### Scenario: 不支持视图过渡

- **WHEN** 浏览器不支持跨页面视图过渡、设备性能不足或访客启用减少动态效果
- **THEN** 分类深链、筛选结果和返回链 MUST 保持完整可用，系统 MUST 使用即时导航或现有轻量页面过渡
