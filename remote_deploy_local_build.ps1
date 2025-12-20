$ServerIP = "118.31.78.72"
$User = "root"
$RepoURL = "https://github.com/elgoog577215-beep/ZJU_Platform.git"
$Branch = "mmaster"
$ProjectDir = "ZJU_Platform"
$LocalDistDir = "dist"
$LocalZipFile = "dist.zip"
$RemoteZipFile = "~/dist.zip"

Write-Host "=========================================="
Write-Host "      ZJU Platform 本地构建 & 远程部署"
Write-Host "=========================================="
Write-Host "服务器: $ServerIP"
Write-Host "分支: $Branch"
Write-Host "=========================================="

# 1. 本地构建
Write-Host "1. 开始本地构建 (npm run build)..."
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) {
    Write-Host "本地构建失败！停止部署。" -ForegroundColor Red
    exit 1
}

# 2. 压缩 dist 目录
Write-Host "2. 正在压缩 dist 目录..."
if (Test-Path $LocalZipFile) {
    Remove-Item $LocalZipFile -Force
}
Compress-Archive -Path "$LocalDistDir\*" -DestinationPath $LocalZipFile -Force

# 3. 上传构建产物
Write-Host "3. 正在上传构建产物 (dist.zip)..."
Write-Host "提示: 您可能需要输入两次密码 (一次用于上传，一次用于部署命令)" -ForegroundColor Yellow
scp $LocalZipFile "$User@$ServerIP`:$RemoteZipFile"
if ($LASTEXITCODE -ne 0) {
    Write-Host "上传失败！停止部署。" -ForegroundColor Red
    exit 1
}

# 4. 远程部署命令
$RemoteCommands = @"
set -e

# 检查并安装 unzip
if ! command -v unzip &> /dev/null; then
    echo "正在安装 unzip..."
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y unzip
    elif command -v yum &> /dev/null; then
        yum install -y unzip
    fi
fi

# 进入主目录
cd ~

if [ ! -d "$ProjectDir" ]; then
    echo "项目目录不存在，正在克隆..."
    git clone -b $Branch $RepoURL $ProjectDir
else
    echo "项目目录已存在，正在更新代码..."
    cd $ProjectDir
    git fetch origin
    git checkout $Branch
    git reset --hard origin/$Branch
    cd ..
fi

echo "正在应用新的构建产物..."
# 清理旧的 dist
rm -rf $ProjectDir/dist
# 创建 dist 目录
mkdir -p $ProjectDir/dist
# 解压新的 dist
unzip -o $RemoteZipFile -d $ProjectDir/dist
# 删除压缩包
rm $RemoteZipFile

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

# 5. 执行远程命令
Write-Host "4. 执行远程部署脚本..."
ssh -t $User@$ServerIP "$RemoteCommands"

Write-Host "=========================================="
if ($LASTEXITCODE -eq 0) {
    Write-Host "部署成功！" -ForegroundColor Green
    Write-Host "请访问 http://$ServerIP 验证网站。"
} else {
    Write-Host "部署过程中出现错误。" -ForegroundColor Red
}
Write-Host "=========================================="
