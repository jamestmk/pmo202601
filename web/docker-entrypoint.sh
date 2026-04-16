#!/bin/sh
set -e

# Copy seed database if no database exists yet
if [ ! -f /app/data/pmo.db ]; then
  echo "Initializing database from seed..."
  cp /app/seed.db /app/data/pmo.db
  echo "Database ready."
fi

exec node server.js
