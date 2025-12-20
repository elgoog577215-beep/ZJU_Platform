import paramiko
import os
import subprocess
import time

# Configuration
HOSTNAME = "118.31.78.72"
USERNAME = "root"
PASSWORD = "TuoTu#SQTP#339280760"
PORT = 22
REMOTE_DIR = "/root/ZJU_Platform"
PACKAGE_NAME = "deploy_package.tar.gz"

def run_local_command(command):
    print(f"[Local] Executing: {command}")
    result = subprocess.run(command, shell=True, capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    print(result.stdout)
    return True

def run_remote_command(ssh, command):
    print(f"[Remote] Executing: {command}")
    stdin, stdout, stderr = ssh.exec_command(command)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(f"OUTPUT: {out}")
    if err: print(f"ERROR: {err}")
    return exit_status == 0

import tarfile

def make_tarfile(output_filename, source_dirs, excludes=[]):
    with tarfile.open(output_filename, "w:gz") as tar:
        for source_dir in source_dirs:
            # If it's a file, just add it
            if os.path.isfile(source_dir):
                tar.add(source_dir)
                continue
                
            # If it's a directory, walk it
            tar.add(source_dir, filter=lambda x: None if any(exc in x.name for exc in excludes) else x)

def main():
    print("========================================")
    print("   Starting DIRECT Deployment (SFTP)    ")
    print("========================================")

    # 1. Local Build
    print("\n--- Step 1: Local Build ---")
    if not run_local_command("npm run build"):
        print("Build failed. Aborting.")
        return

    # 2. Package Files
    print("\n--- Step 2: Packaging Files ---")
    try:
        # Use python tarfile for better compatibility
        # We need to filter node_modules and uploads
        # tarfile filter is a bit complex in older python, let's use a simpler approach
        # Just exclude if name matches
        
        def exclude_filter(tarinfo):
            name = tarinfo.name
            if "node_modules" in name or "uploads" in name:
                return None
            return tarinfo

        with tarfile.open(PACKAGE_NAME, "w:gz") as tar:
            print("Adding dist...")
            tar.add("dist", filter=exclude_filter)
            print("Adding server...")
            tar.add("server", filter=exclude_filter)
            print("Adding ecosystem.config.cjs...")
            tar.add("ecosystem.config.cjs")
            
        print(f"Package created: {PACKAGE_NAME}")
    except Exception as e:
        print(f"Packaging failed: {e}")
        return

    # 3. Connect to Server
    print("\n--- Step 3: Connecting to Server ---")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOSTNAME, PORT, USERNAME, PASSWORD)
        sftp = ssh.open_sftp()
        print("Connected successfully!")

        # 4. Upload Package
        print("\n--- Step 4: Uploading Package ---")
        remote_package_path = f"{REMOTE_DIR}/{PACKAGE_NAME}"
        
        # Ensure remote dir exists
        run_remote_command(ssh, f"mkdir -p {REMOTE_DIR}")
        
        # Backup Database before overwriting (if it exists)
        print("Backing up remote database...")
        run_remote_command(ssh, f"cp {REMOTE_DIR}/server/database.sqlite {REMOTE_DIR}/server/database.sqlite.bak_{int(time.time())} || true")
        
        print(f"Uploading {PACKAGE_NAME} ({os.path.getsize(PACKAGE_NAME)/1024/1024:.2f} MB)...")
        sftp.put(PACKAGE_NAME, remote_package_path)
        print("Upload complete.")

        # 5. Extract and Install
        print("\n--- Step 5: Extracting and Installing ---")
        # Extract
        run_remote_command(ssh, f"cd {REMOTE_DIR} && tar -xzf {PACKAGE_NAME}")
        
        # Install dependencies
        print("Installing dependencies...")
        run_remote_command(ssh, "cd ~/ZJU_Platform && npm install --production")
        
        # 6. Restart Application
        print("\n--- Step 6: Restarting Application ---")
        # Ensure correct port (3001) as per our setup
        restart_cmd = "cd ~/ZJU_Platform && PORT=3001 pm2 restart zju-platform --update-env"
        if not run_remote_command(ssh, restart_cmd):
            print("Restart failed, trying start...")
            run_remote_command(ssh, "cd ~/ZJU_Platform && PORT=3001 pm2 start ./server/index.js --name zju-platform")
            
        run_remote_command(ssh, "pm2 save")

        # Cleanup
        run_remote_command(ssh, f"rm {remote_package_path}")
        if os.path.exists(PACKAGE_NAME):
            os.remove(PACKAGE_NAME)

        print("\n========================================")
        print("   Direct Deployment Completed!         ")
        print("   Check: http://118.31.78.72           ")
        print("========================================")
        
        sftp.close()
        ssh.close()

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
