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
cp backend/.env.example backend/.env.local

# Edit backend/.env.local with your Bluesky credentials:
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
cd backend
npm install
cp .env.example .env.local
# Edit .env.local with your Bluesky credentials
npm run dev

# Terminal 2: Start frontend
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local if your backend runs on a different port
npm run dev
```

**Note**: The frontend `.env.local` is optional - if not present, it will default to `http://localhost:3001`. For Docker Compose, environment variables are set in `docker-compose.dev.yml`.

## Deployment to Railway (Monorepo)

This project is set up as a monorepo with `frontend/` and `backend/` directories. Railway supports monorepo deployments.

### Backend Service

1. **Create a Railway account** at [railway.app](https://railway.app)
2. **Create a new project** and connect your GitHub repository
3. **Add a new service** → "Deploy from GitHub repo"
4. **Configure the service**:
   - Root Directory: `backend`
   - Dockerfile Path: `backend/Dockerfile`
5. **Set environment variables**:
   - `BLUESKY_IDENTIFIER` - Your Bluesky handle
   - `BLUESKY_APP_PASSWORD` - Your Bluesky app password
   - `PORT` - Railway sets this automatically
6. **Deploy** - Railway will automatically deploy on push

Railway will provide a URL like `https://your-backend.up.railway.app`

### Frontend Service

1. **Add another service** in the same Railway project
2. **Configure the service**:
   - Root Directory: `frontend`
   - Dockerfile Path: `frontend/Dockerfile`
   - Build Command: (not needed, Docker handles it)
3. **Set environment variables**:
   - `VITE_API_URL` - Your backend URL (e.g., `https://your-backend.up.railway.app`)
4. **Deploy** - Railway will automatically deploy on push

### Railway Service Communication

Railway services in the same project can communicate using service names. Update your frontend's `VITE_API_URL` to use the backend service's Railway-provided URL, or use Railway's private networking if both services are in the same project.

## Project Structure

```
updraft/
├── backend/             # Express backend API
│   ├── src/
│   │   ├── index.ts    # Server entry point
│   │   ├── routes/     # API routes
│   │   └── services/   # Bluesky API service
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── railway.json
│   └── package.json
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   ├── public/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── nginx.conf
│   ├── railway.json
│   └── package.json
├── docker-compose.yml   # Production Docker Compose
└── docker-compose.dev.yml # Development Docker Compose
```

## Technologies

- **Frontend**: Vite, React, TypeScript, shadcn-ui, Tailwind CSS, Nginx
- **Backend**: Express, TypeScript, Node.js
- **Deployment**: Railway, Docker

## Environment Variables

### Backend (`backend/.env.local`)
- `BLUESKY_IDENTIFIER` - Your Bluesky handle
- `BLUESKY_APP_PASSWORD` - Your Bluesky app password
- `PORT` - Server port (default: 3001)

### Frontend (`frontend/.env.local` - optional for local dev)
- `VITE_API_URL` - Backend API URL (default: `http://localhost:3001`)
  - For Docker Compose: Set in `docker-compose.dev.yml`
  - For Railway: Set in Railway dashboard
  - For local dev: Create `frontend/.env.local` from `frontend/.env.example`

## Social Media Preview Images

To update the Open Graph and Twitter card images, add an `og-image.png` file (1200x630px recommended) to the `public/` directory.
