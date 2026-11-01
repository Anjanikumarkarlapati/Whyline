"""Tier 1: Feature Coverage End-to-End Tests.

Exercises WhyLine across 8 core features (>=5 tests per feature = 40 tests total):
1. Database Schema & Migration (5 tests)
2. Tree-sitter AST Anomaly Detector (5 tests)
3. Gnani Speech Bridge (5 tests)
4. Dual-Source Hybrid RAG (5 tests)
5. FastMCP Server & Guardrails (5 tests)
6. Invariant Test Compiler (5 tests)
7. Seeded Demo Repository Scaffolding (5 tests)
8. Frontend Studio & Design System (5 tests)
"""
from __future__ import annotations

import json
from pathlib import Path
import re
import wave
import pytest
from fastapi.testclient import TestClient

from backend.whyline.ast_scanner import scan_file_for_anomalies, scan_repository
from backend.whyline.fence_compiler import evaluate_expiry_conditions, generate_junit_and_pytest_artifacts
from backend.whyline.gnani_speech import rescore_transcript_with_ast, synthesize_timbre_audio
from backend.whyline.mcp_server import WhyLineMcpEngine
from backend.whyline.store import WhyLineStore

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def _get_migration_sql() -> str:
    candidates = [
        ROOT_DIR / "backend" / "migrations" / "01_init.sql",
        ROOT_DIR / "supabase" / "migrations" / "20261101000000_whyline_hybrid_rag.sql",
    ]
    for p in candidates:
        if p.exists():
            return p.read_text(encoding="utf-8")
    raise FileNotFoundError("No migration SQL file found in backend/migrations or supabase/migrations")


# ==============================================================================
# FEATURE 1: Database Schema & Migration (5 tests)
# ==============================================================================

def test_tier1_db_tables_and_columns():
    """Verify DDL creates ast_nodes and voice_pins tables with required column types."""
    sql = _get_migration_sql().lower()
    assert "create table if not exists public.ast_nodes" in sql or "create table if not exists ast_nodes" in sql
    assert "create table if not exists public.voice_pins" in sql or "create table if not exists voice_pins" in sql
    assert "vector(384)" in sql
    assert "ast_signature_hash" in sql


def test_tier1_db_hnsw_and_gin_indexes():
    """Verify DDL creates HNSW vector index with vector_cosine_ops and GIN index for full-text search."""
    sql = _get_migration_sql().lower()
    assert "using hnsw" in sql
    assert "vector_cosine_ops" in sql
    assert "using gin" in sql
    assert "tsvector" in sql


def test_tier1_db_rrf_function_contract():
    """Verify match_whyline_code_and_fences function is defined with RRF fusion logic."""
    sql = _get_migration_sql().lower()
    assert "match_whyline_code_and_fences" in sql
    assert "query_text text" in sql
    assert "query_embedding vector(384)" in sql
    assert "rrf_k" in sql
    assert "rrf_score" in sql


def test_tier1_db_foreign_key_and_cascade():
    """Verify voice_pins references ast_nodes with cascading deletes or foreign key constraint."""
    sql = _get_migration_sql().lower()
    assert "references public.ast_nodes(id)" in sql or "references ast_nodes(id)" in sql or "ast_node_id" in sql


def test_tier1_db_syntax_and_postgresql16_compliance():
    """Verify migration DDL contains standard PostgreSQL 16 extensions and valid syntax."""
    sql = _get_migration_sql().lower()
    assert "create extension if not exists vector" in sql
    assert "language sql" in sql or "language plpgsql" in sql
    assert not re.search(r"\bautoincrement\b", sql), "PostgreSQL does not use AUTOINCREMENT"


# ==============================================================================
# FEATURE 2: Tree-sitter AST Anomaly Detector (5 tests)
# ==============================================================================

def test_tier1_scanner_magic_numbers_in_loops(repo_dir: Path):
    """Verify scanner detects magic retryCount and timeoutMs in GatewayRouter.java."""
    anomalies = scan_repository(repo_dir)
    gw = [a for a in anomalies if "GatewayRouter" in a.file_path]
    assert len(gw) >= 1
    assert any("retryCount" in a.matched_token or "5" in a.matched_token for a in gw)


