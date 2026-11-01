# TEST_INFRA — WhyLine End-to-End Test Infrastructure Specification

**Document Version:** 1.0.0  
**Status:** Active  
**Scope:** Whole-System Opaque-Box Verification of WhyLine (Database, AST Scanner, Speech Bridge, Hybrid RAG, MCP Server, Invariant Compiler, Seeded Demo Repos, Frontend Studio)  
**Author:** E2E Testing Track Lead (`teamwork_test_writer`)

---

## 1. Architecture & Testing Philosophy

WhyLine is an autonomous voice-native codebase guardrail, spoken fence compiler, and whole-repository strategy co-pilot. Because WhyLine operates as an active barrier against silent AI agent regressions and human error, its test suite must be **rigorous, deterministic, isolated, and completely opaque-box**.

### Core Guiding Principles
1. **Opaque-Box Verification**: Tests interact with WhyLine exclusively through external boundaries:
   - HTTP REST API endpoints (`/api/briefing`, `/api/fences`, `/api/copilot/ask`, `/api/audio/...`)
   - CLI and Git hook triggers (`python -m backend.whyline.cli_and_hooks check-staged`, `.git/hooks/pre-commit`)
   - FastMCP tool invocations (`check_fences`, `verify_diff_against_fences`, `log_or_resume_context`)
   - AST parser and invariant test generators (JUnit 5 and Pytest compilation)
   - DDL schema migrations (PostgreSQL 16 `01_init.sql` / pgvector syntax, tables, and RRF RPC functions)
   - Frontend styling rules and Hallmark design system floor audits
2. **Progressive Testability**: Each test can run standalone without requiring prior milestone executions or fragile global state.
3. **Strict Non-Facade Policy**: Zero tautological assertions (`assert True`), zero mock-bypass tests, and zero synthetic pass facades. Every test exercises real AST parsing, genuine audio file synthesis/validation, true diff verification, and real config evaluations.
4. **Adversarial Hardening**: The suite aggressively exercises edge cases, including corrupt audio byte streams, Unicode Indic text, Windows vs. POSIX path separators, line-drift across refactorings, and config flip-flops.

---

## 2. Directory Layout & Structure

All E2E test suites are located in `tests/e2e/`:

```
c:\Users\anjan\Downloads\Whyline\
├── TEST_INFRA.md                      # This infrastructure specification
├── TEST_READY.md                      # Test suite completion & readiness declaration
├── tests/
│   └── e2e/
│       ├── __init__.py                # Package marker
│       ├── conftest.py                # Shared fixtures (TestClient, temp repos, mock audio, clean state)
│       ├── test_tier1_features.py     # Tier 1: Feature Coverage (>=5 tests per feature across 8 areas)
│       ├── test_tier2_boundaries.py   # Tier 2: Boundary & Corner Cases (>=5 tests per feature across 8 areas)
│       ├── test_tier3_combinations.py # Tier 3: Cross-Feature Pairwise Pipelines (Multi-step workflows)
│       └── test_tier4_scenarios.py    # Tier 4: Real-World Incident Recreations (Healthcare incidents)
├── backend/
│   └── tests/
│       └── test_whyline_engine.py     # Core engine verification suite
├── demo-repos/
│   └── HealthConnect/
│       └── tests/
│           └── test_whyline_invariants.py # Invariant regression suite
└── scripts/
    └── audit_design_system.py         # Cream-and-Olive & Hallmark v2.0.0 design auditor
```

---

## 3. Test Tier Matrix & Coverage Breakdown

The E2E suite is partitioned into four hierarchical tiers:

