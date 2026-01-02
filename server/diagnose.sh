#!/bin/bash

echo "========================================"
echo "       ZJU Platform Diagnosis Tool"
echo "========================================"

# 1. Check Nginx Status
echo -e "\n[1] Checking Nginx Status..."
systemctl is-active nginx
if [ $? -eq 0 ]; then
    echo "Nginx is RUNNING."
else
    echo "ERROR: Nginx is NOT running."
fi

# 2. Check Backend Process
echo -e "\n[2] Checking Backend Process (Port 3001)..."
if lsof -i :3001 > /dev/null; then
    echo "Port 3001 is OPEN (Backend is running)."
else
    echo "ERROR: Port 3001 is CLOSED. Backend is NOT running."
fi

# 3. Check Uploads Directory (Correct Path)
# Assuming script is run from project root or server dir, try to find the absolute path
# We know the backend is in .../server/ and uploads is .../server/uploads
BASE_DIR=$(dirname $(readlink -f "$0"))
# If script is in server/, then BASE_DIR is .../server
UPLOADS_DIR="$BASE_DIR/uploads"

echo -e "\n[3] Checking Uploads Directory at $UPLOADS_DIR..."

if [ -d "$UPLOADS_DIR" ]; then
    echo "Uploads directory EXISTS."
    ls -ld "$UPLOADS_DIR"
    
    # Check for files
    FILE_COUNT=$(ls -1 "$UPLOADS_DIR" | wc -l)
    echo "Found $FILE_COUNT files in uploads directory."
    
    if [ "$FILE_COUNT" -gt 0 ]; then
        FIRST_FILE=$(ls -1 "$UPLOADS_DIR" | head -n 1)
        echo "Sample file: $FIRST_FILE"
        
        # 4. Connectivity Test (Backend)
        echo -e "\n[4] Testing Direct Backend Access (http://localhost:3001/uploads/$FIRST_FILE)..."
        HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}\n" "http://localhost:3001/uploads/$FIRST_FILE")
        if [ "$HTTP_CODE" == "200" ]; then
            echo "SUCCESS: Backend is serving the file (HTTP 200)."
        else
            echo "ERROR: Backend returned HTTP $HTTP_CODE."
        fi
        
        # 5. Connectivity Test (Nginx Proxy)
        echo -e "\n[5] Testing Nginx Proxy Access (http://localhost/uploads/$FIRST_FILE)..."
        HTTP_CODE_NGINX=$(curl -o /dev/null -s -w "%{http_code}\n" "http://localhost/uploads/$FIRST_FILE")
        if [ "$HTTP_CODE_NGINX" == "200" ]; then
            echo "SUCCESS: Nginx is proxying the file correctly (HTTP 200)."
        else
            echo "ERROR: Nginx returned HTTP $HTTP_CODE_NGINX."
            echo "Possible causes: Nginx config not applied, permission issues, or wrong proxy path."
        fi
        
    else
        echo "WARNING: Uploads directory is empty. Cannot test file access."
    fi
else
    echo "ERROR: Uploads directory NOT found at $UPLOADS_DIR"
    echo "Attempting to find it elsewhere..."
    find /var/www -name "uploads" -type d 2>/dev/null
fi

# 6. Check Settings API
echo -e "\n[6] Checking API Settings..."
API_CODE=$(curl -o /dev/null -s -w "%{http_code}\n" "http://localhost:3001/api/settings")
if [ "$API_CODE" == "200" ]; then
    echo "API is accessible (HTTP 200)."
else
    echo "ERROR: API is returning HTTP $API_CODE."
fi

echo -e "\n========================================"
echo "Diagnosis Complete."
