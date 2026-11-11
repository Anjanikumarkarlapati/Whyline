# Graph Report - Whyline  (2026-11-11)

## Corpus Check
- 171 files · ~195,917 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 2, .ttf 2, .example 1)

## Summary
- 1991 nodes · 4073 edges · 137 communities (77 shown, 60 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 234 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2ad54919`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ref_phosphor_icons_react
- test_compiler.py
- test_tier2_boundaries.py
- test_compiler.py
- demo/HealthConnect/tests/test_whyline_invariants.py
- WhyLineMcpEngine
- TestGnaniLiveSpeechStack
- test_tier1_features.py
- WhyLineStore
- test_tier5_adversarial.py
- GnaniSpeechClient
- pathlib
- frontend/package.json
- whyline_mcp.py
- gnani_client.py
- WhyLine Diagnostic Verification, Service Gap & Security Vulnerability Report
- org.junit.jupiter.api.DisplayName
- test_phase0_safety.py
- test_live_api.py
- useI18n
- 3. Code Bugs & Logic Defects
- AskRepoDrawer.jsx
- App.jsx
- app.py
- .hybrid_rrf_search
- useI18n
- sys
- whyline_mcp.py
- 3. Subsystem Feature Checklist
- gnani_client.py
- json
- WhyLineMcpEngine
- TestClient
- useWorkbenchSelection
- pathlib
- AskTabPanel.jsx
- healthconnect
- scan_repository
- test_git_scanner.py
- scan_file_for_anomalies
- ref_react
- _load_config
- rag_service.py
- GatewayRouter
- AskRepoDrawer.jsx
- PatientProfileService
- build_2min_product_showcase.py
- TestClient
- voiceResponseCache.js
- verify_contrast_and_a11y.py
- healthconnect
- render_1080p_latest_frontend_video.py
- repo_dir
- package.json
- 2. Skill Profiles & Trigger Details
- test_fence_032_invariant
- test_compiler_adversarial.py
- DicomShaderPipeline
- DicomShaderPipeline
- tests/test_whyline_invariants.py
- JwtClockSkewFilter
- JwtClockSkewFilter
- test_tier1_features.py
- services/__init__.py
- _get_migration_sql
- demo/HealthConnect/services/billing/gst_rounding_engine.py
- demo/HealthConnect/services/cache/redis_session_store.py
- _install_windows_iocp_self_pipe_patch
- demo/HealthConnect/services/sync_worker/webhook_dispatcher.py
- os
- build_unified_shivani_video.py
- demo-repos/HealthConnect/services/sync_worker/webhook_dispatcher.py
- pre-commit
- test_fence_010_invariant
- test_fence_012_invariant
- test_fence_014_invariant
- test_fence_015_invariant
- test_fence_017_invariant
- test_fence_018_invariant
- test_fence_020_invariant
- test_fence_021_invariant
- test_fence_023_invariant
- test_fence_024_invariant
- test_fence_025_invariant
- test_fence_003_invariant
- test_fence_027_invariant
- test_fence_029_invariant
- test_fence_030_invariant
- whyline
- e2e/__init__.py
- test_compiler.py
- Project: WhyLine — Voice-Native Codebase Guard & Spoken Fence Compiler
- test_fence_015_invariant
- test_fence_017_invariant
- test_fence_018_invariant
- test_fence_020_invariant
- test_fence_021_invariant
- test_fence_023_invariant
- test_fence_024_invariant
- test_fence_025_invariant
- test_fence_003_invariant
- test_fence_027_invariant
- test_fence_029_invariant
- test_fence_027_invariant
- test_fence_031_invariant
- test_fence_033_invariant
- test_fence_034_invariant
- test_fence_035_invariant
- test_fence_004_invariant
- test_fence_036_invariant
- test_fence_037_invariant
- test_fence_038_invariant
- test_fence_005_invariant
- test_fence_007_invariant
- test_fence_008_invariant
- test_fence_009_invariant

## God Nodes (most connected - your core abstractions)
1. `WhyLineStore` - 84 edges
2. `WhyLineMcpEngine` - 52 edges
3. `GnaniSpeechClient` - 48 edges
4. `useI18n()` - 46 edges
5. `Tier 1: Feature Coverage (8 Subsystems $\times 5$ Tests)` - 44 edges
6. `_load_config()` - 40 edges
7. `scan_file_for_anomalies()` - 32 edges
8. `HybridRagService` - 26 edges
9. `useWorkbenchSelection()` - 24 edges
10. `scan_repository()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `4. Memory (`/memory`) Implementation Details` --references--> `MemoryDetailDrawer()`  [INFERRED]
  MIGRATION_NOTES.md → frontend/src/components/memory/MemoryDetailDrawer.jsx
- `5. Settings (`/settings`) Implementation Details` --references--> `SessionModal()`  [INFERRED]
  MIGRATION_NOTES.md → frontend/src/components/SessionModal.jsx
- `Single Source of Truth (`useWorkbenchSelection`)` --references--> `useWorkbenchSelection()`  [INFERRED]
  MIGRATION_NOTES.md → frontend/src/context/WorkbenchContext.jsx
- `4.2 Comprehensive Component-by-Component Desynchronization Matrix` --references--> `useI18n()`  [INFERRED]
  FULL_STACK_AUDIT_REPORT.md → frontend/src/i18n.js
- `6. Remaining Questions & Gaps` --references--> `useI18n()`  [INFERRED]
  FULL_STACK_AUDIT_REPORT.md → frontend/src/i18n.js

## Import Cycles
- None detected.

## Communities (137 total, 60 thin omitted)

### Community 0 - "ref_phosphor_icons_react"
Cohesion: 0.22
Nodes (17): CodeBlock(), FormattedText(), HybridRagDiagramIllustration(), InteractiveFlowchartSvg(), MemoryDetailDrawer(), RepoFlowchartExplorer(), ScorecardWidget(), StatusBadge() (+9 more)

### Community 1 - "test_compiler.py"
Cohesion: 0.05
Nodes (22): _build_danger_and_constraint(), build_fence_record(), evaluate_expiry(), evaluate_expiry_conditions(), generate_junit_test(), generate_pytest_test(), _resolve_yaml_key(), TestCompiler (+14 more)

### Community 2 - "test_tier2_boundaries.py"
Cohesion: 0.08
Nodes (14): _get_migration_sql(), test_tier2_db_extreme_match_count(), test_tier2_db_null_and_missing_optional_fields(), test_tier2_db_special_chars_in_fts_query(), test_tier2_demo_missing_audio_directory(), test_tier2_frontend_dark_theme_tokens(), test_tier2_scanner_corrupt_syntax(), test_tier2_scanner_empty_file() (+6 more)

### Community 3 - "test_compiler.py"
Cohesion: 0.06
Nodes (47): dependencies, @fontsource/crimson-text@^5.3.0, @fontsource/dm-mono@^5.3.0, @fontsource/dm-sans@^5.3.0, @fontsource/noto-sans-devanagari@^5.3.0, @fontsource/noto-sans-telugu@^5.3.0, @fontsource/noto-serif-devanagari@^5.3.0, @fontsource/noto-serif-telugu@^5.3.0 (+39 more)

### Community 4 - "demo/HealthConnect/tests/test_whyline_invariants.py"
Cohesion: 0.06
Nodes (22): _load_config(), test_fence_001_invariant(), test_fence_002_invariant(), test_fence_003_invariant(), test_fence_004_invariant(), test_fence_005_invariant(), test_fence_006_invariant(), test_fence_007_invariant() (+14 more)

### Community 5 - "WhyLineMcpEngine"
Cohesion: 0.06
Nodes (44): dependencies, @fontsource/crimson-text@^5.3.0, @fontsource/dm-mono@^5.3.0, @fontsource/dm-sans@^5.3.0, @fontsource/noto-sans-devanagari@^5.3.0, @fontsource/noto-sans-telugu@^5.3.0, @fontsource/noto-serif-devanagari@^5.3.0, @fontsource/noto-serif-telugu@^5.3.0 (+36 more)

### Community 6 - "TestGnaniLiveSpeechStack"
Cohesion: 0.06
Nodes (20): migration_sql(), parsed_ast(), RrfSimulationHarness, sample_dataset(), test_ast_node_with_multiple_voice_pins(), test_ast_node_with_no_voice_pin(), test_ast_nodes_table_schema(), test_ast_parses_all_statements_without_syntax_error() (+12 more)

### Community 7 - "test_tier1_features.py"
Cohesion: 0.04
Nodes (42): rescore_transcript_with_ast(), Tier 1: Feature Coverage (8 Subsystems $\times 5$ Tests), _get_migration_sql(), test_tier1_compiler_cross_boundary_expiry_evaluation(), test_tier1_compiler_guarded_code_passes(), test_tier1_compiler_junit5_artifact_generation(), test_tier1_compiler_naive_edit_fails(), test_tier1_db_foreign_key_and_cascade() (+34 more)

### Community 8 - "WhyLineStore"
Cohesion: 0.05
Nodes (26): generate_junit_and_pytest_artifacts(), test_execute_check_staged_allows_expired_fence_when_config_upgraded(), test_execute_check_staged_blocks_active_fence(), test_execute_check_staged_blocks_pending_confirmation_fence(), execute_check_staged(), main(), resolve_repo_path(), WhyLineStore (+18 more)

### Community 9 - "test_tier5_adversarial.py"
Cohesion: 0.06
Nodes (23): install_git_hooks(), test_tier5_ast_scanner_comments_and_docstrings_false_positive_immunity(), test_tier5_ast_scanner_idiomatic_interrupt_treated_as_swallowed_vulnerability(), test_tier5_ast_scanner_java_multiline_block_comments_immunity(), test_tier5_ast_scanner_massive_synthetic_source(), test_tier5_ast_scanner_nested_classes_and_runnable_java(), test_tier5_ast_scanner_nested_functions_python(), test_tier5_ast_scanner_non_ascii_and_indic_tokens() (+15 more)

### Community 10 - "GnaniSpeechClient"
Cohesion: 0.10
Nodes (8): GnaniSpeechClient, TestOfflineFallbackFaultTolerance, test_lru_and_ttl_audio_cleanup(), sync_abha_demographic_record(), sync_abha_demographic_record(), verify_models(), run_conversational_voice_loop(), test_stt_transcribe_fallback_language_sensitivity()

### Community 11 - "pathlib"
Cohesion: 0.06
Nodes (13): generate_eval_markdown(), main(), run_eval(), mcp_engine(), test_cli_fallback_whyline_check(), test_eval_benchmark_100_percent_precision_and_recall(), _generate_chime_wav(), synthesize_timbre_audio() (+5 more)

### Community 12 - "frontend/package.json"
Cohesion: 0.10
Nodes (11): _check_tts_rate_limit(), test_incident_webhook_accepts_valid_signature(), test_incident_webhook_rejects_invalid_signature(), test_secret_scanner_allows_env_example(), test_secret_scanner_blocks_env_file(), test_secret_scanner_flags_real_api_key(), test_tts_rate_limiter(), get_target_files() (+3 more)

### Community 13 - "whyline_mcp.py"
Cohesion: 0.18
Nodes (7): check_fences(), get_engine(), get_fence_audio(), log_or_resume_context(), resolve_repo_dir(), verify_diff_against_fences(), test_tier5_mcp_module_fastmcp_exports()

### Community 14 - "gnani_client.py"
Cohesion: 0.06
Nodes (31): 1. Executive Summary & Diagnostic Scorecard, 2.1 Gnani Vachana Text-to-Speech (TTS) — Timbre v2.5, 2.2 Gnani Vachana Speech-to-Text (STT) — Prisma v2.5, 2.3 Google Gemini Generative AI — `gemini-3.8-flash`, 2. Live API Verification & Protocol Specifications, 3. Comprehensive Service Gap Analysis, 4. Security Vulnerability Assessment (CVSS v3.1), 5. Automated Live Test Suite Execution Report (+23 more)

### Community 15 - "WhyLine Diagnostic Verification, Service Gap & Security Vulnerability Report"
Cohesion: 0.11
Nodes (16): InteractiveAudioWaveform(), buildInstantCopilotState(), DEMO_REPOS, ExplorerAndCoPilotWorkspace(), GNANI_VOICES, SPEED_OPTIONS, AST_NODE_PRESETS, INITIAL_FENCES_SEED (+8 more)

### Community 16 - "org.junit.jupiter.api.DisplayName"
Cohesion: 0.17
Nodes (3): SpokenFenceInvariantTest, SpokenFenceInvariantTest, SpokenFenceInvariantTest

### Community 17 - "test_phase0_safety.py"
Cohesion: 0.08
Nodes (24): 1.1 Test Suite Run Results, 1.2 Identified Test Failures & Root Cause Analysis, 1. Automated Test Suite Execution & Diagnostics, 2. Security Vulnerabilities Assessment, 3.1 Systematic Language Inversion Bug in Frontend Handlers, 3.2 FastMCP Server `check_fences` Ignores `proposed_diff`, 3.3 FastMCP False Positive File Matching on Basename, 3.4 AST Scanner Deduplication Silently Drops Secondary Anomalies (+16 more)

### Community 19 - "useI18n"
Cohesion: 0.07
Nodes (21): _fetch_github_pr_if_configured(), _load_local_pr_fixtures(), mine_provenance_for_anomaly(), run_audit(), blend(), check_theme(), contrast_ratio(), luminance() (+13 more)

### Community 20 - "3. Code Bugs & Logic Defects"
Cohesion: 0.07
Nodes (29): ASSUMPTIONS_PATH, AUDIO_DIR, buildDefaultHealthConnectContext(), CHECKPOINTS_PATH, CONFIG_YML_PATH, CURATED_GITHUB_REPOS, __dirname, ENV_PATTERNS (+21 more)

### Community 21 - "AskRepoDrawer.jsx"
Cohesion: 0.13
Nodes (19): AskRepoDrawer(), getStrategyRiskMeta(), AudioWaveform(), DEFAULT_BAR_HEIGHTS, formatTime(), MonacoCodeStudio(), VOICE_LANGUAGE_OPTIONS, VoiceLanguageDropdown() (+11 more)

### Community 22 - "App.jsx"
Cohesion: 0.15
Nodes (12): App(), getInitialTheme(), ErrorBoundary, LegacyRedirect(), RouteAnnouncer(), I18nProvider(), FlowchartsPage(), LOAD_STEPS (+4 more)

### Community 23 - "app.py"
Cohesion: 0.06
Nodes (46): ask_copilot(), CheckpointRequest, cleanup_audio_cache(), confirm_fence_by_voice(), ConfirmFenceRequest, CoPilotAskRequest, create_or_resume_checkpoint(), explain_codebase_endpoint() (+38 more)

### Community 24 - ".hybrid_rrf_search"
Cohesion: 0.21
Nodes (4): test_narration_one_step_per_node_in_order(), test_scan_narrated_is_fast_and_audio_playable(), narrate_flowchart(), speak()

### Community 25 - "useI18n"
Cohesion: 0.19
Nodes (13): Footer(), Layout(), SessionModal(), QUICK_GITHUB_REPOS, DEFAULT_VOICE_PER_LANG, I18nContext, LANGUAGE_VOICE_MODELS, TRANSLATIONS (+5 more)

### Community 26 - "sys"
Cohesion: 0.08
Nodes (17): main(), synthesize_audio_stems(), create_fullscreen_frame(), main(), synthesize_all(), apply_gnai_voice_enhancement(), draw_glass_polygon(), main() (+9 more)

### Community 27 - "whyline_mcp.py"
Cohesion: 0.11
Nodes (12): CSR_DIR, __dirname, __filename, whylineBackendPlugin(), apiMiddleware, __dirname, DIST_DIR, __filename (+4 more)

### Community 28 - "3. Subsystem Feature Checklist"
Cohesion: 0.10
Nodes (20): 1.1 Chesterton's Fence in Codebases, 1.2 Eliminating Notification Fatigue, 1.3 Stopping AI Coding Agent Regressions, 1.4 Native-Language Knowledge Preservation, 1. The Human & Operational Problems Whyline Solves, 2. Swarm Persona Profiles (MiroFish OASIS Setup), 3.1 Dr. Srinivas Rao — Principal Systems Architect, 3.2 Pooja Sharma — Senior Staff SRE (+12 more)

### Community 29 - "gnani_client.py"
Cohesion: 0.07
Nodes (15): _cache_get(), _cache_put(), clarify_spoken_text(), normalize_gnani_language(), normalize_stt_language(), _safe_write_wav(), test_live_gnani_vachana_tts_telugu_hindi_english(), _build_step_narration() (+7 more)

### Community 30 - "json"
Cohesion: 0.08
Nodes (6): assert_valid_16k_wav(), TestGnaniTimbreSynthesisAdversarial, client(), test_audio_retrieval_and_riff_wave_header_validation(), test_stt_base64_robustness_adversarial_matrix(), test_webhook_hmac_sha256_attack_simulation()

### Community 31 - "WhyLineMcpEngine"
Cohesion: 0.06
Nodes (21): test_fastmcp_path_normalization_adversarial_vectors(), test_fastmcp_path_normalization_safe_and_empty_paths(), test_check_fences_diff_aware_contract_keys(), test_diff_aware_allows_comment_only(), test_diff_aware_allows_moved_code_with_intact_invariant(), test_diff_aware_allows_unrelated_code_edit(), test_diff_aware_allows_whitespace_only(), test_diff_aware_blocks_on_guarded_line_removal() (+13 more)

### Community 32 - "TestClient"
Cohesion: 0.09
Nodes (11): test_tier2_demo_concurrent_intercept_requests(), test_tier2_demo_duplicate_incident_webhook(), test_tier2_demo_invalid_branch_checkpoint(), test_tier2_frontend_empty_fences_state(), test_tier2_frontend_missing_auth_cookie(), test_tier2_rag_empty_question(), test_tier2_rag_missing_gemini_api_key(), test_tier2_rag_non_matching_vocabulary() (+3 more)

### Community 33 - "useWorkbenchSelection"
Cohesion: 0.26
Nodes (14): AskTabPanel(), FenceTabPanel(), FileSwitcher(), WhyTabPanel(), WorkbenchEditor(), DEFAULT_ANSWER, loadInitialHistory(), useWorkbenchSelection() (+6 more)

### Community 34 - "pathlib"
Cohesion: 0.16
Nodes (7): _load_dotenv_once(), main(), synthesize_stem(), main(), make_dummy_16k_wav(), probe_stt(), probe_tts()

### Community 35 - "AskTabPanel.jsx"
Cohesion: 0.30
Nodes (14): buildVoiceCacheKey(), clearVoiceResponseCache(), ensureHydrated(), getCachedVoiceResponse(), getVoiceCacheStats(), memoryCache, normalizeLangLocale(), normalizeQuestionText() (+6 more)

### Community 36 - "healthconnect"
Cohesion: 0.12
Nodes (16): 1.1 The Terror of Chesterton's Fence: "Don't Touch Line 42", 1.2 Autonomous AI Agents "Textbook-Optimizing" Away Load-Bearing Hacks, 1.3 Post-Mortem & Documentation Exhaustion (The 3:00 AM Burnout), 1.4 Notification Fatigue & Linter Alert Blindness, 1.5 Evaporating Institutional Memory & The Ghost-Author Problem, 1. The Core Frustrations (From the Developers' Perspective), 2. The 52 Developer Voice Catalog (MiroFish Swarm Data), 3.1 The 10% Anomaly Trigger vs. 100% Linter Fatigue (+8 more)

### Community 37 - "scan_repository"
Cohesion: 0.30
Nodes (9): _build_directory_tree(), _classify_entry_points(), _count_file_lines(), _extract_git_metadata(), _generate_flowchart_graph(), _group_architectural_components(), _is_remote_url(), _sanitize_git_url() (+1 more)

### Community 38 - "test_git_scanner.py"
Cohesion: 0.17
Nodes (5): test_fastapi_endpoint_git_scan(), test_scan_isolated_temp_git_repo(), test_scan_local_workspace(), test_scan_non_existent_path(), test_scan_non_git_directory()

### Community 39 - "scan_file_for_anomalies"
Cohesion: 0.07
Nodes (16): test_ast_scanner_inline_comment_limitation_behavior(), test_ast_scanner_negative_control_files_zero_false_positives(), test_ast_scanner_revert_comment_variations(), test_ast_scanner_revert_detected_when_git_absent(), test_execute_check_staged_allows_unmonitored_file(), test_execute_check_staged_historical_fence_cautionary_warning(), test_execute_check_staged_no_staged_files(), test_execute_check_staged_with_real_git_staged_file() (+8 more)

### Community 40 - "ref_react"
Cohesion: 0.12
Nodes (16): 1. Unified Test Runner Commands, 2. Test Tier Coverage & Results Summary, 3. Subsystem Feature Checklist, 4. Verification Certification, Design System & Hallmark Floor Mechanical Audit, Feature 1: Database Schema & Migration (`backend/migrations/01_init.sql`), Feature 2: Tree-sitter AST Anomaly Scanner (`backend/whyline/ast_scanner.py`), Feature 3: Gnani Speech Bridge (`backend/whyline/gnani_speech.py`) (+8 more)

### Community 41 - "_load_config"
Cohesion: 0.33
Nodes (6): AST_DICTIONARY, classifyTaskIntent(), DEFAULT_VOICE_UTTERANCES, executeCopilotTaskForQuestion(), parseGitHubRepoInput(), rescoreSpokenTranscript()

### Community 42 - "rag_service.py"
Cohesion: 0.05
Nodes (11): compute_384d_embedding(), _compute_384d_embedding_cached(), _cosine_similarity(), GeminiStrategyResult, HybridRagService, _parse_and_normalize(), TestGeminiLiveInference, test_tier2_db_empty_query_text_handling() (+3 more)

### Community 43 - "GatewayRouter"
Cohesion: 0.12
Nodes (15): 1. `check_fences`, 1. Claude Desktop, 2. Cursor IDE, 2. `verify_diff_against_fences`, 3. Antigravity / Gemini CLI, 3. `log_or_resume_context`, 4. `get_fence_audio`, Automatic Installation (+7 more)

### Community 44 - "AskRepoDrawer.jsx"
Cohesion: 0.12
Nodes (15): 1.1 Ingestion & Knowledge Graph (GraphRAG via Zep Cloud), 1.2 Persona Synthesis (OASIS Architecture), 1.3 Swarm Simulation Engine, 1.4 ReACT Report Agent, 1. MiroFish Architecture & Internals, 2. Whyline Alignment & High-Leverage Use Cases, 3. Skill Packaging & Workspace Registration, 4. Technical Integration Architecture: Whyline ↔ MiroFish Bridge (+7 more)

### Community 45 - "PatientProfileService"
Cohesion: 0.12
Nodes (15): 1. Architecture & Testing Philosophy, 2. Directory Layout & Structure, 3. Test Tier Matrix & Coverage Breakdown, 4. Authoritative Verification Sources, 5. Execution Protocol & Unified Runner, 6. Test Isolation & Determinism Guarantees, Core Guiding Principles, Design System Mechanical Audit (+7 more)

### Community 46 - "build_2min_product_showcase.py"
Cohesion: 0.22
Nodes (3): create_1080p_frame(), draw_cursor_and_badge(), make_full_bleed_1080p()

### Community 47 - "TestClient"
Cohesion: 0.14
Nodes (14): 1. ⚡ Sub-50ms Architectural Flowchart & Mind Map Explorer, 2. 🎙️ Multilingual Spoken Fences & Voice Walkthrough (Gnani AI), 3. 🛡️ Autonomous Agent Interception (FastMCP & Git Hooks), 4. 🎨 Field-Report Aesthetic & Hallmark Floor Compliance, ✨ Core Pillars & Capabilities, 🔒 Enterprise Security & Zero-Secret Guarantee, 🌟 Executive Overview: The "Why" Crisis in Autonomous Software Engineering, 📄 License (+6 more)

### Community 48 - "voiceResponseCache.js"
Cohesion: 0.15
Nodes (13): 1. Spoken Fences & Briefing, 2. Architectural Co-Pilot, 3. Speech & Audio, 4. Git Repository Scanner & Architecture Flowcharts, 🏛️ Architecture & Core Subsystems, Deterministic AST Signature Hashing, 📁 Directory Structure, 🧠 Dual-Source Hybrid RAG & pgvector RRF (+5 more)

### Community 49 - "verify_contrast_and_a11y.py"
Cohesion: 0.15
Nodes (12): 1. Executive Summary, 2. Target Information Architecture & Route Mapping, 3. Workbench (`/studio`) Implementation Details, 4. Memory (`/memory`) Implementation Details, 5. Settings (`/settings`) Implementation Details, 60/40 Split & Draggable Handle, 6. Global Shortcuts & Mobile UX, 7. Verification & Backend Contracts (+4 more)

### Community 50 - "healthconnect"
Cohesion: 0.15
Nodes (13): Section-by-Section Breakdown of the Image, Section-by-Section Breakdown of the Image, Section-by-Section Breakdown of the Image, Simple Everyday Example, Simple Everyday Example, Simple Everyday Example, Step 2: Codebase Guard & Fence Briefing Dashboard (`/`), Step 3: Spoken Fences Studio (`/fences`) (+5 more)

### Community 51 - "render_1080p_latest_frontend_video.py"
Cohesion: 0.21
Nodes (4): create_1080p_frame(), draw_cursor_and_badge(), main(), make_full_bleed_1080p()

### Community 52 - "repo_dir"
Cohesion: 0.18
Nodes (5): _run_git(), client(), preserve_demo_state(), repo_dir(), temp_repo()

### Community 53 - "package.json"
Cohesion: 0.17
Nodes (11): ntp_enforced, idempotency_outbox_enabled, provider, version, healthconnect, auth, environment, imaging (+3 more)

### Community 54 - "2. Skill Profiles & Trigger Details"
Cohesion: 0.17
Nodes (11): ntp_enforced, idempotency_outbox_enabled, provider, version, healthconnect, auth, environment, imaging (+3 more)

### Community 55 - "test_fence_032_invariant"
Cohesion: 0.17
Nodes (11): Canonical Palette (Light / Dark), DESIGN.md — WhyLine Studio Cream-and-Olive Field-Report Design System, Elevation System (four levels only), F1 Typography Rules (documented for reference), Implementation, Layout and Shapes, Logo, Required Fallbacks (all mandatory) (+3 more)

### Community 56 - "test_compiler_adversarial.py"
Cohesion: 0.17
Nodes (11): 1. Newly Installed Skills Overview, 2.1 Anthropic, 2.2 Microsoft, 2.3 Supabase, 2.4 Google, 2.5 Addy Osmani, 2.6 MiroFish (Swarm Intelligence & Prediction Engine), 2. Skill Profiles & Trigger Details (+3 more)

### Community 57 - "DicomShaderPipeline"
Cohesion: 0.17
Nodes (5): test_fence_019_invariant(), test_fence_022_invariant(), test_fence_026_invariant(), test_fence_028_invariant(), test_fence_032_invariant()

### Community 59 - "DicomShaderPipeline"
Cohesion: 0.18
Nodes (6): _load_config(), test_fence_001_invariant(), test_fence_002_invariant(), test_fence_006_invariant(), test_fence_013_invariant(), test_fence_016_invariant()

### Community 60 - "tests/test_whyline_invariants.py"
Cohesion: 0.20
Nodes (6): 🗺️ 4-Page Core Information Architecture, 🛠️ Development & Build Commands, 🌐 Multilingual Voice & i18n Architecture (`src/i18n.js`), Non-Negotiable Hallmark Floor Rules, 🎨 Visual Identity & Design Tokens, WhyLine Frontend Studio

### Community 61 - "JwtClockSkewFilter"
Cohesion: 0.29
Nodes (4): GatewayRouter, PaymentReceipt, GatewayRouter, PaymentReceipt

### Community 62 - "JwtClockSkewFilter"
Cohesion: 0.15
Nodes (11): _order(), 1. What was tested, 2. The problem, 3. How deep is it?, 4. Fix strategy, Git Flowchart Page — QA Test Report, Out of scope / notes, Phase 1 — Correct behavior (frontend, small) (+3 more)

### Community 63 - "test_tier1_features.py"
Cohesion: 0.20
Nodes (9): 1. Core 4-Page Information Architecture, 2. Legacy Redirect Verification, 3. Key USPs & Indic Multilingual Capabilities, 4. Mobile Responsive Viewports (375×812), Page 1: Home Dashboard (`/`), Page 2: Workbench (`/studio`), Page 3: Memory & Provenance (`/memory`), Page 4: Settings & Session (`/settings`) (+1 more)

### Community 64 - "services/__init__.py"
Cohesion: 0.20
Nodes (14): buildGeminiFlowchart(), buildStreamingTtsUrl(), createWhylineApiMiddleware(), detectRepositoryStack(), generateContentWithFallback(), getGatewayVersion(), getGenAIClient(), loadDotenvSafe() (+6 more)

### Community 66 - "demo/HealthConnect/services/billing/gst_rounding_engine.py"
Cohesion: 0.22
Nodes (4): pages, SCREENSHOT_DIR, ROUTES, WIDTHS

### Community 67 - "demo/HealthConnect/services/cache/redis_session_store.py"
Cohesion: 0.24
Nodes (10): buildIdiomaticSyntheticCode(), fetchJsonWithTimeout(), fetchTextWithTimeout(), formatDetectedStackSummary(), inferEditorLanguage(), inferRepoLanguageProfile(), loadAndIndexGitHubRepository(), normalizeProgrammingLanguageHint() (+2 more)

### Community 69 - "demo/HealthConnect/services/sync_worker/webhook_dispatcher.py"
Cohesion: 0.29
Nodes (6): 1. Overview & Core Concept, 2. User Experience & Visual Design, 3. Key Product Decisions & Trade-Offs, 4. Technical Architecture & Data Strategy *(Technical Reference)*, User Review & Critical Decisions, WhyLine: Simple GitHub Repo Guide (Ask Repo, Answers, and Flowcharts)

### Community 70 - "os"
Cohesion: 0.31
Nodes (5): setup_module(), _remove_readonly(), run_git(), seed_healthconnect(), write_repo_file()

### Community 72 - "build_unified_shivani_video.py"
Cohesion: 0.15
Nodes (5): create_scene_frame(), render_unified_video(), synthesize_all_stems(), create_scene_frame(), render_video()

### Community 75 - "test_fence_010_invariant"
Cohesion: 0.33
Nodes (6): 1. Clone & Configure Environment, 2. Backend Engine Setup, 3. Frontend & Middleware Studio Setup, 4. Enable FastMCP & Pre-Commit Hooks, Prerequisites, 🚀 Quick Start & Installation

### Community 77 - "test_fence_012_invariant"
Cohesion: 0.40
Nodes (4): Detailed Case Matrix, Evaluation Methodology, Summary Metrics, WhyLine Spoken Fences — Guard Quality Evaluation (BE-205)

### Community 78 - "test_fence_014_invariant"
Cohesion: 0.40
Nodes (5): 1. Monaco Code Studio (`MonacoCodeStudio.jsx`), 2. Audio Waveform Scrubber (`AudioWaveform.jsx`), 3. Ask the Repo Slide-Over Drawer (`AskRepoDrawer.jsx`), 4. Telemetry Scorecard Widget (`ScorecardWidget.jsx`), 🧩 Key Components

### Community 83 - "test_fence_021_invariant"
Cohesion: 0.50
Nodes (4): Section-by-Section Breakdown of the Image, Simple Everyday Example, Step 1: Sign-In & Workspace Entry (`/login`), What Is This Page? (Beginner Explanation)

### Community 84 - "test_fence_023_invariant"
Cohesion: 0.50
Nodes (4): Section-by-Section Breakdown of the Image, Simple Everyday Example, Step 5: Incidents & Institutional Memory Ledger (`/incidents`), What Is This Page? (Beginner Explanation)

### Community 85 - "test_fence_024_invariant"
Cohesion: 0.50
Nodes (4): Section-by-Section Breakdown of the Image, Simple Everyday Example, Step 7: Git Commit Graph & Spoken Architecture Flowchart (`/git`), What Is This Page? (Beginner Explanation)

### Community 86 - "test_fence_025_invariant"
Cohesion: 0.50
Nodes (4): Section-by-Section Breakdown of the Image, Simple Everyday Example, Step 8: Studio, Security & Model Settings (`/settings`), What Is This Page? (Beginner Explanation)

### Community 87 - "test_fence_003_invariant"
Cohesion: 0.50
Nodes (4): Section-by-Section Breakdown of the Image, Simple Everyday Example, Step 9: Quick "Ask Repo" Slide-Over Drawer (Accessible from Any Page), What Is This Panel? (Beginner Explanation)

### Community 88 - "test_fence_027_invariant"
Cohesion: 0.50
Nodes (4): Section-by-Section Breakdown of the Image, Simple Everyday Example, Step 4: AST Anomaly & Fence Code Studio (`/studio`), What Is This Page? (Beginner Explanation)

## Knowledge Gaps
- **60 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Tier 1: Feature Coverage (8 Subsystems $\times 5$ Tests)` connect `test_tier1_features.py` to `ref_phosphor_icons_react`, `WhyLineStore`, `AskRepoDrawer.jsx`, `PatientProfileService`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `WhyLineStore` (e.g. with `mcp_engine()` and `WhyLineMcpEngine`) actually correct?**
  _`WhyLineStore` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_compiler.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05456095481670929 - nodes in this community are weakly interconnected._
- **Why does `AskRepoDrawer()` connect `AskRepoDrawer.jsx` to `ref_phosphor_icons_react`, `useI18n`, `AskTabPanel.jsx`, `test_tier1_features.py`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `WhyLineMcpEngine` (e.g. with `mcp_engine()` and `execute_check_diff()`) actually correct?**
  _`WhyLineMcpEngine` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_tier2_boundaries.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07635467980295567 - nodes in this community are weakly interconnected._
- **Why does `WhyLineStore` connect `WhyLineStore` to `test_tier2_boundaries.py`, `os`, `scan_file_for_anomalies`, `test_tier1_features.py`, `test_tier5_adversarial.py`, `GnaniSpeechClient`, `pathlib`, `rag_service.py`, `whyline_mcp.py`, `app.py`, `gnani_client.py`, `WhyLineMcpEngine`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._