| Tier | Focus | Minimum Count Requirement | Implemented Tests | Coverage Area |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | **Feature Coverage** | $\ge 5$ tests per feature (8 features) | **40 Tests** | Database, Scanner, Speech, RAG, MCP, Compiler, Demo, Frontend |
| **Tier 2** | **Boundary & Corner Cases** | $\ge 5$ tests per feature (8 features) | **40 Tests** | Empty inputs, corrupt audio, missing files, config flips, line-drift, Unicode/Indic |
| **Tier 3** | **Cross-Feature Combinations** | $\ge 8$ pairwise pipeline workflows | **8 Tests** | End-to-end multi-step pipelines (Speech $\to$ Compiler $\to$ Invariant; MCP $\to$ Git $\to$ Abort; RAG $\to$ RRF $\to$ Gemini) |
| **Tier 4** | **Real-World Scenarios** | $\ge 8$ end-to-end incident scenarios | **8 Tests** | Healthcare payment midnight drop, JWT clock skew, legacy HL7 SSL bypass, rural tablet DICOM, etc. |
| **Total** | **Comprehensive E2E Suite** | **$\ge 96$ Tests** | **96 Tests** | Full opaque-box coverage of WhyLine |

### Tier 1: Feature Coverage (8 Subsystems $\times 5$ Tests)
1. **Database Schema & Migration**:
   - `test_tier1_db_tables_and_columns`: Confirms `ast_nodes` and `voice_pins` tables declare required columns and types (`vector(384)`, `tsvector`, `uuid`).
   - `test_tier1_db_hnsw_and_gin_indexes`: Validates HNSW index on embeddings with `vector_cosine_ops` and GIN index on full-text search.
   - `test_tier1_db_rrf_function_contract`: Validates single-round-trip RRF function signature `match_whyline_code_and_fences`.
   - `test_tier1_db_foreign_key_and_cascade`: Validates foreign key constraints from `voice_pins(ast_node_id)` to `ast_nodes(id)` with cascading deletes.
   - `test_tier1_db_syntax_and_postgresql16_compliance`: Ensures DDL passes strict PostgreSQL 16 grammar parsing.
2. **AST Anomaly Scanner**:
   - `test_tier1_scanner_magic_numbers_in_loops`: Flags magic retry counters and timeout constants in loop/control flow.
   - `test_tier1_scanner_explicit_thread_sleeps`: Flags `Thread.sleep()` in Java and `time.sleep()` in Python.
   - `test_tier1_scanner_swallowed_catches`: Flags empty or log-free catch/except blocks.
   - `test_tier1_scanner_validation_bypasses`: Flags `@SuppressWarnings("deprecation")`, `verify = false`, and `TrustAllCerts`.
   - `test_tier1_scanner_zero_false_positives_on_crud`: Enforces zero false positives on routine CRUD services (`PatientProfileService.java`).
3. **Gnani Speech Bridge**:
   - `test_tier1_speech_ast_vocabulary_rescorer`: Verifies phonetic Indic mapping (`gateway router` $\to$ `GatewayRouter.java`, `retry count` $\to$ `retryCount`).
   - `test_tier1_speech_timbre_wav_generation`: Confirms Timbre v2.5 synthesis outputs valid 16kHz 16-bit mono PCM WAV audio.
   - `test_tier1_speech_audio_streaming_endpoint`: Verifies `GET /api/audio/{filename}` serves audio with HTTP 200 and `audio/wav` headers.
   - `test_tier1_speech_voice_confirmation_flow`: Tests `POST /api/fences/{id}/confirm` transitions status to `VERIFIED_ACTIVE`.
   - `test_tier1_speech_indic_code_mixing`: Verifies mixed Telugu/Hindi/English transcripts parse correctly without loss of symbols.
4. **Dual-Source Hybrid RAG**:
   - `test_tier1_rag_query_embedding_dimension`: Confirms dense vector generation produces exactly 384 dimensions.
   - `test_tier1_rag_rrf_single_round_trip`: Confirms hybrid RRF search completes in $< 50\text{ms}$ returning ranked matches.
   - `test_tier1_rag_copilot_structured_output`: Confirms `POST /api/copilot/ask` outputs `spoken_reply`, `strategies`, and `rrf_telemetry`.
   - `test_tier1_rag_three_ranked_strategies`: Confirms response contains exactly 3 ranked architectural strategies with confidence ratings.
   - `test_tier1_rag_offline_sandbox_resilience`: Verifies service succeeds with grounded fallback when cloud API keys are absent.
