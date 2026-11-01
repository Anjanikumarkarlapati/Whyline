# Frontend Design Specification: Cream-and-Olive Field-Report System

**Scope:** Unified Frontend Design System & Source Audit Remediation for the **AgriTech React 18 / Vite 5** application and the **WhyLine Engineering Field-Report Studio**.  
**Mandate:** Apply the calm cream-and-olive field-report visual language without breaking existing routes, authentication, business logic, or API contracts. Operational readability always outranks decorative art.

---

## 1. Source Audit Summary & Remediation Priorities

### 1.1 Strengths Preserved
* React 18 / Vite 5 architecture with React Router, Recharts, Phosphor regular icons, and self-hosted Fontsource fonts (`DM Sans`, `Crimson Text`, `DM Mono`).
* Centered `1320px` max-width container with responsive gutters (`40px` desktop $\ge 1024\text{px}$, `24px` tablet $768\text{--}1023\text{px}$, `16px` mobile $< 768\text{px}$).
* Pill buttons (`9999px`), `24px` card border-radius, `12px` input border-radius, and CSS variable theming.

### 1.2 Audited Departures & Required Fixes (Priority Order)
1. **Mobile Navigation & Viewport Overlap (P0):** Mobile drawer and fixed bottom tabbar currently coexist on narrow viewports, overlapping floating Assistant/chatbot controls and toast notifications. **Fix:** Remove the competing fixed bottom tabbar below `768px` and standardize on one accessible slide-over menu drawer (`aria-expanded`, `Escape` handler, focus trap, focus restoration).
2. **Missing Card Insets (P0):** Shared `.card` does not enforce padding, leaving newer property/repo, climate/anomaly, recommendation/strategy, and settings cards flush against borders. **Fix:** Standardize structured cards with `.card-header` (`16px` vertical / `20px` horizontal) and `.card-body` (`20px` vertical / `24px` horizontal), and simple cards with `24px` desktop / `16px` mobile uniform inset.
3. **Palette & Undefined Legacy Tokens (P0):** Replace `#FFFFFF`, `#000000`, `#485C11`, and `#8E9C78` with the single source-of-truth Cream-and-Olive palette. Map or remove legacy `--line` ($\rightarrow$ `--border`), `--muted` ($\rightarrow$ `--status-muted`), and `--border-default` ($\rightarrow$ `--border`).
4. **Typography & Font Weight Bugs (P0):** Increase main body copy from `14px` to `15px` desktop / `16px` mobile. Raise `10px` helper/chart labels to at least `12px–13px`. Change `.mono-metric` weight from `600` (unsupported by `DM Mono`) to `500`.
5. **Chart Overflow & Hardcoded Strings (P1):** Replace rigid minimum chart widths on detail views with `minmax(0, 1fr)` and `min-width: 0` on flex/grid parents. Move all hardcoded English strings into the i18n translation dictionary.

---

## 2. Color Tokens — One Source of Truth

Define these exact tokens in `frontend/src/styles.css` under `:root` (Light) and `[data-theme="dark"]` (Dark):

| Token | Light Mode (Warm Paper) | Dark Mode (Warm Khaki Slate) | Usage Rules |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#FDFBD4` | `#1C1C12` | Primary page background (`90–95%` of viewport surface area). |
| `--bg-surface` | `#FFFEF0` | `#25251A` | Standard cards, tables, chart canvases, form inputs, and modals. |
| `--bg-raised` | `#F2F0CA` | `#2F2F22` | Table headers, secondary panels, code/diff blocks, and hover states. |
| `--text-primary` | `#2A2919` | `#FDFBD4` | Essential body copy, headings, primary KPI values, and table identities. |
| `--text-secondary` | `#545333` | `#D9D7B6` | Subtitles, field labels, metadata, and secondary descriptions. |
| `--border` | `#D9D7B6` | `#3A3A2A` | `1px` hairline card borders, table row dividers, and chart gridlines. |
| `--border-strong` | `#878672` | `#878672` | `1px` interactive form outlines, secondary button borders, and focus rings. |
| `--accent` | `#545333` | `#D9D7B6` | Primary button fill, active navigation `2px` bar, and primary chart line. |
| `--accent-hover` | `#3E3D25` | `#FDFBD4` | Hover/pressed state for primary actions. |
| `--accent-wash` | `#ECEAD0` | `#343324` | Subtle row-hover wash and selected filter chip background. |
| `--on-accent` | `#FDFBD4` | `#2A2919` | Text and icon color atop `--accent` buttons. |
| `--block` | `#878672` | `#545333` | Decorative offset slab *only* behind the Auth or Hero feature frame. |
| `--hero-ink` | `#2A2919` | `#141409` | Restrained dark-olive feature panel background. |
| `--status-good` | `#545333` | `#D9D7B6` | Online / Verified Active / Healthy (calm olive, never neon green). |
| `--status-warning` | `#8F5A08` | `#D9A520` | Stale / Pending Confirmation / Workaround / Warning threshold line. |
| `--status-critical` | `#B3261E` | `#E86A62` | Needs attention / Failed / Critical Violation / Danger button outline. |
| `--status-info` | `#3B6E91` | `#6BA3C9` | Scheduled / Water & Rainfall series / Unverified Historical provenance. |
| `--status-muted` | `#6B6A55` | `#A9A890` | Offline / Expired — Safe to Remove / Disabled metadata. |

