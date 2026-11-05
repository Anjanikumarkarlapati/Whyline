# WhyLine Studio

> **Guard the unwritten "why" behind code.**  
> AST Anomaly Detection, Multilingual Spoken Fences (Gnani Prisma & Timbre), and Model Context Protocol (MCP) Pre-Commit Interception.

[![Security Audit Passed](https://img.shields.io/badge/Security%20Audit-Zero%20Secrets%20Passed-brightgreen.svg)](#-security--privacy)
[![WCAG 2.2 AA](https://img.shields.io/badge/A11y-WCAG%202.2%20AA%20Verified-brightgreen.svg)](#-architecture--visual-system)
[![Gnani Vachana AI](https://img.shields.io/badge/Voice%20Stack-Gnani%20Prisma%20%26%20Timbre-blue.svg)](#-multilingual-voice-pipeline-gnani-ai)
[![Eval Accuracy](https://img.shields.io/badge/Benchmark-100%25%20Accuracy%20(24%2F24)-success.svg)](#-guard-quality--benchmark-evaluation-evalmd)

**GitHub Repository**: [https://github.com/Anjanikumarkarlapati/Whyline](https://github.com/Anjanikumarkarlapati/Whyline)

---

## 🌟 Overview

Developers spend hours debugging and preserving fragile, undocumented workarounds (e.g., timing delays, retry counts, relaxed TLS handshakes). When AI coding agents (such as Claude Code or Cursor) or new team members refactor this code, they silently strip these workarounds—causing production regressions.

**WhyLine Studio** bridges this gap:
1. **AST Anomaly Detection**: Parses codebases to detect suspicious patterns (`MAGIC_LITERAL_CONTROL_FLOW`, `EXPLICIT_THREAD_HALT`, `VALIDATION_BYPASS`, `SWALLOWED_EXCEPTION`).
2. **Spoken Fences & Provenance Mining**: Extracts historical git blame, PR context, and allows engineers to attach 10-second voice postmortems in English, Telugu, or Hindi (via Gnani Vachana AI).
3. **Model Context Protocol (MCP) Server**: Intercepts automated agent edits and git commits before they are finalized. Rejects changes that violate active fences.
4. **Architectural Co-Pilot**: Voice-to-voice and text query interface powered by Supabase pgvector hybrid Reciprocal Rank Fusion (RRF), delivering strategies to crack bugs safely.

---

## 🔒 Security & Privacy

WhyLine is built with an enterprise-grade **Zero-Secret Guarantee** to prevent private keys, authentication tokens, and credentials from leaking into source control:

### 1. Automated Secret Scanning (`scripts/scan_secrets.py`)
- Runs automatically on every `git commit` via pre-commit hooks and CI sweeps across all repository files.
- Inspects high-entropy token signatures including:
  - Google API Keys & Gemini Developer Studio Keys (`AIza...`, `AQ....`)
  - Gnani Vachana Production Tokens (`vach_...`)
  - Supabase Service Role and Publishable Keys (`sb_secret_...`, `sb_publishable_...`)
  - GitHub Personal Access Tokens (`ghp_...`, `github_pat_...`)
  - Anthropic / OpenAI Secret Keys (`sk-...`)
  - AWS Access Keys (`AKIA...`)
  - RSA / EC / OpenSSH Private Keys (`-----BEGIN ... PRIVATE KEY-----`)
  - Hardcoded production webhook secrets
- Run audit manually anytime:
  ```bash
  python scripts/scan_secrets.py --all
  ```
  *(Expected Output: `[WhyLine Secret Scan] All checks passed. Zero secrets detected.`)*

### 2. Strict Ignored Credentials & Files (`.gitignore`)
- All `.env`, `*.env`, `.env.local`, `*.pem`, `*.key`, `*.cert`, and `*.p12` certificates are strictly excluded from git.
- Only `.env.example` is committed, providing safe dummy placeholder keys (`your-gnani-vachana-api-key`, `your-supabase-service-role-secret-key`, `your-random-webhook-secret-here`).
- Personal office documents (`*.xlsx`, `*.docx`, `*.doc`) and scratch output directories (`outputs/`, `tmp_test/`) are excluded from tracking.

### 3. Isolated Sandbox Fallbacks
- When `GNANI_API_KEY`, `GEMINI_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` are unset, WhyLine operates 100% offline using deterministic local PCM audio synthesis and in-memory AST Reciprocal Rank Fusion (RRF) search with zero network leakage.

---

## 🎙️ Multilingual Voice Pipeline (Gnani AI)

WhyLine features synchronized speech-to-text (STT) and text-to-speech (TTS) via **Gnani Vachana AI**:

### 1. Language-to-Voice Model Linkage
Switching the UI language automatically switches the dedicated neural voice model:
| Language | Locale | Voice Model | Persona | Quality |
|---|---|---|---|---|
| **English** | `en-IN` | **Pranav** | Male • Authoritative | 16kHz linear_pcm WAV |
| **Telugu** | `te-IN` | **Nalini** | Female • Crisp Timbre | 16kHz linear_pcm WAV |
| **Hindi** | `hi-IN` | **Bhavna** | Female • Articulate Neural | 16kHz linear_pcm WAV |

### 2. AST Vocabulary Rescorer
Code-mixed speech often misrecognizes programming terms. WhyLine's phonetic rescorer intercepts live STT output and restores exact CamelCase/snake_case code symbols:
- Spoken *"gateway router dot java"* $\rightarrow$ `GatewayRouter.java`
- Spoken *"రీట్రై కౌంట్"* / *"रिट्राई काउंट"* $\rightarrow$ `retryCount`
- Spoken *"టైమౌట్ మిల్లీసెకన్లు"* $\rightarrow$ `timeoutMs`
- Spoken *"అప్లికేషన్ వై ఎమ్ ఎల్"* $\rightarrow$ `application.yml`

### 3. Interactive Audio Waveform (`AudioWaveform.jsx`)
- 36-bar acoustic spectrum displaying real-time recording energy.
- Interactive click-and-drag scrubber with playhead tracker and timestamp tooltip.
- Accessible keyboard navigation (`Space`/`Enter` play toggle, `Left`/`Right` arrow keys for 1-second seeking).

---

## 🏛️ Architecture & Visual System

WhyLine Studio implements an **architecture-studio field report aesthetic**:
- **Design Tokens**: Warm canvas (`#FDFBD4`), crisp surface (`#FFFEF0`), deep ink (`#2A2919`), and muted olive accents (`#545333`).
- **L2 Floating Glass**: Topbar, navigation sheets, dialog modals, and footer feature `backdrop-filter: blur(14px) saturate(140%)` with top highlights and edge hairlines.
- **3D Depth & Embossing**:
  - **L1 Card**: Solid surface with 1px top highlight and soft two-layer shadows.
  - **L3 Well (Deboss)**: Code containers and waveform tracks with inner shadows and bottom catch-light bevels.
  - **Raised-Cap Controls**: Buttons and filter chips with 1px top highlight, 2px bottom lip, 1px hover lift, and 1px active sink.
- **Accessibility & Contrast**: 100% WCAG 2.2 AA compliant contrast ratios across light and dark modes (`scripts/verify_contrast_and_a11y.py` $\rightarrow$ 18/18 PASS).

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- (Optional) Gnani Vachana API key & Supabase project

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/Anjanikumarkarlapati/Whyline.git
cd Whyline

# Copy safe environment configuration
cp .env.example .env

# Install backend dependencies
pip install fastapi uvicorn pydantic tree-sitter tree-sitter-java requests python-dotenv

# Run backend API server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be live at `http://127.0.0.1:8000`.

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Frontend will be accessible at `http://localhost:5173`.

---

## 📡 Core Capabilities

### 1. Spoken Fences Ledger (`/fences`)
- View AST anomalies across repositories.
- Inspect why a fence exists with recorded reasons, origin PR/commits, and audio postmortems.
- Run 10-second multilingual voice confirmations (English, Telugu, Hindi).

### 2. Protected Code Studio (`/studio`)
- Integrated Monaco Editor with gutter fence pins marking protected code regions.
- Developer Guide callout explicitly explaining guarded source visibility and invariant rationale.
- Interactive Audio Waveform player for Spoken ADRs.

### 3. Incidents & Dead-End Memory (`/incidents`)
- PagerDuty/webhook postmortem simulator.
- `whyline pause` git branch checkpointing: record ruled-out dead ends so engineers switching branches never repeat failed attempts.
- AI Silent Assumption Ledger tracking MCP pre-commit verifications.

### 4. Voice Co-Pilot & 3-Strategy Planner (`/copilot`)
- Ask questions about the codebase via speech or text.
- Returns spoken briefings, recommended code patches, and 3 ranked architectural strategies with visual risk meters.

### 5. Deterministic MCP Server (`mcp/whyline_mcp.py`) & CLI Fallback
- Standard Model Context Protocol interface for AI coding agents (`check_fences`, `verify_diff_against_fences`, `log_or_resume_context`, `get_fence_audio`).
- CLI fallback for non-MCP environments: `whyline check <diff_file>` or `whyline check -` (reads unified diff from stdin).
- Diff-aware guardrail: blocks only when the diff modifies fenced lines or violates invariant tokens, allowing whitespace, comments, renamed variables outside invariants, and safe code relocations.

---

## 📊 Guard Quality & Benchmark Evaluation (`EVAL.md`)

- **Total Labeled Cases**: 24 (12 Must-Block, 12 Must-Pass across Java & Python)
- **Precision**: **100.0%** (0 false blocks on routine edits)
- **Recall**: **100.0%** (Catches 100% of naive workaround removals)
- **False-Positive Rate**: **0.0%**
- **Accuracy**: **100.0%**
- **Evaluation Runner**: `python backend/eval/run_eval.py`

---

## 🧪 Testing & Verification

Run the comprehensive test suite:

```bash
# 1. Run backend invariant & engine tests
python -m pytest tests/ -v
python -m pytest backend/tests/test_whyline_engine.py

# 2. Run secret scan & security audit
python scripts/scan_secrets.py --all

# 3. Verify Gnani Speech live STT & TTS pipeline
python scripts/probe_gnani.py
python scripts/verify_voice_accuracy.py

# 4. Verify design tokens & accessibility contrast
python scripts/audit_design_system.py
python scripts/verify_contrast_and_a11y.py

# 5. Build frontend production bundle
cd frontend && npm run build
```

---

## 📄 License

MIT License. Designed and engineered for resilient software architectures.
