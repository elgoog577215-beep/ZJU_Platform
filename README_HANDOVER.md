# 项目交接文档 & 服务器运维指南 (Project Handover & Server Guide)

本文档旨在帮助新接手的开发人员快速理解本项目架构，并提供阿里云服务器的日常运维命令速查。

## 1. 技术栈概览 (Tech Stack)

本项目采用现代化的前后端分离架构（SPA + API）。

### 前端 (Frontend)
- **框架**: [React 18](https://react.dev/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **动画**: [Framer Motion](https://www.framer.com/motion/) (UI动画), [Three.js / @react-three/fiber](https://docs.pmnd.rs/react-three-fiber) (3D效果)
- **国际化**: [i18next](https://www.i18next.com/) (支持多语言切换)
- **状态管理**: React Context + SWR (数据请求与缓存)

### 后端 (Backend)
- **运行时**: [Node.js](https://nodejs.org/)
- **Web框架**: [Express](https://expressjs.com/)
- **数据库**: [SQLite](https://www.sqlite.org/) (轻量级文件数据库，无需独立安装服务)
- **安全**: Helmet (HTTP头安全), Express Rate Limit (限流), JWT (身份验证)
- **文件处理**: Multer (文件上传)

## 2. 项目目录结构 (Project Structure)

```
/
├── dist/                # 前端构建后的静态文件 (生产环境部署用)
├── public/              # 静态资源 (图标, locales等)
├── src/                 # 前端源代码
│   ├── components/      # React组件
│   ├── pages/           # 页面组件
│   ├── context/         # 全局状态 (Auth, Theme等)
│   └── services/        # API请求封装
├── server/              # 后端源代码
│   ├── src/
│   │   ├── config/      # 配置 (数据库连接等)
│   │   ├── controllers/ # 业务逻辑
│   │   ├── routes/      # API路由
│   │   └── middleware/  # 中间件 (Auth, Upload等)
│   ├── uploads/         # [重要] 用户上传的图片/视频存储目录
│   └── database.sqlite  # [重要] 生产环境数据库文件
├── index.html           # 前端入口
├── package.json         # 项目依赖配置
└── vite.config.js       # Vite配置
```

## 3. 服务器运维命令大全 (Server Cheat Sheet)

假设您使用 Linux (CentOS/Ubuntu) 系统的阿里云服务器。

### 3.1 首次环境准备 (如果迁移到新服务器)

```bash
# 1. 安装 Node.js (建议版本 v18+)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 2. 安装 PM2 (进程管理工具，用于后台运行服务)
npm install -g pm2

# 3. 拉取代码
git clone <您的仓库地址>
cd <项目目录>
```

### 3.2 部署更新 (日常最常用)

当您在本地修改代码并 push 后，在服务器执行以下命令更新：

```bash
# 1. 拉取最新代码 (强制覆盖本地修改，确保一致性)
git fetch --all
git reset --hard origin/test

# 2. 安装依赖并构建前端 (使用项目自带的快捷脚本)
npm run setup
# 注意：该命令会自动安装前后端依赖，并运行 vite build 生成 dist 目录

# 3. 重启服务 (使后端代码生效)
pm2 restart all
```

### 3.3 服务管理 (PM2)

我们推荐使用 PM2 来管理 Node.js 服务，它能保证服务崩溃后自动重启。

```bash
# 启动服务 (首次运行)
# 进入 server 目录启动 index.js，命名为 "portfolio-api"
cd server
pm2 start index.js --name "portfolio-api"
cd ..

# 查看服务状态
pm2 status

# 查看实时日志 (排查报错神器)
pm2 logs "portfolio-api"
# 或者查看所有日志
pm2 logs

# 重启服务
pm2 restart "portfolio-api"

# 停止服务
pm2 stop "portfolio-api"
```

### 3.4 常用 Linux 维护命令

```bash
# 查看磁盘空间 (防止 uploads 目录占满磁盘)
df -h

# 查看内存使用情况
free -m

# 查找大文件 (例如查找大于 100MB 的文件)
find / -type f -size +100M

# 压缩备份 uploads 目录 (防止误删)
tar -czvf uploads_backup_20260128.tar.gz server/uploads/
```

## 4. 数据备份与恢复 (Data Backup)

本项目的数据核心在于两个部分，建议定期备份：

1.  **数据库文件**: `server/database.sqlite`
    *   存储了所有用户、文章、标签、评论等结构化数据。
2.  **上传文件目录**: `server/uploads/`
    *   存储了所有图片、视频、音频等媒体资源。

**备份脚本示例**:
```bash
# 简单的备份命令
cp server/database.sqlite server/database.sqlite.bak.$(date +%F)
```

## 5. 开发环境 (Local Development)

如果您的朋友要在本地电脑上运行项目：

1.  安装 [Node.js](https://nodejs.org/)。
2.  克隆仓库。
3.  运行 `npm run setup` 初始化。
4.  运行 `npm run dev` 启动开发服务器（前后端同时启动）。
    *   前端: http://localhost:5173
    *   后端: http://localhost:3001

---
*文档生成日期: 2026-01-28*
