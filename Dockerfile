# Multi-stage build for production optimization

# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# ============================================
# Stage 2: Build Backend
# ============================================
FROM node:18-alpine AS backend-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server source
COPY server/ ./

# ============================================
# Stage 3: Production Image
# ============================================
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    ca-certificates

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy backend
COPY --from=backend-builder /app/server ./server

# Copy package files
COPY server/package*.json ./server/

# Install production dependencies
WORKDIR /app/server
RUN npm ci --only=production && \
    npm cache clean --force

# Create necessary directories
RUN mkdir -p /app/server/uploads/images && \
    mkdir -p /app/server/data && \
    mkdir -p /app/server/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "index.js"]

# ============================================
# Stage 4: Development Image
# ============================================
FROM node:18-alpine AS development

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    git

# Install global packages
RUN npm install -g nodemon

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies (including dev)
RUN npm install
WORKDIR /app/server
RUN npm install
WORKDIR /app

# Expose ports
EXPOSE 3000
EXPOSE 5173

# Start in development mode
CMD ["npm", "run", "dev"]
