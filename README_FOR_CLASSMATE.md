# 网站部署说明 (Deployment Instructions)

这份文档是给负责部署的同学看的。

## 1. 技术栈概览 (Tech Stack)

- **Frontend**: React + Vite (构建产物在 `dist/` 目录)
- **Backend**: Node.js + Express (运行在 3001 端口)
- **Database**: SQLite (数据文件位于 `server/database.sqlite`)
- **Process Manager**: PM2 (推荐使用)
- **Web Server**: Nginx (反向代理)

## 2. 环境要求 (Prerequisites)

- **Node.js**: 必须安装 **v18.0.0** 或更高版本 (因为后端使用了 `File` API，Node 14/16 会报错)。
- **Nginx**: 用于反向代理和静态文件服务。

## 3. 部署步骤 (Step-by-Step)

### 第一步：安装依赖

进入项目根目录：

```bash
# 1. 安装根目录依赖
npm install

# 2. 安装后端依赖
cd server
npm install
cd ..
```

### 第二步：构建前端

```bash
# 在根目录下运行
npm run build
```

这会在根目录下生成一个 `dist` 文件夹，里面是打包好的网页文件。

### 第三步：启动后端服务

建议使用 PM2 来管理进程：

```bash
# 安装 PM2 (如果还没装)
sudo npm install -g pm2

# 启动服务 (使用根目录下的配置文件)
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

此时，后端应该在 `http://localhost:3001` 启动。

### 第四步：配置 Nginx (关键)

我们需要配置 Nginx 让用户通过域名或 IP (80端口) 访问。

1. 创建或编辑 Nginx 配置文件 (例如 `/etc/nginx/sites-available/my-website`)：

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;  # 替换为你的域名或服务器IP

    # 开启 gzip 压缩，加快加载速度
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 1. 前端静态文件 (指向 dist 目录)
    # 注意：请修改 /path/to/project 为实际的项目路径
    location / {
        root /path/to/project/dist;  
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 2. 后端 API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. 上传文件目录代理 (图片/视频)
    location /uploads {
        proxy_pass http://127.0.0.1:3001/uploads;
    }
}
```

2. 启用配置并重启 Nginx：

```bash
# 如果是新建的文件，建立软链接
sudo ln -s /etc/nginx/sites-available/my-website /etc/nginx/sites-enabled/

# 测试配置是否有语法错误
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

## 4. 常见问题 (Troubleshooting)

- **报错 `File is not defined`**: 确认 Node.js 版本是否 >= 18。
- **数据库没数据**: 确认 `server/database.sqlite` 文件存在。如果不存在，后端会自动创建一个空的。
- **图片无法显示**: 检查 Nginx 的 `/uploads` 配置是否正确代理到了 `http://127.0.0.1:3001/uploads`。
