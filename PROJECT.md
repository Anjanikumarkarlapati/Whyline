# Project: WhyLine — Voice-Native Codebase Guard & Spoken Fence Compiler

## Architecture
WhyLine is a voice-native codebase guardrail, spoken fence compiler, and whole-repo strategy co-pilot.
It comprises 4 tightly integrated subsystems:
1. **Database & Knowledge Store**: PostgreSQL 16 with `pgvector`, HNSW and GIN indexes, Reciprocal Rank Fusion (RRF) single-round-trip search joining AST nodes and voice pins (`match_whyline_code_and_fences`).
2. **Backend Engine & Speech Bridge**: Tree-sitter AST anomaly scanner (Java & Python, 5 patterns, 0 false positives on CRUD), Gnani Speech Client (`backend/services/gnani_client.py` for Prisma v2.5 STT & Timbre v2.5 TTS), and Dual-Source Hybrid RAG service (`backend/services/rag_service.py` with `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, pgvector RPC, and `gemini-2.5-flash` via `google-genai` SDK).
3. **MCP Server & Invariant Compiler**: FastMCP server (`mcp/whyline_mcp.py`) exposing `check_fences`, `verify_diff_against_fences`, `log_or_resume_context`, deterministic pre-commit hook aborting on naive edits, and test compiler (`backend/services/test_compiler.py`) producing runnable JUnit 5 and Pytest invariant suites.
4. **Frontend Studio**: React 18 + Vite studio strictly adhering to the Cream-and-Olive Field-Report palette (#FDFBD4 base, #FFFEF0 surface, #545333 olive ink, #D9D7B6 border; 0 box shadows, 0 glassmorphism, Hallmark compliant). Features Monaco Editor displaying `GatewayRouter.java` with gutter decorations on lines 5–15, slide-over "Ask the Repo" drawer with push-to-talk audio recording and real-time playback, and live telemetry Scorecard widget.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database Schema & Migration | `backend/migrations/01_init.sql` with pgvector, `ast_nodes`, `voice_pins`, HNSW on `code_embedding`, GIN on `fts` | M1 | ORIGINAL_REQUEST R1 |
| 2 | RRF RPC Function | `match_whyline_code_and_fences` PostgreSQL function performing RRF between FTS and cosine similarity, joining voice pins | M1 | ORIGINAL_REQUEST R1 |
| 3 | Tree-sitter AST Anomaly Detector | Java & Python AST anomaly detector flagging 5 patterns (magic numbers, thread sleep, swallowed catch, validation bypass, revert commit) with 0 CRUD false positives | M2 | ORIGINAL_REQUEST R2 |
| 4 | Gnani Speech Client | `backend/services/gnani_client.py` supporting Prisma v2.5 STT (REST/WebSocket Indic code-mixed transliteration) & Timbre v2.5 TTS (voices Nalini/Pranav, 16kHz linear_pcm WAV) | M2 | ORIGINAL_REQUEST R2 |
| 5 | Dual-Source Hybrid RAG Service | `backend/services/rag_service.py` using multilingual MiniLM-L12-v2, calling `match_whyline_code_and_fences`, and prompting `gemini-2.5-flash` via `google-genai` SDK returning structured JSON (`spoken_reply` + 3 ranked strategies) | M2 | ORIGINAL_REQUEST R2 |
| 6 | FastMCP Server | `mcp/whyline_mcp.py` exposing tools `check_fences`, `verify_diff_against_fences`, `log_or_resume_context`, `get_fence_audio` cross-referencing `.whyline/fences.json` | M3 | ORIGINAL_REQUEST R3 |
| 7 | Deterministic Pre-Commit Hook | `.git/hooks/pre-commit` template triggering anomaly checks on staged files and halting commit on violations | M3 | ORIGINAL_REQUEST R3 |
| 8 | Invariant Test Compiler | `backend/services/test_compiler.py` compiling voice constraints into executable JUnit 5 and Pytest suites failing on naive edits and passing on guarded code | M3 | ORIGINAL_REQUEST R3 |
| 9 | Seeded Demo Repository Scaffolding | `demo/HealthConnect/` scaffolding containing `GatewayRouter.java` (5x retry, midnight drop workaround), `.whyline/fences.json`, and `.whyline/scorecard.json` | M3 | ORIGINAL_REQUEST R4 |
| 10 | Monaco Code Studio | Monaco Editor displaying `GatewayRouter.java` with gutter pin decorations on lines 5–15 | M4 | ORIGINAL_REQUEST R4 |
| 11 | Push-to-Talk Slide-Over Drawer | "Ask the Repo" slide-over drawer with Web Audio / MediaRecorder capture and real-time audio playback | M4 | ORIGINAL_REQUEST R4 |
| 12 | Live Scorecard Widget | Widget displaying live telemetry counters (`total_seeded_anomalies: 10`, `hard_blocked_edits: 7`, etc.) | M4 | ORIGINAL_REQUEST R4 |
| 13 | Cream-and-Olive Design System & Hallmark Floor | Strict palette conformance (#FDFBD4, #FFFEF0, #545333, #D9D7B6), zero box-shadows, zero literal hex in JSX, passing `scripts/audit_design_system.py` and `sloplint.mjs` | M4 | ORIGINAL_REQUEST R4 |
| 14 | E2E Testing Suite & Invariant Verification | Full regression suites (`backend/tests/test_whyline_engine.py`, `demo-repos/HealthConnect/tests/test_whyline_invariants.py`, `scripts/audit_design_system.py`, Tiers 1-4) | M5 | Verification Resources |
| 15 | Adversarial Coverage Hardening | Tier 5 adversarial testing with white-box edge case probing and fence boundary stress testing | M5 | Verification Resources |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Database & Migrations | Create `backend/migrations/01_init.sql` with pgvector, `ast_nodes`, `voice_pins`, HNSW & GIN indexes, and joined RRF function `match_whyline_code_and_fences`. | none | DONE |
| 2 | Backend Core Services | Implement Tree-sitter AST anomaly detector, `backend/services/gnani_client.py` (Prisma v2.5 STT & Timbre v2.5 TTS), and `backend/services/rag_service.py` (MiniLM + pgvector RPC + `gemini-2.5-flash` JSON output). | M1 | DONE |
| 3 | MCP Server & Invariants | Implement `mcp/whyline_mcp.py` FastMCP server, `backend/services/test_compiler.py` (JUnit 5 & Pytest compiler), `.git/hooks/pre-commit` hook enforcer, and scaffold `demo/HealthConnect/`. | M2 | DONE |
| 4 | Frontend Studio & Design | Implement Monaco Code Studio with gutter pins, push-to-talk slide-over drawer, standalone Scorecard widget, strict Cream-and-Olive compliance, and verify `npm run build`. | none | DONE |
| 5 | E2E Testing & Hardening | Pass 100% of E2E test suite (Tiers 1-4: engine tests, invariant tests, design audit) + Tier 5 adversarial hardening and forensic audit. | M1, M2, M3, M4 | DONE |

## Interface Contracts

### M1 ↔ M2: Database Schema & RPC
- **Tables**:
  - `ast_nodes(id uuid, file_path text, symbol_name text, raw_code text, ast_signature_hash text, fts tsvector, code_embedding vector(384))`
  - `voice_pins(id uuid, ast_node_id uuid, author_handle text, verification_status text, transcript_raw text, constraint_summary text, expiry_condition jsonb, transcript_embedding vector(384))`
- **Function**:
  - `match_whyline_code_and_fences(query_text text, query_embedding vector(384), match_count int, rrf_k int)`
  - Returns table of joined `ast_nodes` and `voice_pins` ordered by `rrf_score DESC`.

### M2 ↔ M3: Speech Bridge, Scanner & Test Compiler
- `GnaniSpeechClient`:
  - `transcribe(audio_bytes: bytes, language: str) -> dict`
  - `synthesize(text: str, voice: str, language: str) -> dict` (returns 16kHz linear_pcm WAV path/URL)
  - `rescore_ast_vocabulary(transcript: str, symbols: list[str]) -> str`
- `AstAnomalyScanner`:
  - `scan_file(path: Path) -> list[AstAnomaly]` (produces `ast_signature_hash`, `anomaly_type`, `line_start`, `line_end`)
- `TestCompiler`:
  - `generate_junit_test(fence: dict, repo_dir: Path) -> str`
  - `generate_pytest_test(fence: dict, repo_dir: Path) -> str`
  - `evaluate_expiry(fence: dict, config_path: Path) -> bool`

### M3 ↔ M4: MCP Server, Local State & Frontend
- Local Ledger Files (`.whyline/` in repo root and demo dirs):
  - `.whyline/fences.json`: Array of active and historical fences with `ast_signature_hash`, `matched_token`, `transcript_raw`, `audio_url`.
  - `.whyline/scorecard.json`: Telemetry counters: `total_seeded_anomalies`, `hard_blocked_edits`, `cautionary_historical_intercepts`, `routine_crud_false_positives`.
- REST / WebSocket Endpoints (proxied via Vite `/api`):
  - `GET /api/fences`: Returns active and historical fences.
  - `GET /api/briefing`: Returns summary KPIs and scorecard telemetry.
  - `POST /api/copilot/ask`: Accepts query/audio, returns `spoken_reply`, `rrf_matches`, and 3 ranked strategies.
  - `GET /api/audio/{filename}`: Streams 16kHz WAV audio.

## Code Layout
- `backend/`
  - `migrations/`
    - `01_init.sql` (PostgreSQL 16 pgvector DDL & RRF function)
  - `services/`
    - `gnani_client.py` (Prisma STT + Timbre TTS client)
    - `rag_service.py` (MiniLM + pgvector RPC + Gemini 2.5 Flash RAG)
    - `test_compiler.py` (JUnit 5 & Pytest invariant compiler)
  - `whyline/` (Core engine, compatibility re-exports, scanner, store)
  - `tests/`
    - `test_whyline_engine.py` (Engine verification suite)
- `mcp/`
  - `whyline_mcp.py` (FastMCP server)
- `scripts/`
  - `audit_design_system.py` (Strict Cream-and-Olive design auditor)
  - `seed_healthconnect.py` (Demo repos seeder)
  - `hooks/pre-commit` (Pre-commit hook template)
- `demo/HealthConnect/` & `demo-repos/HealthConnect/`
  - `src/main/java/.../GatewayRouter.java` (5x retry, midnight drop workaround)
  - `.whyline/fences.json` (Telugu voice ADR transcripts)
  - `.whyline/scorecard.json` (Live telemetry counters)
  - `tests/test_whyline_invariants.py` (Pytest invariant regression tests)
- `frontend/`
  - `src/`
    - `components/`
      - `MonacoCodeStudio.jsx` (Monaco Editor with gutter pin decorations)
      - `AskRepoDrawer.jsx` (Push-to-talk slide-over drawer & audio player)
      - `ScorecardWidget.jsx` (Live telemetry scorecard)
      - `Layout.jsx`, `StatusBadge.jsx`, etc.
    - `styles.css` (Strict Cream-and-Olive tokens, Hallmark floor)
