# 拓途浙享（TUOTUZJU）

拓途浙享是拓浙 AI 生态的数字底座，面向学生、组织、学校平台与合作伙伴，连接校园机会、AI 学习社区、实践项目、浙客松成果、身份主页和生态运营。

它不只是活动聚合站。平台希望让机会被发现、人与组织建立可信连接、项目和赛事成果持续沉淀，并把社区学习、项目实践、人才识别与产学协作串成可运营闭环。

生产站点：<https://tuotuzju.com>

## 文档入口

| 想了解什么                     | 文档                                       |
| ------------------------------ | ------------------------------------------ |
| 产品最终要设计成什么样         | [产品蓝图](./docs/产品蓝图.md)             |
| 当前做到哪里、下一步是什么     | [产品状态](./docs/产品状态.md)             |
| 仓库、领域真源和运行链怎样组织 | [系统架构](./docs/系统架构.md)             |
| 开发时哪些做法明确不能采用     | [开发禁区](./docs/开发禁区.md)             |
| 当前高影响功能怎样设计和实施   | [`openspec/changes/`](./openspec/changes/) |
| 平台发布与运营操作             | [`docs/指南/`](./docs/指南/)               |
| 历史设计和决策依据             | [`docs/归档/`](./docs/归档/)               |

AI Agent 的正式执行规则位于 [AGENTS.md](./AGENTS.md)。它主要面向 AI，不替代本文的人类上手说明。

## 当前能力

- 活动发现、筛选、报名、组织归属和 AI 活动推荐。
- AI 社区统一内容系统，覆盖技术分享、求助问答、新闻热点、组队协作与学习资源。
- 项目广场、个人与组织主页、数字名片、收藏、关注和成果归属。
- 浙客松多场赛事模板、可配置时间轴与报名表单，以及赛后成果、作品和媒体资产管理。
- 全站搜索、活动推荐、AI 能力注册、评测与模型配置。
- 微信公众号活动采集与治理、微信小程序 WebView、PWA、Android 包装与 iOS Capacitor 工程。
- 面向内容、主体关系、生态项目、AI 能力和系统审计的管理员后台。

准确成熟度与缺口查看[产品状态](./docs/产品状态.md)。

## 技术栈

- 前端：React 18、Vite、React Router、Tailwind CSS、i18next、Framer Motion、Three.js。
- 后端：Node.js、Express、SQLite、JWT、Multer、Sharp、Playwright。
- 客户端：Web/PWA、微信小程序 WebView、Android TWA/WebView、iOS Capacitor。
- 规格与测试：OpenSpec、Node Test Runner、Playwright、ESLint。
- 生产：GitHub Actions、PM2、Caddy。

## 环境要求

- Node.js 20 推荐，最低 Node.js 18。
- npm。
- 本地开发不需要提交数据库或上传目录。
- iOS 构建需要 macOS、Xcode 和可用的 Apple Developer 环境。
- 微信小程序与公众号采集需要各自平台凭据和开发者工具。

## 本地开发

在仓库根目录执行：

```bash
npm install
cp -n server/.env.example server/.env
npm run dev
```

`npm install` 会通过 `postinstall` 安装后端依赖。首次启动前编辑 `server/.env`，至少设置安全的 `SECRET_KEY`；生产环境不得使用示例值。

启动后访问：

- 前端：<http://localhost:5180>
- 后端健康检查：<http://localhost:5181/api/health>
- 前端开发服务器会把 `/api` 和 `/uploads` 代理到后端。

也可以分别启动：

```bash
npm run dev:server
npm run dev:client
```

## 环境变量

完整模板位于 [server/.env.example](./server/.env.example)。主要分组包括：

- `SECRET_KEY`、`ADMIN_PASSWORD`：认证与后台安全。
- `DATABASE_FILE`、`UPLOAD_DIR`：SQLite 与上传存储。
- `CORS_ALLOWED_ORIGINS`：生产跨域白名单。
- `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`：微信文章解析等可选 AI 能力。
- `WECHAT_MINIAPP_APPID`、`WECHAT_MINIAPP_SECRET`：微信小程序登录。

不要提交 `server/.env`、数据库、上传文件、真实平台凭据或日志。

## 测试与检查

常规前端检查：

```bash
npm run lint
npm run build
npm run test:e2e:smoke
```

后端与平台底座：

```bash
npm run test:foundation
npm run check:ai-assistant
npm run check:ai-agents
```

规格与格式：

```bash
npm run openspec:validate
npm run format:check
git diff --check
```

按改动范围选择更多检查：

- 活动推荐与 AI：`npm run eval:ai-golden`、`npm run eval:ai-live`、`npm run stress:ai`。
- 搜索索引：`npm run search:index:refresh`。
- 微信采集：`npm run check:wechat-ai` 及对应服务测试。
- 完整浏览器回归：`npm run test:e2e`。

真实 provider、微信账号、移动真机和生产部署不能由 Mock、构建或局部测试替代。

## 仓库结构

```text
src/                  React 前端、页面、组件、Context 与客户端服务
server/               Express API、领域服务、SQLite 迁移、任务与脚本
public/               静态资源和中英文 locale
wechat-miniprogram/   微信小程序 WebView 壳与原生桥接
android-twa/          Android TWA/WebView 包装工程
ios/                  iOS Capacitor 工程
e2e/                  Playwright 浏览器回归
docs/                 当前中文文档、操作指南和历史归档
openspec/             正式规格、活动变更与归档
```

详细模块与数据真源查看[系统架构](./docs/系统架构.md)。

## 开发协作

- 小型修复直接修改代码并增加回归保护。
- 高影响功能、核心流程、数据库迁移和正式接口变化进入 `openspec/changes/<change>/`。
- 产品语义更新产品蓝图；当前进度更新产品状态；代码边界更新系统架构；重复高代价错误更新开发禁区和自动化保护。
- 用户可见文案至少同步中文和英文，并检查桌面、移动端与英文模式。
- 本仓库公开，不提交内部商业文书、用户数据、数据库、上传内容、密钥、AI memory 和本地生成产物。

## 构建与部署

```bash
npm run build
```

生产部署由 [deploy.yml](./.github/workflows/deploy.yml) 在 `master` 推送后触发：构建前端、更新服务器代码与后端依赖、重启 PM2、上传 `dist/`、验证并重载 Caddy，最后检查生产健康、项目 API 和子路由。

部署失败时先区分代码构建、服务器脏工作区、PM2 健康、Caddy 配置和外部凭据问题，不用本地启动代替生产验收。
