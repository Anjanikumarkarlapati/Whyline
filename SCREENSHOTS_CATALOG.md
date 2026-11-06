# WhyLine Studio — Screenshots Catalog (Consolidated 4-Page Architecture)

All screenshots captured with Google Chrome Headless at native retina display resolutions (1440×1080 desktop, 375×812 mobile). All image files are stored in `screenshots/` and mirrored to the local artifacts directory.

---

## 1. Core 4-Page Information Architecture

### Page 1: Home Dashboard (`/`)
- **Light Theme**: `screenshots/01_home_dashboard_light.png`
  - *Features*: KPI metric ribbons, AST Anomaly Guardrail summary, top "Open Workbench" CTA, Type filter chips (`MAGIC_LITERAL_CONTROL_FLOW`, `EXPLICIT_THREAD_HALT`, `VALIDATION_BYPASS`, `SWALLOWED_EXCEPTION`), deep links to Workbench per line.
- **Dark Theme**: `screenshots/01_home_dashboard_dark.png`
  - *Features*: Khaki Dark (`#1C1C12`) paper tone, DM Sans, Crimson Text, WCAG AA compliant contrast.

### Page 2: Workbench (`/studio`)
The central workspace consolidating Monaco Editor, Spoken Fence recording, Line Provenance, and Ask-the-Repo Co-Pilot:
- **Fence Tab (Light)**: `screenshots/02_workbench_fence_light.png`
  - *Features*: 60/40 draggable CSS grid split, Monaco editor with inline protected fence badge ("PR #212 – Gateway retry count = 5 for midnight clearing latency"), 36-bar waveform scrubber, voice persona selector (te-IN Nalini, hi-IN Bhavna, en-IN Pranav), mitigation metadata.
- **Fence Tab (Dark)**: `screenshots/02_workbench_fence_dark.png`
- **Why Timeline Tab (Light)**: `screenshots/02_workbench_why_light.png`
  - *Features*: Compact vertical provenance timeline showing Git commit blame (`17c074a`), PR (`#212`), linked incident (`INC-9921`), and AST anomaly flags with direct cross-links to `/memory`.
- **Why Timeline Tab (Dark)**: `screenshots/02_workbench_why_dark.png`
- **Ask Tab / Co-Pilot (Light)**: `screenshots/02_workbench_ask_light.png`
  - *Features*: Hybrid pgvector RRF architectural assistant with voice recording, AST symbol rescoring, 3 ranked strategies, and "Open in editor" actions.
- **Ask Tab / Co-Pilot (Dark)**: `screenshots/02_workbench_ask_dark.png`

### Page 3: Memory & Provenance (`/memory`)
- **Incidents Ledger View (Light)**: `screenshots/03_memory_ledger_light.png`
  - *Features*: Segmented view toggle (`view=ledger`), webhook simulation form, recorded incident cards, branch checkpoints.
- **Incidents Ledger View (Dark)**: `screenshots/03_memory_ledger_dark.png`
- **Git Provenance Graph View (Light)**: `screenshots/03_memory_graph_light.png`
  - *Features*: Segmented view toggle (`view=graph`), interactive SVG flowchart with roving tabindex, multilingual audio walkthrough narration.
- **Git Provenance Graph View (Dark)**: `screenshots/03_memory_graph_dark.png`
- **Slide-Over Detail Drawer**: `screenshots/03_memory_detail_drawer_light.png`
  - *Features*: Right-side drawer for incidents or graph nodes with primary "Open in Workbench" CTA linking to `/studio?file=...&line=...&panel=why`.

### Page 4: Settings & Session (`/settings`)
- **Integrations & Cutover (Light)**: `screenshots/04_settings_integrations_light.png`
  - *Features*: Gnani Vachana speech stack status (~110ms), Supabase pgvector status (768-dim HNSW, active vector count), MCP pre-commit hook status (`whyline-mcp`), Gateway version toggle (`v1` vs `v2`), Zero-Secret verification, Appearance/Language preferences, and Session identity chip `@anjani`.
- **Integrations & Cutover (Dark)**: `screenshots/04_settings_integrations_dark.png`

---

## 2. Legacy Redirect Verification

All legacy 9-page routes use `<LegacyRedirect>` with `<Navigate replace>` preserving incoming query parameters:
- **`/fences`**: `screenshots/legacy_01_fences_redirect.png` (Redirects to `/studio?panel=fence`)
- **`/copilot`**: `screenshots/legacy_02_copilot_redirect.png` (Redirects to `/studio?panel=ask`)
- **`/git`**: `screenshots/legacy_03_git_redirect.png` (Redirects to `/memory?view=graph`)
- **`/incidents`**: `screenshots/legacy_04_incidents_redirect.png` (Redirects to `/memory?view=ledger`)
- **`/login`**: `screenshots/legacy_05_login_redirect.png` (Redirects to `/settings`)

---

## 3. Key USPs & Indic Multilingual Capabilities

- **USP 1 — Telugu Spoken Fence**: `screenshots/usp_01_telugu_spoken_fence.png`
  - Demonstrates te-IN Nalini voice persona, Telugu code-mixed transcription, and AST token rescoring.
- **USP 2 — Hindi Co-Pilot**: `screenshots/usp_02_hindi_ask_copilot.png`
  - Demonstrates hi-IN Bhavna voice model answering architectural refactoring inquiries with RRF ranking.
- **USP 3 — AST Anomaly Ledger with Type Filters**: `screenshots/usp_03_ast_anomaly_filter_chips.png`
  - Shows filtering by `MAGIC_LITERAL_CONTROL_FLOW`, `EXPLICIT_THREAD_HALT`, `VALIDATION_BYPASS`, `SWALLOWED_EXCEPTION`.
- **USP 4 — Workbench File Switcher & Line Provenance**: `screenshots/usp_04_workbench_file_switcher_timeline.png`
  - Shows breadcrumb file switcher between `GatewayRouter.java`, `DicomShaderPipeline.java`, `JwtClockSkewFilter.java`, and `application.yml`.
- **USP 5 — Interactive Git Flowchart & Narration**: `screenshots/usp_05_interactive_git_flowchart.png`
  - Demonstrates interactive SVG provenance exploration with spoken step-by-step playback.
- **USP 6 — Zero-Secret Verification & Gateway Cutover**: `screenshots/usp_06_zero_secret_gateway_cutover.png`
  - Confirms air-gapped credentials boundary and live toggle for safe fence auto-expiry upon v2 cutover.

---

## 4. Mobile Responsive Viewports (375×812)

Verified zero horizontal scroll (`overflow-x: clip`), minimum touch target sizes ≥ 44×44px, and sticky segmented tab controls:
- **Mobile Home Dashboard**: `screenshots/mobile_01_home_375.png`
- **Mobile Workbench Editor & Tabs**: `screenshots/mobile_02_workbench_375.png`
- **Mobile Memory Ledger**: `screenshots/mobile_03_memory_375.png`
- **Mobile Settings & Session**: `screenshots/mobile_04_settings_375.png`
