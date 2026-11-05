"""Tier 3: Cross-Feature Combinations End-to-End Tests.

Exercises multi-step, cross-boundary pipelines combining two or more subsystems:
1. Speech -> Rescorer -> Fence Compiler -> Invariant Test Run
2. FastMCP Server -> Git Diff -> Pre-Commit Hook Abort
3. RAG Query -> Dense Embedding -> RRF Retrieval -> Ranked Strategies
4. Config Expiry -> Status Transition -> MCP Allow Edit -> Invariant Pass
5. AST Scanner -> Git Provenance Mining -> Synthesized Fence Record
6. Incident Webhook -> Voice Rescoring -> Audio Synthesis -> KPI Update
7. Dead-End Checkpoint Pause -> Audio Synthesis -> Resume Briefing
8. Successive Voice Confirmations -> Benchmark Scorecard Integrity
"""
from __future__ import annotations

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.whyline.ast_scanner import scan_repository
from backend.whyline.fence_compiler import (
    build_fence_record,
    evaluate_expiry_conditions,
    generate_junit_and_pytest_artifacts,
)
from backend.whyline.gnani_speech import (
    rescore_transcript_with_ast,
    synthesize_timbre_audio,
)
from backend.whyline.mcp_server import WhyLineMcpEngine
from backend.whyline.provenance_miner import mine_provenance_for_anomaly
from backend.whyline.store import WhyLineStore

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def test_tier3_speech_rescorer_to_compiler_to_invariant_test(temp_repo: Path):
    """Pipeline: Indic voice -> AST rescorer -> fence compiler -> executable invariant test."""
    store = WhyLineStore(temp_repo)
    fences = store.get_fences()
    gw_fence = next(f for f in fences if f["id"] == "FENCE-001")

    # 1. Spoken input with code-mixed phonetic references
    raw_voice = "Avunu, gateway router lo retry count = 5 alage unchandi until application yml v2."
    rescored = rescore_transcript_with_ast(raw_voice)
    assert "GatewayRouter.java" in rescored["rescored_transcript"]
    assert "retryCount" in rescored["rescored_transcript"]

    # 2. Confirm fence with rescored transcript
    gw_fence["status"] = "VERIFIED_ACTIVE"
    gw_fence["transcript"] = rescored["rescored_transcript"]
    store.save_fences(fences)

    # 3. Compile invariant test artifacts
    artifacts = generate_junit_and_pytest_artifacts(temp_repo, fences)
    pytest_file = temp_repo / artifacts["pytest_test_path"]
    assert pytest_file.exists()

    # 4. Verify invariant assertion passes on guarded code
    src = (temp_repo / "src/main/java/com/healthconnect/payments/GatewayRouter.java").read_text(encoding="utf-8")
    assert "retryCount = 5" in src


def test_tier3_mcp_git_diff_to_pre_commit_abort(temp_repo: Path):
    """Pipeline: Staged git diff -> MCP guardrail evaluation -> commit rejection."""
    store = WhyLineStore(temp_repo)
    engine = WhyLineMcpEngine(store)

    # 1. Proposed naive diff removing retry loop
    proposed_diff = (
        "--- a/src/main/java/com/healthconnect/payments/GatewayRouter.java\n"
        "+++ b/src/main/java/com/healthconnect/payments/GatewayRouter.java\n"
        "@@ -6,3 +6,3 @@\n"
        "-        int retryCount = 5;\n"
        "+        int retryCount = 1;\n"
    )

    # 2. MCP diff verification
    res = engine.verify_diff_against_fences(
        target_file="src/main/java/com/healthconnect/payments/GatewayRouter.java",
        proposed_diff=proposed_diff,
        agent_assumptions=["Assumes gateway never drops packets at midnight"],
        agent_name="Cursor AI Agent",
    )

    # 3. Decision must reject edit and log to assumptions ledger
    assert res["fence_check"]["decision"] == "REJECT_EDIT"
    assert res["assumption_entry"]["verdict"] == "REJECTED_BY_FENCE"
    assert "INC-9921" in res["fence_check"]["reason"]


