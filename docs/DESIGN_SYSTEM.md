# Scholaris — Design System & Visual Standards

**Design Philosophy:** Academic Trust & Out-of-Distribution Craft  
**Version:** 1.0  
**Status:** Approved Design Specification  
**Target:** Web Interface (`apps/web`)

---

## 1. Visual World & Aesthetic Identity

Scholaris is an intelligent scholarship verification and application assistant built for ambitious students. It is an authoritative advocate, not an experimental chatbot.

### Core Tenets
1. **Academic Authority Over Tech Novelty**: Avoid generic AI aesthetics—no neon purple/blue gradient backgrounds, no decorative glassmorphism, no meaningless floating cards, no kicker/eyebrow labels.
2. **Precision & Tabular Legibility**: GPAs, deadlines, funding sums, and verification outcomes require strict contrast, unambiguous visual status, and tabular numbers (`tabular-nums`).
3. **Intentional Hierarchy**: Every element earns its place. Primary actions are bold and authoritative; secondary controls are understated; status indicators are immediately recognizable without overwhelming the content.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Surfaces & Canvas
- **Background (Light)**: `#FBFBFA` (Crisp archival paper / warm canvas)
- **Surface / Card**: `#FFFFFF` (Pure white with 1px border `#E2E8F0`)
- **Surface Muted**: `#F1F5F9` (Subtle container fill)
- **Surface Inverted / Dark**: `#0A1120` (Midnight Navy)

### 2.2 Brand & Typography
- **Primary Ink**: `#0F172A` (Deep Slate / Navy 900) — Headers and high-contrast body
- **Secondary Ink**: `#475569` (Slate 600) — Subtitles, helper text, metadata
- **Muted Ink**: `#94A3B8` (Slate 400) — Placeholders and disabled states
- **Accent / Interactive**: `#1E3A8A` (Academic Royal Navy 900)

### 2.3 Verification & Status Colors
Status colors must never be decorative. They denote actual verification, eligibility, or safety verdicts:
- **`VERIFIED` / Eligible / Met**:
  - Background: `#ECFDF5` (Emerald 50)
  - Border: `#A7F3D0` (Emerald 200)
  - Text / Foreground: `#065F46` (Emerald 800)
- **`UNCERTAIN` / Pending / Attention**:
  - Background: `#FFFBEB` (Amber 50)
  - Border: `#FDE68A` (Amber 200)
  - Text / Foreground: `#92400E` (Amber 800)
- **`SUSPICIOUS` / Scam / Blocked**:
  - Background: `#FEF2F2` (Red 50)
  - Border: `#FECACA` (Red 200)
  - Text / Foreground: `#991B1B` (Red 800)

---

## 3. Typography Hierarchy

| Style | Element | Size / Weight | Tracking | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Heading** | `h1` | `2.5rem - 3.25rem` (Bold 700) | `-0.03em` | `1.15` | Hero titles, primary page headers |
| **Section Heading** | `h2` | `1.75rem - 2.25rem` (SemiBold 600) | `-0.02em` | `1.25` | Major page sections, module headers |
| **Card / Group Heading** | `h3` | `1.25rem - 1.5rem` (SemiBold 600) | `-0.01em` | `1.35` | Form sections, card headers |
| **Body Large** | `p` | `1.125rem` (Regular 400) | `0` | `1.6` | Lead paragraphs, intro summaries |
| **Body Standard** | `p`, `span` | `0.9375rem - 1rem` (Regular 400) | `0` | `1.5` | Standard body text, table content |
| **Caption & Meta** | `span`, `time` | `0.8125rem - 0.875rem` (Medium 500) | `0` | `1.4` | Badges, timestamps, field hints |
| **Tabular Data** | `span`, `td` | Monospace or `tabular-nums` | `0` | `1.4` | GPAs, currency amounts, deadlines |

---

## 4. Elevation, Borders & Shadows

- **Borders**: Subdued, crisp 1px borders (`#E2E8F0` or `#CBD5E1`) define shape.
- **Shadows**:
  - Flat / Default: `none` or `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
  - Elevated / Dropdown / Card Hover: `0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)`
  - Overlays / Dialogs: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)`
- **Radius**: Restrained geometric rounding (`rounded-lg` = 8px, `rounded-xl` = 12px for modal/containers). Never full bubble pills on cards.

---

## 5. Interaction & Component Standards

### 5.1 Buttons
- **Primary**: Solid Deep Navy (`bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]`). High visual authority.
- **Secondary**: Clean border (`border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`).
- **Destructive**: Brick Red (`bg-red-600 text-white hover:bg-red-700`).
- **Subtle / Ghost**: Text with transparent background (`text-slate-600 hover:text-slate-900 hover:bg-slate-100`).

### 5.2 Forms & Inputs
- High-contrast 1px border (`border-slate-300`).
- Sharp focus ring (`focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none`).
- Labels placed directly above inputs with clear mandatory asterisks.
- Tabular numeral support for dates and grades.

### 5.3 Verification Badges
- Pill format with leading icon (CheckCircle2 for Verified, AlertTriangle for Uncertain, ShieldAlert for Suspicious).
- Plain language: "Verified Institution", "Uncertain Authenticity", "Suspicious Opportunity".

---

## 6. Accessibility & Responsiveness

- Minimum contrast ratio: 4.5:1 for standard text, 3:1 for large display headings.
- Keyboard navigation: All interactive buttons, tabs, and links have visible focus outlines.
- Responsive breakpoints:
  - Mobile (`< 640px`): Single-column stacked layouts, sticky bottom actions for reviews.
  - Tablet (`640px - 1024px`): 2-column forms, collapsible sidebar.
  - Desktop (`> 1024px`): Full dashboard grid, side-by-side review comparisons.
