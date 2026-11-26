# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apk add --no-cache openssl libc6-compat

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

FROM deps AS builder
WORKDIR /app

COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm --filter @scholaris/database db:generate && \
    pnpm --filter @scholaris/api... build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 scholaris

COPY --from=builder --chown=scholaris:nodejs /app/package.json ./
COPY --from=builder --chown=scholaris:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=scholaris:nodejs /app/tsconfig.base.json ./
COPY --from=builder --chown=scholaris:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=scholaris:nodejs /app/packages ./packages
COPY --from=builder --chown=scholaris:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=scholaris:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=scholaris:nodejs /app/apps/api/dist ./apps/api/dist

USER scholaris
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/v1/health || exit 1

CMD ["sh", "-c", "pnpm --filter @scholaris/database exec prisma db push --skip-generate && pnpm --filter @scholaris/api start"]
