# Scholaris — Development Roadmap & Tasks

This document defines the actionable, phased development roadmap for **Scholaris** (formerly ASCAF).  
Tasks must be executed sequentially following their defined dependencies.  
**Rule:** Only mark a task `Completed` after its acceptance criteria have been verified with real tests and checks.

---

## Roadmap Overview

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1** | Project Foundation & Monorepo Setup | Completed |
| **Phase 2** | Authentication & User Profile Management | In Progress |
| **Phase 3** | Document Vault & Text Extraction | Pending |
| **Phase 4** | Centralized Multi-Provider AI Service | Pending |
| **Phase 5** | Scholarship Ingestion & Authenticity Verification | Pending |
| **Phase 6** | AI Eligibility Checker | Pending |
| **Phase 7** | Browser Automation Engine (Playwright) | Pending |
| **Phase 8** | Semantic Field Matching & Form Filling | Pending |
| **Phase 9** | Review Screen & User-Controlled Submission | Pending |
| **Phase 10** | Student Dashboard, Tracking & Admin Panel | Pending |
| **Phase 11** | End-to-End Integration, Security & Performance | Pending |
| **Phase 12** | Deployment & Infrastructure Readiness | Pending |

---

## Phase 1: Project Foundation & Monorepo Setup

### TASK-000: Initial Project Management & Documentation Setup
- **Description**: Inspect requirements, set up `AGENTS.md`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, and `docs/PROGRESS.md`.
- **Dependencies**: None
- **Priority**: High
- **Acceptance Criteria**:
  1. All 5 workflow documentation files created and populated with confirmed project data.
  2. Clear development roadmap and technical boundaries documented.
  3. Git status verified.
- **Status**: Completed

### TASK-001: Git Repository & Workspace Initialization
- **Description**: Initialize the Git repository, configure `.gitignore` (ignoring base specification), install pnpm, and create the root `package.json`, `pnpm-workspace.yaml`, and `.npmrc`.
- **Dependencies**: TASK-000
- **Priority**: High
- **Acceptance Criteria**:
  1. Git repo initialized on the main branch with clean initial state and remote origin configured.
  2. Root `.gitignore` includes `docs/ASCAF_spec.md`, `node_modules/`, `.env*`, `dist/`, `.next/`, `*.log`.
  3. `pnpm-workspace.yaml` configures `apps/*` and `packages/*`.
  4. Root `package.json` contains core workspace scripts (`build`, `lint`, `test`, `dev`, `check-types`).
- **Status**: Completed

### TASK-002: Base TypeScript & Shared Packages Setup
- **Description**: Establish shared packages (`packages/types`, `packages/shared`, `packages/validation`) and root `tsconfig.base.json`.
- **Dependencies**: TASK-001
- **Priority**: High
- **Acceptance Criteria**:
  1. `tsconfig.base.json` configured with strict type-checking and modern ECMAScript target.
  2. `packages/types` exports base DTOs and system enums.
  3. `packages/shared` exports shared constants, formatting utilities, and error definitions.
  4. `packages/validation` exports Zod schemas matching user, profile, and scholarship models.
  5. Type-checking passes cleanly across all workspace packages (`pnpm check-types`).
- **Status**: Completed

### TASK-003: Database Package & Prisma Schema Definition
- **Description**: Setup `packages/database`, initialize Prisma with PostgreSQL provider, and define the complete 21-entity relational schema.
- **Dependencies**: TASK-002
- **Priority**: High
- **Acceptance Criteria**:
  1. `packages/database/prisma/schema.prisma` contains all entities: `Users`, `UserProfiles`, `EducationRecords`, `LanguageSkills`, `Achievements`, `Experiences`, `Documents`, `Scholarships`, `ScholarshipSources`, `EligibilityRequirements`, `EligibilityResults`, `Applications`, `ApplicationFields`, `FieldMappings`, `MissingInformation`, `ApplicationDocuments`, `BrowserSessions`, `AutomationJobs`, `AIRequests`, `Notifications`, `AuditLogs`.
  2. Prisma validation succeeds (`prisma validate`).
  3. Generated Prisma Client exports cleanly for workspace consumption.
  4. Workspace type-check passes with 0 errors.
- **Status**: Completed

