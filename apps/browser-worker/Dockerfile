# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/playwright:v1.50.1-noble AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

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
# Stage 2: Generate Prisma & Compile Worker
# ==========================================
FROM deps AS builder
WORKDIR /app

COPY packages ./packages
COPY apps/browser-worker ./apps/browser-worker

RUN pnpm --filter @scholaris/database db:generate && \
    pnpm --filter @scholaris/browser-worker build

# ==========================================
# Stage 3: Isolated Playwright Worker Runtime
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=builder --chown=pwuser:pwuser /app/package.json ./
COPY --from=builder --chown=pwuser:pwuser /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=pwuser:pwuser /app/tsconfig.base.json ./
COPY --from=builder --chown=pwuser:pwuser /app/node_modules ./node_modules
COPY --from=builder --chown=pwuser:pwuser /app/packages ./packages
COPY --from=builder --chown=pwuser:pwuser /app/apps/browser-worker/package.json ./apps/browser-worker/
COPY --from=builder --chown=pwuser:pwuser /app/apps/browser-worker/node_modules ./apps/browser-worker/node_modules
COPY --from=builder --chown=pwuser:pwuser /app/apps/browser-worker/dist ./apps/browser-worker/dist

USER pwuser

CMD ["pnpm", "--filter", "@scholaris/browser-worker", "exec", "tsx", "dist/index.js"]
