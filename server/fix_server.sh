#!/bin/bash
echo "========================================"
echo "Starting Auto-Fix for ZJU Server..."
echo "========================================"

# Navigate to script directory
cd "$(dirname "$0")"

# 1. Clean existing problematic modules
echo "[1/3] Cleaning old dependencies..."
rm -rf node_modules
rm -f package-lock.json

# 2. Re-install dependencies (Compiles for Linux)
echo "[2/3] Installing dependencies (this may take a minute)..."
npm install

# 3. Restart Service
echo "[3/3] Restarting application..."
pm2 restart zju-serv

echo "========================================"
echo "✅ Fix Complete! Server should be running."
echo "========================================"
