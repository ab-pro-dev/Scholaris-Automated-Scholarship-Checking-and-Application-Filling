# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, and Zod inside a pnpm monorepo workspace (`apps/web`), consuming the existing Fastify v5 REST API (`apps/api`), Playwright browser worker (`apps/browser-worker`), PostgreSQL/Prisma (`packages/database`), and shared `@scholaris/types`, `@scholaris/shared`, and `@scholaris/validation` packages, deployed via Node.js/Docker.

## Users

- **Students (Primary Users):** Applicants managing a reusable personal, academic, language, achievement, and document profile while applying across disparate external scholarship portals, verifying link authenticity, reviewing eligibility, completing missing prompt responses, and explicitly authorizing every final submission.
- **Administrators (Secondary Users):** Platform operators monitoring background BullMQ automation queue health, Chromium browser worker sessions, multi-provider AI usage/latency/fallback telemetry, and security audit trails—strictly blocked from accessing private student documents, encrypted passport numbers, or personal profile contents without authorization.

## Product Purpose

Eliminate repetitive scholarship application labor while protecting students from fraudulent scholarship sites, hallucinated application answers, and unauthorized automated submissions. Success means a student saves verified records once, accurately inspects authenticity and eligibility before investing effort, edits every matched field and AI draft with full source transparency, and retains 100% control over final portal submission.

## Positioning

Unlike generic AI auto-appliers or opaque form fillers, **Scholaris** enforces two non-negotiable boundaries verified across API, worker, and UI layers:
1. **Mandatory Submission Rule:** Scholaris never clicks or executes final scholarship submission without an explicit, auditable student digital consent signature and timestamp (`userApprovedAt != null`).
2. **Strict Anti-Hallucination & Verification Gating:** Unconfirmed profile values are never fabricated into portal inputs (always surfaced via `MissingInformation` for explicit student resolution), external account passwords/2FA are never stored (`ChallengeDetector` handoff), and `SUSPICIOUS` scholarships are strictly blocked from form filling or submission.

## Operating Context

- **Student Workflow:** Register/Sign In (`/api/v1/auth/*`) -> Build Academic Profile (`/api/v1/profile/*`) -> Upload Supporting PDFs/DOCX/Images to Private S3 Vault with background OCR (`/api/v1/documents/*`) -> Submit External Scholarship URL for SSRF-safe Authenticity Verification (`VERIFIED` / `UNCERTAIN` / `SUSPICIOUS`, `/api/v1/scholarships/*`) -> Check Eligibility Breakdown -> Create Application & Run AI Semantic Field Matching (`PROFILE`, `DOCUMENT`, `USER_INPUT`, `AI_DRAFT`) -> Resolve Missing Info & Edit AI Motivation Drafts (`/api/v1/applications/:id/missing-info`, `/draft-essay`) -> Handle Portal Login/CAPTCHA Handoff if Paused (`/api/v1/automation/sessions/*`) -> Inspect Pre-Submission Review + Portal Screenshot Snapshot -> Sign Explicit Consent (`POST /approve`) & Trigger Submission (`POST /submit`) -> Track Applications, Deadlines & Proof Receipts (`/api/v1/applications`).
- **Admin Workflow:** Role-guarded monitoring console (`ADMIN` role only via `/api/v1/admin/metrics` and `/api/v1/admin/audit-logs`).
- **Runtime Environment:** Desktop and mobile web browsers backed by Fastify REST API (`:3001`), PostgreSQL (`:5432`), Redis/BullMQ (`:6379`), MinIO/S3 (`:9000`), and sandboxed Playwright Chromium workers.

## Capabilities and Constraints

- **API Contract Ready:** All REST endpoints, Zod validation schemas (`@scholaris/validation`), TypeScript DTOs (`@scholaris/types`), and backend tests (`197/197` passing across API, AI, and browser worker) already exist.
- **No Active `apps/web` Scaffold:** Previous frontend files were deleted so the web application will be scaffolded and built cleanly screen by screen.
- **Security & Privacy Invariants:** Cross-user tenant isolation on all student resources, SSRF subnet/protocol blocking on URL inspection, private pre-signed S3 URLs, encrypted passport storage excluded from AI prompts, and explicit review/approval flags on AI drafts (`sourceType: 'AI_DRAFT'`).
- **Frontend Visual Decisions Intentionally Open:** Visual direction, color tokens, typography, layout structure, and component styling are undecided and deferred until new surface work begins.

## Brand Commitments

- **Product Name:** **Scholaris** (*Intelligent Scholarship Verification & Application Assistant*).
- **Tone & Authority:** Authoritative, trustworthy academic advocate prioritizing accuracy, transparency, and explicit student consent over black-box automation.

## Evidence on Hand

- Product requirements & architecture specifications: `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`.
- Implemented backend API routes, Zod schemas, and DTO contracts: `apps/api/src/modules/*`, `packages/validation/src/index.ts`, `packages/types/src/index.ts`.
- *Absences:* No existing screenshots, brand marks/logos, customer testimonials, pricing tiers, or live frontend UI remain on disk. Future UI surfaces must not fabricate social proof or marketing claims.

## Product Principles

1. **Human Consent Before Action:** Nothing submits externally without verified student authorization and cryptographic audit logging.
2. **Never Fabricate Student Facts:** Missing eligibility attributes, unmapped form inputs, and personal statements require student input or explicit editing with visible source attribution.
3. **Verify Before Investing Effort:** Surface link authenticity (`VERIFIED`, `UNCERTAIN`, `SUSPICIOUS`) and requirement gaps clearly before triggering automation.
4. **Full Visibility Over Black-Box Automation:** Always show source origins, confidence, portal snapshots, pause-for-CAPTCHA handoffs, and submission confirmation receipts.
5. **Privacy by Isolation:** Keep private documents, encrypted identifiers, and external portal credentials strictly fenced per tenant and out of unauthorized AI prompts or admin views.

## Accessibility & Inclusion

- Must support desktop, tablet, and mobile web viewports cleanly for diverse international student applicants.
- Form controls, multi-step reviews, confirmation gates, and status badges must maintain readable contrast, full keyboard navigation, and clear screen-reader semantics.
