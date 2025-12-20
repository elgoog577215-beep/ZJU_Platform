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
    
    return exit_status

try:
    print(f"Connecting to {hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, port, username, password)
    print("Connected successfully!")

    # 1. Fix Node/PM2 Paths (Create Symlinks)
    print("\n[1/6] Fixing Node/PM2 paths...")
    stdin, stdout, stderr = client.exec_command("find / -name node -type f -executable 2>/dev/null | grep bin/node | head -n 1")
    node_exe = stdout.read().decode().strip()
    
    bin_dir = ""
    if node_exe:
        print(f"Found node executable at: {node_exe}")
        run_command(client, f"ln -sf {node_exe} /usr/bin/node")
        run_command(client, f"ln -sf {node_exe} /usr/local/bin/node")
        
        # Fix: Correctly extract directory using rsplit to avoid replacing partial matches in path
        bin_dir = node_exe.rsplit('/', 1)[0]
        print(f"Bin directory: {bin_dir}")
        
        run_command(client, f"ln -sf {bin_dir}/npm /usr/bin/npm")
        run_command(client, f"ln -sf {bin_dir}/npx /usr/bin/npx")
        run_command(client, f"ln -sf {bin_dir}/pm2 /usr/bin/pm2")
        run_command(client, f"ln -sf {bin_dir}/pm2 /usr/local/bin/pm2")
    else:
        print("Warning: Could not find node executable automatically.")

    # 2. Configure Nginx
    print("\n[2/6] Configuring Nginx...")
    nginx_config = """server {
    listen 80;
    server_name 118.31.78.72;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}"""
    # Write config file
    cmd_write_config = f"echo '{nginx_config}' > /etc/nginx/sites-available/zju-platform"
    run_command(client, cmd_write_config)
    
    # Enable config
    run_command(client, "ln -sf /etc/nginx/sites-available/zju-platform /etc/nginx/sites-enabled/")
    run_command(client, "rm -f /etc/nginx/sites-enabled/default") # Remove default if exists

    # 3. Stop Services
    print("\n[3/6] Stopping existing services...")
    run_command(client, "systemctl stop nginx")
    # Force kill any node processes binding port 80 or 3001
    run_command(client, "pkill -f node") 
    run_command(client, "pm2 delete all")

    # 4. Start Node App on Port 3001
    print("\n[4/6] Starting Node application on Port 3001...")
    # Use direct script start to ensure PORT env var is respected (ecosystem file might override it with 80)
    start_cmd = "cd ~/ZJU_Platform && PORT=3001 pm2 start ./server/index.js --name zju-platform"
    run_command(client, start_cmd)
    run_command(client, "pm2 save")

    # 5. Start Nginx
    print("\n[5/6] Starting Nginx...")
    run_command(client, "nginx -t") # Test config
    run_command(client, "systemctl restart nginx")

    # 6. Verify
    print("\n[6/6] Verifying deployment...")
    print("Checking PM2 status:")
    run_command(client, "pm2 list")
    print("Checking Nginx status:")
    run_command(client, "systemctl status nginx --no-pager")
    print("Checking ports:")
    run_command(client, "netstat -ntlp")

    client.close()
    print("\nRestoration sequence completed! Please check http://118.31.78.72")

except Exception as e:
    print(f"An error occurred: {e}")
