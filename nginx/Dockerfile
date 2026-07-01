# ── Stage 1: Build React app ─────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/chess-engine/package*.json ./packages/chess-engine/
COPY packages/shared-types/package*.json  ./packages/shared-types/
COPY packages/ui/package*.json            ./packages/ui/
COPY apps/web/package*.json               ./apps/web/

RUN npm ci

COPY tsconfig.base.json                   ./
COPY packages/                            ./packages/
COPY apps/web/                            ./apps/web/

RUN npm run build -w apps/web

# ── Stage 2: Nginx ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
