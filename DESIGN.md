# DESIGN.md — WhyLine Studio Cream-and-Olive Field-Report Design System

This file is the locked design system for WhyLine Studio, governed by Hallmark v2.0.0.
The canonical implementation lives in `frontend/src/tokens.css`.

## Canonical Palette (Light / Dark)

| Token | Light | Dark |
|---|---|---|
| `--bg-base` | `#FDFBD4` | `#1C1C12` |
| `--bg-surface` | `#FFFEF0` | `#25251A` |
| `--bg-raised` | `#F2F0CA` | `#2F2F22` |
| `--text-primary` | `#2A2919` | `#FDFBD4` |
| `--text-secondary` | `#545333` | `#D9D7B6` |
| `--border-default` | `#D9D7B6` | `#3A3A2A` |
| `--border-strong` | `#878672` | `#878672` |
| `--accent` | `#545333` | `#D9D7B6` |
| `--accent-hover` | `#3E3D25` | `#FDFBD4` |
| `--accent-wash` | `#ECEAD0` | `#343324` |
| `--on-accent` | `#FDFBD4` | `#2A2919` |
| `--block` | `#878672` | `#545333` |
| `--hero-ink` | `#2A2919` | `#141409` |
| `--amber` | `#A05A00` | `#D9A520` |

## Status Tokens

Every status badge pairs: `Color Token (13% blend fill) + Phosphor Regular Icon (16px) + Explicit Status Word`. Never color alone.

| Token | Light | Dark |
|---|---|---|
| `--status-good` | `#545333` | `#D9D7B6` |
| `--status-warning` | `#8F5A08` | `#D9A520` |
| `--status-critical` | `#B3261E` | `#E86A62` |
| `--status-info` | `#3B6E91` | `#6BA3C9` |
| `--status-muted` | `#6B6A55` | `#A9A890` |

## Typography

| Token | Value |
|---|---|
| `--font-sans` | `"DM Sans", "Noto Sans Devanagari", "Noto Sans Telugu", system-ui, sans-serif` |
| `--font-display` | `"Crimson Text", "Noto Serif Devanagari", "Noto Serif Telugu", Georgia, serif` |
| `--font-mono` | `"DM Mono", "Noto Sans Devanagari", "Noto Sans Telugu", ui-monospace, monospace` |

Weights: 400 / 500 / 600 only. No faux italic or bold (`font-synthesis: none`). No `text-transform` on Indic text.

## Layout and Shapes

- Container max-width: **1320px** (centered, gutters grow beyond 1320, measure does not)
- Cards: `--radius-card` = 24px, `--radius-control` = 12px, `--radius-chip` = 9999px
- Touch targets: minimum 44px, 48px on mobile
- Single accessible mobile drawer below 768px

## Elevation System (four levels only)

Shadows, blur, and bevels are allowed **only** via these tokens. No hard-coded shadows elsewhere.

| Level | Usage | Key properties |
|---|---|---|
| **L0 Canvas** | Page background | Flat + faint fixed radial ambient glow, no animation |
| **L1 Card** | Cards, stat cells, tables, anything with paragraphs | Solid >= 94% opaque, 1px border (`--border-default`), 1px top inset highlight, soft two-layer shadow |
| **L2 Floating glass** | Topbar, account popover, drawers, modals, tooltips **only** | 78–86% surface opacity, `blur(14px) saturate(140%)`, 1px border, inset top highlight |
| **L3 Well (deboss)** | Inputs, selects, textarea, segmented track, risk-bar track, code/diff containers | Inner shadow + 1px bottom catch-light; text on 100% opaque |

