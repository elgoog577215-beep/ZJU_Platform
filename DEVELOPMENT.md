# Development Environment Guide

## Prerequisites

- Node.js >= 18
- npm >= 9

## Quick Start

```bash
# 1. Install all dependencies (root + server)
npm install            # postinstall hook also runs: npm --prefix server install

# 2. Start both frontend & backend in one terminal
SECRET_KEY=test123 npm run dev
```

This runs `dev:full` which spawns:
- **Backend** → `http://localhost:5181` (Express + SQLite)
- **Frontend** → `http://localhost:5180` (Vite dev server)

The Vite dev server proxies `/api/*` and `/uploads/*` requests to the backend automatically.

## Starting Services Separately

```bash
# Terminal 1 — Backend
cd server
SECRET_KEY=<your-secret> node index.js
# Default port: 5181 (auto-increments if occupied)

# Terminal 2 — Frontend
npm run dev:client
# Default port: 5180
```

## Environment Variables

### Backend (`server/.env` or shell)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | **Yes** | — | JWT signing key. Server refuses to start without it. |
| `PORT` | No | `5181` | HTTP port for the backend |
| `DATABASE_FILE` | No | `./database.sqlite` | SQLite file path |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `CORS_ALLOWED_ORIGINS` | No | — | Comma-separated allowlist for production origins, e.g. `https://tuotuzju.com,http://118.31.78.72` |
| `CORS_ORIGIN` | No | — | Legacy compatibility field; now also supports comma-separated origins |

See `server/.env.example` for the full list.

### Frontend (`.env.development`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_PROXY_TARGET` | `http://localhost:5181` | Backend URL for the Vite proxy |

## Seeding the Database

```bash
cd server
SECRET_KEY=test123 node seed.js
```

This creates demo users, sample content, and community posts. The seed is idempotent (drops and recreates all tables).

## Building for Production

```bash
npm run build          # outputs to dist/
```

The backend serves the `dist/` folder as static files in production mode.

For production deployments that still accept both the canonical domain and a temporary public IP entry, set `CORS_ALLOWED_ORIGINS` explicitly instead of relying on a single `CORS_ORIGIN` value.

## Common Issues

- **"FATAL: SECRET_KEY environment variable is required"** → Set `SECRET_KEY` before starting the server.
- **Port conflict** → The server auto-tries PORT+1 and PORT+2 if the default is occupied.
- **Proxy 502 errors** → Make sure the backend is running before the frontend tries to proxy API requests.
