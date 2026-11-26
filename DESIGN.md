---
name: Scholaris
description: Warm Action-Only Surface for verified scholarship discovery, AI-assisted application preparation, and human-authorized submission.
colors:
  canvas-sand: "#F9F7F4"
  surface-white: "#FFFFFF"
  pebble-warm: "#F3EEE5"
  line-taupe: "#E5E0D5"
  scrollbar-thumb: "#D6CFC3"
  scrollbar-thumb-hover: "#B8AFA1"
  ink-espresso: "#2B241F"
  ink-muted: "#6F625A"
  action-cobalt: "#2563EB"
  action-cobalt-hover: "#1D4ED8"
  action-soft: "#EFF6FF"
  verified-bg: "#ECFDF5"
  verified-border: "#A7F3D0"
  verified-text: "#065F46"
  warning-bg: "#FFFBEB"
  warning-border: "#FDE68A"
  warning-text: "#92400E"
  danger-bg: "#FEF2F2"
  danger-border: "#FECACA"
  danger-text: "#991B1B"
typography:
  display:
    fontFamily: "Albert Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Albert Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Albert Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  base:
    fontFamily: "Albert Sans, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Albert Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  micro:
    fontFamily: "Albert Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.33
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.action-cobalt}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.action-cobalt-hover}"
  card-surface:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-espresso}"
    rounded: "{rounded.xl}"
    padding: "1.25rem"
---

# Design System: Scholaris

## Overview

**Creative North Star: "The Warm Scholar's Desk"**

Scholaris is a high-trust scholarship verification and application workspace built on a warm, paper-like sand canvas (`#F9F7F4`) paired with crisp white card surfaces (`#FFFFFF`) and restrained warm taupe borders (`#E5E0D5`). Rather than competing with noisy SaaS dashboards or cold slate gradients, the interface gives students an unhurried, structured reading and review environment where verified facts, AI-drafted responses, and explicit submission gates remain unmistakable.

Color does deliberate work: neutral warm tones hold all structure and metadata, semantic tints (`verified`, `warning`, `danger`) communicate eligibility and approval states without shouting, and a single saturated cobalt accent (`#2563EB`) is reserved strictly for interactive calls to action, active navigation states, and keyboard focus rings.

**Key Characteristics:**
- Warm light-only canvas (`#F9F7F4`) with pure white content cards (`#FFFFFF`) and warm pebble secondary fills (`#F3EEE5`)
- Single interactive accent (`#2563EB`) strictly reserved for buttons, active tabs/links, and focus outlines
- Semantic status badges (`verified`, `warning`, `danger`) with paired 1px tinted borders and accessible dark text (`>= 4.5:1`)
- Tabular numeric alignment for dates, progress percentages, and KPI counts

## Colors

The palette pairs a warm neutral foundation with one cobalt action accent and three semantic verification/status tints.

### Primary
- **Action Cobalt** (`#2563EB`): Primary CTAs, active navigation indicators, active filter pills, text links, selection highlights, and focus rings (`#1D4ED8` on hover, `#EFF6FF` for soft active backgrounds).

### Neutral
- **Canvas Sand** (`#F9F7F4`): Root viewport background (`html` and `body`).
- **Surface White** (`#FFFFFF`): Elevated cards, table containers, top navigation bar, and auth panels.
- **Pebble Warm** (`#F3EEE5`): Table headers, subtle progress tracks, skeleton loaders, and secondary button hover fills.
- **Line Taupe** (`#E5E0D5`): Uniform 1px structural borders and row dividers.
- **Ink Espresso** (`#2B241F`): Primary headings, body copy, KPI numerals, and interactive labels.
- **Ink Muted** (`#6F625A`): Secondary descriptions, table column headers, helper text, and inactive navigation items.

### Semantic Status
- **Verified Emerald** (`#ECFDF5` bg / `#A7F3D0` border / `#065F46` text): Submitted and verified states.
- **Warning Amber** (`#FFFBEB` bg / `#FDE68A` border / `#92400E` text): Ready-for-review, approval gates, and urgent deadlines.
- **Danger Crimson** (`#FEF2F2` bg / `#FECACA` border / `#991B1B` text): Failed automation runs or expired deadlines.

**The Action-Only Cobalt Rule.** Cobalt (`#2563EB`) never decorates static headings, cards, or non-interactive badges; if an element is blue, it can be clicked or focused.

## Typography

**Display & Body Font:** `Albert Sans` (loaded via `next/font/google` as `--font-albert`, fallback `system-ui, -apple-system, sans-serif`)
**Mono Font:** `JetBrains Mono` (loaded via `next/font/google` as `--font-jetbrains`, fallback `ui-monospace, SFMono-Regular, monospace`)

