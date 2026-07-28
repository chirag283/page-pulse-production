# Multi-stage Dockerfile for Page Pulse URL Audit Service

# Stage 1: Build Phase
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy full application code
COPY . .

# Build Vite frontend assets and bundle server TypeScript to dist/server.cjs
RUN npm run build

# Stage 2: Production Execution
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package descriptors for production deps
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/swagger.yaml ./swagger.yaml

EXPOSE 3000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start production server
CMD ["node", "dist/server.cjs"]
