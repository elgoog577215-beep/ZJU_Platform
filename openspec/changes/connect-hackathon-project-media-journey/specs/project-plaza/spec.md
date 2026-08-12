## ADDED Requirements

### Requirement: Event-scoped project plaza

项目广场 SHALL 在 `/projects?competition=<slug>` 提供赛事现场模式，并继续以 `/projects` 作为全部项目的唯一公共广场入口。

#### Scenario: Visitor enters from a hackathon

- **WHEN** 访问者从某场黑客松进入项目广场
- **THEN** 首屏 MUST 展示该赛事标题、日期、已审核作品数和提交行动
- **AND** 列表 MUST 只展示显式关联该赛事且项目为 `published` 的作品项目
- **AND** 访问者 MUST 能回到全部项目而不进入另一套页面

#### Scenario: Event surface keeps one dominant action

- **WHEN** 访问者进入赛事现场模式
- **THEN** 首屏 MUST 以“提交参赛项目”为唯一主行动
- **AND** 创建长期项目 MUST 继续可从投稿流程或空状态进入
- **AND** 赛事现场、影像档案和全部项目 MUST 作为轻量相关路径存在，不得与主行动同级竞争

#### Scenario: Event discovery controls use progressive disclosure

- **WHEN** 访问者浏览赛事作品墙
- **THEN** 页面 MUST 默认提供搜索与排序
- **AND** 进度、需求等进阶筛选 MUST 能按需展开和收起
- **AND** 收起筛选不得清除用户已选择的条件

#### Scenario: Unknown competition context

- **WHEN** `competition` 参数无法匹配公开赛事
- **THEN** 项目广场 MUST 回退到全部公开项目
- **AND** MUST NOT 显示伪造的赛事标题、计数或投稿入口

### Requirement: Event participation is visible on project surfaces

项目卡片、详情和分享海报 SHALL 在存在公开赛事关系时展示可核验的参赛信息。

#### Scenario: Project card in event mode

- **WHEN** 项目广场处于赛事现场模式
- **THEN** 每张项目卡 MUST 显示本场参赛状态
- **AND** 已有奖项或名次时 MUST 使用赛事作品的公开值

#### Scenario: Project detail shows event history

- **WHEN** 访问者打开参加过一场或多场赛事的项目详情
- **THEN** 详情 MUST 展示赛事标题、日期和公开奖项/名次
- **AND** MUST 提供查看赛事成果与现场影像的入口

#### Scenario: Event-aware project poster

- **WHEN** 访问者为参加过赛事的项目生成分享海报
- **THEN** 海报 MUST 展示一条可核验的赛事身份或公开奖项
- **AND** 二维码 MUST 仍指向项目详情而不是静态海报或联系方式
- **AND** 海报 MUST NOT 展示登录后可见的联系方式

### Requirement: Shared live-event visual system

项目广场赛事模式 SHALL 与当前黑客松成果页和赛事影像库共享现场视觉语言，同时保留项目发现与提交任务的清晰性。

#### Scenario: Desktop event plaza

- **WHEN** 访问者在桌面端打开赛事项目广场
- **THEN** 首屏 MUST 以当前 X-field、黑绿底、酸性绿信号、纪实项目封面和开放式线性编排呈现赛事身份
- **AND** 提交行动、赛事状态和项目作品 MUST 在五秒内可辨认
- **AND** 页面 MUST NOT 用同权指标卡或嵌套面板替代主要作品内容

#### Scenario: Mobile event plaza

- **WHEN** 访问者在移动端打开赛事项目广场
- **THEN** 首屏、筛选、作品列表和提交行动 MUST 形成单列连续叙事
- **AND** 文档 MUST NOT 产生横向溢出
- **AND** 项目详情与投稿弹层 MUST 使用可逆关闭、scroll lock 和 `100dvh` 可用区域

#### Scenario: English and day mode

- **WHEN** 用户使用英文或昼间主题打开赛事项目广场
- **THEN** 新增标题、状态、行动、提示和空状态 MUST 使用当前语言
- **AND** 昼间主题 MUST 保持可读对比和赛事身份，不得残留中文或原始 i18n key

### Requirement: Cross-page event journey

黑客松、项目广场和赛事影像库 SHALL 通过稳定 URL 相互连接，并保留当前赛事上下文。

#### Scenario: Hackathon to project plaza

- **WHEN** 访问者从赛事成果页点击浏览或提交项目
- **THEN** 系统 MUST 导航到 `/projects?competition=<slug>`

#### Scenario: Media archive to project plaza

- **WHEN** 访问者从某场赛事影像档案点击本场项目
- **THEN** 系统 MUST 导航到相同 `competition` 上下文的项目广场

#### Scenario: Project detail back to live archive

- **WHEN** 访问者从项目详情选择某条赛事记录的现场影像
- **THEN** 系统 MUST 导航到 `/media?event=<slug>`