### Status & Badge Composition Rule
* **Every status indicator must combine 3 elements:** `Color Token + Phosphor Regular Icon (16px) + Explicit Status Word` (`Online`, `Stale`, `Offline`, `Needs attention`, `Failed`, `Scheduled` for AgriTech; `Verified Active`, `Pending Confirmation`, `Unverified Historical`, `Needs Attention`, `Expired — Safe to Remove` for WhyLine).
* **Badge Fill Calculation:** Blend the status token at `13%` into `--bg-surface` (`background: color-mix(in srgb, var(--status-warning) 13%, var(--bg-surface))`). Error banners use an `8%` `--status-critical` tint with `--text-primary` or `--status-critical` text (never white text on a light red tint).

---

## 3. Typography & Hierarchy

* **UI Sans:** `'DM Sans Variable', 'DM Sans', 'Noto Sans Telugu', 'Noto Sans Devanagari', 'Noto Sans Gurmukhi', system-ui, sans-serif` (Weights: `400`, `500`, `600`).
* **Editorial Display Serif:** `'Crimson Text', Georgia, serif` (Weight: `400` regular only — never synthesize bold `700`).
* **Precision Data Mono:** `'DM Mono', ui-monospace, monospace` (Weights: `400`, `500` only — never request `600`; enable `font-variant-numeric: tabular-nums`).

| Element | Font Family & Weight | Desktop Size | Mobile Size | Line-Height / Tracking |
| :--- | :--- | :--- | :--- | :--- |
| **Auth / Marketing Headline** | `Crimson Text` `400` | `clamp(2.25rem, 4vw, 4.25rem)` (`48–68px`) | `36–44px` | `1.04` / `-0.02em` |
| **Operational Page Title (`h1`)** | `Crimson Text` `400` | `clamp(2rem, 3.5vw, 3.5rem)` (`40–56px`) | `32–40px` | `1.10` / `-0.02em` |
| **Section Title (`h2`)** | `Crimson Text` `400` | `28–32px` (`1.75–2rem`) | `24–28px` | `1.15` |
| **Hero / KPI Metric Number** | `Crimson Text` `400` | `48–64px` (`3–4rem`) | `36–48px` | `1.0` |
| **Card Heading (`h3`)** | `DM Sans` `600` | `16px` (`18px` standalone form) | `16px` | `1.35` |
| **Body Copy & Instructions** | `DM Sans` `400` | `15px` (`0.9375rem`) | `16px` (`1rem`) | `1.5–1.6` (`55–75ch` max) |
| **Navigation & Buttons** | `DM Sans` `500` | `14–15px` | `15px` | `1.3` |
| **Field Labels & Table Cells** | `DM Sans` `500` (labels) / `400` (cells) | `13–14px` | `14px` | `1.4–1.5` |
| **Helper / Caption / Chart Axis** | `DM Sans` `400` | `12–13px` | `12–13px` | `1.5` (never `<12px`) |
| **Eyebrow / Context Label** | `DM Sans` `600` | `12–13px` | `12px` | `+0.04em` tracking |
| **IDs, SHAs, Readings, Coordinates** | `DM Mono` `400` / `500` | `13–14px` | `13px` | `1.5` (`tabular-nums`) |

---

## 4. Layout, Spacing, Shapes & Components

