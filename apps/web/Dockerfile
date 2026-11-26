# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apk add --no-cache libc6-compat

# ==========================================
# Stage 1: Install Workspace Dependencies
# ==========================================
FROM base AS deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/browser-worker/package.json ./apps/browser-worker/
COPY packages/ai/package.json ./packages/ai/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/

RUN pnpm install --frozen-lockfile

# ==========================================
# Stage 2: Build Next.js Production Bundle
# ==========================================
FROM deps AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm --filter @scholaris/web build

# ==========================================
# Stage 3: Production Runtime Image
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next.config.mjs ./apps/web/
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["pnpm", "--filter", "@scholaris/web", "start"]
