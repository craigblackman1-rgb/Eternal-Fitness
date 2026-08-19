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

RUN corepack enable pnpm
# Persist Next's build cache so unchanged routes are not recompiled from scratch.
# Matches decoded-data-app and decoded-ops-hub, which both already do this; this app
# was the outlier and built in 191s vs their 128s/30s. Note decoded-ops-site
# deliberately does NOT do this (its Dockerfile documents a stale-prerender problem);
# that app prerenders marketing pages, this one does not.
RUN --mount=type=cache,target=/app/.next/cache \
    pnpm run build

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
