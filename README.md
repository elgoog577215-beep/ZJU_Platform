# 拓浙 AI 生态数字平台

本仓库承载拓浙 AI 生态的数字底座与公共入口，连接校园活动、学习社区、浙客松、身份、成果与合作。对外名称统一为“拓浙AI生态”。历史工程名“拓途浙享”及 `tuotuzju` 域名、包 ID 继续沿用。

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

### 目录地图

```text
ZJU_Platform/
├── README.md、AGENTS.md          项目与协作入口
├── PRODUCT.md、DESIGN.md         设计工具使用的摘要，详细内容引用 docs
├── docs/                        产品蓝图、产品状态、功能设计、操作手册
├── src/                         Web / PWA 前端
│   ├── App.jsx、main.jsx         应用入口、路由与全局装配
│   ├── features/                已按业务组织的功能：navigation、lottery
│   ├── components/              现有页面、业务组件与通用组件
│   ├── context/、hooks/         前端状态与复用行为
│   ├── services/                API 客户端
│   ├── shared/                  仅前端复用的认证存储与 UI 基础能力
│   └── data/、constants/、utils/ 前端数据、常量与工具
├── server/                      Node API 与后台任务
│   ├── index.js                 服务入口
│   ├── src/                     路由、controller、service、权限、schema / migration
│   ├── scripts/                 检查、评测、初始化与人工维护脚本
│   └── tests/                   后端测试
├── shared/                      前后端共用的业务定义与配置
├── public/                      按原路径发布的公开文件
│   ├── images/brand/            已确认的品牌图形、横标与竖标
│   ├── images/partner-logos/    合作机构 LOGO
│   ├── images/hackathon/        赛事静态图片
│   ├── images/backgrounds/      场景背景
│   ├── images/profiles/         专用主体页面素材
│   ├── icons/                   PWA 安装图标
│   ├── locales/                 中英文词典
│   └── downloads/               对外下载的发布文件
├── scripts/                     仓库级检查、图标生成与发布辅助
│   └── build/                   Vite 构建辅助
├── deploy/                      发布到服务器及独立采集服务的配置
├── e2e/                         浏览器端到端测试
├── bin/                         用户可调用的 CLI 入口
├── android-twa/                 Android 工程
├── ios/                         iOS / Capacitor 工程
├── zju_app/                     HarmonyOS 工程（沿用现有工具链路径）
└── wechat-miniprogram/           微信小程序工程
```

根目录的 `package.json`、锁文件、`index.html`、Vite / Tailwind / ESLint / Playwright 等配置，以及 `.github/`、Docker 文件与 Makefile，是工具和发布入口。多端工程保留现有路径，打包方式从[操作手册](#操作手册)进入。目录迁移必须同步修改引用、命令、构建及部署配置。

`src/features/` 已承载导航和抽奖；`components/` 仍包含其他业务页面。业务模块在修改对应能力时逐步归入 `features/`，具体边界见蓝图[技术设计](docs/产品蓝图.md#技术设计)。根目录 `shared/` 与 `src/shared/` 的使用范围不同，不能仅按同名合并。

### 品牌素材

| 文件                                                                                   | 用途                                                 |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [logo-mark-transparent.png](public/images/brand/logo-mark-transparent.png)             | 透明底独立图形；导航、分享海报及应用图标生成的源文件 |
| [logo-horizontal-transparent.svg](public/images/brand/logo-horizontal-transparent.svg) | 透明底横标，含名称与口号                             |
| [logo-vertical-light.png](public/images/brand/logo-vertical-light.png)                 | 浅色底竖标，含名称与口号                             |

三份素材沿用用户确认的版本。修改只在 `public/images/brand/` 维护；旧 `/newlogo.png`、`/logo.png`、`/tuozhe-ai-ecosystem-logo.svg` 地址由[构建辅助](scripts/build/brand-assets.mjs)兼容，构建时生成旧地址文件，开发与预览时映射到正式素材。浏览器图标、PWA 图标及 `.well-known/` 保留各自的固定地址。

### 脚本与本地文件

优先通过根目录和 `server/package.json` 的 npm 命令运行脚本。`scripts/` 是仓库级工具，`server/scripts/` 是后端工具；同一目录中的脚本统一使用小写连字符命名，名称表达动作和对象，例如 `seed-community-demo.js`、`verify-event-assistant.js`、`wechat-parser.mjs`。

- 后端数据初始化：`npm --prefix server run seed` 调用 `server/scripts/seed-platform.js`；它会写入数据库，不作为启动前的例行检查。
- 人工修复：`server/scripts/fix-comment-schema.js` 会迁移数据库；`server/scripts/reinstall-dependencies.sh` 会重装后端依赖并重启 PM2。它们与只读检查脚本用途不同。
- 自动生成的 `node_modules/`、`dist/`、`dev-dist/`、测试报告、`output/`、`tmp/` 和浏览器缓存不作为源码入口，也不提交 Git。
- 数据库及 WAL/SHM、`server/uploads/`、`server/data/`、日志、备份与真实环境配置是本地或服务器运行数据。不能随目录整理移动正在使用的数据库；数据库位置以服务配置和 `DATABASE_FILE` 为准。
- 本地 `design-demos/` 是设计探索材料，当前未纳入正式源码；未提交的设计稿、素材和历史证据应先核对用途，不能因未被 Git 跟踪而删除。

### 发布

`master` 推送触发 [deploy.yml](.github/workflows/deploy.yml) 的检查、构建与发布包生成。默认直传；`ZJU_DEPLOY_TRANSPORT=local` 时需按手册完成本机中转。生产由 Caddy 提供入口；应用回滚与数据库恢复分开处理。

远端提交、CI 结果和生产部署分别确认。AI 开发协作及自动推送要求见 [AGENTS.md](AGENTS.md)。
