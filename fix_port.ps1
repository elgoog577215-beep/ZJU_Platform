$ServerIP = "118.31.78.72"
$User = "root"

Write-Host "=========================================="
Write-Host "      ZJU Platform 端口诊断与修复"
Write-Host "=========================================="
Write-Host "服务器: $ServerIP"
Write-Host "=========================================="

$RemoteCommands = @"
# 1. 停止当前服务
pm2 delete all

# 2. 检查端口占用 (清理可能占用的进程)
fuser -k 80/tcp
fuser -k 3001/tcp

# 3. 以 80 端口启动服务
echo "正在以 80 端口启动服务..."
cd ~/ZJU_Platform/server
# 确保安装了 PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 设置环境变量 PORT=80 并启动
PORT=80 pm2 start ../ecosystem.config.cjs --name zju-platform --env production
pm2 save

# 4. 检查防火墙 (尝试放行 80 端口)
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 3001/tcp
    ufw reload
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --zone=public --add-port=80/tcp --permanent
    firewall-cmd --zone=public --add-port=3001/tcp --permanent
    firewall-cmd --reload
fi

echo "=========================================="
echo "服务状态:"
pm2 list
echo "=========================================="
echo "监听端口:"
netstat -ntlp | grep node
"@

# 执行远程命令
ssh -t $User@$ServerIP "$RemoteCommands"

Write-Host "=========================================="
if ($LASTEXITCODE -eq 0) {
    Write-Host "修复脚本执行完毕！" -ForegroundColor Green
    Write-Host "请尝试访问: http://$ServerIP"
} else {
    Write-Host "执行出错，请检查网络或密码。" -ForegroundColor Red
}
Write-Host "=========================================="
