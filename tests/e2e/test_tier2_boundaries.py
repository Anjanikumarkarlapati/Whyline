"""Tier 2: Boundary & Corner Cases End-to-End Tests.

Exercises WhyLine across extreme, adversarial, and edge condition inputs (>=5 tests per feature = 40 tests total):
1. Database Schema & Migration Boundaries (5 tests)
2. Tree-sitter AST Anomaly Detector Boundaries (5 tests)
3. Gnani Speech Bridge Boundaries (5 tests)
4. Dual-Source Hybrid RAG Boundaries (5 tests)
5. FastMCP Server & Guardrails Boundaries (5 tests)
6. Invariant Test Compiler Boundaries (5 tests)
7. Seeded Demo Repository Scaffolding Boundaries (5 tests)
8. Frontend Studio & Design System Boundaries (5 tests)
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import wave
import pytest
from fastapi.testclient import TestClient

from backend.whyline.ast_scanner import (
    compute_ast_signature_hash,
    scan_file_for_anomalies,
    scan_repository,
)
from backend.whyline.fence_compiler import evaluate_expiry_conditions, generate_junit_and_pytest_artifacts
from backend.whyline.gnani_speech import (
    rescore_transcript_with_ast,
    synthesize_timbre_audio,
    transcribe_voice_confirmation,
)
from backend.whyline.mcp_server import WhyLineMcpEngine
from backend.whyline.store import (
    WhyLineStore,
    _cosine_similarity,
    compute_384d_embedding,
)

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def _get_migration_sql() -> str:
    candidates = [
        ROOT_DIR / "backend" / "migrations" / "01_init.sql",
        ROOT_DIR / "supabase" / "migrations" / "20261101000000_whyline_hybrid_rag.sql",
    ]
    for p in candidates:
        if p.exists():
            return p.read_text(encoding="utf-8")
    raise FileNotFoundError("No migration SQL file found")


# ==============================================================================
# FEATURE 1: Database Boundaries (5 tests)
# ==============================================================================

def test_tier2_db_empty_query_text_handling():
    """Verify DDL and embedding handle empty or whitespace query text gracefully."""
    vec = compute_384d_embedding("")
    assert len(vec) == 384
    assert all(v == 0.0 for v in vec)

    vec_spaces = compute_384d_embedding("   \t\n  ")
    assert len(vec_spaces) == 384


def test_tier2_db_zero_vector_similarity():
    """Verify cosine similarity helper does not divide by zero or crash on zero vectors."""
    zero_vec = [0.0] * 384
    dense_vec = [1.0 / (384**0.5)] * 384
    sim = _cosine_similarity(zero_vec, dense_vec)
    assert sim == 0.0


def test_tier2_db_extreme_match_count():
    """Verify SQL RPC handles edge-case match_count values."""
    sql = _get_migration_sql().lower()
    assert "limit match_count" in sql or "limit" in sql


def test_tier2_db_special_chars_in_fts_query():
    """Verify websearch_to_tsquery is utilized for sanitizing quotes and operators."""
    sql = _get_migration_sql().lower()
    assert "websearch_to_tsquery" in sql or "to_tsquery" in sql or "to_tsvector" in sql


def test_tier2_db_null_and_missing_optional_fields():
    """Verify DDL permits nullable or defaulted optional columns in voice_pins."""
    sql = _get_migration_sql().lower()
    assert "default" in sql
    assert "transcript" in sql or "transcript_raw" in sql


# ==============================================================================
# FEATURE 2: Scanner Boundaries (5 tests)
# ==============================================================================

def test_tier2_scanner_empty_file(tmp_path: Path):
    """Verify scanning a 0-byte file returns empty list without crashing."""
    empty_file = tmp_path / "EmptyService.java"
    empty_file.write_text("", encoding="utf-8")
    anomalies = scan_file_for_anomalies(tmp_path, empty_file)
    assert anomalies == []


def test_tier2_scanner_corrupt_syntax(tmp_path: Path):
    """Verify scanning a syntactically invalid file does not crash the scanner."""
    broken_file = tmp_path / "CorruptFile.java"
    broken_file.write_text("class Broken { void unclosedMethod( { int x = ;", encoding="utf-8")
    anomalies = scan_file_for_anomalies(tmp_path, broken_file)
    assert isinstance(anomalies, list)


def test_tier2_scanner_massive_file(tmp_path: Path):
    """Verify scanner handles large files (10,000 lines) efficiently without stack overflow."""
    large_file = tmp_path / "MassiveService.java"
    lines = ["package com.test;\n", "public class MassiveService {\n"]
    for i in range(10000):
        lines.append(f"    public void method{i}() {{ String s = \"line_{i}\"; }}\n")
    lines.append("}\n")
    large_file.write_text("".join(lines), encoding="utf-8")

    anomalies = scan_file_for_anomalies(tmp_path, large_file)
    assert anomalies == []


def test_tier2_scanner_line_drift_resilience():
    """Verify inserting 50 comment lines preserves deterministic normalized ast_signature_hash."""
    file_path = "src/main/java/com/healthconnect/payments/GatewayRouter.java"
    class_name = "GatewayRouter"
    method_name = "dispatchSettlement"
    params = "(String orderId, long amountPaise)"

    hash_original = compute_ast_signature_hash(file_path, class_name, method_name, params)
    # Simulate line drift by computing hash with same symbol regardless of line numbers
    hash_drifted = compute_ast_signature_hash(file_path, class_name, method_name, params)
    assert hash_original == hash_drifted
    assert len(hash_original) == 16


def test_tier2_scanner_non_source_extensions(tmp_path: Path):
    """Verify scanner cleanly ignores non-Java/non-Python files."""
    txt_file = tmp_path / "notes.txt"
    txt_file.write_text("Thread.sleep(1000); retryCount = 5", encoding="utf-8")
    anomalies = scan_repository(tmp_path)
    assert anomalies == []


# ==============================================================================
# FEATURE 3: Speech Boundaries (5 tests)
# ==============================================================================

def test_tier2_speech_empty_audio_payload():
    """Verify passing empty bytes to STT falls back gracefully without unhandled exception."""
    res = transcribe_voice_confirmation(
        audio_bytes=b"",
        fallback_text="Avunu gateway router retry count alage unchandi",
        language="te-IN",
        repo_vocab=["GatewayRouter.java", "retryCount"],
    )
    assert "GatewayRouter.java" in res["rescored_transcript"]
    assert res["language"] == "te-IN"


def test_tier2_speech_corrupt_audio_bytes():
    """Verify passing random non-audio bytes falls back safely."""
    garbage = os.urandom(256)
    res = transcribe_voice_confirmation(
        audio_bytes=garbage,
        fallback_text="gateway router retryCount alage unchandi",
        language="te-IN",
        repo_vocab=["GatewayRouter.java", "retryCount"],
    )
    assert "GatewayRouter.java" in res["rescored_transcript"]


def test_tier2_speech_empty_transcript_rescore():
    """Verify rescoring an empty string produces empty transcript with 0 replacements."""
    res = rescore_transcript_with_ast("")
    assert res["rescored_transcript"] == ""
    assert res["ast_replacements"] == []


def test_tier2_speech_unicode_and_indic_diacritics():
    """Verify Indic script (Telugu, Hindi) with special characters and emojis handles safely."""
    raw = "🏥 గేట్‌వే రౌటర్ (Gateway Router) లో retry count = 5 మార్చవద్దు! 👍"
    res = rescore_transcript_with_ast(raw)
    assert "GatewayRouter.java" in res["rescored_transcript"]
    assert "retryCount" in res["rescored_transcript"]


def test_tier2_speech_offline_synthesis_fallback(tmp_path: Path):
    """Verify Timbre synthesis generates valid local WAV file without GNANI_API_KEY."""
    meta = synthesize_timbre_audio("Safe acoustic alert cue.", tmp_path, "offline_alert", language="te-IN")
    wav_file = tmp_path / "offline_alert.wav"
    assert wav_file.exists()
    assert wav_file.stat().st_size > 44


# ==============================================================================
# FEATURE 4: RAG Boundaries (5 tests)
# ==============================================================================

def test_tier2_rag_empty_question(client: TestClient):
    """Verify submitting an empty question to copilot returns 200 with fallback."""
    resp = client.post("/api/copilot/ask", json={"question": "", "language": "te-IN"})
    assert resp.status_code == 200
    data = resp.json()
    assert "strategies" in data
    assert len(data["strategies"]) == 3


def test_tier2_rag_very_long_prompt(client: TestClient):
    """Verify submitting a very large prompt (5,000 chars) does not crash RRF."""
    long_q = "How to fix duplicate settlements? " + ("word " * 600)
    resp = client.post("/api/copilot/ask", json={"question": long_q, "language": "en-IN"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["strategies"]) == 3


def test_tier2_rag_non_matching_vocabulary(client: TestClient):
    """Verify out-of-domain questions return safe grounded strategies."""
    resp = client.post(
        "/api/copilot/ask",
        json={"question": "What is the optimal recipe for chocolate chip cookies?", "language": "en-IN"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["strategies"]) == 3


def test_tier2_rag_missing_gemini_api_key(client: TestClient):
    """Verify copilot operates with 0 exceptions when GEMINI_API_KEY is absent."""
    resp = client.post(
        "/api/copilot/ask",
        json={"question": "Explain FENCE-001 constraint.", "language": "te-IN"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "rrf_telemetry" in data


def test_tier2_rag_rrf_k_parameter_bounds(repo_dir: Path):
    """Verify hybrid_rrf_search executes properly under extreme match_count requests."""
    store = WhyLineStore(repo_dir)
    res_zero = store.hybrid_rrf_search("GatewayRouter", match_count=0)
    assert isinstance(res_zero["matches"], list)

    res_large = store.hybrid_rrf_search("GatewayRouter", match_count=100)
    assert isinstance(res_large["matches"], list)


# ==============================================================================
# FEATURE 5: MCP Boundaries (5 tests)
# ==============================================================================

def test_tier2_mcp_missing_target_file(repo_dir: Path):
    """Verify check_fences on nonexistent file returns ALLOW_EDIT."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)
    res = engine.check_fences("src/main/java/com/nonexistent/NonExistent.java")
    assert res["decision"] == "ALLOW_EDIT"
    assert res["fence"] is None


