# 个人多媒体资源管理系统 - 设计框架与技术实现文档

## 1. 项目摘要
本项目是一个基于现代 Web 技术的个人多媒体资源管理系统，旨在提供一个高性能、美观且易于管理的平台，用于展示和管理摄影作品、音乐、视频、文章和活动记录。系统采用前后端分离架构，前端注重交互体验与视觉美感，后端强调数据的一致性与扩展性。核心特色包括动态资源管理工厂模式、Stale-While-Revalidate 缓存策略以及基于角色的访问控制（RBAC）。

## 2. 系统架构设计

### 2.1 整体架构
系统采用 **Client-Server (C/S)** 架构模式，通过 RESTful API 进行通信。

*   **前端层 (Client)**: 单页应用 (SPA)，负责页面渲染、用户交互、路由管理及状态管理。
*   **API 层 (Server)**: 提供 RESTful 接口，处理业务逻辑、权限验证及数据转换。
*   **数据层 (Database)**: 负责持久化存储结构化数据（用户、资源元数据）及配置信息。

### 2.2 目录结构规范
*   `src/`: 前端源代码
    *   `components/`: UI 组件与页面级组件
    *   `hooks/`: 自定义 React Hooks (逻辑复用)
    *   `context/`: 全局状态管理 (Auth, Settings)
    *   `services/`: API 请求封装
*   `server/src/`: 后端源代码
    *   `controllers/`: 业务逻辑控制器
    *   `models/`: 数据库模型定义 (SQLite)
    *   `middleware/`: 中间件 (Auth, Upload, Cache)
    *   `routes/`: 路由定义

## 3. 技术栈与选型理由

### 3.1 前端技术栈
*   **React 18**: 利用并发模式和 Hooks 构建组件化 UI，保证开发效率与维护性。
*   **Vite**: 下一代前端构建工具，提供极速的冷启动和热更新 (HMR) 体验。
*   **Tailwind CSS**: 原子化 CSS 框架，实现高度可定制的响应式设计，减少 CSS 体积。
*   **Framer Motion**: 声明式动画库，用于实现流畅的页面转场和微交互（如卡片悬停效果）。
*   **React Router v6**: 处理 SPA 路由，支持路由懒加载 (Lazy Loading) 优化首屏性能。

### 3.2 后端技术栈
*   **Node.js & Express**: 轻量级、非阻塞 I/O 的 Web 框架，适合处理高并发的 I/O 密集型任务。
*   **SQLite (better-sqlite3)**: 嵌入式关系型数据库。
    *   *选型理由*: 零配置、单文件存储，非常适合个人项目部署与迁移；开启 WAL (Write-Ahead Logging) 模式后并发性能显著提升。
*   **JWT (JSON Web Token)**: 无状态身份验证，减轻服务端 Session 存储压力。

## 4. 数据库设计

### 4.1 核心数据模型
系统包含以下核心实体表：

1.  **Users (用户表)**
    *   `id`: 主键
    *   `username`: 用户名
    *   `password`: 加密后的哈希密码 (Bcrypt)
    *   `role`: 角色 ('admin' | 'user') - 决定资源审批权限
    *   `avatar`: 头像 URL

2.  **Resources (资源表 - 包含 Photos, Music, Videos, Articles, Events)**
    *   虽然物理上分为多张表，但逻辑结构一致（多态设计思想）：
    *   `id`: 主键
    *   `title`: 标题
    *   `url/content`: 资源链接或内容
    *   `uploader_id`: 关联 Users 表
    *   `status`: 状态 ('approved' | 'pending') - 审核机制
    *   `likes`: 点赞数
    *   `deleted_at`: 软删除时间戳

3.  **Tags (标签表)**
    *   实现资源的分类与检索，支持多对多关系。

### 4.2 数据一致性策略
*   **软删除 (Soft Delete)**: 核心资源表包含 `deleted_at` 字段，删除时仅标记，不物理移除，防止误操作并保留审计记录。
*   **级联清理**: 当执行“永久删除”时，系统会自动清理关联的评论、收藏及物理文件，防止孤儿数据。

## 5. 核心功能模块实现

### 5.1 动态资源管理 (后端亮点)
为了避免为每种资源（图片、视频、文章）编写重复的 CRUD 代码，后端实现了 **工厂模式控制器** (`resourceController.js`)。

*   **实现逻辑**: `createHandler(table, fields)` 是一个高阶函数，接收表名和字段列表，动态生成对应的 Express 中间件。
*   **优势**: 极大地减少了代码冗余，新增一种资源类型只需一行配置。

### 5.2 性能优化：Stale-While-Revalidate (前端亮点)
自定义 Hook `useCachedResource` 实现了高级缓存策略。

*   **工作流程**:
    1.  组件挂载时，优先从 `localStorage` 读取缓存数据并立即渲染（秒开体验）。
    2.  同时在后台发起真实网络请求。
    3.  网络请求返回后，对比数据指纹，如有更新则重新渲染 UI 并更新缓存。
*   **代码参考**: `src/hooks/useCachedResource.js`

### 5.3 安全与权限控制 (RBAC)
*   **认证**: 使用 HTTP Authorization Header 携带 JWT Token。
*   **鉴权**:
    *   `isAdmin` 中间件：拦截敏感操作（如全局配置修改、审批资源）。
    *   **资源可见性**: 普通用户只能看到 `status='approved'` 的资源；管理员和资源拥有者可以看到 `pending` 状态的资源。

## 6. UI/UX 设计哲学

### 6.1 视觉风格：Glassmorphism (毛玻璃)
*   全站采用半透明背景 (`backdrop-blur`) 配合细微边框 (`border-white/10`)，营造层次感与现代感。
*   **Retro Grid**: 背景采用复古网格动画，增加视觉深度而不干扰内容阅读。

### 6.2 响应式布局
*   **Masonry Layout (瀑布流)**: 图片画廊采用 CSS Column 布局，自动适应不同屏幕宽度，解决不同尺寸图片展示的空隙问题。
*   **Mobile First**: 导航栏在移动端自动折叠为汉堡菜单，触摸目标优化（>44px）。

## 7. 总结与展望
本项目成功构建了一个全功能的资源管理系统。通过采用工厂模式和自定义 Hooks，代码具有极高的复用性和可维护性。未来计划引入 Redis 缓存层以进一步提升高并发下的读取性能，并结合 AI 技术实现资源的自动打标与分类。
