$ErrorActionPreference = "Stop"

$ServerIP = "118.31.78.72"
$User = "root"
$RemotePath = "/root/ZJU_Platform/server/database.sqlite"
$LocalPath = "server\database.sqlite"

Write-Host "正在将数据库同步到服务器 $ServerIP..." -ForegroundColor Cyan

# Check if scp is available
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-Error "未找到 scp 命令。请确保安装了 OpenSSH 客户端 (Windows 设置 -> 应用 -> 可选功能)。"
}

# Upload
scp $LocalPath ${User}@${ServerIP}:${RemotePath}

if ($LASTEXITCODE -eq 0) {
    Write-Host "数据库同步成功！" -ForegroundColor Green
    Write-Host "注意：服务器上的应用可能需要重启才能看到最新数据 (pm2 restart all)" -ForegroundColor Yellow
} else {
    Write-Error "数据库同步失败。"
}
