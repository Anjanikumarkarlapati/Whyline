# Reusable Engineering & Design Skills (`SKILL.md`)

This file defines three standardized, repeatable execution playbooks (**Skills**) for developers and AI agents working on the repository.

---

## Skill 1: `apply-field-report-ui` (Cream-and-Olive Component & Page Transformation)

### When to Trigger
Invoke this skill whenever creating or refactoring a React page, card, form, table, or Recharts visualization in `frontend/src/`.

### Step-by-Step Execution Playbook
1. **Token Verification:** Ensure the component imports no hardcoded hex colors. Bind background to `var(--bg-surface)`, border to `1px solid var(--border)`, radius to `24px` (`12px` for inputs/alerts, `9999px` for buttons/badges), and remove any `box-shadow`.
2. **Typography Assignment:**
   * Page `h1` (`40–56px` desktop, `32–40px` mobile), Section `h2` (`28–32px`), and Hero KPI numbers (`48–64px`): apply `font-family: var(--font-display)` (`Crimson Text`, `font-weight: 400`).
   * Body copy (`15px` desktop, `16px` mobile), card headings (`16px/600`), and buttons (`14–15px/500`): apply `font-family: var(--font-sans)` (`DM Sans`).
   * Device/Sensor IDs, commit SHAs, AST hashes, coordinates, timestamps, and numeric table readings: apply `font-family: var(--font-mono)` (`DM Mono`, `font-weight: 400` or `500`, `font-variant-numeric: tabular-nums`).
3. **Status Badge Construction:** Render status pills using `background: color-mix(in srgb, var(--status-<type>) 13%, var(--bg-surface))`, a `16px` Phosphor regular icon, and an explicit translated label (`Online`, `Stale`, `Offline`, `Needs attention`, `Failed`, `Scheduled`, or `Verified Active`, `Pending Confirmation`, `Unverified Historical`).
4. **Chart & Table Accessibility Check:**
   * Wrap Recharts in a solid `var(--bg-surface)` card with explicit title, unit (`%`, `°C`, `mm`, `L/min`, `ms`), time range, and freshness label.
   * Differentiate multi-series lines by both stroke color (`var(--accent)` olive, `var(--status-warning)` amber, `var(--status-info)` blue) and `strokeDasharray` pattern (`"0"` vs. `"6 4"`).
   * Add a collapsible `<details>` accessible summary table below the chart.
5. **Responsive & Zoom Verification:** Confirm zero horizontal page scroll at `320px` and `375px`, single mobile drawer navigation below `768px`, and unclipped text at `200%` browser zoom.

---

## Skill 2: `recover-and-compile-spoken-fence` (Git Archaeology $\rightarrow$ Voice Confirmation $\rightarrow$ CI Test)

### When to Trigger
Invoke this skill when ingesting a repository, scanning a `git diff` that triggers an AST anomaly, or processing a Slack/PagerDuty incident webhook.

### Step-by-Step Execution Playbook
1. **Detect AST Anomaly:** Run Tree-sitter query rules over the target file/diff to isolate magic numbers in loops/timeouts, explicit thread sleeps, swallowed exceptions, validation bypasses, or commit reverts.
2. **Mine Historical Provenance:**
   * Execute `git blame -L <start>,<end> -w -C -C <file_path>` to extract the originating commit SHA and author.
   * Query the GitHub REST API (using `GITHUB_TOKEN` if present, or fall back to local `git log --grep` in Local Sandbox Mode) to pull the PR description, inline diff review comments, and linked Issue/Jira keys.
3. **Draft Candidate Fence:** Synthesize a JSON entry in `.whyline/fences.json` with `reconstructed_why`, `danger_condition`, `provenance` links, `confidence` (`HIGH`/`MEDIUM`/`LOW`), and status `PENDING_CONFIRMATION` (or `UNVERIFIED_HISTORICAL` if the author is no longer active).
4. **Execute 10s Voice Confirmation Ritual:**
   * Synthesize the prompt via **Gnani Timbre v2.5** (`model="timbre-v2.5"`, `sample_rate=16000`).
   * Capture the developer's 10–15 second code-mixed confirmation via **Gnani Prisma v2.5** (`POST https://api.vachana.ai/v1/stt/rest`) or 1-line CLI text fallback, applying the AST Vocabulary Rescorer.
5. **Compile Enforcement Artifacts:**
   * Generate a runnable JUnit 5 or Pytest test asserting the invariant.
   * Write a checkable `expiry_condition` watching both source AST nodes and config files (`application.yml`, Terraform, schemas).
   * Upsert the 384-dim `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` embedding into Supabase (`ast_nodes` and `voice_pins`).

---

## Skill 3: `curate-and-optimize-field-asset` (Image & SVG Pipeline)

### When to Trigger
Invoke this skill before adding or replacing any photograph, thumbnail, screenshot, or SVG illustration in `frontend/src/assets/` or `frontend/src/components/illustrations/`.

### Step-by-Step Execution Playbook
1. **Verify Slot & Eligibility:** Confirm the target page allows imagery (`/login` right panel, `/properties` cover, `/crops` stage thumbnail/detail, `/onboarding` spot SVG, `/assistant` empty-state SVG). Reject any image inside working sensor tables, irrigation control forms, climate charts, or settings forms.
2. **Enforce Visual Authenticity:**
   * For decorative brand/auth photography: apply subtle desaturation or olive/cream duotone (`#2A2919` shadows $\rightarrow$ `#FDFBD4` highlights).
   * For factual crop/soil/health or code-evidence photography: preserve **100% natural color** and add an `'Illustrative image'` badge if the photo is not an actual user upload.
   * For spot illustrations: use a `320 x 200` SVG `viewBox`, `2px` rounded strokes, and CSS theme variables (`var(--text-primary)`, `var(--accent)`, `var(--bg-raised)`).
3. **Compress & Lock Dimensions:** Export AVIF/WebP within budget ($\le 15\text{KB}$ SVG, $\le 40\text{KB}$ thumbnail, $\le 100\text{KB}$ cover, $\le 200\text{KB}$ hero), set explicit `width`/`height` or `aspect-ratio`, configure `loading="lazy"` below the fold, and record license, focal point, and factual `alt` text in `asset-manifest.json`.