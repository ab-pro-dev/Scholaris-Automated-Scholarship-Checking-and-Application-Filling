---
version: 1
slug: "apps-web-app-dashboard-applications-page-tsx"
primary_target: "apps/web/app/(dashboard)/applications/page.tsx"
related_targets: ["apps/web/app/(dashboard)/layout.tsx"]
---

# Surface Brief: Student Application Tracking Dashboard & App Shell

- **Mode:** Operate
- **Scope:** Core Design System tokens (`globals.css`), `(dashboard)/layout.tsx` App Shell, and `(dashboard)/applications/page.tsx` Student Application Tracking Dashboard.
- **Audience & Job:** Returning scholarship applicants under deadline pressure needing instant clarity on pending inputs, authorization readiness, nearest due dates, and safe next actions.
- **Constraints:** Uses existing Fastify endpoints (`/api/v1/applications`, `/api/v1/auth/me`); maintains Mandatory Submission Rule visibility; desktop top bar + mobile bottom bar; warm-tinted secondary inks (`>= 4.5:1`); no decorative gradients or neon glow; code-led build.

## Direction contract

THESIS: Replace cold generic SaaS grids with an approachable, calm workspace where warm neutral surfaces recede completely and one saturated cobalt accent highlights only what the student can act on next.

OWN-WORLD: Warm sand ground (`#F9F7F4`), crisp pure white cards (`#FFFFFF`) framed by warm taupe borders (`#E5E0D5`), warm espresso ink (`#2B241F`) with tinted secondary ink (`#6F625A`), and action-only cobalt (`#2563EB`) strictly on primary CTAs, active tabs, and focus outlines, paired with semantic status pills (`Emerald`/`Amber`/`Red`).

STORY: A stressed applicant lands, immediately spots applications ready for signature or missing essays, checks upcoming deadline urgency, and clicks the cobalt CTA straight into the right workspace without guessing.

FIRST VIEWPORT: Clean desktop top header (and mobile persistent bottom nav) above the dashboard title and primary "+ Check Scholarship" action; 4 interactive filter summary cards above a split workspace featuring the searchable/tabbed Applications Table (left, 8 cols) and Upcoming Deadlines + Submission Guard panel (right, 4 cols).

FORM: Warm Action-Only Surface (Challenger `digital-design-canon-warm-consumer-app-surface`, ranked 5th / selected by user; `seed:2ded288e49ff6652`). Standard accessible Next.js + Tailwind controls; `Albert Sans` + tabular numerals (`tabular-nums`).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