**Raised-cap controls** (buttons, chips, active segment): top highlight + 2px bottom lip + 1px border. Hover lift 1px. Active sink 1px. Labels must achieve >= 4.5:1 contrast (affordance does not depend on shadow alone; cream highlights are nearly invisible on #FFFEF0).

## F1 Typography Rules (documented for reference)

Fonts: Self-hosted WOFF2 via @fontsource — DM Sans (Latin UI), Crimson Text (Latin display), DM Mono (mono), Noto Sans Devanagari + Noto Sans Telugu (UI, variable), Noto Serif Devanagari + Noto Serif Telugu (display). Weights: 400 / 500 / 600 only. No faux italic or bold (`font-synthesis: none`). No `text-transform` on Indic text.

Font stacks per role:
- `--font-sans`: `"DM Sans","Noto Sans Devanagari","Noto Sans Telugu",system-ui,sans-serif` (Latin UI, Devanagari UI, Telugu UI)
- `--font-display`: `"Crimson Text","Noto Serif Devanagari","Noto Serif Telugu",Georgia,serif` (display heads)
- `--font-mono`: `"DM Mono","Noto Sans Devanagari","Noto Sans Telugu",ui-monospace,monospace` (monospace)

Script-aware line-heights via `:lang()`:
- Body line-height: en 1.55, hi 1.7, te 1.8
- Headings: en 1.15, hi 1.35, te 1.45
- Captions >= 18px, te line-height 1.9

Indic face compensation: add @font-face rules for them with size-adjust (start 106%) and tune visually.

hi/te: letter-spacing 0 and text-transform none (including eyebrow labels).

Globally: font-style: normal and font-synthesis: none (no faux italic or bold; Indic scripts have no italics). Weights 400/500/600 only.

Never disable ligatures or OpenType features, and never use text-rendering: optimizeSpeed (breaks conjuncts and half-forms).

text-wrap: balance on headings, pretty on paragraphs. overflow-wrap: anywhere only on code/identifier chips.

Content rules:
- Keep technical terms and identifiers in Latin inside hi/te UI (PR, commit, fence, retryCount, file paths); translate the explanation around them.
- Latin digits everywhere (Intl.NumberFormat with the -u-nu-latn extension); Intl.DateTimeFormat for dates.
- All UI strings in locales/en.json, hi.json, te.json (ICU messages); no hard-coded text.
- Truncate and count text only with Intl.Segmenter (grapheme); never slice/substring (breaks conjuncts and vowel signs).
- Normalize to NFC before comparing or searching.
- Sentence splitting (for the TTS queue) must treat the Hindi danda (।, ॥) as well as . ? !.

Layout resilience: Hindi runs about 20-30% longer than English, Telugu about 30-40%. No fixed-width buttons, pills or table columns; use min-width + wrapping. Add a pseudo-locale (strings padded ~40%) to expose overflow in topbar, segmented controls, KPI slabs, badges, table headers, drawers.

Loading: preload Latin plus only the active language's face; split by unicode-range (devanagari U+0900-097F U+200C-200D U+A8E0-A8FF; telugu U+0C00-0C7F U+200C-200D); font-display: swap with metric-matched fallbacks. Await document.fonts.ready (and document.fonts.load for the active script) before measuring text or laying out the flowchart.

Monaco: fontFamily from --font-mono, fontLigatures false, lineHeight 22. Hindi/Telugu appears only in comments; voice notes live in the side panel, not in the editor (non-monospace glyphs misalign the cursor).

/dev/typography route: dev-only route showing the type scale and test strings per script:
- en: "GatewayRouter retryCount = 5 must stay until the v2 cutover."
- hi: "गेटवे राउटर में retryCount 5 ही रखें, v2 कटओवर तक।" and "क्षत्रिय श्रद्धा ज्ञान द्वारा उद्योग"
- te: "గేట్‌వేరౌటర్_INCLUDE retryCount 5_alagu_ v2_katt_overy_with_out_dot." and "స్వాతంత్ర్యం_lakshmi_krishna_samskruti"
- Verify no clipped matras or top bars, no tofu, correct mixed-script spacing.

## Touch Radius and Depth

- Cards: `--radius-card` = 24px, `--radius-control` = 12px, `--radius-chip` = 9999px (full pill)
- Radii & Depth: 24px cards and primary image frames; 12px inputs, alerts, code snippets, and compact panels; full pill (9999px) buttons, status badges, and filter chips. Zero card box-shadows replaced by elevation tokens.

## Required Fallbacks (all mandatory)

1. `@supports not (backdrop-filter)` — solid L1 replaces L2 glass
2. `prefers-reduced-transparency: reduce` — solid surfaces, no glass
3. `forced-colors: active` / `prefers-contrast: more` — no shadows or blur; borders and system colors only
4. `prefers-reduced-motion: reduce` — no transforms or animations; content visible with scripting off
5. `html[data-fx="lite"]` — no blur, single-layer shadows; auto-enabled when `navigator.deviceMemory <= 4` or `hardwareConcurrency <= 4`; Settings toggle "Visual effects: Full / Lite"
6. Max 3 blurred layers visible at once; never blur scrolling lists or Monaco
7. Focus ring: `outline: 2px solid var(--accent)`, `outline-offset: 2px` (outline, never box-shadow)

## Logo

"Speaking Fence" — fence pickets + amber accent picket + sound-wave arc. The amber picket marks "this one speaks" and doubles as the accent. SVG at `public/favicon.svg` (favicon, 32px) and `public/logo.svg` (topbar, 28px). Survives at 16px.

## Implementation

All tokens, elevation, and fallbacks: `frontend/src/tokens.css` (imported first in `main.jsx`).
Component layout, typography, and patterns: `frontend/src/styles.css`.
No hard-coded colors, shadows, or font-family values outside `tokens.css`.
