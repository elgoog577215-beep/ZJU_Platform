$ServerIP = "118.31.78.72"
$User = "root"
$Branch = "test"
$ProjectDir = "ZJU_Platform"

Write-Host "=========================================="
Write-Host "      ZJU Platform Clean Deploy"
Write-Host "=========================================="
Write-Host "1. Force pushing local code and data..."
Write-Host "2. Cleaning remote server..."
Write-Host "3. Re-deploying..."
Write-Host "=========================================="

# 1. Local Push
Write-Host "Step 1: Pushing local changes..."
git add .
git add server/database.sqlite -f
git add server/uploads -f
git add dist -f
git commit -m "Full deployment with database and dist" 
git push origin $Branch -f
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git push failed!" -ForegroundColor Red
    exit 1
}

# 2. Remote Commands
# Note: Using strict Here-String syntax (no indentation for closing tag)
# Fixed: Removed parentheses in echo commands to avoid bash syntax errors
$RemoteCommands = @"
set -e

echo "=== Remote: Cleaning environment ==="
if command -v pm2 &> /dev/null; then
    pm2 delete all || true
    pm2 save --force
fi

cd ~
if [ -d "$ProjectDir" ]; then
    echo "Removing old project directory..."
    rm -rf $ProjectDir
fi

echo "=== Remote: Cloning code ==="
git clone -b $Branch https://github.com/elgoog577215-beep/ZJU_Platform.git $ProjectDir

echo "=== Remote: Installing dependencies ==="
cd $ProjectDir/server
npm install

echo "=== Remote: Starting Server on Port 3001 ==="
cd $ProjectDir
pm2 start ecosystem.config.cjs --env production
pm2 save

echo "=== Remote: Configuring Port Forwarding 80 to 3001 ==="
# Check if rule exists
if ! iptables -t nat -C PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3001 2>/dev/null; then
    echo "Adding iptables rule..."
    iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3001
else
    echo "Iptables rule already exists."
fi

echo "=== Deployment Complete ==="
"@

# Execute SSH
Write-Host "Step 2: Connecting to server..."
ssh -t $User@$ServerIP "$RemoteCommands"

Write-Host "=========================================="
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS! Website deployed." -ForegroundColor Green
    Write-Host "Visit: http://$ServerIP"
} else {
    Write-Host "FAILURE. Deployment failed." -ForegroundColor Red
}
Write-Host "=========================================="
