## ADDED Requirements

### Requirement: 个人与组织主页首屏名片化

系统 SHALL 在个人 profile 与组织 profile 的公开主页首屏展示可快速识别的身份摘要。

#### Scenario: 访问者打开个人主页

- **WHEN** 访问者打开 `/u/:handle`
- **THEN** 首屏 SHOULD 展示头像、展示名、handle、身份类型、认证状态、简介或一句话名片
- **AND** 首屏 SHOULD 展示公开标签、可见统计或状态摘要
- **AND** 首屏 MUST 提供分享名片入口

#### Scenario: 访问者打开组织主页

- **WHEN** 访问者打开 `/org/:handle`
- **THEN** 首屏 SHOULD 展示 logo、组织名、handle、组织类型、认证状态和组织简介
- **AND** 首屏 SHOULD 展示成员、内容、活动或项目相关的公开摘要
- **AND** 首屏 MUST 提供分享名片入口

### Requirement: Profile 分享名片弹层

系统 SHALL 为个人与组织 profile 提供统一分享名片弹层。

#### Scenario: 打开分享名片

- **WHEN** 用户点击公开主页的分享名片入口
- **THEN** 系统 MUST 打开分享名片预览弹层
- **AND** 名片 MUST 展示头像或 logo、名称、handle、profile 类型、认证状态、简介、精选标签、主页 URL 和二维码

#### Scenario: 二维码回流公开主页

- **WHEN** 分享名片完成渲染
- **THEN** 二维码 MUST 指向该 profile 的公开主页 URL
- **AND** 个人 profile SHOULD 指向 `/u/:handle`
- **AND** 组织 profile SHOULD 指向 `/org/:handle`

#### Scenario: 复制、下载与系统分享

- **WHEN** 分享名片弹层打开
- **THEN** 用户 MUST 能复制主页链接
- **AND** 用户 MUST 能下载名片 PNG
- **AND** 若浏览器支持原生分享，用户 SHOULD 能调用系统分享

### Requirement: 分享名片隐私边界

系统 SHALL 只把公开信息写入分享名片与导出的 PNG。

#### Scenario: 访客导出个人名片

- **WHEN** 访客打开他人的个人分享名片并下载 PNG
- **THEN** 导出图片 MUST NOT 包含隐藏 social link、隐藏自定义 card 或登录后才可见的联系方式

#### Scenario: Owner 打开自己的分享名片

- **WHEN** owner 打开自己的分享名片
- **THEN** 预览图片仍 MUST 只包含公开可传播信息
- **AND** owner 专属编辑入口 MUST NOT 出现在导出的名片内容中

### Requirement: 中英文与响应式可用性

Profile 分享名片 SHALL 支持项目既有 i18n 与桌面/移动端布局。

#### Scenario: 英文模式打开分享名片

- **WHEN** 用户切换到英文模式并打开分享名片
- **THEN** 新增按钮、状态、提示、错误和空状态文案 MUST 使用英文

#### Scenario: 移动端打开分享名片

- **WHEN** 访问者在移动端 viewport 打开分享名片
- **THEN** 弹层内容 MUST 不遮挡、不横向溢出
- **AND** 主要操作按钮 MUST 可点击且文字不溢出
