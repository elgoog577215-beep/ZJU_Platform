## ADDED Requirements

### Requirement: Hackathon workspace separates event and stage navigation

系统 SHALL 在 `/hackathon` 提供统一赛事工作区，并将“选择哪场赛事”与“查看该赛事哪个环节”表达为两个稳定、相互独立的导航维度。

#### Scenario: Desktop visitor opens hackathon workspace

- **WHEN** 桌面端访问者打开 `/hackathon`
- **THEN** 页面左侧显示历届赛事目录
- **AND** 主内容顶部显示“赛事报名、项目作品、赛事影像、成果展示”四个环节
- **AND** 选择任一赛事后两组导航均不得消失。

#### Scenario: Visitor scrolls current stage

- **WHEN** 访问者在任一赛事环节中滚动正文
- **THEN** 工作区不得因滚动距离隐藏赛事选择或环节导航
- **AND** 访问者仍能判断当前赛事和当前环节。

### Requirement: Four event stages remain stable across lifecycle states

系统 SHALL 始终保留四个赛事环节的位置，并以页面状态表达未开放、进行中、已结束、暂无内容或已发布，而不是隐藏栏目或替换导航骨架。

#### Scenario: Registration has closed

- **WHEN** 所选赛事已经结束报名
- **THEN** “赛事报名”环节仍可进入并阅读赛事介绍、规则和日程
- **AND** 报名操作明确显示已结束且不可提交。

#### Scenario: Event has no published media or results

- **WHEN** 所选赛事尚无公开影像或成果
- **THEN** 对应环节显示与该赛事关联的明确空态
- **AND** 页面不得自动切换到其他环节。

### Requirement: Event and stage state is URL-backed

系统 SHALL 使用 URL 同时保存所选赛事和所选环节，并在刷新、分享、浏览器前进和后退时恢复相同上下文。

#### Scenario: Visitor opens a stage deep link

- **WHEN** 访问者打开 `/hackathon?event=<eventKey>&view=media`
- **THEN** 工作区选择对应赛事和“赛事影像”环节
- **AND** 影像内容只读取该赛事的公开关联记录。

#### Scenario: Visitor switches event while staying in a stage

- **WHEN** 访问者在“项目作品”环节切换到另一届赛事
- **THEN** URL 更新为新赛事
- **AND** 当前环节仍为“项目作品”
- **AND** 若新赛事暂无作品，页面显示该赛事的作品空态。

#### Scenario: Invalid event or stage parameter

- **WHEN** URL 包含不存在的赛事或非法环节
- **THEN** 系统回退到有效的默认赛事和基于赛事状态的默认环节
- **AND** 使用替换导航修正规范 URL，避免产生额外历史记录。

### Requirement: Project and media stages reuse canonical records

工作区 SHALL 通过已有项目、赛事作品、图片、视频和 competition 关联组合“项目作品”与“赛事影像”，不得复制内容记录或伪造归属。

#### Scenario: Visitor opens project stage

- **WHEN** 访问者打开某场赛事的“项目作品”环节
- **THEN** 页面显示该 competition 下可公开的长期项目与赛事作品投影
- **AND** 投稿、审核、详情和项目所有权继续使用现有正式能力。

#### Scenario: Visitor opens media stage

- **WHEN** 访问者打开某场赛事的“赛事影像”环节
- **THEN** 页面显示该 competition 关联的公开图片直播、精选照片和视频
- **AND** 未关联赛事的通用媒体不得被自动归入该赛事。

### Requirement: Workspace adapts without adding another tab row

系统 SHALL 在窄屏将历届赛事目录收为单一赛事选择器，并保留四环节局部导航，不得把赛事卡机械堆成第二条横向 Tab 栏。

#### Scenario: Mobile visitor switches event

- **WHEN** 移动端访问者点击当前赛事选择器
- **THEN** 页面使用可关闭的抽屉或弹层显示历届赛事
- **AND** 选择后抽屉关闭并更新当前赛事
- **AND** 页面不得产生文档级横向溢出或嵌套纵向滚动陷阱。

### Requirement: Global navigation distinguishes content from app acquisition

系统 SHALL 将全站内容栏目与下载 App 行动分组，并把浙客松作为项目作品与赛事影像的一级业务入口。

#### Scenario: Desktop visitor scans primary navigation

- **WHEN** 桌面全站导航渲染
- **THEN** 内容栏目显示“活动集合、AI 社区、浙客松、生态介绍”
- **AND** “下载 App”显示为搜索和个人入口附近的独立行动按钮
- **AND** 搜索入口以“AI 搜索”文字和搜索图标呈现，并与“下载 App”使用一致的长条按钮轮廓
- **AND** 四个内容栏目共享轻量导航底托，当前栏目具有清晰但不过度厚重的选中状态
- **AND** “项目广场”和“影像库”不再与浙客松并列为一级栏目。

#### Scenario: Visitor opens a legacy independent route

- **WHEN** 访问者通过历史链接打开 `/projects` 或 `/media`
- **THEN** 对应公开内容仍可访问
- **AND** 既有项目、媒体详情和分享深链不得失效。

#### Scenario: Visitor opens AI search

- **WHEN** 访问者从桌面导航或移动入口打开 AI 搜索
- **THEN** 搜索输入、结果和键盘提示显示在主题感知的半透明毛玻璃浮层中
- **AND** 页面背景由独立蒙版和适度模糊压低干扰
- **AND** 点击蒙版、点击关闭按钮或按 `Escape` 均可关闭搜索
- **AND** 移动端搜索保持全屏安全区、可读对比和至少 44px 的关闭触控区域。