* **Approved Spacing Scale:** `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px` (plus optical exceptions: `6px` label-to-input/helper gap, `14px` table-cell vertical padding, `18px` button horizontal padding).
* **Radii & Depth:** `24px` cards and primary image frames; `12px` inputs, alerts, code snippets, and compact panels; full pill (`9999px`) buttons, status badges, and filter chips. **Zero card box-shadows.**
* **Decorative Offset Slab (`--block`):** Used *only* on the Auth panel or one primary Hero feature frame (`24px` left/bottom reveal on desktop, `16px` on mobile, `32px` slab radius, `24px` foreground frame radius). Never place text or icons on the slab.
* **Buttons & Touch Targets:** Minimum `44px` height (`48px` on mobile primary actions and form inputs). One primary action (`--accent` fill + `--on-accent` text) per logical region.

---

## 5. Recommended Pictures, Illustrations & Page-by-Page Redesign

Below is the complete visual asset catalog and page-by-page redesign tailored for both **AgriTech** and **WhyLine's Field-Report Studio**.

### 5.1 Curated Photography Recommendations (Raster Assets)

All raster images must live in `frontend/src/assets/images/`, be exported as responsive **AVIF/WebP** with intrinsic `width`/`height` or CSS `aspect-ratio`, stay within strict byte budgets, and include provenance metadata in `frontend/src/assets/images/asset-manifest.json`.

| Slot & Page | Recommended Subject (AgriTech) | Recommended Subject (WhyLine Adaptation) | Aspect Ratio & Dimensions | Max Budget | Filename & Treatment | Factual `alt` Text |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Auth Contextual Panel (`/login`)** *(Replaces coastal `farmland.jpg`)* | Close-up of a farmer's hands inspecting a real soil-moisture probe along irrigated drip rows in warm morning light. | Overhead editorial shot of an engineer's desk with a warm paper field notebook, architectural diagram sketch, and studio microphone. | `4:5` (`1200 x 1500px`) | $\le 200\text{KB}$ | `auth-drip-irrigation.avif` / `auth-engineering-notebook.avif` (Desaturated `15%`, optional `#2A2919` $\rightarrow$ `#FDFBD4` duotone, `24px` frame + `24px` `--block` slab; hidden `<960px`). | `"Soil-moisture probe installed beside drip-irrigated tomato rows"` / `"Architectural field notebook beside a studio microphone"` |
| **2. Dashboard Context Strip (`/`)** *(Replaces `hills.jpg`)* | **Recommended Default:** Replace photo strip with a compact olive vector illustration beside the report header so KPIs stay above the fold. If used: wide view of terraced paddy rows with weather station mast. | **Recommended Default:** No photo behind KPIs or charts. Optional `160px` header banner showing an archival blueprint ledger grid. | `16:5` (`1600 x 500px`) | $\le 150\text{KB}$ | `dashboard-cultivated-rows.webp` (Never behind numbers/charts; hidden on `<640px` phones). | `""` (Decorative context strip; report text is HTML) |
| **3. Property / Repo Card Covers (`/properties` or `/repos`)** | User-uploaded farm photo, or clearly badged `[Illustrative image]` of cultivated paddy, cotton, or orchard rows. | Clean vector repository topology badge (no fabricated stock office photos). | `3:2` (`600 x 400px` & `1200 x 800px`) | $\le 100\text{KB}$ | `property-cover-paddy-field.webp` (`object-fit: cover; object-position: center 40%`). | `"Mapped paddy field rows at East Block property"` |
| **4. Property / Crop Detail (`/properties/:id`, `/crops/:id`)** | Authentic stage-matched crop photo (e.g., vegetative wheat at tillering stage—preserve 100% natural color, never duotone!). | High-resolution static call-graph snapshot or hardware/deployment topology diagram. | `16:9` (`1600 x 900px`) | $\le 180\text{KB}$ | `crop-detail-wheat-tillering.webp` (100% factual natural color for health assessment). | `"Young wheat crop at tillering stage showing uniform leaf color"` |
| **5. Crop / Module Thumbnails (`/crops`, `/recommendations`)** | Square `1:1` stage-accurate crop close-up (tomato, paddy, chilly, cotton) beside title. | Square `1:1` language/framework or audio waveform emblem. | `1:1` (`160 x 160px` for `80px` slot) | $\le 40\text{KB}$ | `thumb-crop-tomato-vegetative.webp` | `"Vegetative stage tomato foliage"` |
| **6. Help / Setup Screenshots (`/sensors/:id`, `/onboarding`)** | Real hardware photo of the soil-probe wiring terminal or actual Cream-and-Olive UI capture. | Real capture of VS Code / Cursor terminal showing `whyline-mcp` intercepting an unsafe agent edit. | Native capture ratio | $\le 250\text{KB}$ | `guide-sensor-probe-wiring.webp` / `guide-mcp-intercept.webp` (`object-fit: contain`, `12px` radius). | `"Terminal output showing WhyLine MCP blocking an edit to GatewayRouter.java"` |

