# Railway Deployment Guide

This project is structured as a monorepo with `frontend/` and `backend/` directories. Railway supports monorepo deployments by allowing you to specify the root directory for each service.

## Setting Up Railway Services

### 1. Create a Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository

### 2. Deploy Backend Service

1. Click **"New"** → **"GitHub Repo"** (or **"Empty Service"** if already connected)
2. Select your repository
3. In the service settings:
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `backend/Dockerfile`
4. Add environment variables:
   - `BLUESKY_IDENTIFIER` - Your Bluesky handle (e.g., `yourname.bsky.social`)
   - `BLUESKY_APP_PASSWORD` - Your Bluesky app password
   - `PORT` - Railway sets this automatically (usually 3001)
5. Railway will automatically detect the Dockerfile and deploy

### 3. Deploy Frontend Service

1. In the same Railway project, click **"New"** → **"GitHub Repo"**
2. Select the same repository
3. In the service settings:
   - **Root Directory**: `frontend`
   - **Dockerfile Path**: `frontend/Dockerfile`
4. Add environment variables:
   - `VITE_API_URL` - Your backend service URL (e.g., `https://your-backend-service.up.railway.app`)
5. Railway will automatically detect the Dockerfile and deploy

## Service Communication

### Option 1: Public URLs (Recommended for now)

Use the Railway-provided public URLs:
- Backend: `https://your-backend-service.up.railway.app`
- Frontend: `https://your-frontend-service.up.railway.app`
- Set `VITE_API_URL` in frontend to the backend URL

### Option 2: Railway Private Networking (Future)

Railway services in the same project can communicate via private networking using service names. This requires additional configuration and is more complex.

## Custom Domains

1. In each service, go to **Settings** → **Domains**
2. Add your custom domain
3. Railway will provide DNS records to configure

## Environment Variables

### Backend
- `BLUESKY_IDENTIFIER` (required) - Your Bluesky handle
- `BLUESKY_APP_PASSWORD` (required) - Your Bluesky app password
- `PORT` (auto-set by Railway)

### Frontend
- `VITE_API_URL` (required) - Backend API URL

**Note**: `VITE_*` variables are embedded at build time, so you'll need to rebuild the frontend service if you change them.

## Monitoring

- View logs in the Railway dashboard for each service
- Check service health in the dashboard
- Set up alerts for service failures

## Troubleshooting

### Backend not starting
- Check that `BLUESKY_IDENTIFIER` and `BLUESKY_APP_PASSWORD` are set correctly
- Check logs for connection errors

### Frontend can't reach backend
- Verify `VITE_API_URL` is set to the correct backend URL
- Check CORS settings in backend (should allow frontend domain)
- Ensure backend service is running and healthy

### Build failures
- Check that Root Directory and Dockerfile Path are correct
- Verify all dependencies are in package.json
- Check build logs for specific errors