### TASK-004: Fastify API Application Skeleton
- **Description**: Scaffold `apps/api` with Fastify, TypeScript, basic plugins (CORS, sensible, rate-limit), health check endpoint, and Prisma integration.
- **Dependencies**: TASK-003
- **Priority**: High
- **Acceptance Criteria**:
  1. Fastify app starts cleanly with typed configuration.
  2. Health check route `GET /health` returns status `200 OK` with system uptime.
  3. Prisma client successfully connects or mocks in test mode.
  4. Automated API test verifies `GET /health`.
- **Status**: Completed

### TASK-005: Next.js Web Application Skeleton & Design System Tokens
- **Description**: Scaffold `apps/web` with Next.js 15 (App Router), Tailwind CSS, Lucide icons, and create `docs/DESIGN_SYSTEM.md`.
- **Dependencies**: TASK-002
- **Priority**: High
- **Acceptance Criteria**:
  1. Next.js app builds cleanly (`pnpm build`).
  2. Tailwind CSS configuration matches the academic-trust color palette and typography rules.
  3. `docs/DESIGN_SYSTEM.md` documents visual identity, colors, typography, and component guidelines.
  4. Landing page renders with verified responsive navigation and theme tokens.
- **Status**: Completed

### TASK-006: Local Infrastructure & Docker Compose Setup
- **Description**: Create `docker-compose.yml` for local development supporting PostgreSQL 16, Redis 7, and MinIO object storage.
- **Dependencies**: TASK-001
- **Priority**: Medium
- **Acceptance Criteria**:
  1. `docker-compose.yml` defines services: `postgres`, `redis`, `minio`.
  2. Environment variable templates (`.env.example`) provided with secure default ports and configuration keys.
  3. Connection scripts verify container connectivity.
- **Status**: Completed

---

## Phase 2: Authentication & User Profile Management

### TASK-007: Backend Authentication Module
- **Description**: Implement user registration, password hashing (argon2/bcrypt), email verification stub, login, JWT token issuance, and refresh token rotation in `apps/api/src/modules/auth`.
- **Dependencies**: TASK-004
- **Priority**: High
- **Acceptance Criteria**:
  1. `POST /api/v1/auth/register` creates user with hashed password and returns credentials.
  2. `POST /api/v1/auth/login` validates credentials and returns access + refresh tokens.
  3. `POST /api/v1/auth/refresh` renews access token.
  4. Authentication middleware properly blocks unauthorized requests to protected routes.
  5. Automated integration tests verify all auth endpoints and error flows (invalid passwords, duplicate emails).
- **Status**: Completed

### TASK-008: Backend Student Profile Management APIs
- **Description**: Implement CRUD endpoints for personal profile, education history, language skills, achievements, and work experience.
- **Dependencies**: TASK-007
- **Priority**: High
- **Acceptance Criteria**:
  1. `GET /api/v1/profile` and `PUT /api/v1/profile` manage personal and contact details.
  2. `GET/POST/PUT/DELETE /api/v1/profile/education` handles multi-tier academic history.
  3. `GET/POST/PUT/DELETE /api/v1/profile/languages` handles language proficiency.
  4. `GET/POST/PUT/DELETE /api/v1/profile/achievements` and `experiences` work with ownership checks.
  5. Automated integration tests verify full profile lifecycle and cross-tenant isolation.
- **Status**: Completed

### TASK-009: Frontend Authentication & Student Profile UI
- **Description**: Build user login, register, and comprehensive multi-tab profile management UI in `apps/web` using shadcn/ui and TanStack Query.
- **Dependencies**: TASK-005, TASK-008
- **Priority**: High
- **Acceptance Criteria**:
  1. Login and registration pages with client-side Zod validation and clean error feedback.
  2. Profile dashboard with tabs: Personal Info, Education, Languages, Achievements, and Work Experience.
  3. Responsive layouts across desktop and mobile.
  4. Real API integration saving and retrieving profile information.
- **Status**: Completed

---

## Phase 3: Document Vault & Text Extraction

### TASK-010: S3/MinIO Object Storage & Presigned Upload Service
- **Description**: Implement document upload service in `apps/api/src/modules/documents` supporting presigned S3 URLs, MIME type validation, and file metadata tracking.
- **Dependencies**: TASK-007, TASK-006
- **Priority**: High
- **Acceptance Criteria**:
  1. `POST /api/v1/documents/presigned-upload` generates secure presigned upload URLs with strict file size/MIME limits.
  2. `POST /api/v1/documents/confirm-upload` records document record in PostgreSQL.
  3. `GET /api/v1/documents/:id/download` provides short-lived presigned download URLs.
  4. Private documents are inaccessible without user JWT.
