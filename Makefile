# Lumos Photography Makefile
# Quick commands for development and deployment

.PHONY: help install dev build test lint clean docker-build docker-run deploy

# Default target
help:
	@echo "Lumos Photography - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install       Install all dependencies"
	@echo "  make dev           Start development server"
	@echo "  make dev-backend   Start backend development server only"
	@echo "  make dev-frontend  Start frontend development server only"
	@echo ""
	@echo "Building:"
	@echo "  make build         Build production application"
	@echo "  make build-docker  Build Docker image"
	@echo ""
	@echo "Testing:"
	@echo "  make test          Run all tests"
	@echo "  make test-frontend Run frontend tests"
	@echo "  make test-backend  Run backend tests"
	@echo "  make test-e2e      Run end-to-end tests"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint          Run ESLint"
	@echo "  make lint-fix      Fix ESLint errors"
	@echo "  make format        Format code with Prettier"
	@echo "  make format-check  Check code formatting"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build  Build Docker image"
	@echo "  make docker-run    Run Docker container"
	@echo "  make docker-dev    Run development Docker environment"
	@echo "  make docker-stop   Stop Docker containers"
	@echo "  make docker-clean  Clean Docker containers and images"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate    Run database migrations"
	@echo "  make db-seed       Seed database with sample data"
	@echo "  make db-backup     Backup database"
	@echo "  make db-restore    Restore database from backup"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-staging    Deploy to staging"
	@echo "  make deploy-production Deploy to production"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean         Clean build files and dependencies"
	@echo "  make update        Update all dependencies"
	@echo "  make audit         Run security audit"

# ============================================
# Development
# ============================================
install:
	npm install
	cd server && npm install

dev:
	npm run dev

dev-backend:
	cd server && npm run dev

dev-frontend:
	npm run dev:frontend

# ============================================
# Building
# ============================================
build:
	npm run build

build-docker:
	docker build -t lumos:latest .

# ============================================
# Testing
# ============================================
test:
	npm run test
	cd server && npm test

test-frontend:
	npm run test:unit

test-backend:
	cd server && npm test

test-e2e:
	npm run test:e2e

# ============================================
# Code Quality
# ============================================
lint:
	npm run lint
	cd server && npm run lint

lint-fix:
	npm run lint:fix
	cd server && npm run lint:fix

format:
	npm run format

format-check:
	npm run format:check

# ============================================
# Docker
# ============================================
docker-build:
	docker-compose build

docker-run:
	docker-compose up -d app

docker-dev:
	docker-compose up dev

docker-stop:
	docker-compose down

docker-clean:
	docker-compose down -v --rmi all --remove-orphans
	docker system prune -f

# ============================================
# Database
# ============================================
db-migrate:
	cd server && npm run migrate

db-seed:
	cd server && npm run seed

db-backup:
	cd server && npm run backup

db-restore:
	@echo "Usage: make db-restore FILE=backup-file.sql"
	cd server && npm run restore -- $(FILE)

# ============================================
# Deployment
# ============================================
deploy-staging:
	@echo "Deploying to staging..."
	# Add your staging deployment commands
	# ssh user@staging-server "cd /app && git pull && make docker-build && make docker-run"

deploy-production:
	@echo "Deploying to production..."
	# Add your production deployment commands
	# ssh user@production-server "cd /app && git pull && make docker-build && make docker-run"

# ============================================
# Maintenance
# ============================================
clean:
	rm -rf node_modules
	rm -rf server/node_modules
	rm -rf dist
	rm -rf server/dist
	rm -rf coverage
	rm -rf server/coverage
	find . -type d -name ".cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "build" -exec rm -rf {} + 2>/dev/null || true

update:
	npm update
	cd server && npm update

audit:
	npm audit
	cd server && npm audit

# ============================================
# Utilities
# ============================================
logs:
	docker-compose logs -f app

shell:
	docker-compose exec app sh

backup-images:
	@echo "Backing up images..."
	tar -czf backups/images-$(shell date +%Y%m%d-%H%M%S).tar.gz uploads/

optimize-images:
	cd server && npm run optimize-images
