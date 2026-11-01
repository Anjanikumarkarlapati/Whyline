# Product & Engineering Backlog: WhyLine & Field-Report Frontend

All backlog items are prioritized across **P0 (Critical Path — Repair & Core Loop)**, **P1 (Unification & Co-Pilot Surfaces)**, and **P2 (Intentional Imagery, Polish & Post-Nov-10 Extensions)**.

---

## Epic 1: Frontend Phase 1 — Structural & Token Repair (P0)

| ID | Title | Description & Technical Scope | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **FE-101** | Resolve Mobile Navigation Conflict & Overlay Overlap | Remove the fixed bottom tabbar below `768px` in `Layout.jsx`. Retain only the accessible slide-over menu drawer and add bottom safe-area inset reservation for floating Assistant/voice controls and toasts. | 1. Only one mobile nav exists at `375px` width.<br>2. Drawer supports `aria-expanded`, `Escape` close, focus trap, and focus return.<br>3. Floating voice/chat button and toasts never overlap navigation or form actions. |
| **FE-102** | Standardize Card Padding & Header/Body Insets | Update `.card`, `.card-header`, and `.card-body` in `styles.css` and audit all pages (`Dashboard`, `Properties`/`Repos`, `Crops`/`Fences`, `Climate`, `Recommendations`, `Settings`). | 1. Structured cards have `16px/20px` header and `20px/24px` body insets.<br>2. Simple cards have `24px` desktop and `16px` mobile uniform padding.<br>3. Zero child elements use ad-hoc margins to fake card padding. |
| **FE-103** | Replace Hardcoded Colors & Alias Legacy CSS Tokens | Map undefined `--line` ($\rightarrow$ `--border`), `--muted` ($\rightarrow$ `--status-muted`), and `--border-default` ($\rightarrow$ `--border`). Strip hardcoded hex values from risk badges, danger buttons, maps, and Recharts. | 1. `grep` for undefined CSS variables returns `0` matches.<br>2. Theme toggle cleanly swaps every surface, border, badge, and chart element between Light and Dark mode. |
| **FE-104** | Fix Font Weights, Minimum Label Sizes & Chart Overflow | Change `DM Mono` `font-weight: 600` to `500`. Set body text to `15px` desktop / `16px` mobile and helper/chart labels to $\ge 12\text{px}$. Replace rigid chart `min-width` rules with `minmax(0, 1fr)` and `min-width: 0`. | 1. Browser network tab loads only `DM Sans` 400/500/600, `Crimson Text` 400, and `DM Mono` 400/500.<br>2. Zero horizontal page overflow at `320px` and `375px` widths. |

---

## Epic 2: Recover-First Spoken Fences & Gnani Speech Core (P0)

| ID | Title | Description & Technical Scope | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **BE-201** | Tree-sitter AST Anomaly Detector | Build Python `tree-sitter` scanner detecting magic numbers in loops/timeouts, `sleep()` calls, swallowed `catch` blocks, validation bypasses (`verify=False`), and git reverts. | 1. Accurately flags all 10 seeded anomalies in `HealthConnect`.<br>2. Remains silent on routine CRUD/formatting commits. |
| **BE-202** | Git Blame & GitHub PR Provenance Miner | Trace flagged AST lines via `git blame -L -w -C -C` to commit SHAs, PR bodies, inline review comments, and Issue/Jira keys, with Local Sandbox fallback for public repos. | 1. Produces structured provenance JSON with source snippets and confidence levels.<br>2. Never crashes when `GITHUB_TOKEN` is absent or rate-limited. |
| **BE-203** | Gnani Vachana Prisma v2.5 STT & Timbre v2.5 TTS Bridge | Integrate `POST /v1/stt/rest`, `wss://api.vachana.ai/v1/stt/realtime`, and `timbre-v2.5` TTS with AST Vocabulary Rescoring (`gateway router` $\rightarrow$ `GatewayRouter`). | 1. Transcribes 10–15s Telugu/Hindi/English confirmations with code identifiers intact.<br>2. Streams 16kHz WAV spoken warnings via Timbre v2.5. |
| **BE-204** | Spoken Fence Compiler & Executable Test Generator | Compile confirmed or historical fences into `.whyline/fences.json`, a runnable JUnit 5 / Pytest invariant test, and a checkable `expiry_condition` (Code $\leftrightarrow$ Config). | 1. Generated test passes on current code and fails when the guarded retry/timeout is naively removed.<br>2. Flipping `gateway.version: v2` marks the fence `EXPIRED_SAFE_TO_REMOVE`. |
| **BE-205** | Hook-Enforced `whyline-mcp` Server & Scorecard | Implement `check_fences`, `get_fence_audio`, `verify_diff_against_fences`, and `log_or_resume_context` paired with Pre-Edit / Pre-Commit hooks and `.whyline/scorecard.json`. | 1. Intercepts AI coding agents before file edits occur.<br>2. Automatically increments `intercepted_agent_breaks` on blocked edits. |

