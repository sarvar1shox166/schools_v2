#!/bin/sh
set -e
echo "==> Running database migrations..."
node /app/apps/api/dist/db/migrate.js
echo "==> Starting API server..."
exec node /app/apps/api/dist/server.js
