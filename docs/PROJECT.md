# Scholaris — Project Requirements Specification

**Project Name:** Scholaris (Intelligent Scholarship Verification & Application Assistant)  
**Document Version:** 1.0  
**Status:** Approved Requirements  
**Primary Source of Truth:** `docs/ASCAF_spec.md` (Original Specification)

---

## 1. Project Overview & Vision

Applying for multiple academic scholarships is a repetitive, tedious, and error-prone process. Students must repeatedly enter their personal details, academic history, achievements, and financial circumstances across different disparate portals. Furthermore, students frequently face ambiguous requirements or fall prey to fraudulent scholarship websites.

**Scholaris** is an intelligent, web-based scholarship assistant powered by AI and browser automation. It allows students to maintain a single comprehensive profile and reuse it safely across scholarship opportunities. The system investigates scholarship authenticity, evaluates eligibility, matches fields intelligently, identifies missing data, drafts written responses with human review, and automates form filling via browser workers.

**Core Vision:** Reduce repetitive application labor while ensuring absolute user transparency, privacy, and control. **The platform never submits an application without explicit user approval.**

---

## 2. Target Users & Roles

### 2.1 Students (Primary Users)
- Manage comprehensive personal, academic, and document profiles.
- Submit external scholarship URLs for automatic analysis.
- View independent AI authenticity assessments (Verified, Uncertain, Suspicious).
- Check eligibility against scholarship criteria with clear explanations.
- Initiate browser-assisted form filling.
- Interactively provide missing answers and review AI-drafted statements.
- Inspect every filled field and attached document before explicitly authorizing submission.
- Track application statuses, deadlines, and history from a unified dashboard.

### 2.2 Administrators
- Monitor system health, background queue performance, and browser worker states.
- Manage AI provider routing (Google Gemini & OpenRouter quotas, fallbacks).
- Review audit logs, security events, and platform analytics.
- **Privacy Boundary**: Administrators cannot view private student documents, sensitive identity numbers, or profile contents without authorization.

---

## 3. Core Functional Requirements

Features are structured into logical modules.

### Module 1: User Authentication & Account Security
- Email and password registration with email verification.
- Secure session management (JWT/refresh tokens or secure HTTP-only cookies).
- Password recovery and reset flows.
- Multi-factor authentication (MFA) readiness.
- Account profile settings and data deletion (GDPR-compliant right-to-erasure).

### Module 2: Comprehensive Student Profile
- **Personal Information**: Legal names, birthdate, gender (when required), nationalities, residences, contact info, passport details (encrypted).
- **Family & Financial Information**: Guardian details, household income, financial circumstances (optional, filled only when required).
- **Language Proficiency**: Native tongue, English proficiency (IELTS, TOEFL, Duolingo, CEFR scores), additional languages.
- **Educational History**: High school records, undergraduate studies, postgraduate records (GPAs, institutions, majors, dates, honors).
- **Achievements & Extracurriculars**: Awards, publications, leadership roles, volunteer history, work experience, career goals.

### Module 3: Document Vault & Metadata Management
- File upload support: PDF, DOCX, JPEG, PNG.
- Document categorization (transcripts, recommendation letters, CV/resume, motivation letters, certificates, passport copies).
- Metadata extraction (upload date, file size, MIME type, cryptographic checksum).
- Text & OCR content extraction (extracting text for AI context using PyMuPDF / Tesseract).
- Replacement, versioning, and private S3-compatible cloud storage (pre-signed URLs; no public bucket exposure).

### Module 4: Scholarship Ingestion & Authenticity Verification
- URL submission and validation with SSRF protection.
- Automated page fetching and preliminary DOM inspection.
- **Multi-Factor Authenticity Verification**:
  - *Domain Verification*: Domain registration, institutional ownership, SSL/TLS validation, redirect tracing.
  - *Institutional Corroboration*: Independent lookup against verified academic directories and official university domains.
  - *Scam & Risk Detection*: Detection of upfront fee demands, password phishing, deceptive redirects, unreasonable data harvesting.
  - *Verification Ratings*: `VERIFIED`, `UNCERTAIN`, or `SUSPICIOUS`.
  - *Safety Policy*: Automatic filling is strictly blocked on `SUSPICIOUS` links; strong warnings and data minimization apply on `UNCERTAIN` links.

