# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (workspace-aware)
COPY package*.json ./
COPY packages/chess-engine/package*.json ./packages/chess-engine/
COPY packages/shared-types/package*.json  ./packages/shared-types/
COPY apps/api/package*.json               ./apps/api/

RUN npm ci

# Copy source
COPY tsconfig.base.json                   ./
COPY packages/chess-engine/               ./packages/chess-engine/
COPY packages/shared-types/               ./packages/shared-types/
COPY apps/api/                            ./apps/api/

# Build chess-engine first (API runtime needs compiled JS)
RUN npm run build -w packages/chess-engine

# Build API
RUN npm run build -w apps/api

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init

# Install only production deps
COPY package*.json ./
COPY packages/chess-engine/package*.json ./packages/chess-engine/
COPY packages/shared-types/package*.json  ./packages/shared-types/
COPY apps/api/package*.json               ./apps/api/

RUN npm ci --omit=dev

# Copy compiled output
COPY --from=builder /app/packages/chess-engine/dist ./packages/chess-engine/dist
COPY --from=builder /app/apps/api/dist              ./apps/api/dist

# SQL migration files (needed at runtime)
COPY apps/api/src/db/migrations ./apps/api/src/db/migrations

# Uploads directory (overridden by Docker volume in production)
RUN mkdir -p /app/uploads

COPY apps/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["dumb-init", "--", "/entrypoint.sh"]
