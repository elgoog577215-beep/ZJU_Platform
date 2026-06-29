# 产品功能迭代任务队列

更新时间：2026-06-29

本队列承接“用户系统之后，全站功能继续迭代”的范围。原则是先收束已有能力，再新增大模块；已有 OpenSpec change 优先复用，不新建平行规格。

## 执行顺序

### P0 项目广场与项目名片

- 目标：把“我正在做什么项目、缺谁、怎么加入”做成稳定闭环。
- 规划：先收尾 `add-project-plaza`，确认项目名片实体、项目广场、详情弹层、收藏通知、个人主页项目分类和返回收藏链路都可验证；随后归档规格。
- 当前执行切片：补 E2E 覆盖项目列表、详情、登录发布、收藏响应，并同步 OpenSpec 任务状态。
- 验证：`project-plaza-portal.spec.js`、后端语法、相关前端 lint、OpenSpec validate。

### P1 AI 社区投稿与审核链路

- 目标：让技术分享、新闻热点、求助问答、组队协作进入统一发布、审核和用户投稿管理链路。
- 规划：先收束 `add-cli-community-publishing`，因为 CLI、后端接口和文档已经存在；网页端继续沿用 `ai-community-unified-content`，不另建教程系统。
- 当前执行切片：验证 CLI 语法、后端导入解析和路由挂载；同步任务状态。
- 验证：`node -c server/src/controllers/cliController.js`、`node bin/zju.js help`、导入解析 smoke。

### P1 全站搜索与活动推荐质量闭环

- 目标：让搜索和推荐从“能用”进入“可评测、可回归、可治理”。
- 规划：不改 `/api/search` 或 `/api/events/assistant` 响应协议；先做索引覆盖、搜索 smoke、活动推荐 golden 评测和失败样例沉淀。
- 当前执行切片：复用 `search:index:refresh`、`eval:ai-golden`、`check:ai-agents`，把结果纳入后续质量队列。
- 验证：索引刷新、搜索 API smoke、活动推荐评测脚本。

### P1 黑客松成果体系

- 目标：把成果上传、作品故事、照片、视频和荣誉归属稳定到 canonical channel。
- 规划：`rescue-hackathon-outcome-architecture` 已完成主体链路；剩余只做两件事：给照片/视频补一等活动关系，确认 legacy `competition_media` 无 UI 依赖后再迁移或归档。
- 当前执行切片：先审计 legacy UI 依赖，不做破坏性迁移。
- 验证：OpenSpec validate、相关页面/接口 smoke、无 legacy review UI 回归。

### P2 移动端体验与白天模式

- 目标：把移动端弹层、底部导航、安全区和白天模式主题从散补丁收成共享规则。
- 规划：先收束 `mobile-me-and-news-fullscreen` 和 `overhaul-day-mode-theme-system` 的可验证部分；继续从共享组件和主题 token 下手，不逐页堆颜色补丁。
- 当前执行切片：验证移动“我的”入口、AI 社区新闻全屏、项目广场 body portal 和白天/暗色构建。
- 验证：移动 viewport Playwright、相关 lint/build、英文模式文案扫描。

### P2 iOS Capacitor App

- 目标：补齐 iOS 分发形态，复用现有 Web/PWA。
- 规划：保留 Capacitor/WKWebView 路线，不重写原生页面；当前仓库已有 `ios/`、`capacitor.config.json`、脚本和说明文档。
- 当前执行切片：运行 Web build 与 `cap sync ios`；Xcode/真机验证保留为 macOS + Apple Developer 环境任务。
- 验证：`npm run build`、`npm run cap:sync:ios`、后续 Xcode/真机清单。

### P3 后台运营台

- 目标：把内容审核、模型治理、资源管理和运营指标变成高信号工作台。
- 规划：复用已有 `admin-command-center` 与 `admin-console-systematization` 规格；短期不重写后台，只围绕内容队列和治理队列补入口。
- 当前执行切片：等项目广场、社区投稿、黑客松成果的内容链路稳定后，把它们挂入统一后台队列。
- 验证：admin e2e、URL tab 深链、审核状态和模型 key 管理回归。

## 暂不做

- 不新增独立私信系统，项目广场 v1 继续用登录后可见联系方式。
- 不把 AI 社区拆回独立教程站、新闻站或组队站。
- 不做 iOS 原生重写、推送、扫码和相机增强；这些等 WKWebView 壳层稳定后再开独立 change。
- 不做黑客松 legacy 数据的破坏性删除；先审计依赖，再迁移。
