# Updraft — Your Year on Bluesky, Lifted

A beautiful, shareable recap of your posts, follows, and moments from the past year on Bluesky. No tracking. No posting. Just your data.

## Architecture

This is a **full-stack application** with:
- **Frontend**: React + Vite (served via Nginx in production)
- **Backend**: Express API server

Both services are containerized with Docker and can be deployed to Railway.

## Local Development with Docker

### Prerequisites
- Docker and Docker Compose installed
- Bluesky app password ([get one here](https://bsky.app/settings/app-passwords))

### Quick Start

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>
cd updraft

# Step 2: Set up environment variables
cp server/.env.example server/.env.local

# Edit server/.env.local with your Bluesky credentials:
# - BLUESKY_IDENTIFIER=your.handle.bsky.social
# - BLUESKY_APP_PASSWORD=your-app-password

# Step 3: Start everything with Docker Compose
docker-compose -f docker-compose.dev.yml up --build

# The app will be available at:
# - Frontend: http://localhost:8080
# - Backend API: http://localhost:3002 (default, or set BACKEND_PORT env var)

# If port 3002 is also in use, you can change it:
# BACKEND_PORT=3003 docker-compose -f docker-compose.dev.yml up --build
```

### Docker Commands

```sh
# Start services
docker-compose -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild containers
docker-compose -f docker-compose.dev.yml up --build

# Clean up (remove containers, volumes)
docker-compose -f docker-compose.dev.yml down -v
```

## Local Development (Without Docker)

If you prefer to run without Docker:

```sh
# Terminal 1: Start backend
cd server
npm install
npm run dev

# Terminal 2: Start frontend
npm install
npm run dev
```

## Deployment to Railway

### Backend Service

1. **Create a Railway account** at [railway.app](https://railway.app)
2. **Create a new project** and connect your GitHub repository
3. **Add a new service** → "Deploy from GitHub repo"
4. **Configure the service**:
   - Root Directory: `server`
   - Dockerfile Path: `server/Dockerfile`
5. **Set environment variables**:
   - `BLUESKY_IDENTIFIER` - Your Bluesky handle
   - `BLUESKY_APP_PASSWORD` - Your Bluesky app password
   - `PORT` - Railway sets this automatically
6. **Deploy** - Railway will automatically deploy on push

Railway will provide a URL like `https://your-backend.up.railway.app`

### Frontend Service

1. **Add another service** in the same Railway project
2. **Configure the service**:
   - Root Directory: `.` (root)
   - Dockerfile Path: `Dockerfile`
   - Build Command: (not needed, Docker handles it)
3. **Set environment variables**:
   - `VITE_API_URL` - Your backend URL (e.g., `https://your-backend.up.railway.app`)
4. **Deploy** - Railway will automatically deploy on push

### Railway Service Communication

Railway services in the same project can communicate using service names. Update your frontend's `VITE_API_URL` to use the backend service's Railway-provided URL, or use Railway's private networking if both services are in the same project.

## Project Structure

```
updraft/
├── server/              # Express backend API
│   ├── src/
│   │   ├── index.ts    # Server entry point
│   │   ├── routes/     # API routes
│   │   └── services/   # Bluesky API service
│   ├── Dockerfile
│   └── package.json
├── src/                 # React frontend
│   ├── components/
│   ├── pages/
│   └── ...
├── Dockerfile           # Frontend production Dockerfile
├── Dockerfile.dev       # Frontend development Dockerfile
├── docker-compose.yml   # Production Docker Compose
├── docker-compose.dev.yml # Development Docker Compose
└── package.json
```

## Technologies

- **Frontend**: Vite, React, TypeScript, shadcn-ui, Tailwind CSS, Nginx
- **Backend**: Express, TypeScript, Node.js
- **Deployment**: Railway, Docker

## Environment Variables

### Backend (`server/.env.local`)
- `BLUESKY_IDENTIFIER` - Your Bluesky handle
- `BLUESKY_APP_PASSWORD` - Your Bluesky app password
- `PORT` - Server port (default: 3001)

### Frontend (build-time)
- `VITE_API_URL` - Backend API URL (default: `http://localhost:3001`)

## Social Media Preview Images

To update the Open Graph and Twitter card images, add an `og-image.png` file (1200x630px recommended) to the `public/` directory.