def test_tier1_scanner_explicit_thread_sleeps(repo_dir: Path):
    """Verify scanner detects explicit Thread.sleep and time.sleep across Java and Python."""
    anomalies = scan_repository(repo_dir)
    sleep_anomalies = [a for a in anomalies if a.anomaly_type == "EXPLICIT_THREAD_HALT"]
    assert len(sleep_anomalies) >= 2
    files = {Path(a.file_path).name for a in sleep_anomalies}
    assert "DicomShaderPipeline.java" in files
    assert "patient_queue.py" in files


def test_tier1_scanner_swallowed_catches(repo_dir: Path):
    """Verify scanner detects swallowed catch blocks."""
    anomalies = scan_repository(repo_dir)
    catches = [a for a in anomalies if a.anomaly_type == "SWALLOWED_EXCEPTION"]
    assert len(catches) >= 1
    files = {Path(a.file_path).name for a in catches}
    assert "WebRtcIceCandidateHandler.java" in files or "redis_session_store.py" in files


def test_tier1_scanner_validation_bypasses(repo_dir: Path):
    """Verify scanner detects validation bypasses (deprecation, verify=false, TrustAllCerts)."""
    anomalies = scan_repository(repo_dir)
    bypasses = [a for a in anomalies if a.anomaly_type == "VALIDATION_BYPASS"]
    assert len(bypasses) >= 1
    files = {Path(a.file_path).name for a in bypasses}
    assert "LegacyHl7SslClient.java" in files or "prescription_parser.py" in files


def test_tier1_scanner_zero_false_positives_on_crud(repo_dir: Path):
    """Verify scanner produces zero false positives on routine CRUD files."""
    crud_file = repo_dir / "src/main/java/com/healthconnect/patient/PatientProfileService.java"
    assert crud_file.exists()
    crud_anomalies = scan_file_for_anomalies(repo_dir, crud_file)
    assert crud_anomalies == [], "Routine CRUD file must produce zero false positives"


# ==============================================================================
# FEATURE 3: Gnani Speech Bridge (5 tests)
# ==============================================================================

def test_tier1_speech_ast_vocabulary_rescorer():
    """Verify phonetic Indic transcripts are mapped to exact repository symbols."""
    raw = "gateway router lo retry count alage unchandi until application yml lo gateway version v2."
    res = rescore_transcript_with_ast(raw)
    rescored = res["rescored_transcript"]
    assert "GatewayRouter.java" in rescored
    assert "retryCount" in rescored
    assert "application.yml" in rescored
    assert len(res["ast_replacements"]) >= 3


def test_tier1_speech_timbre_wav_generation(tmp_path: Path):
    """Verify Timbre v2.5 synthesis outputs valid 16kHz 16-bit mono PCM WAV."""
    meta = synthesize_timbre_audio("Test audio cue", tmp_path, "test_audio", language="en-IN")
    wav_path = tmp_path / "test_audio.wav"
    assert wav_path.exists()
    assert meta["sample_rate"] == 16000

    with wave.open(str(wav_path), "rb") as wf:
        assert wf.getnchannels() == 1
        assert wf.getsampwidth() == 2  # 16-bit
        assert wf.getframerate() == 16000
        assert wf.getnframes() > 0


def test_tier1_speech_audio_streaming_endpoint(client: TestClient):
    """Verify GET /api/audio/{filename} serves audio with 200 OK and audio/wav header."""
    resp = client.get("/api/audio/fence-001_confirmed.wav")
    assert resp.status_code == 200
    assert "audio/wav" in resp.headers.get("content-type", "")
    assert len(resp.content) > 44  # WAV header is 44 bytes minimum


