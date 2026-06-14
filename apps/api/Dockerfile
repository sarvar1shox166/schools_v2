FROM node:20-alpine AS base
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm install

COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared-types packages/shared-types

WORKDIR /repo/apps/api
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/server.js"]
