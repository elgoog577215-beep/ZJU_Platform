# Deployment Guide

This project is ready for deployment. It consists of a React frontend (Vite) and an Express backend (Node.js).

## Prerequisites

- Node.js (v18 or higher)
- NPM or Yarn
- PM2 (optional, for process management)

## Quick Start (Production)

1.  **Install Dependencies**
    ```bash
    npm install
    cd server && npm install && cd ..
    ```

2.  **Build Frontend**
    ```bash
    npm run build
    ```
    This will compile the frontend to the `dist` folder.

3.  **Start Server**
    You can use the provided PM2 configuration or start it directly.

    **Using PM2 (Recommended):**
    ```bash
    pm2 start ecosystem.config.cjs
    ```

    **Using Node directly:**
    ```bash
    cd server
    npm start
    ```

    The server will start on port 3001 (default) and serve the frontend from `../dist`.
    Access the website at `http://YOUR_SERVER_IP:3001`.

## Configuration

You can configure the server using environment variables. Create a `.env` file in the `server` directory or root (if starting from root with dotenv support).

- `PORT`: Server port (default: 3001)
- `DATABASE_FILE`: Path to SQLite database (default: `server/database.sqlite`)
- `FRONTEND_URL`: CORS origin URL (optional)

## Directory Structure

- `server/`: Backend code
- `src/`: Frontend code
- `dist/`: Compiled frontend (generated after build)
- `server/uploads/`: User uploaded files
- `server/database.sqlite`: SQLite database file
