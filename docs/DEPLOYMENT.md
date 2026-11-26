# Scholaris — Production Environment & Deployment Guide

This guide covers building, configuring, and operating **Scholaris** in production using Docker containers, PostgreSQL, Redis, S3-compatible storage, and automated CI checks.

---

## 1. Container Architecture

| Service | Dockerfile | Port | Notes |
| :--- | :--- | :--- | :--- |
| **`api`** | [Dockerfile](file:///home/abpro/Documents/Scholaris/apps/api/Dockerfile) | `3001` | Fastify REST API, runs as non-root `scholaris` user, healthcheck at `/api/v1/health`. |
| **`web`** | [Dockerfile](file:///home/abpro/Documents/Scholaris/apps/web/Dockerfile) | `3000` | Next.js 15 App Router frontend, runs as non-root `nextjs` user; requires build-time `NEXT_PUBLIC_API_URL`. |
| **`browser-worker`** | [Dockerfile](file:///home/abpro/Documents/Scholaris/apps/browser-worker/Dockerfile) | — | Isolated Playwright v1.50.1 Chromium worker (`pwuser`), bounded memory (`2G`), consumes BullMQ jobs. |

All services are orchestrated in [docker-compose.prod.yml](file:///home/abpro/Documents/Scholaris/docker-compose.prod.yml).

---

## 2. Required Production Environment Variables

Generate strong, unique random secrets before deploying:

```bash
openssl rand -base64 48
```

| Variable | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection URI with SSL enabled in managed environments (e.g., `?sslmode=require`). |
| `REDIS_URL` | Yes | Authenticated Redis URI (`redis://:PASSWORD@redis:6379`) for BullMQ queues. |
| `JWT_SECRET` | Yes | Minimum 32-character random secret for 15-minute access tokens. |
| `JWT_REFRESH_SECRET` | Yes | Separate 32+ character secret for refresh token rotation. |
| `CORS_ORIGIN` | Yes | Exact public origin of `apps/web` (e.g., `https://scholaris.yourdomain.com`). Do **not** use `*`. |
| `NEXT_PUBLIC_API_URL` | Yes | Public API URL baked into the `apps/web` build and runtime environment. |
| `S3_ENDPOINT` | Yes | Private MinIO or AWS S3/R2 endpoint (`http://minio:9000` or `https://s3.us-east-1.amazonaws.com`). |
| `S3_BUCKET` | Yes | Private bucket name (`scholaris-documents`). Ensure public anonymous read is **disabled**. |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Yes | Least-privilege IAM credentials scoped only to `S3_BUCKET`. |
| `S3_REGION` | Yes | S3 region (e.g., `us-east-1`). |
| `GEMINI_API_KEY` | Recommended | Primary Google Gemini API key for scholarship verification & field matching. |
| `OPENROUTER_API_KEY` | Optional | Fallback LLM provider key if Gemini hits rate limits or downtime. |
| `AI_RATE_LIMIT_PER_MINUTE` | Optional | Per-user AI request cap per minute (default `20`). |
| `AI_DAILY_TOKEN_LIMIT` | Optional | Daily per-user AI token ceiling (default `100000`). |

---

## 3. Database Migrations & First Boot

Before starting application traffic, apply Prisma schema migrations cleanly without resetting data:

```bash
pnpm --filter @scholaris/database exec prisma migrate deploy
```

Ensure private S3 bucket policy blocks anonymous `GetObject` / `ListBucket`; Scholaris serves documents and portal proof screenshots exclusively through short-lived cryptographic presigned URLs.

---

## 4. Building & Starting Production Containers

```bash
# Build all three production images and start dependencies
docker compose -f docker-compose.prod.yml up -d --build

# Check container health
docker compose -f docker-compose.prod.yml ps
```

### Reverse Proxy & TLS
Terminate TLS 1.2+ in front of ports `3000` (`web`) and `3001` (`api`) using Nginx, Caddy, or a managed cloud load balancer, forwarding `X-Forwarded-For` and `X-Forwarded-Proto`.

---

## 5. Security & Operational Guardrails

1. **Mandatory Submission Rule**: `SubmissionGuard` and `POST /api/v1/applications/:id/submit` strictly enforce `userApprovedAt != null`. Never disable this invariant in worker overrides.
2. **SSRF Isolation**: Keep `postgres`, `redis`, and `minio` strictly on `scholaris-internal` (internal Docker bridge) so external browser workers cannot pivot to internal datastore subnets alongside application-layer `NetworkFirewall` checks.
3. **CI Pipeline**: [ci.yml](file:///home/abpro/Documents/Scholaris/.github/workflows/ci.yml) runs `prisma validate`, `pnpm -r check-types`, `pnpm test` (unit, integration, E2E, and security penetration suites), and all three production builds on every push/PR to `main`.