5. **FastMCP Server & Pre-Commit Hook**:
   - `test_tier1_mcp_check_fences_active_guard`: Verifies `check_fences` returns `REJECT_EDIT` for naive edits on active fences.
   - `test_tier1_mcp_check_fences_historical_warning`: Verifies `check_fences` returns `WARN_AND_REQUIRE_CONFIRMATION` on departed author code.
   - `test_tier1_mcp_verify_diff_logs_assumptions`: Verifies `verify_diff_against_fences` appends agent assumptions to `.whyline/assumptions.json`.
   - `test_tier1_mcp_dead_end_memory_checkpoint`: Confirms `log_or_resume_context` saves and retrieves branch dead-end checkpoints.
   - `test_tier1_mcp_scorecard_telemetry_increment`: Confirms intercepted edits increment live counters in `.whyline/scorecard.json`.
6. **Invariant Test Compiler**:
   - `test_tier1_compiler_junit5_artifact_generation`: Confirms generation of valid JUnit 5 `.java` test source.
   - `test_tier1_compiler_pytest_artifact_generation`: Confirms generation of valid runnable Pytest suite (`test_whyline_invariants.py`).
   - `test_tier1_compiler_guarded_code_passes`: Confirms invariant test assertions pass against guarded codebase.
   - `test_tier1_compiler_naive_edit_fails`: Confirms invariant test fails when guarded token is removed.
   - `test_tier1_compiler_cross_boundary_expiry_evaluation`: Confirms fence transitions to `EXPIRED_SAFE_TO_REMOVE` upon config change.
7. **Demo Repository Scaffolding**:
   - `test_tier1_demo_repo_structure_and_artifacts`: Validates `GatewayRouter.java`, `.whyline/fences.json`, and `.whyline/scorecard.json`.
   - `test_tier1_demo_gateway_router_source`: Validates 5x retry loop and midnight connection drop workaround in source code.
   - `test_tier1_demo_scorecard_metrics`: Validates telemetry fields (`total_seeded_anomalies: 10`, `prevention_rate_label`).
   - `test_tier1_demo_incident_postmortems`: Validates incident history records for INC-9921 and INC-9984.
   - `test_tier1_demo_git_history_and_authors`: Validates git commit log with historical author handles (`@anjani`, `@vikram-legacy`).
8. **Frontend Studio & Design System**:
   - `test_tier1_frontend_cream_and_olive_design_tokens`: Verifies `#FDFBD4` base, `#FFFEF0` surface, `#545333` olive ink, and `#D9D7B6` border.
   - `test_tier1_frontend_hallmark_floor_compliance`: Confirms zero box-shadows, zero backdrop-filter, and Hallmark header stamp.
   - `test_tier1_frontend_briefing_dashboard_api_binding`: Verifies `GET /api/briefing` returns all fields needed by the studio dashboard.
   - `test_tier1_frontend_component_structure`: Verifies required components exist (`MonacoCodeStudio`, `AskRepoDrawer`, `ScorecardWidget`).
   - `test_tier1_frontend_build_cleanliness`: Verifies production build assets or bundle configuration.

### Tier 2: Boundary & Corner Cases (8 Subsystems $\times 5$ Tests)
Exercises empty strings, corrupt payloads, missing files, Unicode/Indic characters, rapid config toggling, line-drift, and OS path separators across all 8 subsystems.

### Tier 3: Cross-Feature Combinations (8 Pipeline Workflows)
Exercises end-to-end chains across subsystem boundaries:
1. Speech $\to$ Rescorer $\to$ Fence Compiler $\to$ Invariant Test Run.
2. MCP Tool $\to$ Staged Git Diff $\to$ Pre-Commit Hook Abort.
3. RAG Query $\to$ Embedding $\to$ RRF $\to$ Gemini Structured Strategy Output.
4. Config File Expiry $\to$ Status Transition $\to$ MCP Allow Edit $\to$ Invariant Skip.
5. Tree-sitter Anomaly $\to$ Git Provenance Mining $\to$ Synthesized Fence Record.
6. Incident Webhook $\to$ Voice Rescoring $\to$ Timbre Audio $\to$ Scorecard Update.
7. Dead-End Checkpoint Pause $\to$ Audio Synthesis $\to$ Context Resume Briefing.
8. Concurrent Voice Confirmations $\to$ Scorecard Benchmark Atomicity.