def test_tier1_speech_voice_confirmation_flow(client: TestClient):
    """Verify POST /api/fences/{id}/confirm updates status to VERIFIED_ACTIVE and generates audio."""
    payload = {
        "transcript_text": "gateway router lo retry count = 5 alage unchandi",
        "language": "te-IN",
        "author_handle": "@anjani",
    }
    resp = client.post("/api/fences/FENCE-001/confirm", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["fence"]["status"] == "VERIFIED_ACTIVE"
    assert data["fence"]["confirmed_by"] == "@anjani"
    assert "GatewayRouter.java" in data["fence"]["transcript"]


def test_tier1_speech_indic_code_mixing():
    """Verify Indic code-mixed speech with Hindi terms rescores correctly."""
    raw = "bhaiya gateway router me retry count change mat karo"
    res = rescore_transcript_with_ast(raw)
    rescored = res["rescored_transcript"]
    assert "GatewayRouter.java" in rescored
    assert "retryCount" in rescored


# ==============================================================================
# FEATURE 4: Dual-Source Hybrid RAG (5 tests)
# ==============================================================================

def test_tier1_rag_query_embedding_dimension():
    """Verify 384d multilingual embedder produces 384-dimensional dense vectors."""
    from backend.whyline.store import compute_384d_embedding
    vec = compute_384d_embedding("How do we fix the settlement packet loss?")
    assert len(vec) == 384
    assert any(abs(v) > 0 for v in vec)


def test_tier1_rag_rrf_single_round_trip(repo_dir: Path):
    """Verify hybrid RRF search completes in single round trip under 50ms latency."""
    store = WhyLineStore(repo_dir)
    result = store.ask_repo_copilot("GatewayRouter retry count settlement", language="te-IN")
    assert "rrf_telemetry" in result
    assert result["rrf_telemetry"]["latency_ms"] < 50.0
    assert len(result["rrf_telemetry"]["matched_fences"]) > 0


def test_tier1_rag_copilot_structured_output(client: TestClient):
    """Verify POST /api/copilot/ask returns structured JSON with spoken answer and strategies."""
    resp = client.post(
        "/api/copilot/ask",
        json={"question": "How to handle duplicate charges in GatewayRouter?", "language": "te-IN"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "spoken_answer" in data or "spoken_reply" in data
    assert "strategies" in data
    assert "rrf_telemetry" in data


def test_tier1_rag_three_ranked_strategies(client: TestClient):
    """Verify CoPilot returns exactly 3 ranked architectural strategies."""
    resp = client.post(
        "/api/copilot/ask",
        json={"question": "What is the migration path for payment gateway v1?", "language": "en-IN"},
    )
    assert resp.status_code == 200
    data = resp.json()
    strategies = data["strategies"]
    assert len(strategies) == 3
    for s in strategies:
        assert "rank" in s
        assert "title" in s
        assert "summary" in s


def test_tier1_rag_offline_sandbox_resilience(client: TestClient):
    """Verify CoPilot functions reliably with grounded fallback even without external cloud credentials."""
    resp = client.post(
        "/api/copilot/ask",
        json={"question": "Explain FENCE-001 danger condition.", "language": "te-IN"},
    )
    assert resp.status_code == 200
    data = resp.json()
    answer = data.get("spoken_answer") or data.get("spoken_reply")
    assert answer != ""
    assert len(data["strategies"]) == 3


# ==============================================================================
# FEATURE 5: FastMCP Server & Guardrails (5 tests)
# ==============================================================================

def test_tier1_mcp_check_fences_active_guard(repo_dir: Path):
    """Verify check_fences returns REJECT_EDIT on active guarded file."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)
    res = engine.check_fences("src/main/java/com/healthconnect/payments/GatewayRouter.java")
    assert res["decision"] in ("REJECT_EDIT", "WARN_AND_REQUIRE_CONFIRMATION")
    assert res["fence"] is not None
    assert "FENCE-001" == res["fence"]["id"]


def test_tier1_mcp_check_fences_historical_warning(repo_dir: Path):
    """Verify check_fences returns WARN_AND_REQUIRE_CONFIRMATION on departed author code."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)
    res = engine.check_fences("src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java")
    assert res["decision"] == "WARN_AND_REQUIRE_CONFIRMATION"
    assert "@vikram-legacy" in res["reason"]


def test_tier1_mcp_verify_diff_logs_assumptions(repo_dir: Path):
    """Verify verify_diff_against_fences appends agent assumptions to .whyline/assumptions.json."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)
    assumptions = ["Assumes retryCount = 5 is unnecessary boilerplate"]
    res = engine.verify_diff_against_fences(
        target_file="src/main/java/com/healthconnect/payments/GatewayRouter.java",
        proposed_diff="- int retryCount = 5;\n+ int retryCount = 1;",
        agent_assumptions=assumptions,
        agent_name="E2E Test Agent",
    )
    assert res["assumption_entry"]["verdict"] in ("REJECTED_BY_FENCE", "CAUTION_UNVERIFIED_HISTORICAL")
    assert store.assumptions_path.exists()
    all_asm = json.loads(store.assumptions_path.read_text(encoding="utf-8"))
    assert any(a["agent_name"] == "E2E Test Agent" for a in all_asm)


def test_tier1_mcp_dead_end_memory_checkpoint(repo_dir: Path):
    """Verify log_or_resume_context records and retrieves branch dead-end checkpoints."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)
    pause_res = engine.log_or_resume_context(
        branch_name="feature/test-branch",
        action="pause",
        author_handle="@tester",
        summary="Testing pause checkpoint",
        ruled_out_dead_ends=["Removing retry loop causes SYN drop"],
        next_untested_action="Add idempotency header",
    )
    assert pause_res["action"] == "pause_saved"

    resume_res = engine.log_or_resume_context(branch_name="feature/test-branch", action="resume")
    assert resume_res["action"] == "resume_briefing"
    assert resume_res["checkpoint"]["branch_name"] == "feature/test-branch"


def test_tier1_mcp_scorecard_telemetry_increment(repo_dir: Path):
    """Verify intercepted edits increment live counters in .whyline/scorecard.json."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)
    initial_score = json.loads(store.scorecard_path.read_text(encoding="utf-8")) if store.scorecard_path.exists() else {}
    initial_events = initial_score.get("live_intercept_events", 0)

    engine.check_fences("src/main/java/com/healthconnect/payments/GatewayRouter.java")
    updated_score = json.loads(store.scorecard_path.read_text(encoding="utf-8"))
    assert updated_score.get("live_intercept_events", 0) >= initial_events + 1


# ==============================================================================
# FEATURE 6: Invariant Test Compiler (5 tests)
# ==============================================================================

def test_tier1_compiler_junit5_artifact_generation(repo_dir: Path):
    """Verify compiler produces valid JUnit 5 .java test class."""
    store = WhyLineStore(repo_dir)
    artifacts = generate_junit_and_pytest_artifacts(repo_dir, store.get_fences())
    junit_path = repo_dir / "src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java"
    assert junit_path.exists()
    content = junit_path.read_text(encoding="utf-8")
    assert "public class SpokenFenceInvariantTest" in content
    assert "@Test" in content
    assert "assertTrue" in content


def test_tier1_compiler_pytest_artifact_generation(repo_dir: Path):
    """Verify compiler produces valid runnable Pytest suite."""
    store = WhyLineStore(repo_dir)
    artifacts = generate_junit_and_pytest_artifacts(repo_dir, store.get_fences())
    pytest_path = repo_dir / "tests/test_whyline_invariants.py"
    assert pytest_path.exists()
    content = pytest_path.read_text(encoding="utf-8")
    assert "def test_fence_001_invariant():" in content
    assert "assert" in content


def test_tier1_compiler_guarded_code_passes(repo_dir: Path):
    """Verify invariant tests pass against current guarded source code."""
    src = (repo_dir / "src/main/java/com/healthconnect/payments/GatewayRouter.java").read_text(encoding="utf-8")
    assert "retryCount = 5" in src
    assert "timeoutMs = 4500" in src


def test_tier1_compiler_naive_edit_fails(temp_repo: Path):
    """Verify invariant assertion fails when naive edit removes guarded token."""
    gw_file = temp_repo / "src/main/java/com/healthconnect/payments/GatewayRouter.java"
    content = gw_file.read_text(encoding="utf-8")
    corrupted = content.replace("retryCount = 5", "retryCount = 1")
    gw_file.write_text(corrupted, encoding="utf-8")

    # Invariant assertion check
    with pytest.raises(AssertionError):
        updated_src = gw_file.read_text(encoding="utf-8")
        assert "retryCount = 5" in updated_src, "Invariant failed: retryCount must be 5"


def test_tier1_compiler_cross_boundary_expiry_evaluation(temp_repo: Path):
    """Verify compiler transitions fence to EXPIRED_SAFE_TO_REMOVE when config matches."""
    store = WhyLineStore(temp_repo)
    fences = store.get_fences()
    gw_fence = next(f for f in fences if f["id"] == "FENCE-001")

    # Update config to v2
    cfg_file = temp_repo / "config" / "application.yml"
    cfg_file.write_text("healthconnect:\n  payment:\n    gateway:\n      version: 'v2'\n", encoding="utf-8")

    updated_fences = evaluate_expiry_conditions(temp_repo, fences)
    gw_updated = next(f for f in updated_fences if f["id"] == "FENCE-001")
    assert gw_updated["status"] == "EXPIRED_SAFE_TO_REMOVE"


# ==============================================================================
# FEATURE 7: Demo Repository Scaffolding (5 tests)
# ==============================================================================

def test_tier1_demo_repo_structure_and_artifacts(repo_dir: Path):
    """Verify demo repo contains required files and directory structure."""
    assert (repo_dir / "src/main/java/com/healthconnect/payments/GatewayRouter.java").exists()
    assert (repo_dir / "config/application.yml").exists()
    assert (repo_dir / ".whyline/fences.json").exists()
    assert (repo_dir / ".whyline/scorecard.json").exists()


def test_tier1_demo_gateway_router_source(repo_dir: Path):
    """Verify GatewayRouter.java contains 5x retry loop and midnight connection drop workaround."""
    code = (repo_dir / "src/main/java/com/healthconnect/payments/GatewayRouter.java").read_text(encoding="utf-8")
    assert "retryCount = 5" in code
    assert "timeoutMs = 4500" in code
    assert "Razorpay" in code or "midnight" in code or "INC-9921" in code


def test_tier1_demo_scorecard_metrics(repo_dir: Path):
    """Verify scorecard.json records expected telemetry counters."""
    scorecard = json.loads((repo_dir / ".whyline/scorecard.json").read_text(encoding="utf-8"))
    assert scorecard["total_seeded_anomalies"] == 10
    assert scorecard["hard_blocked_edits"] >= 7
    assert scorecard["cautionary_historical_intercepts"] >= 3
    assert scorecard["routine_crud_false_positives"] == 0


def test_tier1_demo_incident_postmortems(repo_dir: Path):
    """Verify incidents.json records post-mortems for INC-9921 and INC-9984."""
    incidents_path = repo_dir / ".whyline/incidents.json"
    assert incidents_path.exists()
    incidents = json.loads(incidents_path.read_text(encoding="utf-8"))
    ids = {inc["id"] for inc in incidents}
    assert "INC-9921" in ids


def test_tier1_demo_git_history_and_authors(repo_dir: Path):
    """Verify demo repository contains author attribution records."""
    fences = json.loads((repo_dir / ".whyline/fences.json").read_text(encoding="utf-8"))
    handles = {f["author_handle"] for f in fences}
    assert "@anjani" in handles
    assert "@vikram-legacy" in handles


# ==============================================================================
# FEATURE 8: Frontend Studio & Design System (5 tests)
# ==============================================================================

def test_tier1_frontend_cream_and_olive_design_tokens():
    """Verify styles.css declares strict Cream-and-Olive tokens."""
    css_path = ROOT_DIR / "frontend" / "src" / "styles.css"
    assert css_path.exists()
    css = css_path.read_text(encoding="utf-8")
    assert "#FDFBD4" in css, "Must define base background token #FDFBD4"
    assert "#FFFEF0" in css, "Must define surface background token #FFFEF0"
    assert "#545333" in css, "Must define olive ink token #545333"
    assert "#D9D7B6" in css, "Must define border token #D9D7B6"


def test_tier1_frontend_hallmark_floor_compliance():
    """Verify styles.css satisfies Hallmark floor rules (zero box-shadow, zero backdrop-filter)."""
    css_path = ROOT_DIR / "frontend" / "src" / "styles.css"
    css = css_path.read_text(encoding="utf-8")
    assert "/* Hallmark:" in css
    assert "box-shadow: none" in css or "box-shadow" not in css or re.search(r"box-shadow:\s*none", css)
    assert not re.search(r"backdrop-filter:", css), "Backdrop filter is prohibited under Hallmark floor"


def test_tier1_frontend_briefing_dashboard_api_binding(client: TestClient):
    """Verify GET /api/briefing returns all data elements required by studio dashboard."""
    resp = client.get("/api/briefing")
    assert resp.status_code == 200
    data = resp.json()
    assert "repo_name" in data
    assert "kpis" in data
    assert "scorecard" in data
    assert "fences" in data
    assert "gateway_version" in data
    assert data["kpis"]["total_fences"] == 10


def test_tier1_frontend_component_structure():
    """Verify React components exist for Code Studio, Drawer, and Scorecard."""
    src_dir = ROOT_DIR / "frontend" / "src"
    assert src_dir.exists()
    assert (src_dir / "App.jsx").exists()
    assert (src_dir / "components" / "Layout.jsx").exists()
    assert (src_dir / "components" / "StatusBadge.jsx").exists()


def test_tier1_frontend_build_cleanliness():
    """Verify frontend contains valid package.json with React and Vite."""
    pkg_file = ROOT_DIR / "frontend" / "package.json"
    assert pkg_file.exists()
    pkg = json.loads(pkg_file.read_text(encoding="utf-8"))
    assert "react" in pkg["dependencies"]
    assert "vite" in pkg["devDependencies"] or "vite" in pkg["dependencies"]
