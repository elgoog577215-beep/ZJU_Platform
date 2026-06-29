# 设计：账号与身份控制中心

## 后端

新增 `GET /api/users/me/overview`，仅允许登录用户访问。接口返回：

- `account`：当前账号基本信息。
- `profileCompletion`：资料完整度百分比和分项完成状态。
- `managedProfiles`：当前用户可管理的 person / club / organization / school / enterprise profiles。
- `identitySummary`：身份认证数量、已认证数量、待确认数量和组织身份数量。
- `contentSummary`：该用户上传、投稿、项目等内容按状态聚合后的数量。
- `outcomeSummary`：成果认领候选、确认、拒绝和撤销数量。
- `activityProfile`：活动推荐画像填写进度。

实现原则：

- 复用 `profileService.listManageableProfiles`，确保个人 profile 存在。
- 只读统计使用固定表名白名单，不接收前端表名或 SQL 片段。
- 某张表缺失或旧环境未迁移时，单项统计回退为 0，不影响整个接口。

## 前端

`PublicProfile` 在 owner 视图中展示账号系统总览：

- 资料完整度进度条。
- 认证身份、可管理主体、待处理事项和内容总量。
- 未完成步骤的快捷入口。
- 可管理 profile 列表。
- 内容状态摘要。

交互原则：

- 快捷入口复用现有标签页：个人名片、活动画像、身份认证、投稿、作品。
- 移动端和桌面端使用同一块总览，不新增独立移动逻辑。
- 空状态和错误态不阻塞原个人主页。

## i18n

新增总览相关文案写入 `public/locales/zh/translation.json` 和 `public/locales/en/translation.json`，组件通过 `t(...)` 读取。

## 验证

- `node -c server/src/controllers/userController.js`
- 针对改动文件运行 ESLint。
- 运行 Vite 构建。
- 运行 `openspec validate --all`。
