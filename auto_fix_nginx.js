import { Client } from 'ssh2';

const conn = new Client();

console.log('🚀 正在连接远程服务器修复 Nginx...');

conn.on('ready', () => {
  console.log('✅ 连接成功！开始配置 Nginx...');
  
  conn.shell((err, stream) => {
    if (err) throw err;
    
    stream.on('close', () => {
      console.log('🔌 Nginx 修复完毕，连接断开');
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    });
    
    // Nginx 修复脚本：
    // 1. 指向正确的前端 dist 目录
    // 2. 配置 API 反向代理
    // 3. 确保前端路由刷新不白屏 (try_files)
    const fixNginxScript = `
echo ">>> 1. 重新构建前端（确保 dist 存在）..."
cd /var/www/zju_platform
npm run build

echo ">>> 2. 覆盖 Nginx 配置..."
cat >/etc/nginx/sites-available/zju_platform <<'EOF'
server {
  listen 80;
  server_name _;
  
  # 开启 gzip 压缩
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

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

echo ">>> 3. 重启 Nginx..."
ln -sf /etc/nginx/sites-available/zju_platform /etc/nginx/sites-enabled/zju_platform
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "🎉🎉🎉 Nginx 配置修复完成！"
echo "请刷新浏览器访问 http://118.31.78.72"
exit
`;

    stream.write(fixNginxScript + '\n');
    
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
