FROM node:20-alpine AS base

# --- deps ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
ENV DATABASE_URL="file:/tmp/placeholder.db"
RUN npm ci

# --- build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV BASE_PATH=/pmo2026
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/tmp/placeholder.db"
RUN npx prisma generate
RUN npm run build

# --- runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BASE_PATH=/pmo2026

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# prisma + seed deps
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild

# entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# data directory for SQLite
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data /app/prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/pmo.db"

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
