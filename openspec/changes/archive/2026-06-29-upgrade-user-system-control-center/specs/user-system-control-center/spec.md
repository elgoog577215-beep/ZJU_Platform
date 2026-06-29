# 规格：用户系统控制中心

## ADDED Requirements

### Requirement: 当前用户系统总览接口

系统 SHALL 为登录用户提供一个只读的用户系统总览接口，聚合账号、资料完整度、身份认证、可管理主体、内容状态和成果认领状态。

#### Scenario: 登录用户读取总览

- **Given** 用户已登录
- **When** 前端请求 `/api/users/me/overview`
- **Then** 响应 MUST 包含 `account`、`profileCompletion`、`managedProfiles`、`identitySummary`、`contentSummary` 和 `outcomeSummary`
- **And** 接口 MUST NOT 修改用户内容、身份认证或成果归属

#### Scenario: 未登录用户读取总览

- **Given** 用户未登录
- **When** 请求 `/api/users/me/overview`
- **Then** 系统 MUST 返回 401

### Requirement: 个人中心展示账号控制中心

系统 SHALL 在用户自己的个人中心展示账号与身份控制中心，帮助用户看见资料完整度、可管理身份和待处理事项。

#### Scenario: 用户查看自己的个人中心

- **Given** 用户打开自己的个人中心
- **When** 用户资料加载完成
- **Then** 页面 SHOULD 展示资料完整度、身份认证摘要、可管理主体摘要和内容状态摘要
- **And** 页面 SHOULD 提供进入个人名片、活动画像、身份认证、投稿和作品的快捷入口

#### Scenario: 访客查看他人主页

- **Given** 访客或其他登录用户打开他人主页
- **When** 页面加载完成
- **Then** 页面 MUST NOT 展示该用户的私有账号总览
