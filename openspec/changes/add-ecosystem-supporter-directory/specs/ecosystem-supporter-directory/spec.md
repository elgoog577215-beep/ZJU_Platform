## ADDED Requirements

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

About 的资源与合作区域 SHALL 保留代表性支持方展示，并提供通往完整支持方名录的清晰入口。

#### Scenario: 从 About 查看全部支持方

- **WHEN** 访客点击资源与合作区域的“查看全部支持方”
- **THEN** 系统 MUST 导航到 `/about/partners`，且浏览器返回能够回到 About

### Requirement: 完整支持方名录

`/about/partners` SHALL 只展示已启用的核心支持方，并提供五类筛选、名称搜索、各类计数和真实数据状态。

#### Scenario: 按类别浏览

- **WHEN** 访客选择一个支持方类别
- **THEN** 页面 MUST 仅显示该类别中的核心支持方，并明确当前类别和匹配数量

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
