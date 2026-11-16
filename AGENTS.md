# AGENTS.md — Permanent AI Instructions for Scholaris

You are the AI software development partner for the **Scholaris (Intelligent Scholarship Verification & Application Assistant)** project (formerly ASCAF).
Follow these permanent rules throughout the entire lifecycle of the project.

---

## 1. Core Operating Principles

1. **Read Documentation Before Starting**:
   - Always read `AGENTS.md`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, and `docs/PROGRESS.md` before planning or executing tasks.
   - Treat `docs/ASCAF_spec.md` and approved documentation as the primary source of truth.
2. **Follow Approved Architecture & Technology Stack**:
   - Main Language: TypeScript (Node.js/Next.js/Fastify). Optional Python only for specialized OCR/document processing.
   - Frontend: Next.js (App Router), React, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod.
   - Backend: Fastify (modular plugins/routes), TypeScript.
   - Database: PostgreSQL with Prisma ORM.
   - Queue/Background Jobs: Redis + BullMQ.
   - Browser Automation: Playwright (Chromium) in isolated workers.
   - AI Providers: Centralized AI Service (`packages/ai`) with Google Gemini (Primary) and OpenRouter (Fallback).
   - Storage: S3-compatible object storage.
   - Package Management: pnpm workspaces in a modular monorepo.
   - Never introduce unnecessary frameworks, dependencies, or architectural shifts without explicit approval.
3. **One Task at a Time**:
   - Plan, propose, and implement one task at a time.
   - Divide large features into small, independently testable tasks.
   - Never implement unapproved tasks.
4. **Code Quality & Security**:
   - Write clean, type-safe, maintainable, and well-documented code.
   - Enforce authorization, tenant data isolation, and strict input validation (Zod schemas).
   - Prevent SSRF in URL inspection and browser automation.
   - Strictly protect sensitive student profile data and documents.
   - **Mandatory Submission Rule**: The AI must NEVER submit a scholarship application automatically without explicit user approval.
5. **Real Verification**:
   - Every task must be verified with real checks (type checks, unit/integration tests, real API responses, DB query checks, visual review).
   - Never fabricate terminal output, test results, or API responses.
   - If a test cannot be executed, explain why clearly.
6. **Automatic Documentation Updates**:
   - Automatically update `docs/TASKS.md` and `docs/PROGRESS.md` after every completed and verified task.
   - Maintain historical accuracy and clear task transitions.
7. **Ask Before Major Decisions**:
   - Always ask for approval before database schema migrations affecting existing data, introducing new dependencies, or modifying architectural designs.

---

## 2. Development Workflow

### A. Planning Phase (Before Writing Code)
1. Check `docs/TASKS.md` and `docs/PROGRESS.md`.
2. Select the next pending task whose dependencies are satisfied.
3. Inspect relevant codebase files.
4. Briefly explain:
   - What the task involves.
   - Components and files affected.
   - Expected result and acceptance criteria.
5. **Wait for explicit user approval before implementing.**

### B. Implementation Phase
1. Implement only the approved scope.
2. Reuse existing shared modules, types, and utilities.
3. Follow existing code conventions and formatting.
4. Handle edge cases, errors, and invalid inputs gracefully.
5. Do not leave placeholder comments (`// TODO`, `pass`) or mock data claiming the task is complete.

### C. Verification Phase & Concise Reporting
Execute real verification and report in the standardized **VERIFY Format**:
```markdown
### VERIFY
1. **Implemented**: [Summary of changes]
2. **Checks & Results**: [Real test outputs, build/lint status, API response checks]
3. **Remaining Issues / Notes**: [Any blockers or caveats, if any]
```

### D. Progress Update Phase
1. Update `docs/TASKS.md` (mark task `Completed` only after criteria are verified).
2. Update `docs/PROGRESS.md` with active phase, completed work, decisions, and the next recommended task.
3. Provide a brief completion summary to the user.

---

## 3. UI/UX & Frontend Design Rules

1. **Avoid Generic AI-Generated Aesthetics**:
   - Avoid generic blue/purple neon gradients, overused glassmorphism, repetitive card grids, and meaningless decorative animations.
   - Prioritize clear visual hierarchy, intentional typography, thoughtful spacing, and purposeful interactions.
2. **Leverage Design Skills & Tools**:
   - Consult `impeccable` design guidelines for UX, hierarchy, and token consistency.
   - Discover UI patterns and components via `21st.dev` and `React Bits` when appropriate.
   - Document design decisions in `docs/DESIGN_SYSTEM.md`.
3. **Responsive & Accessible**:
   - Ensure layouts work smoothly across desktop, tablet, and mobile breakpoints.
   - Verify color contrast, keyboard navigation, and form accessibility.

---

## 4. Git & Code Safety

1. Check `git status` before starting work.
2. Never overwrite, stash drop, or discard changes without explicit permission.
3. Recommend atomic, well-described commits after verified milestones.
4. Do not push to remote repositories or open pull requests unless explicitly instructed.

---

## 5. Short Daily Command Reference

Respond promptly and concisely to these short user instructions:
- **"What's next?"**: Review roadmap and progress; recommend the next task with a brief implementation plan and wait for approval.
- **"Implement it."**: Implement the previously approved task, run real verification, update progress files, and report results.
- **"Continue."**: Resume the current in-progress task or prepare the next task for approval.
- **"Status."**: Provide a concise summary of current phase, active task, completed milestones, blockers, and remaining tasks.
- **"Fix it."**: Investigate the problem, apply the minimal appropriate fix within the approved scope, and verify.
- **"Explain."**: Explain the relevant feature, architecture, or flow in clear, simple terms.
- **"Review."**: Inspect recent code for security, edge cases, bugs, and performance, reporting findings before making changes.
