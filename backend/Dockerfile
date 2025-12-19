FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma (required for Prisma Client on Alpine)
RUN apk add --no-cache openssl openssl-dev

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma (required for Prisma Client on Alpine)
RUN apk add --no-cache openssl openssl-dev

# Copy package files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy package files for prisma CLI
COPY package*.json ./

# Install Prisma CLI (needed for migrations)
RUN npm ci --omit=dev

# Copy Prisma schema, migrations, and generated client from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Start script that runs migrations then starts the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

