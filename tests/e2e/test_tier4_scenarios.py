"""Tier 4: Real-World Application Scenarios End-to-End Tests.

Simulates complex production incidents, architectural regressions, and Chesterton's Fence defenses:
1. INC-9921: Healthcare Payment Gateway Midnight Settlement SYN Packet Drop
2. INC-9984: Satellite-Backhaul Rural Clinic PHC JWT Clock Skew Desynchronization
3. Diagnostic Lab VLAN Legacy Mindray BC-5150 Hematology SSL Bypass
4. Rural Telehealth Tablet Adreno 619 GPU Driver Thread Sleep Race Condition
5. Telehealth Video Consultation Dual-SIM 4G Handover Stale ICE Candidate
6. State Health Insurance GST Rounding 1-Paisa Treasury Rejection
7. Air-Gapped District Hospital Offline Prescription OCR Certificate Check
8. Cross-Boundary Payment Gateway v2 Migration Graceful Expiry and Cleanup
"""
from __future__ import annotations

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.whyline.fence_compiler import (
    evaluate_expiry_conditions,
    generate_junit_and_pytest_artifacts,
)
from backend.whyline.mcp_server import WhyLineMcpEngine
from backend.whyline.store import WhyLineStore

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def test_tier4_healthcare_payment_gateway_midnight_drop_incident(temp_repo: Path, client: TestClient):
    """Scenario 1 (INC-9921 / PR #212): Midnight SYN Packet Drop Defense.
    
    A refactoring agent attempts to reduce retryCount from 5 to 1 in GatewayRouter.java.
    WhyLine intercepts the edit, logs assumptions, and blocks the regression.
    """
    store = WhyLineStore(temp_repo)
    engine = WhyLineMcpEngine(store)

    # 1. Proposed naive edit by AI assistant
    proposed_diff = (
        "--- a/GatewayRouter.java\n"
        "+++ b/GatewayRouter.java\n"
        "-        int retryCount = 5;\n"
        "-        long timeoutMs = 4500;\n"
        "+        int retryCount = 1;\n"
        "+        long timeoutMs = 500;\n"
    )
    assumptions = [
        "Assumes Razorpay gateway responds within 500ms at all times",
        "Assumes 5 retries is unnecessary legacy defensive coding",
    ]

    # 2. FastMCP intercepts the proposed diff
    result = engine.verify_diff_against_fences(
        target_file="src/main/java/com/healthconnect/payments/GatewayRouter.java",
        proposed_diff=proposed_diff,
        agent_assumptions=assumptions,
        agent_name="Autonomous Refactor Bot",
    )

    # 3. Assert Hard Rejection with full Chesterton's rationale
    assert result["fence_check"]["decision"] == "REJECT_EDIT"
    assert "FENCE-001" in result["fence_check"]["reason"]
    assert "INC-9921" in result["fence_check"]["reason"]
    assert "drops every 4th midnight SYN packet" in result["fence_check"]["reason"]
    assert result["assumption_entry"]["verdict"] == "REJECTED_BY_FENCE"

    # 4. Invariant test verification
    src = (temp_repo / "src/main/java/com/healthconnect/payments/GatewayRouter.java").read_text(encoding="utf-8")
    assert "retryCount = 5" in src
    assert "timeoutMs = 4500" in src


def test_tier4_jwt_clock_skew_historical_caution_scenario(temp_repo: Path):
    """Scenario 2 (INC-9984 / PR #219): Satellite-Backhaul JWT Skew Defense.
    
    A security scanner attempts to lower clockSkewSeconds from 180 to 5 in JwtClockSkewFilter.java.
    WhyLine identifies departed author @vikram-legacy and enforces explicit human confirmation.
    """
    store = WhyLineStore(temp_repo)
    engine = WhyLineMcpEngine(store)

    check = engine.check_fences(
        file_path="src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java",
        proposed_diff="- int clockSkewSeconds = 180;\n+ int clockSkewSeconds = 5;",
    )

    assert check["decision"] == "WARN_AND_REQUIRE_CONFIRMATION"
    assert "FENCE-003" == check["fence"]["id"]
    assert "@vikram-legacy" in check["reason"]
    assert check["fence"]["provenance"]["incident_id"] in ("INC-7410", "INC-9984")
    assert "clockSkewSeconds" in check["fence"]["matched_token"]


def test_tier4_legacy_hl7_ssl_bypass_containment_scenario(temp_repo: Path):
    """Scenario 3: Diagnostic Lab VLAN Legacy Mindray BC-5150 Hematology Analyzer.
    
    A linter flags @SuppressWarnings("deprecation") and TrustAllCerts in LegacyHl7SslClient.java.
    WhyLine protects the scoped lab workaround while keeping diagnostic machines online.
    """
    store = WhyLineStore(temp_repo)
    fences = store.get_fences()
    hl7_fence = next(f for f in fences if f["id"] == "FENCE-004")

    assert hl7_fence["status"] == "UNVERIFIED_HISTORICAL"
    assert "Mindray BC-5150" in hl7_fence["danger_condition"]
    assert "10.42.0.0/16" in hl7_fence["constraint_summary"]

    # Verify source contains the guarded token
    src = (temp_repo / hl7_fence["file_path"]).read_text(encoding="utf-8")
    assert '@SuppressWarnings("deprecation")' in src


