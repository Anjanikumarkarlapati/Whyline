# WhyLine Studio

> **Guard the unwritten "why" behind code.**  
> AST Anomaly Detection, Multilingual Spoken Fences (Gnani Prisma & Timbre), and Model Context Protocol (MCP) Pre-Commit Interception.

---

## 🌟 Overview

Developers spend hours debugging and preserving fragile, undocumented workarounds (e.g., timing delays, retry counts, relaxed TLS handshakes). When AI coding agents (such as Claude Code or Cursor) or new team members refactor this code, they silently strip these workarounds—causing production regressions.

**WhyLine Studio** bridges this gap:
1. **AST Anomaly Detection**: Parses codebases to detect suspicious patterns (`MAGIC_LITERAL_CONTROL_FLOW`, `EXPLICIT_THREAD_HALT`, `VALIDATION_BYPASS`, `SWALLOWED_EXCEPTION`).
2. **Spoken Fences & Provenance Mining**: Extracts historical git blame, PR context, and allows engineers to attach 10-second voice postmortems in English, Telugu, or Hindi.
3. **Model Context Protocol (MCP) Server**: Intercepts automated agent edits and git commits before they are finalized. Rejects changes that violate active fences.
4. **Architectural Co-Pilot**: Voice-to-voice and text query interface powered by hybrid Reciprocal Rank Fusion (RRF), delivering strategies to crack bugs safely.

---

## 🏛️ Architecture & Visual System

WhyLine Studio features an **architecture-studio aesthetic**:
- **Design Tokens**: Cream canvas (`#FDFBD4`), crisp surface (`#FFFEF0`), olive ink (`#545333`), and raised surface (`#F2F0CA`).
- **Dark Mode**: High-contrast, calm dark theme (`#1C1C10` canvas, `#25251A` surface, `#FDFBD4` ink).
- **Accessibility**: 100% WCAG 2.2 AA compliant contrast ratios across all elements, `aria-live` voice indicators, and keyboard accessibility.
- **Visual Design**: Strict 1200px container, zero decorative fluff, 44px min touch targets, and inline mono code rendering.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ & npm

### Development Server

```bash
# Install dependencies
npm install

# Start Vite development server on port 3000
npm run dev
```

App is accessible at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run preview
```

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

### 5. Interactive Git Architecture Flowchart (`/git`)
- Directed flowchart graph visualizer with 5 architectural stages.
- Multilingual synchronized step-by-step voice narration in Telugu, Hindi, or English.