**Character:** Humanist geometric clarity (`Albert Sans`) keeps dense scholarship tables and form-review prompts readable at small sizes, while `JetBrains Mono` anchors technical identifiers, URLs, and tabular figures.

### Hierarchy
- **Display / Page Title** (`700`, `1.5rem`, `1.25` line-height, `-0.02em` tracking): Primary page `<h1>` headings.
- **Title / Card Heading** (`600`, `1.125rem`, `1.35` line-height): Section headers and card titles.
- **Body** (`400`, `0.875rem`, `1.5` line-height): Primary descriptions, table cells, and form labels.
- **Label / Metadata** (`500`, `0.75rem`, `1.33` line-height): Table headers, status badges, and secondary timestamps.

## Layout

Content sits in a centered container (`max-w-7xl`, `px-4 sm:px-6 lg:px-8`) with `py-8` vertical rhythm and `gap-6` between major sections.
- **Desktop (`lg+`):** Sticky top navigation bar (`h-16`) with inline primary links and account actions; dashboard uses a 4-column KPI strip (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`) above an asymmetric 12-column split (`lg:col-span-8` applications workspace + `lg:col-span-4` deadlines widget).
- **Mobile (`< md`):** Single-column stacked layout with a fixed bottom navigation bar (`pb-20` clearance on `<main>`) and touch targets sized at `>= 44px` height where primary actions live.

## Elevation & Depth

Surfaces rely primarily on tonal contrast (`#F9F7F4` canvas vs. `#FFFFFF` surface) and uniform `1px solid #E5E0D5` borders rather than heavy drop shadows.

### Shadow Vocabulary
- **Card (`shadow-card`):** `0 1px 2px 0 rgba(43, 36, 31, 0.04)` — subtle resting separation on white cards.
- **Elevated (`shadow-elevated`):** `0 6px 16px -4px rgba(43, 36, 31, 0.08), 0 2px 6px -2px rgba(43, 36, 31, 0.04)` — reserved for hover states on interactive cards and floating menus.

**The Flat-By-Default Rule.** Cards rest on 1px `#E5E0D5` strokes with minimal ambient shadow; avoid thick directional accent borders (`border-l-4`) on cards or alerts.

## Shapes

- **Cards & Panels:** `rounded-2xl` (`1rem`) with `1px solid #E5E0D5`.
- **Buttons, Inputs & Filter Tabs:** `rounded-xl` (`0.75rem`) for primary controls, `rounded-lg` (`0.5rem`) for compact inline actions.
- **Status Badges & Progress Bars:** `rounded-full` (`9999px`) pill silhouettes.

## Components

### Buttons
- **Shape:** `rounded-xl` (`0.75rem`) for default/large buttons, `rounded-lg` (`0.5rem`) for `sm` inline actions.
- **Primary:** `#2563EB` background, `#FFFFFF` text, `hover:bg-[#1D4ED8]`, `focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2`.
- **Secondary / Outline / Ghost:** `#FFFFFF` or transparent background with `#E5E0D5` 1px border (outline) and `#F3EEE5` hover fill.

### Status Badges
- **Style:** Pill (`rounded-full`) with `1px` semantic border and semantic tint background (`verified`, `warning`, `danger`) or `#F3EEE5` neutral pebble.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (`1rem`)
- **Background:** `#FFFFFF` on `#F9F7F4` canvas
- **Border:** `1px solid #E5E0D5`
- **Internal Padding:** `p-5` (`1.25rem`) for KPI cards and widgets, `p-6` to `p-8` for auth/empty-state panels.

### Navigation
- **Desktop:** Top sticky bar (`bg-surface/95 backdrop-blur-sm border-b border-line h-16`) with active state highlighted via `#EFF6FF` background and `#2563EB` text.
- **Mobile:** Fixed bottom tab bar (`md:hidden`) with icon + label stack and `>= 44px` tap area.

## Do's and Don'ts

### Do:
- **Do** preserve `>= 4.5:1` text contrast across all warm sand, pebble, white, and semantic badge surfaces.
- **Do** use skeleton placeholders (`DashboardSkeleton`) while fetching authenticated data instead of blank screens or generic spinners.
- **Do** keep explicit human-approval cues visible before any final scholarship submission action.

### Don't:
- **Don't** introduce cold gray/slate surfaces, neon gradients, or decorative glow effects.
- **Don't** add uppercase kickers/eyebrows above page headings or emoji characters as UI icons (use `lucide-react`).
- **Don't** use `border-l-4` or `border-r-4` accent stripes on cards or alerts; use uniform `1px` borders.
