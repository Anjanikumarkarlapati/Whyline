# Product Requirements Document (PRD): WhyLine

**Product Name:** WhyLine — Voice ADRs, Spoken Fences, Predictive Code Guard & Whole-Repo Voice Co-Pilot  
**Built For:** The Great Indian AI Internship Challenge by Gnani.ai (Deadline: November 10, 2026, 11:59 PM IST)  
**Powered By:** Gnani Vachana Speech Stack (`Prisma v2.5 STT`, `Timbre v2.5 TTS`, `Gnani Voice Cloning API`)  
**Frontend Aesthetic Direction:** Calm Cream-and-Olive Engineering Field Report & Codebase Archaeology Ledger  
**Demo Target Repository:** `HealthConnect` (containing shader workarounds, payment gateway routing, and authentication filters)

---

## 1. Executive Summary & Product Evolution

Software engineering teams lose substantial productivity to **Chesterton's Fence**: developers hesitate to refactor or delete brittle code because the original rationale is missing, and AI coding agents routinely break production by "cleaning up" load-bearing workarounds they do not understand.

Across iterative design and research synthesis, WhyLine evolved through four phases to close real-world adoption, cold-start, and visual usability gaps:

1. **Phase 1 — Passive Voice ADRs at Merge Time:** Captures a 20-second voice note in the developer's native thinking language (Telugu-English / Tenglish, Hinglish, Kanglish, English) when a Pull Request merges, linking it to diff hunks and visualizing repository bus-factor via a Dark Code map.
2. **Phase 2 — Predictive Guard & Whole-Repo Voice Strategy Co-Pilot:** Solves **Pin Drift** via Tree-sitter AST hashing, predicts Pre-PR constraint violations using tabular machine learning (ML #3), generates safe refactoring plans (ML #4), and solves the **Day-0 Cold-Start Onboarding Problem** by indexing entire GitHub repositories into Supabase (`pgvector`) for interactive voice Q&A and 3-option architectural strategy generation (ML #5).
3. **Phase 3 — Anomaly-Triggered "Spoken Fences" & Shared Developer Memory Core:** Solves **Ritual Notification Fatigue** (since ~80% of commits are routine CRUD/UI updates) and **Dashboard Friction** (since developers live inside IDE terminals and AI coding agents). Prompts fire *only* on the ~10% of commits containing suspicious AST anomalies, compiling a 15-second voice note into a 3-part living **Spoken Fence**: an MCP agent guardrail enforced by pre-edit hooks, an executable CI invariant test, and a machine-checkable expiration trigger. Extends the same voice-memory core to **Dead-End Memory**, **Resume Context**, **Voice Walkthrough PRs**, **Assumption Ledgers**, and **First-PR Guides**.
4. **Phase 4 — Recover-First Archaeology, Incident-First Capture & Field-Report UI Redesign:** Solves **Human Origination Dependency** on legacy codebases where authors have departed or skip recording, **Sanitized Git History**, and **Environment/Config Drift**. Automatically mines `git blame`, PR review comments, linked issues, and reverts to draft candidate fences with provenance (`PENDING_CONFIRMATION` or `UNVERIFIED_HISTORICAL`), requiring only a 10-second binary voice confirmation (*"avunu, correct"*). Simultaneously redesigns the web studio away from generic neon SaaS dashboards into a calm, high-contrast **Cream-and-Olive Field Report** (`#FDFBD4` paper, `#545333` olive ink, `Crimson Text` editorial headers, `DM Sans` UI, and `DM Mono` telemetry).

---

## 2. Empirical Problem Validation & Secondary Research Synthesis

WhyLine's product requirements are grounded in published industry surveys (Stack Overflow Developer Survey 2024/2025, Atlassian Developer-Experience Survey, and Chainguard 2026 Engineering Reality Report):

* **Technical Debt & Missing "Why":** Technical debt is the top developer friction point at **59%** (Atlassian) and top workplace frustration at **63%** (Stack Overflow), followed by insufficient documentation at **41%**, with **69%** of developers losing $8+$ hours per week to inefficiencies. In Chainguard's 2026 report, **66%** frequently encounter delivery-blocking tech debt, spending only **16%** of their week building new features while **79%** cite code maintenance as a major drain.
* **The AI Trust & Verification Gap:** **66%** of developers cite *"AI solutions that are almost right, but not quite"* as their #1 frustration, followed by debugging AI-generated code taking longer than expected (**45%**). Only **29%** believe AI tools can handle complex problems (down from **35%**), overall accuracy trust is **33%** (**2.6%** high trust vs. **20%** high distrust among experienced devs), and **75.3%** still ask another human when they do not trust AI output.
* **Context Switching & Tool Sprawl:** **54%** of developers juggle $6+$ tools daily, **88%** report tool-switching hurts productivity, and **44%** report significant loss of focus.
* **Knowledge Concentration:** Critical modules and deployment quirks are frequently understood by a single senior engineer, creating severe bus-factor risk.

---

## 3. Core Functional Requirements

### 3.1 Recover-First, Confirm-by-Voice Archaeology Pipeline
1. **AST Anomaly Detection:** Scans existing files and incoming `git diff` hunks via Tree-sitter for 5 high-suspicion patterns:
   * Arbitrary numeric literals in control flow, retry loops, or timeouts (`retryCount = 5`, `timeout = 4500`).
   * Explicit thread halts (`Thread.sleep()`, `time.sleep()`, `setTimeout()`, `asyncio.sleep()`).
   * Swallowed or abnormal `catch` blocks (`catch (Exception e) {}`).
   * Bypassed security or validation checks (`verify=False`, `TrustAllCerts`, `@SuppressWarnings`).
   * Revert commits (`^Revert ".*"` or diffs negating a commit from the prior 14 days).
2. **Historical Provenance Mining:** Traverses `git blame -L <start>,<end> -w -C -C`, commit messages, trailers (`Co-authored-by`, `Fixes:`), GitHub PR descriptions, inline review comments, and linked Issue/Jira keys (`#104`, `INC-9921`). Gracefully falls back to local `git log` in **Local Sandbox Mode** when scanning external public repositories without admin permissions or when `GITHUB_TOKEN` is rate-limited.
3. **10-Second Voice Confirmation vs. Ghost Author Handling:**
   * **Active Author Present:** Prompts via **Gnani Timbre v2.5** and captures a 10-second confirmation via **Gnani Prisma v2.5** (or a 1-line text fallback for quiet open offices), upgrading the fence to `VERIFIED_ACTIVE`.
   * **Author Departed:** Marks the fence `UNVERIFIED_HISTORICAL` with explicit provenance links and confidence level (`HIGH`, `MEDIUM`, `LOW`).

### 3.2 Incident-First Capture Strategy
* Listens to Slack / PagerDuty `Incident Resolved` webhooks and prompts the on-call engineer for a 15-second unfiltered post-mortem voice note, automatically linking it to the subsequent hotfix PR.

### 3.3 Spoken Fences (3-Part Living Lifecycle)
1. **Hook-Enforced MCP Guardrail (`whyline-mcp`):** Pairs MCP tools (`check_fences`, `get_fence_audio`, `verify_diff_against_fences`, `log_or_resume_context`) with deterministic Pre-Edit / Pre-Commit Git hooks so AI coding agents cannot bypass constraints using built-in `grep` or file-edit tools.
2. **Executable CI Invariant Test:** Compiles the spoken constraint into a runnable JUnit 5 or Pytest test file stored in the repository.
3. **Cross-Boundary Auto-Expiring Lifecycle (Code $\leftrightarrow$ Config):** Evaluates machine-checkable `expiry_condition` rules across both source ASTs and config/infrastructure files (`application.yml`, Terraform, Kubernetes YAML, schemas). Automatically transitions fences to `EXPIRED_SAFE_TO_REMOVE` and generates a cleanup diff when the condition is met.

### 3.4 Shared Voice-Memory Surfaces & Supabase Hybrid RAG
* **Dead-End Memory & Resume Context:** Captures 15–20 second branch checkpoints (`whyline pause`) tracking ruled-out debugging hypotheses vs. untested suspects, playing a 10-second **Gnani Timbre v2.5** briefing on `git checkout`.
* **Whole-Repo Voice Co-Pilot ("Ask the Repo"):** Uses **Supabase (`pgvector` HNSW + PostgreSQL `tsvector` FTS)** via the single-round-trip `match_whyline_code_and_fences` Reciprocal Rank Fusion (RRF) RPC function, **Gnani Prisma v2.5 WebSocket STT**, **Gemini 2.5 Flash / Groq Llama-3.3-70B**, **Gnani Timbre v2.5 TTS**, and **Gnani Voice Cloning (`speaker_embedding`)** to answer questions in voice and output 3 ranked problem-solving strategies.
* **Assumption Ledger & Voice Walkthrough PRs:** Surfaces silent AI agent assumptions alongside diffs and anchors 60-second voice walkthroughs to diff hunks.

---

## 4. Non-Functional & Frontend Field-Report Design Requirements

The frontend web studio (adapted for both **WhyLine Studio** and the **AgriTech React 18 / Vite 5** codebase) must strictly adhere to the **Cream-and-Olive Field-Report Design System**:

1. **Visual Identity:** Warm archival paper (`#FDFBD4`), flat cream cards (`#FFFEF0`), olive ink (`#545333`), deep charcoal-olive primary text (`#2A2919`), and warm near-black/khaki dark mode (`#1C1C12` / `#25251A`). Zero card shadows, zero neon green, zero purple gradients, and zero glassmorphism.
2. **Typography:** Self-hosted `DM Sans Variable` (400/500/600) for UI, `Crimson Text` (400 regular only) for editorial titles and KPI numbers, and `DM Mono` (400/500 only) for commit SHAs, AST hashes, sensor/device IDs, coordinates, timestamps, and exact readings, paired with script-appropriate fallbacks for Telugu, Hindi, and Punjabi.
3. **Mobile & Accessibility:** Single mobile navigation pattern below `768px` (accessible menu drawer with focus management, removing competing fixed bottom tabbars), $\ge 44\times 44\text{px}$ touch targets ($48\text{px}$ preferred on mobile), WCAG 2.2 AA contrast, explicit `color + Phosphor icon + word` status badges, and complete translation coverage.
4. **Honest Telemetry & Data Integrity:** Never invent confidence scores or present unmeasured ML targets as measured facts. Clearly distinguish measured/verified states, unverified historical reconstructions, simulated/demo mode, and AI-recommended strategies.