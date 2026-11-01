# Master Execution Plan: WhyLine & Field-Report Frontend Rollout

**Timeline:** 10-Day Sprint (October 31 – November 10, 2026, 11:59 PM IST)  
**Objective:** Ship the complete **WhyLine Recover-First Spoken Fences + Gnani Vachana Speech Pipeline + Supabase Hybrid Graph-RAG** backend alongside the **3-Phase Cream-and-Olive Field-Report Frontend Redesign**.

---

## 1. Parallel Track Overview

To hit the November 10 Gnani.ai cutoff while delivering a production-grade UI, execution runs across two synchronized tracks:
* **Track A (Core AI, Speech & MCP Engine):** Gnani Prisma v2.5 STT, Timbre v2.5 TTS, Tree-sitter AST anomaly detector, git/PR provenance miner, Spoken Fence test compiler, Supabase `pgvector` RRF search, and `whyline-mcp` pre-edit hooks.
* **Track B (Frontend Field-Report Redesign — Phases 1, 2, 3):** Repairing layout/token bugs, unifying the Cream-and-Olive design system, and integrating verified imagery and accessible Recharts data views.

---

## 2. Day-by-Day Sprint Schedule (Oct 31 – Nov 10, 2026)

### Days 1–3 (Oct 31 – Nov 2): Validation, Gnani Speech Loop, Anomaly Miner & Frontend Phase 1 (Repair)
* **User Research Validation:** Conduct 6–8 fifteen-minute interviews with KL University peers, interns, and senior engineers using the drafted-fence protocol and the 6-item pain-ranking question. Record 2 verbatim quotes (with permission) for the LinkedIn post.
* **Backend & Speech Setup:**
  * Provision `GNANI_API_KEY` on `https://api.vachana.ai` and test `prisma-v2.5` (REST & WebSocket STT) and `timbre-v2.5` (TTS).
  * Run the Supabase SQL migration creating `ast_nodes`, `voice_pins`, `HNSW`/`GIN` indexes, and the `match_whyline_code_and_fences` RRF hybrid search RPC.
  * Build the Tree-sitter AST Anomaly Detector (catching magic numbers, sleeps, swallowed catches, validation bypasses, and reverts) and the `git blame -L -w -C -C` + GitHub PR provenance stitcher (with Local Sandbox fallback for external public repos).
* **Frontend Phase 1 — Repair (`frontend/src/`):**
  * Remove the competing mobile fixed bottom tabbar in `Layout.jsx`; standardize on the accessible mobile drawer below `768px` and reserve safe space for floating chat/voice controls and toasts.
  * Add mandatory `.card-header` (`16px 20px`), `.card-body` (`20px 24px`), and simple `.card` (`24px` desktop / `16px` mobile) padding across all pages.
  * Alias/remove undefined `--line`, `--muted`, and `--border-default` CSS variables.
  * Fix `DM Mono` weight `600` $\rightarrow$ `500`, raise body font to `15px` desktop / `16px` mobile, raise `10px` labels to `12–13px`, and fix rigid chart `min-width` overflow using `minmax(0, 1fr)` and `min-width: 0`.

### Days 4–6 (Nov 3 – Nov 5): Spoken Fence Compiler, MCP Server, Resume Context & Frontend Phase 2 (Unify)
* **Backend & MCP Guardrail:**
  * Build the LLM Fence Compiler (`gemini-2.5-flash` / `llama-3.3-70b-versatile`) outputting `.whyline/fences.json`, runnable JUnit 5 / Pytest invariant tests, and cross-boundary `expiry_condition` rules (Code $\leftrightarrow$ Config).
  * Implement `whyline-mcp` (`check_fences`, `get_fence_audio`, `verify_diff_against_fences`, `log_or_resume_context`) and wire `.git/hooks/pre-commit`, `post-checkout`, and IDE Pre-Edit hooks.
  * Implement the `whyline pause` / `git checkout` **Dead-End Memory & Resume Context** loop.
* **Frontend Phase 2 — Unify (`frontend/src/`):**
  * Apply the exact Light (`#FDFBD4` / `#FFFEF0` / `#545333`) and Dark (`#1C1C12` / `#25251A` / `#D9D7B6`) Cream-and-Olive color tokens in `styles.css`.
  * Standardize `Crimson Text` `400` page titles and KPI figures, pill buttons ($\ge 44\text{px}$ height), labeled form inputs with inline unit hints, and `color + Phosphor icon + word` status badges (`13%` surface blend).
  * Style Recharts on solid `--bg-surface` cards with token axes/tooltips, distinct line patterns (`solid` vs. `dashed`), freshness timestamps, and accessible fallback summary tables.
  * Externalize all remaining hardcoded English strings into the i18n translation files and test Telugu/Hindi script rendering.

### Days 7–8 (Nov 6 – Nov 7): Frontend Phase 3 (Imagery), `HealthConnect` Benchmark & 90s Demo Video
* **Frontend Phase 3 — Intentional Imagery & Final Visual QA:**
  * Replace `farmland.jpg` and `hills.jpg` with curated, licensed AVIF/WebP assets (`auth-drip-irrigation.avif` / `auth-engineering-notebook.avif`) and custom `2px`-stroke cream/olive SVGs (`onboarding-spoken-fence.svg`, `irrigation-valve-schematic.svg`, `assistant-empty-state.svg`).
  * Run full visual QA across `320px`, `375px`, `480px`, `768px`, `1024px`, and `1440px` viewports, both Light and Dark themes, keyboard-only navigation, and `200%` browser text zoom.
* **Real Measured Benchmark on `HealthConnect`:**
  * Seed `HealthConnect` with 10 real anomalous workarounds (`GatewayRouter.java` retry loop, shader workaround, auth skew filter), run an AI coding agent across those 10 files, and record exact measured prevention metrics in `.whyline/scorecard.json` (e.g., *"Blocked 9 of 10 naive agent edits"*).
* **Record 90-Second Demo Video:**
  * *0:00–0:25:* Show a drafted fence recovered from PR #212 on `GatewayRouter.java` inside the Cream-and-Olive Studio $\rightarrow$ Confirm with a 10-second Telugu voice note via **Gnani Prisma v2.5** $\rightarrow$ Show generated JUnit test and `v2` expiry trigger.
  * *0:25–0:60:* Task an AI coding agent with "cleaning up `GatewayRouter.java`" $\rightarrow$ Pre-edit hook and `whyline-mcp` intercept the edit $\rightarrow$ **Gnani Timbre v2.5** speaks the warning out loud $\rightarrow$ JUnit test blocks the regression.
  * *0:60–0:90:* Ask the Whole-Repo Voice Co-Pilot in Telugu how to safely fix the double-charge bug $\rightarrow$ Hear Timbre v2.5 explain the Idempotent Outbox strategy $\rightarrow$ Bump `gateway.version: v2` in `application.yml` and watch the fence flip to `Expired — Safe to Remove`.

### Days 9–10 (Nov 8 – Nov 10): Early Viral Launch & Final Internship Submission
* **Nov 8 (48 Hours Before Cutoff):** Publish the 90-second video on LinkedIn and X tagging `@GnaniAI`, featuring the verified survey statistics (`66%` "almost right" AI tax, `75.3%` human verification reliance) and verbatim developer interview quotes.
* **Nov 9 – Nov 10:** Engage with comments and reshares across developer communities and submit the final application before **November 10, 2026, 11:59 PM IST**.