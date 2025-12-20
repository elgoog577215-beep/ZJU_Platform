import paramiko
import time

hostname = "118.31.78.72"
username = "root"
password = "TuoTu#SQTP#339280760"
port = 22

def run_command(ssh, command):
    print(f"Executing: {command}")
    stdin, stdout, stderr = ssh.exec_command(command)
    exit_status = stdout.channel.recv_exit_status()
    output = stdout.read().decode().strip()
    error = stderr.read().decode().strip()
    
    if output:
        print(f"OUTPUT:\n{output}")
    if error:
        print(f"ERROR:\n{error}")
    
    return error # 返回 error 用于判断

try:
    print(f"Connecting to {hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, port, username, password)
    print("Connected successfully!")

    # 尝试更暴力的 PATH 修复，并显式指定 pm2 路径（如果有）
    # 先找到 node 在哪
    find_node_cmd = "which node || type -p node || echo 'NODE_NOT_FOUND'"
    
    stdin, stdout, stderr = client.exec_command("source ~/.bashrc && source ~/.profile && which node")
    node_path = stdout.read().decode().strip()
    print(f"Node found at: {node_path}")
    
    # 如果找不到，尝试查找 npm 全局 bin 目录
    if not node_path:
        # 尝试查找 node 所在的目录
        stdin, stdout, stderr = client.exec_command("find / -name node -type f -executable 2>/dev/null | grep bin/node | head -n 1")
        node_exe = stdout.read().decode().strip()
        
        if node_exe:
            print(f"Found node executable at: {node_exe}")
            # 作为 root，最简单的修复方法是建立软链接
            run_command(client, f"ln -sf {node_exe} /usr/bin/node")
            run_command(client, f"ln -sf {node_exe} /usr/local/bin/node")
            
            # 同时尝试修复 npm 和 pm2
            bin_dir = node_exe.replace("/node", "")
            run_command(client, f"ln -sf {bin_dir}/npm /usr/bin/npm")
            run_command(client, f"ln -sf {bin_dir}/npx /usr/bin/npx")
            # 如果 pm2 在同一个 bin 目录下
            run_command(client, f"ln -sf {bin_dir}/pm2 /usr/bin/pm2")
            run_command(client, f"ln -sf {bin_dir}/pm2 /usr/local/bin/pm2")
            
            # 更新 PATH
             prefix = f"export PATH=$PATH:{bin_dir} && "
             
             # 如果 PM2 不在 node 的 bin 目录下（比如全局安装在其他地方），尝试重新安装 PM2
             # 或者直接使用 npx pm2
             pm2_cmd = f"{bin_dir}/pm2" if "pm2" in bin_dir else "pm2"
         else:
             print("Could not find node automatically. Trying standard paths.")
             prefix = "source ~/.bashrc; source ~/.profile; "
             pm2_cmd = "pm2"
             bin_dir = ""

     else:
         prefix = ""
         pm2_cmd = "pm2"
         bin_dir = ""

    # 1. 停止所有 PM2 进程
    # 使用找到的 bin 目录来确保能找到 pm2
    # 如果刚才建立软链接失败，这里尝试直接调用
    delete_cmd = f"bash -c 'export PATH=$PATH:{bin_dir} && {pm2_cmd} delete all || true'"
    run_command(client, delete_cmd)
     
    # 2. 进入项目目录并重启服务
    # 确保使用绝对路径的 pm2 如果需要
    cmd = f"bash -c 'export PATH=$PATH:{bin_dir} && cd ~/ZJU_Platform && PORT=80 {pm2_cmd} start ecosystem.config.cjs --name zju-platform --env production --update-env && {pm2_cmd} save'"
    run_command(client, cmd)

    # 3. 检查端口
    run_command(client, "netstat -ntlp | grep node")
    
    # 4. 检查防火墙 (尝试放行)
    run_command(client, "ufw allow 80/tcp")

    client.close()
    print("\nDone! Please check http://118.31.78.72")

except Exception as e:
    print(f"An error occurred: {e}")
