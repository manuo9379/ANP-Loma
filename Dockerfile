# Multi-stage build for optimal production performance and small image size
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifest files
COPY package*.json ./

# Install development and production dependencies
RUN npm ci

# Copy full application code
COPY . .

# Build Vite frontend and compile Express server to dist/server.cjs
RUN npm run build

# Stage 2: Clean production container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Force port 3000 as requested by workspace conventions
ENV PORT=3000

# Copy only production dependencies to keep the image slim
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist
# If database directory contains seed data or structural databases, include them
COPY --from=builder /app/db ./db

# Expose server ingress port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.cjs"]
