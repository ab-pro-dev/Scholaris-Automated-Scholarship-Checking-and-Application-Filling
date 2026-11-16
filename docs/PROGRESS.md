# Scholaris — Development Progress & Memory

This file is the living memory of the **Scholaris** project (formerly ASCAF). It is updated after every verified task to track the real state of development, verification results, blockers, and next steps.

---

## 1. Current State Summary

- **Current Phase**: Phase 1: Project Foundation & Monorepo Setup
- **Active Task**: None (Awaiting user approval to start `TASK-005`)
- **Project Status**: Fastify API application skeleton (@scholaris/api) implemented, connected to Prisma, and verified via automated tests.
- **Next Recommended Task**: `TASK-005: Next.js Web Application Skeleton & Design System Tokens`

---

## 2. Recently Completed Tasks

### TASK-004: Fastify API Application Skeleton
- **Completed On**: 2026-11-16
- **What Was Done**:
  - Scaffolded `apps/api` with Fastify v5 and TypeScript.
  - Registered `@fastify/cors`, `@fastify/helmet`, `@fastify/sensible`, and `@fastify/rate-limit`.
  - Built custom `prismaPlugin` decorating Fastify with `@scholaris/database` and handling graceful teardown.
  - Implemented typed environment configuration (`src/config/env.ts`) using Zod.
  - Implemented `GET /health` and `GET /api/v1/health` with resilient database connection check.
  - Added Vitest test suite (`test/health.test.ts`) validating health checks and payload integrity.
- **Verification Results**:
  - `pnpm check-types` passed with 0 errors across all 5 workspace projects (`types`, `shared`, `validation`, `database`, `api`).
  - `pnpm --filter @scholaris/api test` passed with 2/2 tests green.

### TASK-003: Database Package & Prisma Schema Definition
- **Completed On**: 2026-11-16
- **What Was Done**:
  - Created `@scholaris/database` package with Prisma ORM.
  - Defined PostgreSQL schema with all 21 models, 22 enums, foreign key relations, and indexes.
  - Configured pnpm v12 `onlyBuiltDependencies` in `pnpm-workspace.yaml` for Prisma engines.
  - Created root `.env.example` template with PostgreSQL, Redis, S3, AI keys, and JWT configurations.
  - Generated Prisma Client and exported singleton client from `packages/database/src/index.ts`.
- **Verification Results**:
  - `prisma validate` passed: `The schema at prisma/schema.prisma is valid 🚀`.
  - `prisma generate` succeeded generating client v6.19.3.
  - `pnpm check-types` passed across all 4 packages with 0 errors.

### TASK-002: Base TypeScript & Shared Packages Setup
- **Completed On**: 2026-11-16
- **What Was Done**:
  - Created root `tsconfig.base.json` with strict ES2022 / NodeNext settings.
  - Built `@scholaris/types` (`packages/types`) containing foundational DTOs, system enums, and API response contracts.
  - Built `@scholaris/shared` (`packages/shared`) containing SSRF URL validation, blocked IP checks, file constants, and custom error classes.
  - Built `@scholaris/validation` (`packages/validation`) containing isomorphic Zod schemas for auth, student profiles, education, documents, and application workflows.
  - Installed `typescript`, `@types/node`, and `zod` via pnpm.
- **Verification Results**:
  - `pnpm check-types` executed across all workspace packages and passed with 0 errors.

### TASK-001: Git Repository & Workspace Initialization
- **Completed On**: 2026-11-16
- **What Was Done**:
  - Initialized Git repository on `main` branch.
  - Attached remote origin: `git@github.com:ab-pro-dev/Scholaris-Automated-Scholarship-Checking-and-Application-Filling.git`.
  - Created `.gitignore` with `docs/ASCAF_spec.md` (base documentation) explicitly ignored.
  - Installed and verified `pnpm` (v12.21.0).
  - Configured root `package.json`, `pnpm-workspace.yaml`, and `.npmrc`.
- **Verification Results**:
  - `git check-ignore -v docs/ASCAF_spec.md` confirmed base spec is ignored.
  - `git remote -v` confirmed remote origin.
  - `pnpm -v` confirmed 12.21.0.

### TASK-000: Initial Project Management & Documentation Setup
- **Completed On**: 2026-11-16
- **What Was Done**:
  - Carefully studied `docs/ASCAF_spec.md` (Software Requirements Specification & Technical Design).
  - Created permanent AI operating instructions in `AGENTS.md`.
  - Created structured project requirements in `docs/PROJECT.md`.
  - Created system architecture, entity diagrams, and API design in `docs/ARCHITECTURE.md`.
  - Established a 12-phase, 34-task detailed roadmap with strict acceptance criteria in `docs/TASKS.md`.
  - Initialized this live progress ledger in `docs/PROGRESS.md`.
- **Verification Results**:
  - All 5 workflow files exist, are linked, and are fully populated with confirmed information from the specification.
  - Zero application code written before establishing project management foundation.

---

## 3. Unfinished Work & Known Issues

1. **Environment tooling considerations**:
   - `node` is available (v24.22.2).
   - `pnpm` is available (v12.21.0).
   - `python3` is available (v3.14.4).
   - `git` is available (v2.53.0).
   - `docker` CLI needs to be installed via `sudo apt install docker.io docker-compose-v2`.

---

## 4. Technical Decisions Made

1. **Project Identity**: Re-branded the project from ASCAF to **Scholaris** (Latin root for "scholarly"), emphasizing academic prestige, institutional trust, and serious student advocacy.
2. **Strict Human-in-the-Loop Submission**: The platform will never submit a scholarship application without explicit, real-time user approval.
3. **Monorepo Architecture with pnpm**: Modular monorepo with `apps/web` (Next.js), `apps/api` (Fastify), `apps/browser-worker` (Playwright), and shared `packages/*`.
4. **Multi-Provider AI Fallback**: Google Gemini as primary provider (fast structured JSON schemas, high context window) with OpenRouter as automatic fallback and essay drafting assistant.
5. **Authenticity Classification**: 3-tier outcome (`VERIFIED`, `UNCERTAIN`, `SUSPICIOUS`) with automatic form-filling strictly blocked on `SUSPICIOUS` links.
6. **Academic Trust UI**: Non-generic design system using Tailwind CSS, shadcn/ui, avoiding excessive AI gradients or bloated animations.

---

## 5. Next Recommended Task

- **Task**: `TASK-001: Git Repository & Workspace Initialization`
- **Scope**:
  1. Initialize Git repository (`git init`) and commit documentation files.
  2. Create comprehensive root `.gitignore`.
  3. Activate `pnpm` via corepack (`corepack enable pnpm`).
  4. Create root `package.json` and `pnpm-workspace.yaml`.
- **Expected Result**: Clean Git repository with workspace structure ready for package scaffolding.