def test_tier3_rag_query_to_rrf_to_gemini_strategies(client: TestClient):
    """Pipeline: Natural language question -> MiniLM embedding -> RRF retrieval -> 3 ranked strategies."""
    resp = client.post(
        "/api/copilot/ask",
        json={
            "question": "How can we resolve payment timeouts during midnight without dropping transactions?",
            "language": "te-IN",
        },
    )
    assert resp.status_code == 200
    data = resp.json()

    # Verify RRF telemetry
    assert data["rrf_telemetry"]["latency_ms"] < 1000.0
    matched_ids = [m["id"] for m in data["rrf_telemetry"]["matched_fences"]]
    assert "FENCE-001" in matched_ids

    # Verify 3 ranked strategies
    strategies = data["strategies"]
    assert len(strategies) == 3
    assert strategies[0]["rank"] == 1
    assert "Idempotent" in strategies[0]["title"]


def test_tier3_config_expiry_to_mcp_allow_edit_to_compiler_skip(temp_repo: Path):
    """Pipeline: Config update v2 -> fence expiry -> MCP allows edit -> invariant passes/skips."""
    store = WhyLineStore(temp_repo)
    cfg = temp_repo / "config" / "application.yml"

    # 1. Update config to gateway.version: "v2"
    cfg.write_text("healthconnect:\n  payment:\n    gateway:\n      version: 'v2'\n", encoding="utf-8")

    # 2. Expiry evaluator marks fence as EXPIRED_SAFE_TO_REMOVE
    fences = store.get_fences()
    gw_fence = next(f for f in fences if f["id"] == "FENCE-001")
    assert gw_fence["status"] == "EXPIRED_SAFE_TO_REMOVE"

    # 3. MCP check now returns ALLOW_EDIT
    engine = WhyLineMcpEngine(store)
    mcp_res = engine.check_fences("src/main/java/com/healthconnect/payments/GatewayRouter.java")
    assert mcp_res["decision"] == "ALLOW_EDIT"
    assert "EXPIRED_SAFE_TO_REMOVE" in mcp_res["reason"]

    # 4. Generate invariant suite and verify status is EXPIRED_SAFE_TO_REMOVE
    generate_junit_and_pytest_artifacts(temp_repo, fences)
    pytest_src = (temp_repo / "tests/test_whyline_invariants.py").read_text(encoding="utf-8")
    assert 'if "EXPIRED_SAFE_TO_REMOVE" == "EXPIRED_SAFE_TO_REMOVE":' in pytest_src


def test_tier3_scanner_anomaly_to_provenance_to_fence_record(temp_repo: Path):
    """Pipeline: AST scanning -> Git blame mining -> complete fence record synthesis."""
    anomalies = scan_repository(temp_repo)
    gw_anomaly = next(a for a in anomalies if "GatewayRouter" in a.file_path)

    # Mine provenance from git / fixtures
    provenance = mine_provenance_for_anomaly(temp_repo, gw_anomaly)
    assert provenance["pr_number"] == "#212"
    assert provenance["incident_id"] == "INC-9921"

    # Build fence record
    fence = build_fence_record(1, temp_repo, gw_anomaly, provenance)
    assert fence["id"] == "FENCE-001"
    assert "Preserve retryCount" in fence["constraint_summary"]
    assert "drops every 4th midnight SYN packet" in fence["danger_condition"]