### Tier 4: Real-World Application Scenarios (8 Incident Defenses)
Simulates actual production incidents and validates that WhyLine guards prevent recurrence:
1. `INC-9921`: Healthcare payment gateway midnight settlement SYN packet drop.
2. `INC-9984`: Satellite-backhaul rural clinic PHC JWT clock skew desynchronization.
3. Diagnostic Lab VLAN legacy Mindray BC-5150 hematology analyzer SSL bypass.
4. Rural telemedicine tablet Adreno 619 GPU driver thread sleep race condition.
5. Telehealth video consultation Dual-SIM 4G handover stale ICE candidate.
6. State treasury GST rounding 1-paisa settlement batch rejection.
7. Air-gapped district hospital offline prescription OCR certificate verification.
8. Cross-boundary payment gateway v2 migration graceful expiry and cleanup.

---

## 4. Authoritative Verification Sources

| Feature / Artifact | Authoritative Expected Source | Observable Output Checked |
| :--- | :--- | :--- |
| Database Schema | `ORIGINAL_REQUEST.md` R1, `PROJECT.md` M1 | Table definitions, vector dimension 384, indexes, RRF SQL |
| AST Anomaly Scanner | `ORIGINAL_REQUEST.md` R2, `backend/whyline/ast_scanner.py` | 10 anomalies detected, 0 on `PatientProfileService.java` |
| Gnani Speech Bridge | `ORIGINAL_REQUEST.md` R2, `backend/whyline/gnani_speech.py` | 16kHz WAV header, $\ge 4$ AST token replacements |
| Hybrid RAG | `ORIGINAL_REQUEST.md` R2, `backend/whyline/store.py` | 384d vector, RRF latency $< 50\text{ms}$, 3 strategies |
| FastMCP Server | `ORIGINAL_REQUEST.md` R3, `backend/whyline/mcp_server.py` | `REJECT_EDIT` on active, `WARN_AND_REQUIRE_CONFIRMATION` on historical |
| Invariant Compiler | `ORIGINAL_REQUEST.md` R3, `backend/whyline/fence_compiler.py` | JUnit 5 `.java` code, Pytest `.py` assertions, config expiry |
| Demo Repository | `ORIGINAL_REQUEST.md` R4, `scripts/seed_healthconnect.py` | `GatewayRouter.java` retry loop, `.whyline/` ledger files |
| Frontend Studio | `ORIGINAL_REQUEST.md` R4, `scripts/audit_design_system.py` | Cream-and-Olive palette tokens, 0 box-shadow, Hallmark floor |

---

## 5. Execution Protocol & Unified Runner

### Single Unified Test Command
To execute the complete E2E test suite with verbose reporting:

```powershell
python -m pytest tests/e2e/ -v
```

### Full Multi-Suite Regression Runner
To execute both the existing verification suites and the new E2E test suite in a single invocation:

```powershell
python -m pytest backend/tests/test_whyline_engine.py demo-repos/HealthConnect/tests/test_whyline_invariants.py tests/e2e/ -v
```

### Design System Mechanical Audit
```powershell
python scripts/audit_design_system.py
```

### Success Criteria
- Exit code must be `0` for all test runs.
- 100% of tests must pass (0 failed, 0 errors).
- All tests must be self-contained and clean up any temporary files.

---

## 6. Test Isolation & Determinism Guarantees

1. **State Isolation**: Tests use in-memory FastAPI `TestClient`, isolated temporary directories (`tmp_path`), and fixture-level rollback mechanisms so that test runs never corrupt repository ledgers (`.whyline/fences.json`, `scorecard.json`).
2. **Network Resilience**: STT and TTS bridges use local 16kHz WAV synthesis and fallback transcripts when `GNANI_API_KEY` is not present in the environment, ensuring tests succeed deterministically in air-gapped CI/CD environments.
3. **Execution Order Independence**: Every test sets up its own preconditions and does not rely on state from previous tests.
