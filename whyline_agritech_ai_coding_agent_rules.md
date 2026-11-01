# AI Coding Agent Operational Rules (`AGENTS.md`)

**Applies To:** Claude Code, Cursor, GitHub Copilot, OpenAI Codex, Kiro, Antigravity CLI, and any automated agent modifying this repository.

---

## 1. Mandatory Pre-Edit Protocol (Spoken Fences Enforcement)

Before modifying, refactoring, or deleting any method, retry loop, timeout constant, exception handler, or configuration key in this repository:

1. **Query `whyline-mcp` First:** You **MUST** call `check_fences(file_path, proposed_diff)` (or inspect `.whyline/fences.json`) before applying file edits.
2. **Respect Hard Intercepts (`VERIFIED_ACTIVE`):** If `check_fences` returns `REJECT_EDIT`, **STOP IMMEDIATELY**. Do not attempt to bypass the pre-edit hook, delete the generated invariant test in `src/test/`, or strip out the guarded workaround. Read the `constraint_summary` and `provenance`, and propose an alternative implementation that preserves the invariant (such as introducing an idempotency key before altering retry logic).
3. **Handle Cautionary Intercepts (`UNVERIFIED_HISTORICAL`):** If `check_fences` returns `WARN_AND_REQUIRE_CONFIRMATION`, surface the historical PR provenance (`pr_number`, `commit_sha`, `source_snippet`) to the human developer and ask for explicit confirmation before proceeding.
4. **Declare Silent Assumptions (`Assumption Ledger`):** On multi-file refactors, call `verify_diff_against_fences(proposed_diff, agent_assumptions)` listing every runtime assumption your code makes (e.g., *"Assumes `payment_id` is never null"*, *"Assumes webhook delivery is idempotent"*).
5. **Check Dead-End Memory Before Debugging:** When fixing a bug on an active branch, call `log_or_resume_context(branch)` or inspect `.whyline/checkpoints.json` first so you do not re-try hypotheses already listed in `ruled_out_dead_ends`.

---

## 2. Strict Frontend Design Guardrails (Cream-and-Olive Field-Report System)

When generating or modifying any React/Vite component (`frontend/src/`), CSS file (`styles.css`), chart, or layout, you **MUST** obey these non-negotiable rules:

### 2.1 Do Nots (Zero Tolerance)
* **NEVER** preserve or reintroduce raw `#FFFFFF`, `#000000`, `#485C11`, `#8E9C78`, neon green, purple gradients, glassmorphism (`backdrop-filter: blur`), glowing charts, 3D icons, or card `box-shadow` declarations.
* **NEVER** change existing React Router paths, authentication flows, business logic, or backend API contracts when styling UI components.
* **NEVER** synthesize bold on `Crimson Text` (`font-weight` must always be `400`) or request `font-weight: 600` on `DM Mono` (only `400` and `500` are loaded).
* **NEVER** load external Google Fonts CDNs or add a fourth Latin typeface; use the self-hosted Fontsource packages.
* **NEVER** place charts or KPI numbers on top of background photographs.
* **NEVER** communicate status by color alone; always render `Color Token + Phosphor Regular Icon + Explicit Status Word`.
* **NEVER** display missing or stale sensor/telemetry data as `0` or `0%`; render `'No reading'`, `'Stale'`, or `'Last updated…'`.
* **NEVER** hardcode visible English strings in JSX; use the project's translation dictionary (`t('...')`) for all labels, placeholders, errors, chart axes, and `aria-label` attributes.

### 2.2 Mandatory Token & Layout Standards
* **Use Only Approved CSS Variables:**
  * Surfaces: `var(--bg-base)`, `var(--bg-surface)`, `var(--bg-raised)`
  * Text: `var(--text-primary)`, `var(--text-secondary)`
  * Borders & Accents: `var(--border)`, `var(--border-strong)`, `var(--accent)`, `var(--accent-hover)`, `var(--accent-wash)`, `var(--on-accent)`, `var(--block)`, `var(--hero-ink)`
  * Semantic Status: `var(--status-good)`, `var(--status-warning)`, `var(--status-critical)`, `var(--status-info)`, `var(--status-muted)`
* **Card Structure:** Every `.card` must either use `.card-header` (`16px 20px`) + `.card-body` (`20px 24px`) or a uniform inset (`24px` desktop, `16px` mobile) with `border-radius: 24px` and `1px solid var(--border)`.
* **Touch Targets & Accessibility:** All buttons, icon buttons, and form inputs must be at least `44px` tall (`48px` on mobile) with a visible `:focus-visible` ring (`2px solid var(--accent)`, `outline-offset: 2px`).
* **Responsive Containment:** Every flex or grid child containing a Recharts instance or long text/ID must set `min-width: 0` and use `minmax(0, 1fr)` to prevent horizontal page overflow at `320px–375px`.