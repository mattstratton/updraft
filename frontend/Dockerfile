FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for API URL (defaults to localhost for local dev)
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Verify build output
RUN ls -la /app/dist || echo "Build output not found!"

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Verify files were copied and index.html exists
RUN ls -la /usr/share/nginx/html && \
    test -f /usr/share/nginx/html/index.html || (echo "ERROR: index.html not found!" && exit 1)

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Test nginx config
RUN nginx -t || (echo "ERROR: nginx config test failed!" && exit 1)

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

