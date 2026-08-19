FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
COPY .npmrc ./
COPY pnpm.yaml ./
COPY pnpm-workspace.yaml ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Build the application
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Deliberately NO --mount=type=cache,target=/app/.next/cache here. It was tried and
# measured on 2026-08-19 (CR-EF-047) on the theory that this app was slow because it
# lacked the mount decoded-data-app and decoded-ops-hub both have. It does not help:
# build step was 179.9-227.6s across 10 deploys BEFORE the change (mean ~205s) and
# 234.2 / 235.9 / 214.8s across 3 deploys after (mean ~228s) -- at or above the top of
# the pre-existing range, including one clean solo run on an otherwise-idle builder.
# Every deploy does a full `COPY . .`, so this build is dominated by fresh compilation
# rather than by cacheable artifacts, and the extra RUN layer costs more than the mount
# returns. The 30s/128s/191s spread across hub/data-app/this app is app size, not
# caching. Do not re-add without re-measuring.
RUN corepack enable pnpm && pnpm run build

# Production image — minimal
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=Europe/London

RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
