#!/bin/bash

# Stop on error
set -e

echo "开始部署..."

# 1. 检查并安装 Node.js (如果没有安装)
if ! command -v node &> /dev/null; then
    echo "正在安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js 已安装: $(node -v)"
fi

# 2. 安装 PM2 (如果未安装)
if ! command -v pm2 &> /dev/null; then
    echo "正在安装 PM2..."
    npm install -g pm2
fi

# 3. 安装根目录依赖 (用于构建前端)
echo "安装项目依赖..."
npm install

# 4. 构建前端
echo "正在构建前端..."
npm run build

# 5. 安装后端依赖
echo "安装后端依赖..."
cd server
npm install
cd ..

# 6. 启动应用
echo "启动应用..."
pm2 restart ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production
pm2 save

echo "部署完成！请访问 http://$(curl -s ifconfig.me) 查看网站"
