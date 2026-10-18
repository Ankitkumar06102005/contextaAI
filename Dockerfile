# Multi-stage production Dockerfile for Contexta AI
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors and lockfile
COPY package.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Build Vite frontend assets into dist/
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules and built assets from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/vite.config.ts ./vite.config.ts

# Create data directory for RAG index storage
RUN mkdir -p /app/data

EXPOSE 3000

# Run full-stack server using tsx
CMD ["npx", "tsx", "server.ts"]
