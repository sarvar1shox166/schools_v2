# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/landing/package*.json ./apps/landing/

RUN npm ci

COPY tsconfig.base.json ./
COPY apps/landing/ ./apps/landing/

RUN npm run build -w apps/landing

# ── Stage 2: Production image ────────────────────────────────────────────────
# `output: "standalone"` — faqat kuzatilgan (traced) node_modules qismini
# o'z ichiga olgan minimal server bundle, `npm ci` prod bosqichida shart emas.
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache dumb-init tzdata
ENV TZ=Asia/Tashkent
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=builder /app/apps/landing/public ./apps/landing/public

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/landing/server.js"]