- **Status**: Completed

### TASK-011: Document Text & Metadata Extraction Worker
- **Description**: Implement asynchronous document parser using BullMQ to extract plain text and structural data from uploaded PDFs and DOCX files.
- **Dependencies**: TASK-010
- **Priority**: Medium
- **Acceptance Criteria**:
  1. BullMQ job triggers on document upload.
  2. Text extracted from PDFs/DOCX and stored in `Documents.extractedText`.
  3. Handles corrupt or password-protected files gracefully without crashing worker.
- **Status**: Completed

### TASK-012: Frontend Document Vault UI
- **Description**: Build document management interface in `apps/web` allowing drag-and-drop upload, categorization, extraction status viewing, and document replacement.
- **Dependencies**: TASK-009, TASK-010
- **Priority**: High
- **Acceptance Criteria**:
  1. Drag-and-drop upload zone with progress indicators.
  2. Document list categorized by type (Transcripts, CV, Certificates, Recommendation Letters).
  3. Document preview modal and secure download action.
- **Status**: Completed

---

## Phase 4: Centralized Multi-Provider AI Service

### TASK-013: AI Provider Package (`packages/ai`)
- **Description**: Build unified AI orchestration client with Google Gemini API (primary) and OpenRouter API (fallback), supporting structured JSON schemas and error handling.
- **Dependencies**: TASK-002
- **Priority**: High
- **Acceptance Criteria**:
  1. Gemini provider handles structured output queries using native schema enforcement.
  2. OpenRouter provider serves as automatic fallback on rate limit, timeout, or provider failure.
  3. Anonymization utility masks sensitive PII before prompt submission.
  4. Unit tests with mocked LLM responses verify fallback logic and schema validation.
- **Status**: Pending

### TASK-014: AI Token Usage & Cost Auditing
- **Description**: Implement logging and token usage tracking stored in the `AIRequests` table for administrative review and cost controls.
- **Dependencies**: TASK-013, TASK-003
- **Priority**: Medium
- **Acceptance Criteria**:
  1. Every prompt execution logs model, prompt tokens, completion tokens, latency, and status in `AIRequests`.
  2. Rate limiter protects against accidental LLM billing spikes.
- **Status**: Pending

---

## Phase 5: Scholarship Ingestion & Authenticity Verification

### TASK-015: URL Ingestion & SSRF Protection
- **Description**: Implement scholarship URL submission with rigorous SSRF protection, domain resolution check, and initial DOM content retrieval.
- **Dependencies**: TASK-004
- **Priority**: High
- **Acceptance Criteria**:
  1. `POST /api/v1/scholarships/analyze` validates URL syntax and rejects private/loopback/cloud metadata IP addresses.
  2. Fetches web content with timeout and safe size limits.
  3. Creates `Scholarships` record with status `PENDING`.
- **Status**: Pending

### TASK-016: AI Authenticity Verification Engine
- **Description**: Build verification pipeline analyzing domain credibility, institutional affiliation, and scam indicators, classifying results into `VERIFIED`, `UNCERTAIN`, or `SUSPICIOUS`.
- **Dependencies**: TASK-013, TASK-015
- **Priority**: High
- **Acceptance Criteria**:
  1. Checks domain against known university domains and verified scholarship directories.
  2. AI prompt analyzes page for red flags (upfront fee, phishing, suspicious contact emails).
  3. Generates structured verdict with confidence score and evidence notes in `ScholarshipSources`.
  4. Prevents automatic form-filling on any scholarship marked `SUSPICIOUS`.
- **Status**: Pending

### TASK-017: Frontend Scholarship Verification & Results UI
- **Description**: Implement scholarship submission form and detailed authenticity verification result card in `apps/web`.
- **Dependencies**: TASK-005, TASK-016
- **Priority**: High
- **Acceptance Criteria**:
  1. URL input form with immediate format validation.
  2. Visual status badge (`VERIFIED` green, `UNCERTAIN` yellow, `SUSPICIOUS` red).
  3. Evidence breakdown drawer displaying institutional corroboration and risk warnings.
- **Status**: Pending

---

## Phase 6: AI Eligibility Checker

### TASK-018: Scholarship Requirement Extraction
- **Description**: Extract structured eligibility requirements (nationality, age, GPA, education level, major, language test scores) from verified scholarship content using Gemini.
- **Dependencies**: TASK-016
- **Priority**: High
- **Acceptance Criteria**:
  1. Converts unstructured scholarship text into normalized `EligibilityRequirements` rows.
  2. Accurately identifies whether each criterion is mandatory or preferred.