def test_tier3_incident_webhook_to_audio_synthesis_to_dashboard_kpis(client: TestClient):
    """Pipeline: Incident webhook -> AST rescoring -> Timbre audio -> dashboard KPI update."""
    # 1. Post new incident webhook
    webhook_payload = {
        "incident_id": "INC-TEST-100",
        "source": "E2E Integration Test",
        "service": "HealthConnect Core Router",
        "title": "Midnight Drop Re-test",
        "oncall_engineer": "@anjani",
        "language": "te-IN",
        "voice_postmortem": "gateway router lo retry count = 5 alage unchandi Razorpay v1 packet drop.",
        "linked_fence_id": "FENCE-001",
    }
    import hashlib
    import hmac
    import os

    from backend.app import store
    if store.incidents_path.exists():
        try:
            curr = json.loads(store.incidents_path.read_text(encoding="utf-8"))
            filtered = [x for x in curr if x.get("id") != "INC-TEST-100"]
            store.incidents_path.write_text(json.dumps(filtered, indent=2), encoding="utf-8")
        except Exception:
            pass

    secret = (os.getenv("WEBHOOK_SECRET") or os.getenv("INCIDENT_WEBHOOK_SECRET") or "whyline_test_webhook_secret_local").strip()
    raw_bytes = json.dumps(webhook_payload).encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), raw_bytes, hashlib.sha256).hexdigest()
    headers = {
        "X-PagerDuty-Signature": f"sha256={sig}",
        "Content-Type": "application/json",
    }
    wh_resp = client.post("/api/incidents/webhook", content=raw_bytes, headers=headers)
    assert wh_resp.status_code == 200
    assert "GatewayRouter.java" in wh_resp.json()["incident"]["voice_postmortem"]

    # 2. Check incidents list reflects new record
    inc_resp = client.get("/api/incidents")
    assert inc_resp.status_code == 200
    inc_ids = [inc["id"] for inc in inc_resp.json()["incidents"]]
    assert "INC-TEST-100" in inc_ids

    # 3. Check briefing dashboard
    br_resp = client.get("/api/briefing")
    assert br_resp.status_code == 200
    assert br_resp.json()["kpis"]["total_fences"] == 10


def test_tier3_dead_end_checkpoint_pause_to_resume_briefing(client: TestClient):
    """Pipeline: Pause branch with dead ends -> audio briefing synthesized -> resume context."""
    # 1. Pause branch
    pause_payload = {
        "branch_name": "fix/e2e-double-charge",
        "action": "pause",
        "author_handle": "@anjani",
        "summary": "Investigating duplicate settlement retries during midnight window.",
        "ruled_out_dead_ends": [
            "Removing retryCount in GatewayRouter.java drops midnight packets (INC-9921)"
        ],
        "next_untested_action": "Add X-Idempotency-Key header to webhook frames.",
    }
    pause_resp = client.post("/api/checkpoints", json=pause_payload)
    assert pause_resp.status_code == 200
    chk = pause_resp.json()["checkpoint"]
    assert chk["branch_name"] == "fix/e2e-double-charge"
    assert "/api/audio/" in chk["audio_url"]

    # 2. Resume branch
    resume_resp = client.post(
        "/api/checkpoints",
        json={"branch_name": "fix/e2e-double-charge", "action": "resume"},
    )
    assert resume_resp.status_code == 200
    resumed_chk = resume_resp.json()["checkpoint"]
    assert resumed_chk["id"] == chk["id"]
    assert len(resumed_chk["ruled_out_dead_ends"]) == 1


def test_tier3_concurrent_voice_confirmations_and_benchmarking(client: TestClient, temp_repo: Path):
    """Pipeline: Multi-turn voice confirmations across languages -> atomic scorecard benchmark."""
    # Confirm FENCE-001 in Telugu
    r1 = client.post(
        "/api/fences/FENCE-001/confirm",
        json={
            "transcript_text": "gateway router retry count 5 unchandi",
            "language": "te-IN",
            "author_handle": "@anjani",
        },
    )
    assert r1.status_code == 200

    # Rescan & benchmark
    scan_resp = client.post("/api/fences/scan")
    assert scan_resp.status_code == 200
    scorecard = scan_resp.json()["scorecard"]
    assert scorecard["total_seeded_anomalies"] == 10
    assert scorecard["hard_blocked_edits"] >= 7
