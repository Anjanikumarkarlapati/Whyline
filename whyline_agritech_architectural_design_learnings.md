# Project Learnings & Architectural Evolution (`LEARNINGS.md`)

This document records the core product, machine learning, user research, and frontend design lessons uncovered during the development of **WhyLine** and the **Cream-and-Olive Field-Report Design System**.

---

## 1. Product & Workflow Learnings

### 1.1 Blank-Slate Voice Authoring Fails on Ritual Fatigue and Cold Start
* **Initial Assumption:** Asking developers to record a 20-second voice note after every merged Pull Request would effortlessly replace written Markdown ADRs.
* **What We Learned:** ~80% of commits are routine CRUD updates, UI tweaks, or minor refactors that do not need oral history; prompting on every PR guarantees developers will mute the webhook within 48 hours. Even worse, relying strictly on human authoring leaves 100% of existing legacy code unprotected on Day 1.
* **The Architectural Fix:** Flip the workflow to **Recover-First, Confirm-by-Voice**. Trigger only on the ~10% of commits containing **AST Anomalies** (magic numbers, sleeps, swallowed catches, validation bypasses, reverts), reconstruct the candidate "why" automatically from `git blame` and PR review comments, and ask the author only for a 10-second binary voice confirmation (*"Avunu, correct"*). When the original author has left the company, mark the fence `UNVERIFIED_HISTORICAL` with explicit provenance links so AI agents and reviewers treat it with appropriate caution.

### 1.2 Git History Is Often Sanitized — Capture at Incident Resolution
* **Initial Assumption:** Mining PR descriptions and Jira tickets will always reveal the true technical reason behind a hack.
* **What We Learned:** PRs and tickets are visible to managers, clients, and auditors, so developers often write polite corporate summaries while keeping the real reason (*"Vendor v2 API drops every 4th packet at midnight"*) in frantic Slack threads or incident calls.
* **The Architectural Fix:** Pair git provenance mining with an **Incident-First Webhook** (`Slack / PagerDuty Incident Resolved`) that prompts the on-call engineer for a 15-second unfiltered post-mortem voice note and links it automatically to the subsequent hotfix PR.

### 1.3 Workarounds Never Die Without Machine-Checkable Expiry Triggers
* **Initial Assumption:** Capturing *why* a workaround exists is enough to manage technical debt.
* **What We Learned:** A confirmed voice warning without an expiration condition becomes a permanent landmine—two years later, after the database or payment gateway is upgraded, developers and AI agents are still afraid to remove the obsolete hack.
* **The Architectural Fix:** Compile every voice note into a **3-Part Spoken Fence** with an explicit lifecycle: (1) an agent guardrail, (2) a runnable JUnit/Pytest invariant test, and (3) a cross-boundary `expiry_condition` watching both code ASTs and config files (`application.yml`, Terraform, schemas) so the fence automatically flips to `EXPIRED_SAFE_TO_REMOVE` when the underlying issue is fixed.

---

## 2. AI Agent & RAG Engineering Learnings

### 2.1 Voluntary MCP Tools Are Ignored by RL-Tuned Coding Agents
* **Initial Assumption:** Exposing a `check_fences()` tool on an MCP server is sufficient to stop Claude Code, Cursor, or Codex from breaking workarounds.
* **What We Learned:** Modern coding agents are heavily reinforcement-learning tuned to rely on their built-in `grep` and file-edit tools, frequently ignoring custom MCP search tools even when instructed in system prompts.
* **The Architectural Fix:** Enforce `whyline-mcp` deterministically via **Pre-Tool / Pre-Edit / Pre-Commit Hooks** that intercept file modifications automatically and play the **Gnani Timbre v2.5** warning out loud before the edit lands.

### 2.2 Line Numbers Drift; Pin to Normalized Tree-sitter AST Hashes
* **Initial Assumption:** Pinning voice notes to `(file_path, start_line, end_line)` is sufficient.
* **What We Learned:** Adding ten lines of imports or running a code formatter shifts line numbers and orphans margin pins (**Pin Drift**).
* **The Architectural Fix:** Anchor every pin and fence to a normalized **Tree-sitter AST Signature Hash** ($\text{SHA256}(\text{FilePath} :: \text{Class} :: \text{Method} :: \text{Params})$) and use **Supabase (`pgvector` HNSW + PostgreSQL `tsvector` FTS)** with Reciprocal Rank Fusion (RRF) for single-round-trip hybrid retrieval.

### 2.3 Measured Honesty Beats Inflated Unverified Metrics
* **What We Learned:** Presenting design target benchmarks (`86%` Top-1, `0.88` Macro-F1) as if they were already measured production scores undermines engineering credibility with judges and senior reviewers.
* **The Fix:** Clearly separate *Design Target Benchmarks* from *Measured Evaluation Results*, and maintain a live `.whyline/scorecard.json` reporting exact empirical outcomes on seeded test cases (e.g., *"Blocked 9 of 10 naive agent edits across 10 seeded workarounds"*).

---

## 3. Frontend Design & UX Audit Learnings (Cream-and-Olive Field-Report System)

### 3.1 Calm Paper-and-Olive Beats Neon SaaS Chrome for High-Trust Operations
* **Audit Discovery:** Standard dark/neon dashboards with glassmorphism, drop shadows, and glowing charts create visual fatigue and obscure critical operational alerts. Furthermore, the audited codebase contained competing palettes (`#FFFFFF`, `#000000`, `#485C11`), undefined legacy tokens (`--line`, `--muted`, `--border-default`), unpadded `.card` containers, and a dual mobile navigation collision (drawer + bottom bar overlapping floating chat/toast controls).
* **Design Resolution:**
  1. **Repair Before Decoration:** Fix mobile drawer/bottom-bar conflicts, standardize `.card` insets (`24px` desktop / `16px` mobile), and alias legacy tokens before adding any photography.
  2. **Warm Paper & Olive Ink:** Use `#FDFBD4` base paper, `#FFFEF0` flat cards, `#545333` olive accents, `Crimson Text 400` editorial headers, `DM Sans` UI controls, and `DM Mono 400/500` tabular numerals (`tabular-nums`).
  3. **Factual Imagery & Non-Color-Alone Status:** Never place charts over photographs, never duotone factual crop/code health evidence, label any non-user stock photo as `'Illustrative image'`, and always render status as `Color Token + Phosphor Icon + Explicit Word`.