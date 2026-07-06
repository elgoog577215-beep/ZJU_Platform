# 设计：用户、权限与组织主体合并整理

## 核心模型

本轮采用三轴模型，而不是把所有概念塞进一个 `role`：

- 主体类型：`account_type` 表示账号当前主要身份，`personal` 是个人，`organization` 是组织运营账号。
- 能力权限：`review_permission` 表示发布内容审核能力，`normal` 需要审核，`trusted` 免审核，`admin` 具备管理员级发布治理能力。
- 后台访问：继续用旧 `users.role = 'admin'` 判断能否进入后台，避免破坏已有中间件、路由和 token 逻辑。

组织本身仍使用现有 `profiles` 表表达，账号通过 `profile_members` 管理组织。生态/比赛合作方和活动提供方继续使用 `ecosystem_partners.partner_scope` 区分。

## 后端

### 数据迁移

在 `runMigrations` 中补齐：

- `users.account_type TEXT DEFAULT 'personal'`
- `users.review_permission TEXT DEFAULT 'normal'`
- `users.admin_scope TEXT DEFAULT 'none'`

迁移后回填：

- `role = 'admin'` 的用户默认 `review_permission = 'admin'`、`admin_scope = 'platform'`。
- 有 `organization_cr` 或已认证组织身份的用户可推断为 `organization`，但不覆盖已经显式设置的值。

### 用户列表

`getAllUsers` 返回更完整的用户运营字段：

- 基本账号字段：`id`、`username`、`nickname`、`avatar`、`role`、`created_at`。
- 新模型字段：`account_type`、`review_permission`、`admin_scope`。
- 组织与内容摘要：`managed_profile_count`、`organization_profile_count`、`pending_content_count`。

`updateUser` 支持管理员修改新字段。校验使用白名单，避免任意权限值进入数据库。

### 当前用户总览

`getOwnOverview` 增加：

- `accountType`：当前账号主体类型。
- `permissionSummary`：发布审核权限、后台访问状态、可读标签和说明。
- `organizationWorkspace`：可管理组织、官方/合作方展示数量、活动提供方数量、成员角色摘要。
- `nextActions`：从资料完整度、待审核投稿、身份认证、成果认领和组织主体生成最多 6 个行动项。

### 后台组织聚合

新增 `userController.getAdminUserOrganizations`：

- 从 `profiles` 读取 `club`、`organization`、`school`、`enterprise` 类型主体。
- 合并 `profile_members` 成员、`ecosystem_partners` 展示层级、活动归属和内容数量。
- 返回只读列表，前端仍通过既有 `EcosystemPartnerManager` 或 profile 成员接口执行编辑。

## 前端

### 个人中心

升级 `UserSystemOverview` 为更饱满的工作台：

- 顶部展示账号类型、发布权限、资料完整度和待处理事项。
- 中部展示“我的组织”列表，区分可管理组织、活动提供方、生态/比赛合作方。
- 右侧/下方展示下一步行动和内容状态。
- 保留跳转到既有设置页、投稿页和身份页的快捷入口。

### 后台用户管理

在 `UserManager` 中新增分段视图：

- `accounts`：账号表，支持搜索和按角色/权限筛选。
- `organizations`：组织主体表，展示 profile、合作方层级、成员、内容/活动统计。
- `permissions`：权限治理摘要，展示普通、免审核、管理员三档分布。

编辑账号弹窗增加账号类型、发布权限和管理员范围字段；旧角色仍可编辑。

## i18n

新增和修改的用户可见文案同步写入：

- `public/locales/zh/translation.json`
- `public/locales/en/translation.json`

组件默认通过 `t(...)` 读取，保留少量 fallback 以兼容缺失 key。

## 验证

- OpenSpec 校验：`npm run openspec:validate`
- 后端语法：`node -c server/src/controllers/userController.js`、`node -c server/src/config/runMigrations.js`
- 前端 lint：针对改动组件运行 ESLint
- 构建：`npm run build` 或本机可用的 Vite 构建路径

