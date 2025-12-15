# 部署指南 (Deployment Guide)

本项目包含 React 前端和 Node.js 后端。以下是将网站发布到 Linux 服务器（如 Ubuntu）的详细步骤。

## 1. 准备工作

你需要：
- 一台 Linux 服务器 (推荐 Ubuntu 20.04 或 22.04)
- 域名 (可选，但推荐)
- SSH 工具 (如 Putty, Xshell 或 终端)

## 2. 服务器环境配置

连接到你的服务器，依次运行以下命令安装 Node.js 和 Nginx。

### 安装 Node.js (v18+)
```bash
# 更新系统
sudo apt update
sudo apt upgrade -y

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v
npm -v
```

### 安装 PM2 (进程管理器)
```bash
sudo npm install -g pm2
```

## 3. 上传代码

你可以使用 Git 或 FTP/SFTP 上传代码。

### 方法 A: 使用 Git (推荐)
1. 将代码推送到 GitHub/GitLab。
2. 在服务器上克隆仓库：
```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 方法 B: 使用 SFTP
将本地项目文件夹直接上传到服务器的 `/var/www/777` (或其他目录)。

## 4. 安装依赖与构建

进入项目根目录：

```bash
# 1. 安装根目录依赖 (如果有)
npm install

# 2. 安装前端依赖并构建
npm install
npm run build

# 这将生成 dist 文件夹，后端会自动托管这些静态文件。

# 3. 安装后端依赖
cd server
npm install
cd ..
```

## 5. 启动服务

使用 PM2 启动后端服务（它同时会提供前端页面）：

```bash
# 在根目录下运行
pm2 start ecosystem.config.cjs

# 保存当前进程列表，以便开机自启
pm2 save
pm2 startup
```

此时，网站应该已经在 `http://你的服务器IP:3001` 上运行了。

## 6. 配置 Nginx 反向代理 (推荐)

为了使用 80 端口 (HTTP) 或域名访问，建议配置 Nginx。

### 安装 Nginx
```bash
sudo apt install -y nginx
```

### 配置站点
创建一个新的配置文件：
```bash
sudo nano /etc/nginx/sites-available/lumos
```

粘贴以下内容 (将 `your_domain.com` 替换为你的域名或服务器 IP)：

```nginx
server {
    listen 80;
    server_name your_domain.com; # 或者是你的 IP

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置并重启 Nginx：
```bash
sudo ln -s /etc/nginx/sites-available/lumos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

现在你应该可以通过 `http://your_domain.com` 访问网站了。

## 7. 常见问题

- **数据库数据在哪里？**
  数据存储在 `server/database.sqlite`。请定期备份此文件。

- **如何查看日志？**
  运行 `pm2 logs`。

- **如何更新代码？**
  1. `git pull` (或重新上传)
  2. `npm run build` (如果前端有变动)
  3. `pm2 restart lumos-portfolio`
