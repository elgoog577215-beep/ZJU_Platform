# 部署指南

## 1. 快速部署 (推荐)

我们在项目根目录下准备了一个一键部署脚本 `remote_deploy.ps1`，您可以在**本地电脑**上直接运行它来完成部署。

### 使用方法：

1. 打开 PowerShell 终端。
2. 运行以下命令：
   ```powershell
   .\remote_deploy.ps1
   ```
3. 按照提示输入服务器密码即可。

脚本会自动连接服务器、拉取最新代码、安装依赖、构建前端并重启服务。

---

## 2. 手动部署

如果您更喜欢手动操作，可以按照以下步骤进行：

### 第一步：在服务器上拉取代码

通过 SSH 登录到您的服务器，然后克隆或拉取代码：

```bash
ssh root@118.31.78.72

# 如果是首次部署
cd ~
git clone -b mmaster https://github.com/elgoog577215-beep/ZJU_Platform.git
cd ZJU_Platform

# 如果已经部署过
cd ~/ZJU_Platform
git pull origin mmaster
```

### 第二步：运行部署脚本

在项目根目录下运行：

```bash
# 赋予执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

脚本会自动安装 Node.js、PM2、依赖，并构建和启动服务。网站将在 80 端口运行。

---

## 3. 数据库同步 (Windows 本地 -> 服务器)

如果您想把本地的数据库 (`server/database.sqlite`) 同步到服务器，请在**本地电脑**上运行提供的 `sync_db.ps1` 脚本。

1. 右键点击 `sync_db.ps1`，选择“使用 PowerShell 运行”。
2. 或者在 PowerShell 中运行：
   ```powershell
   .\sync_db.ps1
   ```

**注意**：该脚本默认将数据库上传到 `/root/ZJU_Platform/server/database.sqlite`。如果您的项目路径不同，请编辑脚本中的 `$RemotePath` 变量。

## 4. 常见问题

- **端口被占用**：如果 80 端口被占用，请修改 `ecosystem.config.cjs` 中的端口号，然后运行 `pm2 restart all`。
- **权限问题**：如果遇到权限错误，请使用 `sudo` 运行命令。
