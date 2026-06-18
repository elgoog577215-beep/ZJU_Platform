## MODIFIED Requirements

### Requirement: Project Detail View
点击项目卡片后，系统 SHALL 打开项目详情视图，展示长正文、概要数据、需求标签、技术标签、登录后可见的联系方式、仓库操作，以及项目分享海报操作。桌面端 SHALL 使用弹窗覆盖层，移动端 SHALL 使用全屏视图。

#### Scenario: Open share poster preview
- **WHEN** 访问者打开项目详情
- **THEN** 详情视图显示“生成海报”操作。
- **WHEN** 访问者点击该操作
- **THEN** 系统先打开海报预览，而不是直接开始下载。

#### Scenario: Poster contains shareable project card
- **WHEN** 海报预览完成渲染
- **THEN** 海报展示项目封面图，或在没有封面时展示生成的兜底视觉
- **AND** 海报展示“拓浙AI生态：项目广场”标识和站点 logo
- **AND** 海报展示项目标题、简介、进度、精选技术标签、精选需求标签、发起人展示名、发起人头像、收藏数和浏览数
- **AND** 发起人展示名优先使用昵称，昵称为空时回退用户名
- **AND** 海报不展示登录后才可见的联系方式。

#### Scenario: Poster QR opens project detail
- **WHEN** 海报预览完成渲染
- **THEN** 海报包含指向 `/projects?id={projectId}` 的二维码。
- **WHEN** 用户扫描二维码
- **THEN** 项目详情可以通过现有深链行为打开。

#### Scenario: Download poster image
- **WHEN** 访问者选择下载海报
- **THEN** 浏览器将预览内容导出为 PNG 图片。

#### Scenario: Share link fallback
- **WHEN** 原生文件分享不可用
- **THEN** 海报预览仍然允许访问者复制项目详情链接。
