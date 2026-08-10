## ADDED Requirements

### Requirement: Admin console maps modules to ecosystem governance domains

管理员后台 SHALL 按生态运营域组织主要模块，而不是只按历史组件或资源类型堆叠。

#### Scenario: 管理员打开后台导航

- **WHEN** 管理员打开 `/admin`
- **THEN** 后台导航展示运营总览、内容与审核、主体与关系、生态项目运营、AI 能力治理、系统与审计等治理域
- **AND** 每个模块归入一个主要治理域
- **AND** 各治理域以静态分组展示，模块入口直接可见，不通过手风琴折叠或数量标签增加导航层级。

### Requirement: Admin overview presents ecosystem operating priorities

后台总览 SHALL 优先展示生态运营优先级，而不是只展示通用资源数量。

#### Scenario: 管理员查看总览

- **WHEN** 后台统计加载完成
- **THEN** 总览优先展示内容待审、主体关系、生态项目状态、AI 能力健康和系统风险入口
- **AND** 管理员可以从总览进入对应治理域。

### Requirement: Content collection presents stable operating objects

内容采集 SHALL 客观呈现来源、连接状态、采集记录、候选内容和工具，不得把后台状态合同包装成强制操作步骤，也不得默认平铺爬虫技术参数。

#### Scenario: 管理员打开内容采集

- **WHEN** 管理员从后台进入内容采集
- **THEN** 首屏显示采集源数量、连接状态、调度状态和本轮新增，并直接展示最近采集记录与候选内容
- **AND** 首屏不使用编号、箭头、“下一步”或流水线规定管理员的操作顺序
- **AND** 管理员可以分别进入采集源、候选内容、连接与工具工作区
- **AND** token、fakeid、分页延迟和风控参数不占据默认首屏
- **AND** 当前实现明确为学院、社团等微信公众号来源，不暗示已经支持任意网站或多平台爬虫。

### Requirement: Detailed settings are progressively disclosed

站点设置 SHALL 按任务分类，并对字段较多的关于页面继续分区收纳。

#### Scenario: 管理员维护关于页面

- **WHEN** 管理员打开站点设置并选择关于站点
- **THEN** 页面显示团队身份、数据依据、AI 社区、浙客松、支持网络和结尾等内容区块
- **AND** 同一时刻只展示当前内容区块的字段
- **AND** 安全和公共外观配置不与关于页面字段同时平铺。

### Requirement: AI governance wording reflects real capability boundaries

AI 治理界面 SHALL 准确表达当前 AI 能力边界，不得把半成熟能力包装成完整全站 AI 治理。

#### Scenario: 管理员打开 AI 能力治理

- **WHEN** AI 能力治理页面加载
- **THEN** 页面区分模型配置、活动元数据治理、Agent 成熟度、搜索/推荐/索引等能力状态
- **AND** 不可操作或未完整接入的能力标注为只读诊断、实验性或待接入
- **AND** 活动治理建议说明其作用范围是活动元数据治理。

### Requirement: Subject relationship management preserves the three-axis permission model

主体与关系治理 SHALL 遵守账号主体类型、发布审核权限、后台访问角色三轴分离。

#### Scenario: 管理员查看用户与组织治理入口

- **WHEN** 管理员进入主体与关系治理域
- **THEN** 用户账号、组织 profile、组织成员、合作方层级和历史归属迁移以同一治理心智呈现
- **AND** 组织账号不自动等于管理员
- **AND** 免审核权限不自动等于后台访问
- **AND** 生态/比赛合作方与活动提供方继续通过 `partner_scope` 区分。

### Requirement: Project Plaza has a first-class admin operating path

项目广场 SHALL 有后台运营路径，以支撑项目育人和内容安全。

#### Scenario: 管理员治理项目广场内容

- **WHEN** 管理员进入生态项目运营域
- **THEN** 后台提供项目广场管理入口
- **AND** 至少覆盖项目列表、状态筛选、举报或下架、作者与组织归属查看
- **AND** 下架与恢复操作写入审计日志
- **AND** 项目管理不被误归类为普通图片、文章或音视频资源。

### Requirement: Admin module status is visible

后台 SHALL 展示模块成熟度或运营状态，帮助管理员识别可运营能力与半成熟工具。

#### Scenario: 模块能力尚未完整接入

- **WHEN** 一个后台模块只有只读诊断、实验性能力或内部工具能力
- **THEN** 后台显示对应状态
- **AND** 不展示会让管理员误以为可以完整治理该业务的主要操作。

### Requirement: Admin i18n remains synchronized for touched modules

本 change 修改的后台用户可见文案 SHALL 同步维护中文和英文资源。

#### Scenario: 修改后台导航或模块文案

- **WHEN** 后台导航、按钮、空状态、错误提示、模块说明或状态标签被新增或修改
- **THEN** `public/locales/zh/translation.json` 与 `public/locales/en/translation.json` 同步更新
- **AND** 组件通过 `t(...)` 读取新增文案。
