$ServerIP = "118.31.78.72"
$User = "root"
$ProjectDir = "~/ZJU_Platform"
$Branch = "mmaster"

Write-Host "=========================================="
Write-Host "      ZJU Platform 远程 Git 部署"
Write-Host "=========================================="
Write-Host "服务器: $ServerIP"
Write-Host "分支: $Branch"
Write-Host "=========================================="

$RemoteCommands = @"
set -e

# 进入主目录
if [ ! -d "$ProjectDir" ]; then
    echo "项目目录不存在，正在克隆..."
    git clone -b $Branch https://github.com/elgoog577215-beep/ZJU_Platform.git $ProjectDir
else
    echo "项目目录已存在，正在拉取最新代码..."
    cd $ProjectDir
    git fetch origin
    git reset --hard origin/$Branch
fi

# 因为 dist 目录已经在 git 中，所以不需要 build
echo "代码已更新 (包含 dist 目录)"

echo "正在更新后端依赖..."
cd $ProjectDir/server
npm install

echo "重启服务..."
cd ..
if command -v pm2 &> /dev/null; then
    pm2 restart ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production
    pm2 save
else
    echo "PM2 未找到，尝试安装..."
    npm install -g pm2
    pm2 start ecosystem.config.cjs --env production
fi

echo "部署完成！"
"@

# 执行远程命令
Write-Host "正在连接服务器执行更新..."
ssh -t $User@$ServerIP "$RemoteCommands"

Write-Host "=========================================="
if ($LASTEXITCODE -eq 0) {
    Write-Host "部署成功！" -ForegroundColor Green
    Write-Host "请访问 http://$ServerIP 验证网站。"
} else {
    Write-Host "部署过程中出现错误。" -ForegroundColor Red
}
Write-Host "=========================================="