def test_tier4_rural_dicom_tablet_rendering_thread_sleep(temp_repo: Path):
    """Scenario 4: Adreno 619 GPU Driver Thread Sleep Race Condition.
    
    A developer removes Thread.sleep(120) in DicomShaderPipeline.java.
    WhyLine prevents half-zeroed radiology slice corruption on rural clinic tablets.
    """
    store = WhyLineStore(temp_repo)
    engine = WhyLineMcpEngine(store)

    check = engine.check_fences("src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java")
    assert check["decision"] in ("REJECT_EDIT", "WARN_AND_REQUIRE_CONFIRMATION")
    assert "FENCE-002" == check["fence"]["id"]
    assert "Adreno 619" in check["fence"]["constraint_summary"]
    assert "half-zeroed X-ray slice textures" in check["fence"]["danger_condition"]


def test_tier4_telehealth_webrtc_stale_candidate_handover(temp_repo: Path):
    """Scenario 5: Telehealth Video Consultation Dual-SIM 4G Handover.
    
    Ensures swallowed catch block in WebRtcIceCandidateHandler.java is preserved
    so active video calls are not disconnected during cell tower handover.
    """
    store = WhyLineStore(temp_repo)
    fences = store.get_fences()
    webrtc_fence = next(f for f in fences if f["id"] == "FENCE-005")

    assert "Dual-SIM 4G" in webrtc_fence["constraint_summary"]
    assert "drops active telehealth video calls" in webrtc_fence["danger_condition"]

    src = (temp_repo / webrtc_fence["file_path"]).read_text(encoding="utf-8")
    assert "catch" in src


def test_tier4_gst_rounding_one_paisa_state_treasury_rejection(temp_repo: Path):
    """Scenario 6: State Health Insurance GST Rounding 1-Paisa Treasury Rejection.
    
    Verifies epsilon_bias = 0.0049 in gst_rounding_engine.py is guarded against removal.
    """
    store = WhyLineStore(temp_repo)
    engine = WhyLineMcpEngine(store)

    check = engine.check_fences("services/billing/gst_rounding_engine.py")
    assert check["decision"] == "WARN_AND_REQUIRE_CONFIRMATION"
    assert "FENCE-008" == check["fence"]["id"]
    assert "epsilon_bias = 0.0049" in check["fence"]["constraint_summary"]
    assert "1-paisa state treasury settlement rejection" in check["fence"]["danger_condition"]


def test_tier4_district_hospital_offline_prescription_ocr(temp_repo: Path):
    """Scenario 7: Air-Gapped District Hospital Offline Prescription OCR.
    
    Verifies verify = False in prescription_parser.py is guarded for air-gapped LAN OCR mirrors.
    """
    store = WhyLineStore(temp_repo)
    fences = store.get_fences()
    ocr_fence = next(f for f in fences if f["id"] == "FENCE-009")

    assert "air-gapped district hospital" in ocr_fence["constraint_summary"]
    assert "fails offline weight loading" in ocr_fence["danger_condition"]

    src = (temp_repo / ocr_fence["file_path"]).read_text(encoding="utf-8")
    assert "verify" in src


def test_tier4_cross_boundary_v2_migration_graceful_expiry(temp_repo: Path, client: TestClient):
    """Scenario 8: Complete Payment Gateway v2 Cutover and Cleanup Lifecycle.
    
    1. Initially v1: FENCE-001 is active; edits rejected.
    2. Operations updates config/application.yml to gateway.version: 'v2'.
    3. Fence transitions to EXPIRED_SAFE_TO_REMOVE.
    4. MCP allows cleanup diff.
    5. Invariant suite skips assertion.
    """
    store = WhyLineStore(temp_repo)
    engine = WhyLineMcpEngine(store)

    # 1. Active state check
    c1 = engine.check_fences("src/main/java/com/healthconnect/payments/GatewayRouter.java")
    assert c1["decision"] in ("REJECT_EDIT", "WARN_AND_REQUIRE_CONFIRMATION")

    # 2. Upgrade config via API or direct file edit
    cfg_file = temp_repo / "config" / "application.yml"
    cfg_file.write_text("healthconnect:\n  payment:\n    gateway:\n      version: 'v2'\n", encoding="utf-8")

    # 3. Re-evaluate expiry
    fences = store.get_fences()
    gw_fence = next(f for f in fences if f["id"] == "FENCE-001")
    assert gw_fence["status"] == "EXPIRED_SAFE_TO_REMOVE"

    # 4. MCP allows edit with cleanup instructions
    c2 = engine.check_fences("src/main/java/com/healthconnect/payments/GatewayRouter.java")
    assert c2["decision"] == "ALLOW_EDIT"
    assert "EXPIRED_SAFE_TO_REMOVE" in c2["reason"]

    # 5. Generated test reflects expired state
    generate_junit_and_pytest_artifacts(temp_repo, fences)
    pytest_src = (temp_repo / "tests/test_whyline_invariants.py").read_text(encoding="utf-8")
    assert 'if "EXPIRED_SAFE_TO_REMOVE" == "EXPIRED_SAFE_TO_REMOVE":' in pytest_src
