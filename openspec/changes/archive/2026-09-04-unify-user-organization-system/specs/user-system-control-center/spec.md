# user-system-control-center Specification Delta

## ADDED Requirements

### Requirement: 账号主体类型与发布审核权限分离

系统 SHALL 将账号主体类型、发布审核权限和后台访问权限作为不同维度表达。

#### Scenario: 管理员读取用户列表

- **Given** 管理员已登录
- **When** 请求 `/api/admin/users`
- **Then** 每个用户 MUST 包含 `account_type`、`review_permission`、`admin_scope` 和旧 `role`
- **And** `role = 'admin'` MUST 继续表示可进入后台
- **And** `review_permission` MUST 表示内容发布是否需要审核

#### Scenario: 管理员更新用户权限

- **Given** 管理员正在编辑某个用户
- **When** 提交 `account_type`、`review_permission` 或 `admin_scope`
- **Then** 系统 MUST 使用白名单校验字段值
- **And** 系统 MUST NOT 接受未定义的权限值

### Requirement: 当前用户总览展示组织工作台

系统 SHALL 在 `/api/users/me/overview` 中返回当前用户的账号类型、发布权限和组织工作台摘要。

#### Scenario: 组织用户读取个人中心总览

- **Given** 用户已登录并管理至少一个组织 profile
- **When** 请求 `/api/users/me/overview`
- **Then** 响应 SHOULD 包含 `permissionSummary`
- **And** 响应 SHOULD 包含 `organizationWorkspace`
- **And** `organizationWorkspace.managed` SHOULD 列出该用户可管理的组织主体

#### Scenario: 普通用户读取个人中心总览

- **Given** 普通个人用户已登录
- **When** 请求 `/api/users/me/overview`
- **Then** 响应 SHOULD 将账号类型表达为个人账号
- **And** 组织工作台 SHOULD 返回空组织列表和可申请组织身份的下一步建议

### Requirement: 后台组织主体聚合视图

系统 SHALL 为管理员提供组织主体聚合列表，用于在用户管理场景中理解组织账号、成员和前台展示层级。

#### Scenario: 管理员读取组织聚合列表

- **Given** 管理员已登录
- **When** 请求 `/api/admin/user-organizations`
- **Then** 响应 MUST 返回组织 profile 列表
- **And** 每个组织 SHOULD 包含成员摘要、合作方展示层级、活动数量和内容数量
- **And** 接口 MUST 是只读操作

#### Scenario: 非管理员读取组织聚合列表

- **Given** 登录用户不是管理员
- **When** 请求 `/api/admin/user-organizations`
- **Then** 系统 MUST 返回 403

### Requirement: 个人中心成为账号与组织工作台

系统 SHALL 在用户自己的个人中心展示账号主体、发布权限、组织主体、内容状态和下一步行动。

#### Scenario: 用户打开自己的个人中心

- **Given** 用户打开自己的个人中心
- **When** 用户系统总览加载完成
- **Then** 页面 SHOULD 展示账号类型和发布权限
- **And** 页面 SHOULD 展示可管理组织主体
- **And** 页面 SHOULD 展示内容审核状态和待处理事项
- **And** 页面 SHOULD 提供跳转到资料、身份、投稿和组织主页的操作

### Requirement: 后台用户管理合并账号、权限和组织治理

后台用户管理 SHALL 同时展示账号列表、权限分布和组织主体列表。

#### Scenario: 管理员打开用户管理

- **Given** 管理员进入用户管理
- **When** 数据加载完成
- **Then** 页面 SHOULD 提供账号、组织主体和权限治理三个视图
- **And** 账号列表 SHOULD 展示主体类型、发布权限和关联组织数量
- **And** 组织主体列表 SHOULD 展示组织 profile、成员数量和展示层级