### 5.2 Custom House-Style SVG Line Illustrations (`frontend/src/components/illustrations/`)

All vector spot illustrations use a `320 x 200` `viewBox` (`8:5` aspect ratio), `2px` rounded strokes (`stroke-linecap="round" stroke-linejoin="round"`), simple geometric line work, `--text-primary` / `--accent` strokes, and `--bg-raised` / `--accent-wash` fills so they adapt automatically to Light and Dark mode (`<= 15KB` each):

1. `onboarding-soil-sensor.svg`: Field rows in perspective with a vertical soil-moisture probe transmitting three concentric signal arcs.
2. `onboarding-boundary-map.svg`: Polygon farm boundary with four corner coordinate pins and a compass rose.
3. `onboarding-spoken-fence.svg` *(WhyLine)*: Soundwave entering a protective architectural gate (`[ ||| ]`) anchored to an AST tree node with a clock expiry badge.
4. `irrigation-valve-schematic.svg` / `pipeline-hook-schematic.svg`: Clean technical schematic showing Mainline $\rightarrow$ Solenoid Valve $\rightarrow$ Drip Zone (or `Git Diff` $\rightarrow$ `Pre-Edit Hook` $\rightarrow$ `Spoken Fence` $\rightarrow$ `CI Invariant Test`).
5. `assistant-empty-state.svg`: Minimalist field notebook and fountain pen / microphone resting on a grid line (`160 x 100px` compact variant inside the Assistant empty state).

### 5.3 Page-by-Page Redesign Blueprint

1. **Topbar & Navigation (`Layout.jsx`):**
   * Desktop ($\ge 768\text{px}$): `64px` min-height topbar on `--bg-surface` with `1px solid var(--border)`, leaf/field-row mark, horizontal links with `2px solid var(--accent)` active bottom bar, unit/language switcher, and theme toggle.
   * Mobile ($< 768\text{px}$): Single accessible menu drawer button (`44x44px`). Fixed bottom navigation bar is completely removed so floating Assistant/voice controls and toasts never overlap.
2. **Dashboard (`/`) — The Field-Report Briefing:**
   * **Row 1 (Context Header):** Eyebrow `FIELD REPORT • UPDATED 2 MINS AGO` (`DM Sans 12px/600`), `h1` Property/Repository Title (`Crimson Text 44px`), property/repo selector pill, and primary action button (`Schedule irrigation` / `Scan repository`).
   * **Row 2 (Urgent Alerts Banner):** Shown only when active (`8%` `--status-critical` tint, `12px` radius, Phosphor `WarningCircle` icon, plain-language explanation, and immediate recovery button).
   * **Row 3 (3-Column KPI Grid):** Flat `--bg-surface` cards (`24px` radius, `24px` inset) displaying `Crimson Text 56px` numbers with inline units (`34%` soil moisture, `28.5 °C`, `14` intercepted agent breaks) and explicit status pills.
   * **Row 4 (2fr / 1fr Operational Split):** Left `2fr` card renders Recharts on solid `--bg-surface` (`--accent` olive primary line, `--status-warning` dashed threshold line, `--status-info` blue water/rain bars, plus a collapsible accessible summary table). Right `1fr` card lists Pending Confirmations / Next Actions.
3. **Working Tables & Control Screens (`/sensors`, `/climate`, `/irrigation`, `/explorer`):**
   * Strictly zero decorative photography. Tables align identity/name left (`DM Sans 14px`), numeric readings and SHAs right (`DM Mono 13px tabular-nums`), and actions right.
4. **Assistant / Voice Co-Pilot (`/assistant`):**
   * Clean paper conversation feed with source/provenance badges (`Source: Sensor S-104` or `Source: PR #212 • Confirmed by @anjani`), uncertainty disclaimers on AI recommendations, and a `48px`-tall push-to-talk **Gnani Prisma / Timbre** voice bar at the bottom with safe-area padding.