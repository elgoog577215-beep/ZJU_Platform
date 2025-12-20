$ServerIP = "118.31.78.72"
$User = "root"
$RepoURL = "https://github.com/elgoog577215-beep/ZJU_Platform.git"
$Branch = "mmaster"
$ProjectDir = "ZJU_Platform"

Write-Host "=========================================="
Write-Host "      ZJU Platform 远程部署工具"
Write-Host "=========================================="
Write-Host "服务器: $ServerIP"
Write-Host "分支: $Branch"
Write-Host "=========================================="
Write-Host "注意：如果这是第一次连接，可能会提示您确认 host key (输入 yes)。"
Write-Host "接着需要输入 $User@$ServerIP 的密码。"
Write-Host "=========================================="

$RemoteCommands = @"
set -e

# 检查并安装 git 和 curl
if ! command -v git &> /dev/null || ! command -v curl &> /dev/null; then
    echo "正在检查必要工具 (git, curl)..."
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y git curl
    elif command -v yum &> /dev/null; then
        yum install -y git curl
    fi
fi

# 进入主目录
cd ~

if [ ! -d "$ProjectDir" ]; then
    echo "项目目录不存在，正在克隆..."
    git clone -b $Branch $RepoURL $ProjectDir
else
    echo "项目目录已存在，正在更新..."
    cd $ProjectDir
    git fetch origin
    git checkout $Branch
    git reset --hard origin/$Branch
    cd ..
fi

cd $ProjectDir
echo "赋予部署脚本执行权限..."
chmod +x deploy.sh
echo "执行部署脚本..."
./deploy.sh
"@

# 执行 SSH 命令
# 使用 -t 强制分配伪终端，以便 sudo 或其他命令需要交互时能正常工作
ssh -t $User@$ServerIP "$RemoteCommands"

Write-Host "=========================================="
if ($LASTEXITCODE -eq 0) {
    Write-Host "部署命令执行完毕！" -ForegroundColor Green
    Write-Host "请访问 http://$ServerIP 验证网站是否正常运行。"
} else {
    Write-Host "部署过程中出现错误，请检查输出信息。" -ForegroundColor Red
}
Write-Host "=========================================="
