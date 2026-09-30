# 拓浙 AI 生态数字平台

本仓库承载拓浙 AI 生态的数字底座与公共入口，连接校园活动、学习社区、浙客松、身份、成果与合作。历史工程名“拓途浙享”及 `tuotuzju` 域名、包 ID 继续沿用。

生产站点：[拓浙 AI 生态](https://tuotuzju.com)。

## 文档入口

```text
README.md                  介绍、安装、运行、检查
AGENTS.md                  项目协作入口与特殊约束
docs/
├── 产品蓝图.md             内容、逻辑、交互、技术的完整设计
├── 产品状态.md             实现与蓝图的差距、验证范围
├── 功能设计/
│   ├── 浙客松.md           赛事业务的四层展开
│   └── 内容采集.md         采集业务的四层展开
└── 操作手册/               投稿、采集、部署和各端打包/验收
```

从[产品蓝图](docs/产品蓝图.md)了解要建成什么，对照[产品状态](docs/产品状态.md)判断现实差距，再到代码和测试核验。详细业务设计是蓝图的一部分，不按每次修改另建规格和任务包。

[AGENTS.md](AGENTS.md) 面向开发协作；[PRODUCT.md](PRODUCT.md) 与 [DESIGN.md](DESIGN.md) 为设计工具提供简短产品和视觉入口，详细设计引用蓝图，具体 token 读取代码。旧文档不在工作目录维持第二套入口，追溯使用 Git 历史。

## 环境与技术栈

- Node.js 推荐 24，最低 22.13.0；使用 npm，根目录安装会通过 `postinstall` 安装后端依赖。
- 前端：React、Vite、React Router、Tailwind CSS、i18next、Framer Motion、Three.js。
- 后端：Express、SQLite、JWT、Multer、Sharp、Playwright；生产 PM2 与 Caddy。
- Web/PWA 为主实现，微信小程序 WebView、Android、iOS 等工程复用产品能力。原生构建需要各自工具链及平台账号。

## 本地开发

在仓库根目录执行：

```bash
npm install
cp -n server/.env.example server/.env
npm run dev
```

先编辑 `server/.env`，至少设置安全的 `SECRET_KEY`。完整变量及说明以 [server/.env.example](server/.env.example) 为准，不提交真实配置。

- 前端固定 [localhost:5180](http://localhost:5180)，端口占用时明确失败，不自动换号。
- 后端健康端点为 [localhost:5181/api/health](http://localhost:5181/api/health)。
- `npm run dev` 把 `/api`、`/uploads` 代理到本地 `127.0.0.1:5181`，以开发模式关闭采集、开奖等后台任务。
- 分开启动可使用 `npm run dev:server`、`npm run dev:client`。手动启动前端时检查 `VITE_API_PROXY_TARGET`，避免意外连接生产。
- `SERVER_HOST` 控制后端监听，`BACKGROUND_TASKS_DISABLED=1` 明确关闭后台任务；真实 AI、采集、推送等外部能力按专项任务配置，不用页面联调消耗线上服务。

数据库、上传、密钥、账号、备份和私有材料留在本地或私有运行环境，不进入公开仓库。主站文本模型政策见蓝图[搜索与 AI](docs/产品蓝图.md#搜索与-ai)。

## 检查命令

按改动范围选择，不为每个任务运行所有命令；实际脚本以 [package.json](package.json) 为准。

| 范围               | 命令                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| 前端静态检查与构建 | `npm run lint`、`npm run build`                                                    |
| 浏览器             | `npm run test:e2e:smoke`；需要完整回归时 `npm run test:e2e`                        |
| 平台基础与 AI 结构 | `npm run test:foundation`、`npm run check:ai-assistant`、`npm run check:ai-agents` |
| AI 质量与真实调用  | `npm run eval:ai-golden`、`npm run eval:ai-live`、`npm run stress:ai`              |
| 微信采集           | `npm run check:wechat-ai` 及相关服务测试                                           |
| 搜索索引维护       | `npm run search:index:refresh`（会更新索引，不是只读检查）                         |
| 格式与差异         | `npm run format:check`、`git diff --check`                                         |

文档任务检查内容、链接、格式和差异；UI 需查看真实页面；Mock、构建不能替代真实 provider、平台账号、真机或生产流程证据。

## 操作手册

- [AI 社区 CLI 投稿](docs/操作手册/AI社区CLI投稿.md)
- [结构化活动导入](docs/操作手册/结构化活动导入.md)
- [微信公众号文章采集](docs/操作手册/微信公众号文章采集.md)
- [本机中转部署](docs/操作手册/本机中转部署.md)
- [Android 打包](docs/操作手册/Android应用打包.md)、[iOS 开发与验收](docs/操作手册/iOS应用开发与验收.md)、[HarmonyOS 打包与上架](docs/操作手册/HarmonyOS应用打包与上架.md)

## 代码与发布

`src/` 为前端，`server/` 为 API、领域服务、迁移与后台任务，`shared/` 存放前后端共同定义，`public/` 存放公开静态资源与词典，`e2e/` 为浏览器测试。具体职责见蓝图[技术设计](docs/产品蓝图.md#技术设计)。

`master` 推送触发 [deploy.yml](.github/workflows/deploy.yml) 的检查、构建与发布包生成。默认直传；`ZJU_DEPLOY_TRANSPORT=local` 时需按手册完成本机中转。生产由 Caddy 提供入口；应用回滚与数据库恢复分开处理。

远端提交、CI 结果和生产部署分别确认。AI 开发协作及自动推送要求见 [AGENTS.md](AGENTS.md)。