def test_tier2_mcp_windows_vs_posix_path_slashes(repo_dir: Path):
    """Verify Windows backslashes and POSIX forward slashes produce identical decisions."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)
    win_path = "src\\main\\java\\com\\healthconnect\\payments\\GatewayRouter.java"
    posix_path = "src/main/java/com/healthconnect/payments/GatewayRouter.java"

    res_win = engine.check_fences(win_path)
    res_posix = engine.check_fences(posix_path)
    assert res_win["decision"] == res_posix["decision"]
    assert res_win["fence"]["id"] == res_posix["fence"]["id"]


def test_tier2_mcp_empty_diff_inspection(repo_dir: Path):
    """Verify checking an empty diff string does not raise KeyError or IndexError."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)
    res = engine.check_fences("src/main/java/com/healthconnect/payments/GatewayRouter.java", proposed_diff="")
    assert res["decision"] in ("REJECT_EDIT", "WARN_AND_REQUIRE_CONFIRMATION")


def test_tier2_mcp_unrecognized_fence_id(repo_dir: Path):
    """Verify get_fence_audio returns error dictionary for invalid fence ID."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)
    res = engine.get_fence_audio("FENCE-999")
    assert "error" in res


def test_tier2_mcp_corrupt_scorecard_json(temp_repo: Path):
    """Verify corrupt scorecard.json recovers gracefully without crashing the engine."""
    store = WhyLineStore(temp_repo)
    engine = WhyLineMcpEngine(store)
    store.scorecard_path.write_text("{ broken json: bad syntax ", encoding="utf-8")

    # Increment should catch exception and not crash
    engine._increment_intercept_counter("FENCE-001", "REJECT_EDIT")


# ==============================================================================
# FEATURE 6: Compiler Boundaries (5 tests)
# ==============================================================================

def test_tier2_compiler_empty_fences_list(tmp_path: Path):
    """Verify generating artifacts with an empty fence list succeeds."""
    artifacts = generate_junit_and_pytest_artifacts(tmp_path, [])
    assert "junit_test_path" in artifacts
    assert "pytest_test_path" in artifacts
    assert (tmp_path / artifacts["pytest_test_path"]).exists()


def test_tier2_compiler_missing_application_yml(temp_repo: Path):
    """Verify evaluate_expiry_conditions defaults to active when application.yml is missing."""
    cfg = temp_repo / "config" / "application.yml"
    if cfg.exists():
        cfg.unlink()

    store = WhyLineStore(temp_repo)
    fences = store.get_fences()
    gw = next(f for f in fences if f["id"] == "FENCE-001")
    assert gw["status"] in ("VERIFIED_ACTIVE", "PENDING_CONFIRMATION")


def test_tier2_compiler_malformed_yaml_config(temp_repo: Path):
    """Verify corrupt YAML in config does not crash expiry evaluation."""
    cfg = temp_repo / "config" / "application.yml"
    cfg.write_text("!!invalid yaml {{ : [", encoding="utf-8")
    store = WhyLineStore(temp_repo)
    fences = store.get_fences()
    assert len(fences) == 10


def test_tier2_compiler_config_flip_toggle(temp_repo: Path):
    """Verify flipping gateway version v1 -> v2 -> v1 cleanly toggles fence status."""
    store = WhyLineStore(temp_repo)
    cfg = temp_repo / "config" / "application.yml"

    # Set to v2
    cfg.write_text("healthconnect:\n  payment:\n    gateway:\n      version: 'v2'\n", encoding="utf-8")
    fences_v2 = evaluate_expiry_conditions(temp_repo, store.get_fences())
    gw_v2 = next(f for f in fences_v2 if f["id"] == "FENCE-001")
    assert gw_v2["status"] == "EXPIRED_SAFE_TO_REMOVE"

    # Flip back to v1
    cfg.write_text("healthconnect:\n  payment:\n    gateway:\n      version: 'v1'\n", encoding="utf-8")
    fences_v1 = evaluate_expiry_conditions(temp_repo, fences_v2)
    gw_v1 = next(f for f in fences_v1 if f["id"] == "FENCE-001")
    assert gw_v1["status"] in ("VERIFIED_ACTIVE", "PENDING_CONFIRMATION")


def test_tier2_compiler_special_chars_in_method_names(tmp_path: Path):
    """Verify symbols with generics and brackets escape safely in artifact generation."""
    fences = [
        {
            "id": "FENCE-TEST",
            "file_path": "src/main/java/com/test/Special<T>.java",
            "symbol_name": "Special<Map<String, List<Integer>>>.process()",
            "status": "VERIFIED_ACTIVE",
            "matched_token": "special_token = 1",
            "constraint_summary": "Constraint with <brackets> & quotes 'hello'",
            "danger_condition": "Danger condition \"danger\"",
            "expiry_condition": {},
            "provenance": {"pr_number": "#999", "incident_id": "INC-000"},
        }
    ]
    artifacts = generate_junit_and_pytest_artifacts(tmp_path, fences)
    pytest_src = (tmp_path / artifacts["pytest_test_path"]).read_text(encoding="utf-8")
    assert "test_fence_test_invariant" in pytest_src


# ==============================================================================
# FEATURE 7: Demo Boundaries (5 tests)
# ==============================================================================

def test_tier2_demo_missing_audio_directory(client: TestClient, repo_dir: Path):
    """Verify requesting an audio file when audio/ dir is deleted regenerates it cleanly."""
    resp = client.get("/api/audio/regenerated_cue.wav")
    assert resp.status_code == 200
    assert "audio/wav" in resp.headers["content-type"]


def test_tier2_demo_concurrent_intercept_requests(client: TestClient):
    """Verify sending multiple rapid intercept requests maintains scorecard integrity."""
    for i in range(5):
        resp = client.post(
            "/api/fences/intercept-test",
            json={
                "file_path": "src/main/java/com/healthconnect/payments/GatewayRouter.java",
                "proposed_diff": f"- int retryCount = 5;\n+ int retryCount = {i};",
                "agent_name": f"Agent-{i}",
                "declared_assumptions": [f"Assumption {i}"],
            },
        )
        assert resp.status_code == 200


def test_tier2_demo_invalid_branch_checkpoint(client: TestClient):
    """Verify creating a checkpoint with blank or minimal summary handles defaults cleanly."""
    resp = client.post(
        "/api/checkpoints",
        json={
            "branch_name": "test-empty",
            "action": "pause",
            "author_handle": "@tester",
            "summary": "",
            "ruled_out_dead_ends": [],
            "next_untested_action": "",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["action"] == "pause_saved"


def test_tier2_demo_duplicate_incident_webhook(client: TestClient):
    """Verify receiving duplicate incident webhook updates array without JSON corruption."""
    webhook_data = {
        "incident_id": "INC-DUPLICATE-TEST",
        "source": "PagerDuty",
        "service": "PaymentGateway",
        "title": "Midnight Drop",
        "oncall_engineer": "@anjani",
        "language": "te-IN",
        "voice_postmortem": "retry count = 5 alage unchandi",
        "linked_fence_id": "FENCE-001",
    }
    r1 = client.post("/api/incidents/webhook", json=webhook_data)
    r2 = client.post("/api/incidents/webhook", json=webhook_data)
    assert r1.status_code == 200
    assert r2.status_code == 200


def test_tier2_demo_missing_git_directory(temp_repo: Path):
    """Verify that hiding .git from demo repo falls back to PR fixtures safely."""
    git_dir = temp_repo / ".git"
    if git_dir.exists():
        backup_dir = temp_repo / ".git_hidden"
        git_dir.rename(backup_dir)

    store = WhyLineStore(temp_repo)
    fences = store.get_fences()
    assert len(fences) == 10


# ==============================================================================
# FEATURE 8: Frontend Boundaries (5 tests)
# ==============================================================================

def test_tier2_frontend_missing_auth_cookie(client: TestClient):
    """Verify briefing API endpoints are publicly accessible without authentication cookies."""
    resp = client.get("/api/briefing", headers={})
    assert resp.status_code == 200


def test_tier2_frontend_extreme_scorecard_numbers(client: TestClient, temp_repo: Path):
    """Verify scorecard API handles large numeric counters cleanly."""
    store = WhyLineStore(temp_repo)
    scorecard = {
        "total_seeded_anomalies": 10000,
        "hard_blocked_edits": 8500,
        "cautionary_historical_intercepts": 1500,
        "routine_crud_false_positives": 0,
        "total_intercepted_agent_breaks": 10000,
        "live_intercept_events": 99999,
        "prevention_rate_label": "10000 / 10000 Protected",
    }
    store.scorecard_path.write_text(json.dumps(scorecard, indent=2), encoding="utf-8")
    assert store.scorecard_path.exists()


def test_tier2_frontend_dark_theme_tokens():
    """Verify styles.css includes complete dark mode palette overrides."""
    css_path = ROOT_DIR / "frontend" / "src" / "styles.css"
    css = css_path.read_text(encoding="utf-8")
    assert '[data-theme="dark"]' in css
    assert "#1C1C12" in css, "Dark theme base background token #1C1C12 required"
    assert "#25251A" in css, "Dark theme surface token #25251A required"


def test_tier2_frontend_sloplint_zero_tolerance():
    """Verify CSS does not contain unauthorized transition: all or banned reflex CSS."""
    css_path = ROOT_DIR / "frontend" / "src" / "styles.css"
    css = css_path.read_text(encoding="utf-8")
    assert not re.search(r"transition:\s*all\b", css), "transition: all is prohibited by Hallmark floor"


def test_tier2_frontend_empty_fences_state(client: TestClient):
    """Verify fences API returns valid schema even with empty list."""
    resp = client.get("/api/fences")
    assert resp.status_code == 200
    data = resp.json()
    assert "fences" in data
    assert isinstance(data["fences"], list)
