import { Client } from 'ssh2';

const conn = new Client();

console.log('🚀 正在连接远程服务器进行最终部署...');

conn.on('ready', () => {
  console.log('✅ 连接成功！开始配置环境...');
  
  conn.shell((err, stream) => {
    if (err) throw err;
    
    stream.on('close', () => {
      console.log('🔌 部署流程结束，连接断开');
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    });
    
    // 最终部署脚本：
    // 1. 停止 Nginx (如果占用 80)
    // 2. 确保后端服务正常 (监听 3001)
    // 3. 重新构建前端
    // 4. 配置 Nginx 转发
    // 5. 启动 Nginx
    const deployScript = `
echo ">>> 1. 准备环境..."
export DEBIAN_FRONTEND=noninteractive
# 确保安装 Nginx
if ! command -v nginx &> /dev/null; then
    apt-get update -y && apt-get install -y nginx
fi

echo ">>> 2. 检查代码..."
cd /var/www/zju_platform
git pull || git clone https://github.com/elgoog577215-beep/ZJU_Platform.git .

echo ">>> 3. 构建前端..."
npm install
npm run build

echo ">>> 4. 确保后端运行..."
cd server
# 注入 File 兼容性代码（以防万一）
if ! grep -q "global.File" index.js; then
  sed -i '1i const { File } = require("node:buffer"); global.File = File;' index.js
fi
npm install
# 确保 PM2 启动
if ! pm2 list | grep -q "zju-platform"; then
    PORT=3001 pm2 start index.js --name zju-platform --update-env
else
    PORT=3001 pm2 restart zju-platform --update-env
fi
pm2 save

echo ">>> 5. 配置 Nginx (80 -> 3001/dist)..."
cat >/etc/nginx/sites-available/zju_platform <<'EOF'
server {
  listen 80;
  server_name _;
  
  # 开启 gzip 压缩
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
  client_max_body_size 50m;

  # 前端静态文件
  location / {
    root /var/www/zju_platform/dist;
    index index.html;
    try_files \$uri \$uri/ /index.html;
  }

  # 后端 API 代理
  location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
  
  # 上传文件目录代理
  location /uploads {
    proxy_pass http://127.0.0.1:3001/uploads;
  }
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/zju_platform /etc/nginx/sites-enabled/zju_platform
rm -f /etc/nginx/sites-enabled/default

# 检查并重启 Nginx
nginx -t && systemctl restart nginx

echo ">>> 6. 最终检查..."
echo "后端状态:"
curl -I http://127.0.0.1:3001/ || echo "Warning: Backend not reachable on 3001"
echo "前端/Nginx状态:"
curl -I http://127.0.0.1/ || echo "Warning: Nginx not reachable on 80"

echo "🎉🎉🎉 部署完成！"
echo "请访问: http://118.31.78.72"
exit
`;

    stream.write(deployScript + '\n');
    
  });
}).on('error', (err) => {
  console.error('❌ 连接错误:', err);
}).connect({
  host: '118.31.78.72',
  port: 22,
  username: 'root',
  password: 'TuoTu#SQTP#339280760',
  readyTimeout: 30000
});