- **Status**: Pending

### TASK-019: Eligibility Matching & Scoring Service
- **Description**: Compare parsed scholarship requirements against student profile and generate eligibility report (`ELIGIBLE`, `INELIGIBLE`, `INSUFFICIENT_INFO`).
- **Dependencies**: TASK-008, TASK-018
- **Priority**: High
- **Acceptance Criteria**:
  1. Evaluates each requirement against student's education, nationality, age, and language scores.
  2. Generates comprehensive breakdown of satisfied, failed, and unconfirmed criteria in `EligibilityResults`.
  3. Provides clear, human-understandable explanation of results without hallucination.
- **Status**: Pending

### TASK-020: Frontend Eligibility Report UI
- **Description**: Build eligibility summary card in `apps/web` displaying requirement checklist, match score, and missing profile items.
- **Dependencies**: TASK-017, TASK-019
- **Priority**: High
- **Acceptance Criteria**:
  1. Visual requirement checklist showing green checkmarks for met criteria and warnings for missing data.
  2. One-click link to update profile if an eligibility requirement is unfulfilled due to missing info.
- **Status**: Pending

---

## Phase 7: Browser Automation Engine (Playwright)

### TASK-021: Playwright Browser Worker Infrastructure (`apps/browser-worker`)
- **Description**: Set up isolated Chromium worker service executing BullMQ jobs with strict resource limits and error capture.
- **Dependencies**: TASK-006, TASK-002
- **Priority**: High
- **Acceptance Criteria**:
  1. Playwright launches isolated Chromium browser contexts with ephemeral storage.
  2. Sandboxed execution blocks access to internal IP addresses.
  3. Captures screenshots and session state on error.
- **Status**: Pending

### TASK-022: Form Detection & DOM Analysis
- **Description**: Implement Playwright form detector that traverses scholarship pages, classifies input controls (text, select, radio, checkbox, file), and extracts labels and instructions.
- **Dependencies**: TASK-021
- **Priority**: High
- **Acceptance Criteria**:
  1. Detects form inputs across single-page and multi-page forms.
  2. Maps DOM selectors, element types, and human-readable field labels to `ApplicationFields`.
  3. Handles dynamic JavaScript-rendered forms with proper wait-for-selector logic.
- **Status**: Pending

### TASK-023: Interactive User Login & CAPTCHA Handoff Protocol
- **Description**: Implement session pause/resume mechanism allowing students to manually log into external portals or solve CAPTCHA before automation resumes.
- **Dependencies**: TASK-022
- **Priority**: High
- **Acceptance Criteria**:
  1. Worker detects login wall or CAPTCHA and transitions `BrowserSessions` status to `PAUSED_FOR_USER`.
  2. User receives notification with instructions to interact with session.
  3. Automation resumes only after user signals successful authentication.
  4. External account credentials are never logged or stored by Scholaris.
- **Status**: Pending

---

## Phase 8: Semantic Field Matching & Form Filling

### TASK-024: AI Semantic Field Matching Engine
- **Description**: Match discovered application fields to student profile data and uploaded documents using AI schema mapping.
- **Dependencies**: TASK-013, TASK-022
- **Priority**: High
- **Acceptance Criteria**:
  1. Maps form fields to profile data with confidence score and explicit source attribution.
  2. Flags unmapped mandatory fields in `MissingInformation`.
  3. Never fabricates personal details; flags missing values for user attention.
- **Status**: Pending

### TASK-025: Missing Information & AI Essay Drafting Assistant
- **Description**: API endpoints and UI flow to prompt the user for missing fields and offer AI-assisted personal statement drafting with required user editing.
- **Dependencies**: TASK-024
- **Priority**: High
- **Acceptance Criteria**:
  1. `GET/PUT /api/v1/applications/:id/missing-info` gathers missing responses.
  2. `POST /api/v1/applications/:id/draft-essay` drafts motivation letter based on user's background.
  3. UI marks AI-generated drafts clearly and requires explicit student review and edit.
- **Status**: Pending

### TASK-026: Automated Form Field Filling & Document Attachment
- **Description**: Browser worker executes automated typing, dropdown selection, radio/checkbox toggling, and file uploading using mapped data.
- **Dependencies**: TASK-021, TASK-024, TASK-010
- **Priority**: High
- **Acceptance Criteria**:
  1. Fills form fields accurately based on verified mappings.
  2. Downloads user documents securely from S3 and uploads them to target file inputs.
  3. Stops short of final submission and saves draft state.
  4. Captures screenshot of filled form for review.
