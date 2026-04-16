#!/bin/sh
set -e

# Initialize database if it doesn't exist
if [ ! -f /app/data/pmo.db ]; then
  echo "Initializing database..."
  npx prisma db push --skip-generate 2>&1
  echo "Seeding database..."
  npx tsx prisma/seed.ts 2>&1
  echo "Database ready."
fi

exec node server.js
