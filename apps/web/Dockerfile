FROM node:20-alpine AS base
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm install

COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/ui packages/ui
COPY packages/shared-types packages/shared-types

WORKDIR /repo/apps/web
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
