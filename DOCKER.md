# Docker Setup Guide

## Quick Start

```bash
# 1. Set up environment variables
cp server/.env.example server/.env.local
# Edit server/.env.local with your Bluesky credentials

# 2. Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Access:
# - Frontend: http://localhost:8080
# - Backend: http://localhost:3002 (default)

# If ports are in use, set custom ports:
# BACKEND_PORT=3003 FRONTEND_PORT=8081 docker-compose -f docker-compose.dev.yml up --build
```

## Development vs Production

### Development (`docker-compose.dev.yml`)
- Hot reload enabled
- Source code mounted as volumes
- Uses development Dockerfiles
- Faster startup, easier debugging

### Production (`docker-compose.yml`)
- Optimized builds
- No source code in containers
- Uses production Dockerfiles
- Smaller image sizes

## Common Commands

```bash
# Start services
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend

# Rebuild containers
docker-compose -f docker-compose.dev.yml up --build

# Remove everything (containers, volumes, networks)
docker-compose -f docker-compose.dev.yml down -v

# Execute command in running container
docker-compose -f docker-compose.dev.yml exec backend sh
docker-compose -f docker-compose.dev.yml exec frontend sh
```

## Troubleshooting

### Port already in use
If ports are already in use, set environment variables:
```bash
# Change backend port
BACKEND_PORT=3003 docker-compose -f docker-compose.dev.yml up

# Change both ports
BACKEND_PORT=3003 FRONTEND_PORT=8081 docker-compose -f docker-compose.dev.yml up
```

Or create a `.env` file in the root directory:
```bash
BACKEND_PORT=3003
FRONTEND_PORT=8081
```

### Environment variables not loading
Make sure `server/.env.local` exists and has the correct format (no quotes around values).

### Frontend can't reach backend
- Check that backend is running: `curl http://localhost:3001/health`
- Check browser console for CORS errors
- Verify `VITE_API_URL` in docker-compose.dev.yml matches backend URL

### Rebuild after dependency changes
```bash
docker-compose -f docker-compose.dev.yml up --build --force-recreate
```

