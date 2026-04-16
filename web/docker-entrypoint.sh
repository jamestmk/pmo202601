#!/bin/sh
set -e

# Initialize database if it doesn't exist
if [ ! -f /app/data/pmo.db ]; then
  echo "Initializing database..."
  node node_modules/prisma/build/index.js db push --skip-generate 2>&1
  echo "Seeding database..."
  node node_modules/tsx/dist/cli.mjs prisma/seed.ts 2>&1
  echo "Database ready."
fi

exec node server.js