### Module 5: AI Eligibility Checking
- Automated extraction of explicit criteria: nationality, age caps, minimum GPA, degree level, academic discipline, financial thresholds.
- Comparison with student profile attributes.
- Classification of eligibility status: `Appears Eligible`, `Appears Ineligible`, or `Insufficient Information`.
- Detailed requirement breakdown highlighting satisfied rules, failed criteria, and unconfirmed attributes.

### Module 6: AI Information Matching & Missing Data Engine
- Semantic field matching between external form inputs and stored student profile fields.
- Tracking source origin for every matched field (e.g. `Profile -> Education -> Cumulative GPA`).
- Identification of missing fields, required document types, or essay prompts.
- Interactive missing information prompt for the student.
- AI drafting assistant for motivation essays or short answers with mandatory student editing and approval.
- Strict anti-hallucination policy: The system never fabricates personal data.

### Module 7: Playwright Browser Automation System
- Isolated Chromium browser worker execution.
- Automated navigation, form element detection (inputs, textareas, selects, radios, checkboxes, file pickers).
- Multi-step form traversing and client-side validation error handling.
- **Human-in-the-Loop Login / CAPTCHA Protocol**:
  - If a scholarship portal requires login or presents CAPTCHA, automation pauses.
  - The student completes authentication/CAPTCHA interactively.
  - Automation resumes once the application form is ready.
  - External account passwords are never stored by Scholaris.

### Module 8: Application Review & Explicit User Submission (Mandatory Boundary)
- Comprehensive pre-submission review screen displaying:
  - Scholarship metadata, authenticity rating, and institution.
  - Side-by-side or tabulated view of all auto-filled form values.
  - Attached documents selected for submission.
  - Highlighting of AI-drafted answers versus profile data.
- Full editing capability before confirmation.
- **Explicit Final Approval**: The user must explicitly click "Approve & Submit".
- Execution of submission by the browser worker, followed by screenshot/DOM verification of submission confirmation.
- Clear status tracking (`Draft`, `Preparing`, `Waiting for Input`, `Ready for Review`, `Awaiting Approval`, `Submitting`, `Submitted`, `Submission Failed`, `Requires Manual Action`).

### Module 9: Application Tracking & Student Dashboard
- Centralized tracking board of all submitted and in-progress applications.
- Key dates and deadline countdowns.
- Filtering by status, date, or institution.
- Manual outcome logging (Accepted, Rejected, Waitlisted, Interview).

### Module 10: Multi-Provider AI Orchestration
- Centralized service (`packages/ai`).
- Primary Provider: Google Gemini API (high context, structured JSON schemas, multimodal document reading).
- Secondary Provider: OpenRouter API (resilience, alternative LLMs, essay assistance, fallback).
- Automatic graceful fallback on provider timeouts or 5xx outages.
- Anonymization and data minimization before dispatching prompts to external LLMs.

---

## 4. Scope Demarcation

### In Scope (Version 1.0)
- End-to-end web application (Next.js frontend + Fastify backend).
- Student registration, profile, and document repository.
- URL submission, authenticity verification, and eligibility analysis.
- Playwright-based browser automation worker.
- Interactive missing information collection and essay drafting.
- Explicit approval gate and submission verification.
- Tracking dashboard and administrative monitoring.

### Out of Scope (Version 1.0 — Future Releases)
- Automatic submission without explicit user approval (strictly prohibited).
- Automated CAPTCHA solving or bypassing bot-protection systems.
- Native mobile applications (iOS / Android).
- Browser extension.
- Autonomous global web scraping for scholarships (discovery engine).
- Predicting admission or scholarship acceptance odds.

---

## 5. Non-Functional Requirements & Compliance

- **Security & Privacy**: Zero exposure of raw documents, AES-256 encryption at rest for sensitive profile fields, strict SSRF defenses, token rate limiting.
- **Reliability & Resilience**: Redis BullMQ job queues ensure browser and AI operations do not block web requests and can be retried safely.
- **Performance**: Sub-second UI response times for dashboard and profile; asynchronous progress streaming (via SSE or WebSockets) for browser automation and AI verification tasks.
- **Auditing**: Comprehensive audit logs for authentication, profile updates, and application submission actions.
