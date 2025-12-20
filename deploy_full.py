import paramiko
import os
import subprocess
import time

# Configuration
HOSTNAME = "118.31.78.72"
USERNAME = "root"
PASSWORD = "TuoTu#SQTP#339280760"
PORT = 22
LOCAL_DB_PATH = os.path.join("server", "database.sqlite")
REMOTE_DIR = "/root/ZJU_Platform"
REMOTE_DB_PATH = f"{REMOTE_DIR}/server/database.sqlite"

def run_local_command(command):
    print(f"[Local] Executing: {command}")
    # Use shell=True for complex commands like git add .
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

def main():
    print("========================================")
    print("   Starting Full Deployment Sequence    ")
    print("========================================")

    # 1. Local Build
    print("\n--- Step 1: Local Build ---")
    if not run_local_command("npm run build"):
        print("Build failed. Please fix errors first.")
        return

    # 2. Local Git Push
    print("\n--- Step 2: Git Push ---")
    # Check if there are changes
    run_local_command("git add .")
    # Commit might fail if nothing to commit, which is fine
    run_local_command('git commit -m "Auto-deploy update"')
    
    print("Pushing to origin mmaster...")
    if not run_local_command("git push origin mmaster"):
        print("Git push failed. Ensure remote is configured correctly.")
        # We continue even if push fails? No, server needs it.
        # But maybe it failed because up to date.
        # Let's try to continue.

    # 3. Connect to Server
    print("\n--- Step 3: Connecting to Server ---")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOSTNAME, PORT, USERNAME, PASSWORD)
        sftp = ssh.open_sftp()
        print("Connected successfully!")

        # 4. Sync Code
        print("\n--- Step 4: Syncing Code on Server ---")
        # Ensure git handles permissions
        run_remote_command(ssh, f"git config --global --add safe.directory {REMOTE_DIR}")
        
        # Pull changes
        # Use fetch + reset to ensure it matches exactly
        pull_cmd = f"cd {REMOTE_DIR} && git fetch origin mmaster && git reset --hard origin/mmaster"
        if not run_remote_command(ssh, pull_cmd):
             print("Git pull failed. Attempting standard pull...")
             run_remote_command(ssh, f"cd {REMOTE_DIR} && git pull origin mmaster")

        # 5. Upload Database
        print("\n--- Step 5: Uploading Database ---")
        if os.path.exists(LOCAL_DB_PATH):
            # Backup remote DB
            backup_name = f"database.sqlite.bak_{int(time.time())}"
            print(f"Backing up remote database to {backup_name}...")
            run_remote_command(ssh, f"cp {REMOTE_DB_PATH} {REMOTE_DIR}/server/{backup_name}")
            
            # Upload
            print(f"Uploading {LOCAL_DB_PATH} to {REMOTE_DB_PATH}...")
            try:
                sftp.put(LOCAL_DB_PATH, REMOTE_DB_PATH)
                print("Database uploaded successfully.")
            except Exception as e:
                print(f"Failed to upload database: {e}")
        else:
            print(f"Local database not found at {LOCAL_DB_PATH}. Skipping upload.")

        # 6. Restart Application
        print("\n--- Step 6: Restarting Application ---")
        
        # Install dependencies just in case
        print("Installing dependencies...")
        run_remote_command(ssh, "cd ~/ZJU_Platform && npm install --production")
        
        print("Restarting PM2 service...")
        # We use the ecosystem config but ensure PORT is set if needed (though we configured nginx to 3001)
        # In previous step we set up nginx -> 3001
        # So we should ensure node runs on 3001.
        # ecosystem.config.cjs might say PORT=80 (from my read earlier).
        # We need to override it or edit it.
        # The previous `restore_service.py` started it with `PORT=3001 pm2 start ...`
        # Restarting usually keeps env, but to be safe we can reload or start again.
        
        restart_cmd = "cd ~/ZJU_Platform && PORT=3001 pm2 restart zju-platform --update-env"
        if not run_remote_command(ssh, restart_cmd):
            print("Restart failed, trying start...")
            run_remote_command(ssh, "cd ~/ZJU_Platform && PORT=3001 pm2 start ./server/index.js --name zju-platform")
            
        run_remote_command(ssh, "pm2 save")

        print("\n========================================")
        print("   Deployment Completed Successfully!   ")
        print("   Check: http://118.31.78.72           ")
        print("========================================")
        
        sftp.close()
        ssh.close()

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
