FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for API URL
# Railway will pass this as a build argument from environment variables
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Debug: Print the API URL being used (will show in build logs)
RUN echo "Building with VITE_API_URL=${VITE_API_URL}"

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Verify build output
RUN ls -la /app/dist || echo "Build output not found!"

# Production stage - use same Node image, just serve the built files
FROM node:20-alpine

WORKDIR /app

# Copy package.json to install production dependencies
COPY --from=builder /app/package*.json ./

# Install only production dependencies (express for secure server)
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy secure server script
COPY --from=builder /app/server.js ./server.js

# Expose port (Railway will set PORT env var)
EXPOSE ${PORT:-3000}

# Use our secure server wrapper
CMD ["node", "server.js"]

