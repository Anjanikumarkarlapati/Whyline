# WhyLine Studio

> **Guard the unwritten "why" behind code.**  
> AST Anomaly Detection, Multilingual Spoken Fences (Gnani Prisma & Timbre), and Model Context Protocol (MCP) Pre-Commit Interception.

---

## 🌟 Overview

Developers spend hours debugging and preserving fragile, undocumented workarounds (e.g., timing delays, retry counts, relaxed TLS handshakes). When AI coding agents (such as Claude Code or Cursor) or new team members refactor this code, they silently strip these workarounds—causing production regressions.

**WhyLine Studio** bridges this gap:
1. **AST Anomaly Detection**: Parses codebases to detect suspicious patterns (`MAGIC_LITERAL_CONTROL_FLOW`, `EXPLICIT_THREAD_HALT`, `VALIDATION_BYPASS`, `SWALLOWED_EXCEPTION`).
2. **Spoken Fences & Provenance Mining**: Extracts historical git blame, PR context, and allows engineers to attach 10-second voice postmortems in English, Telugu, or Hindi (via Gnani Vachana AI).
3. **Model Context Protocol (MCP) Server**: Intercepts automated agent edits and git commits before they are finalized. Rejects changes that violate active fences.
4. **Architectural Co-Pilot**: Voice-to-voice and text query interface powered by Supabase pgvector hybrid Reciprocal Rank Fusion (RRF), delivering strategies to crack bugs safely.

---

## 🏛️ Architecture & Visual System

WhyLine Studio features an **architecture-studio aesthetic**:
- **Design Tokens**: Warm canvas (`#F7F4EC`), crisp surface (`#FCFAF5`), deep ink (`#1B1A16`), and muted olive accents (`#4A4A2A`).
- **Dark Mode**: High-contrast, calm dark theme (`#151510` canvas, `#1D1D16` surface, `#ECE8DA` ink).
- **Accessibility**: 100% WCAG 2.2 AA compliant contrast ratios across all elements, `aria-live` voice indicators, and keyboard accessibility.
- **Visual Design**: Strict 1200px container, zero decorative fluff, 44px min touch targets, and inline mono code rendering.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- (Optional) Supabase project & Gnani Vachana API key (runs seamlessly in deterministic local fallback mode if omitted)

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/Anjanikumarkarlapati/Whyline.git
cd Whyline

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
- Side panel detailing the fence invariant, audio note player, and cutover conditions (e.g. `gateway.version == 'v2'`).

### 3. Incidents & Dead-End Memory (`/incidents`)
- PagerDuty/webhook postmortem simulator.
- `whyline pause` git branch checkpointing: record ruled-out dead ends so engineers switching branches never repeat failed attempts.
- AI Silent Assumption Ledger tracking MCP pre-commit verifications.

### 4. Voice Co-Pilot & 3-Strategy Planner (`/copilot`)
- Ask questions about the codebase via speech or text.
- Returns spoken briefings, recommended code patches, and 3 ranked architectural strategies with visual risk meters.

### 5. Deterministic MCP Server (`mcp/whyline_mcp.py`)
- Standard Model Context Protocol interface for AI coding agents:
  - `check_diff`: Validates proposed diffs against AST fences and rejects edits breaking active invariants.
  - `query_fences`: Exposes fences and historical reasons to the model's tool context.

---

## 🧪 Testing & Verification

Run the comprehensive test suite:

```bash
# Run backend tests
python -m pytest tests/ -v

# Run design token & contrast verification
python scripts/audit_design_system.py
python scripts/verify_contrast_and_a11y.py

# Build frontend production bundle
cd frontend && npm run build
```

---

## 🔒 Security & Privacy

- All sensitive keys (`GNANI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`) are configured through `.env` and are strictly excluded from source control.
- Deterministic sandbox fallbacks ensure full offline local development without external API exposure.

---

## 📄 License

MIT License. Designed and engineered for resilient software architectures.
