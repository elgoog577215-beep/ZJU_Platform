# Lumos 作品集 (Lumos Portfolio)

一个充满未来感、拥有沉浸式 3D 交互和流畅动画效果的个人作品集网站，配备功能完善的管理后台。

## 🚀 技术栈

### 前端 (Frontend)
- **核心框架**: React 18
- **构建工具**: Vite
- **样式方案**: Tailwind CSS + Framer Motion
- **3D 图形**: Three.js + React Three Fiber
- **数据/状态**: SWR + Axios
- **国际化**: i18next (支持多语言切换)

### 后端 (Backend)
- **运行环境**: Node.js
- **Web 框架**: Express
- **数据库**: SQLite (嵌入式数据库，无需额外安装配置)
- **安全机制**: JWT (认证), Helmet (安全头), Rate Limiting (限流)

## 🛠️ 快速开始

### 环境要求
- Node.js (建议 v16 或更高版本)
- npm 或 yarn

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone git@github.com:elgoog577215-beep/ZJU_Platform.git
   cd ZJU_Platform
   ```

2. **安装前端依赖**
   ```bash
   npm install
   ```

3. **安装后端依赖**
   ```bash
   cd server
   npm install
   ```

### 启动项目

你需要同时启动前端和后端服务。

1. **启动后端服务器**
   打开一个终端窗口：
   ```bash
   cd server
   npm start
   ```
   服务器将运行在 `http://localhost:3001`。
   *如果是首次运行，系统会自动初始化数据库并填充种子数据。*

2. **启动前端开发服务器**
   打开一个新的终端窗口（在项目根目录）：
   ```bash
   npm run dev
   ```
   网站将在 `http://localhost:5173` 启动。

## 🔑 管理员后台

网站包含一个强大的管理后台，用于管理所有内容（照片、音乐、视频、文章、活动、用户等）。

- **访问地址**: `http://localhost:5173/admin`
- **访问口令**: `12345`

> **注意**: 为了简化体验，管理员登录采用了“仅口令验证”模式，无需输入用户名。

## 📂 项目结构

```
├── public/             # 静态资源 (图片, 语言包等)
├── src/                # 前端源代码
│   ├── components/     # React 组件 (Admin, Layout, UI 等)
│   ├── pages/          # 主要页面布局
│   ├── services/       # API 配置与请求
│   └── ...
├── server/             # 后端源代码
│   ├── src/            # 控制器, 路由, 中间件
│   ├── uploads/        # 用户上传的文件存储目录
│   └── database.sqlite # SQLite 数据库文件
└── ...
```

## ✨ 功能特性

- **沉浸式主页**: 3D 背景与交互式元素。
- **媒体画廊**: 管理和展示照片、音乐及视频作品。
- **博客/文章**: 阅读与撰写深度文章。
- **活动管理**: 活动日历视图、报名系统及外部活动抓取功能。
- **用户系统**: 用户注册、个人资料管理及基于角色的权限控制。
- **管理后台**:
  - 所有资源的全功能 CRUD（增删改查）操作。
  - 实时文件管理系统。
  - 审计日志与系统状态统计。
  - 可视化内容编辑器。
- **响应式设计**: 完美适配桌面端与移动端设备。

---
Created with ❤️ by Trae.