---

## Epic 3: Frontend Phase 2 — Field-Report Unification & Supabase Voice Co-Pilot (P1)

| ID | Title | Description & Technical Scope | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **FE-301** | Apply Cream-and-Olive Field-Report Palette & Typography | Implement the exact Light (`#FDFBD4` / `#FFFEF0` / `#545333`) and Dark (`#1C1C12` / `#25251A` / `#D9D7B6`) tokens, `Crimson Text` titles/KPIs, and `24px` offset `--block` slab on `/login`. | 1. `90–95%` of UI surface uses neutral cream/olive tokens.<br>2. Zero card box-shadows across the application.<br>3. All text/background pairs pass WCAG 2.2 AA contrast ($\ge 4.5:1$). |
| **FE-302** | Accessible Status Badges, Recharts & Data Tables | Enforce `color + Phosphor icon + explicit word` badges (`13%` surface blend). Render Recharts on solid `--bg-surface` with distinct line styles, unit labels, freshness timestamps, and text summary tables. | 1. No status is communicated by color alone.<br>2. Missing sensor/fence readings display `'No reading'` or `'Stale'`, never `0`.<br>3. Every chart has a keyboard-accessible tabular data toggle. |
| **FE-303** | i18n Translation Completion & Indic Script Support | Move all hardcoded English copy on newer pages into translation files and configure `Noto Sans Telugu`, `Noto Sans Devanagari`, and `Noto Sans Gurmukhi` fallbacks. | 1. Switching app language translates all headers, buttons, errors, chart axes, and aria-labels.<br>2. No clipped ascenders/descenders on Telugu or Hindi text. |
| **BE-304** | Supabase `pgvector` Hybrid Graph-RAG & Strategy Planner | Deploy `match_whyline_code_and_fences` RRF SQL function in Supabase and connect the Voice Co-Pilot UI to generate spoken answers + 3 ranked strategies. | 1. Single-RPC hybrid search returns matched AST nodes + attached fences in $< 50\text{ms}$.<br>2. UI renders 3 strategy cards with explicit provenance and uncertainty labels. |
| **BE-305** | Dead-End Memory & Resume Context (`whyline pause`) | Build branch-scoped `DEBUG_CHECKPOINT` capture and automatic 10s spoken briefing on `git checkout`. | 1. Clearly separates **Ruled-Out Dead Ends** from **Next Untested Action**. |

---

## Epic 4: Frontend Phase 3 — Intentional Imagery & Deferred Scope (P2)

| ID | Title | Description & Technical Scope | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **FE-401** | Curated AVIF/WebP Photography & House-Style SVGs | Replace `farmland.jpg` and `hills.jpg` with licensed, aspect-ratio-locked AVIF/WebP assets and create the five `320x200` `2px`-stroke cream/olive SVG spot illustrations. | 1. Spot SVGs $\le 15\text{KB}$, thumbnails $\le 40\text{KB}$, covers $\le 100\text{KB}$, hero $\le 200\text{KB}$.<br>2. Zero Cumulative Layout Shift (`CLS = 0`).<br>3. Non-user stock covers carry an explicit `'Illustrative image'` badge. |
| **DEFER-501** | *(Deferred Post-Nov 10)* LightGBM Tabular Risk Model, D3 Treemap & Voice Cloning | Hold off on training the standalone LightGBM predictor, D3 Dark Code treemap, and cross-lingual voice cloning until the core Spoken Fence + MCP + Field-Report Studio demo is 100% locked. | Implemented only if Epics 1–3 finish ahead of schedule before November 7. |