- **Status**: Pending

---

## Phase 9: Review Screen & User-Controlled Submission

### TASK-027: Pre-Submission Application Review Interface
- **Description**: Build full application review screen in `apps/web` displaying all auto-filled values, attached files, AI-generated content, and external form preview screenshots.
- **Dependencies**: TASK-005, TASK-026
- **Priority**: High
- **Acceptance Criteria**:
  1. Complete view of every field value with source origin (Profile vs AI Draft vs User Input).
  2. In-place editable inputs allowing the user to modify any value.
  3. List of selected documents with preview options.
  4. Prominent warning and validation summary if any mandatory item is unresolved.
- **Status**: Pending

### TASK-028: Explicit User Authorization & Submission Execution
- **Description**: Implement mandatory human-in-the-loop authorization gate and browser worker submission trigger with DOM verification of success.
- **Dependencies**: TASK-027, TASK-026
- **Priority**: High
- **Acceptance Criteria**:
  1. `POST /api/v1/applications/:id/approve` records user digital consent with timestamp.
  2. `POST /api/v1/applications/:id/submit` instructs browser worker to click final submit button only after explicit approval is verified.
  3. Worker captures submission confirmation page screenshot and verification evidence.
  4. Application status updates to `SUBMITTED` or `SUBMISSION_FAILED` with real evidence.
- **Status**: Pending

---

## Phase 10: Student Dashboard, Tracking & Admin Panel

### TASK-029: Student Application Tracking Dashboard
- **Description**: Build comprehensive student tracking dashboard in `apps/web` showing active applications, deadlines, verification status badges, and history.
- **Dependencies**: TASK-028
- **Priority**: High
- **Acceptance Criteria**:
  1. Displays metrics: Total Applications, Under Review, Awaiting Approval, Submitted.
  2. Deadline calendar / list with upcoming scholarship due dates.
  3. Filterable application table with quick links to review or status details.
- **Status**: Pending

### TASK-030: Administrative Monitoring & System Metrics
- **Description**: Implement admin dashboard in `apps/web` and `apps/api` for monitoring queue health, browser worker status, AI provider quotas, and audit logs.
- **Dependencies**: TASK-029, TASK-014
- **Priority**: Medium
- **Acceptance Criteria**:
  1. Overview of BullMQ job counts, failed jobs, and active workers.
  2. AI usage metrics (token spend per provider, latency, fallback rate).
  3. Audit log explorer with filtering by user or action.
  4. Admin role guard strictly enforced on all admin endpoints.
- **Status**: Pending

---

## Phase 11: End-to-End Testing & Security Hardening

### TASK-031: Comprehensive Integration & E2E Testing Suite
- **Description**: Implement end-to-end test suite using controlled mock scholarship portals to test the full lifecycle from URL submission to explicit submission.
- **Dependencies**: TASK-028, TASK-029
- **Priority**: High
- **Acceptance Criteria**:
  1. Mock scholarship web portal with multiple input types and file upload.
  2. E2E test runs full flow: URL entry -> verification -> eligibility -> form filling -> approval -> submission.
  3. All tests pass in CI/local headless mode.
- **Status**: Pending

### TASK-032: Security & Privacy Audit
- **Description**: Conduct comprehensive security audit covering SSRF, tenant isolation, S3 bucket privacy, PII masking in AI prompts, and rate limiting.
- **Dependencies**: TASK-031
- **Priority**: High
- **Acceptance Criteria**:
  1. Penetration test attempts for cross-user document access and profile viewing fail with 403 Forbidden.
  2. SSRF payloads against internal subnets blocked.
  3. Prompt audit confirms no unmasked passport numbers or sensitive credentials sent to AI.
- **Status**: Pending

---

## Phase 12: Production Preparation & Deployment

### TASK-033: Production Containerization & CI/CD Setup
- **Description**: Create optimized multi-stage Dockerfiles for `apps/api`, `apps/web`, and `apps/browser-worker`, along with GitHub Actions CI pipeline.
- **Dependencies**: TASK-031
- **Priority**: Medium
- **Acceptance Criteria**:
  1. Lightweight, secure Docker images build successfully.
  2. CI workflow runs type checks, linter, and automated test suite on every commit/PR.
  3. Production environment configuration guidelines documented.
- **Status**: Pending
