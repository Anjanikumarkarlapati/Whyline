"""Unit & Integration Tests for WhyLine Core Engine (Epics 2 & 3)."""
from __future__ import annotations

import asyncio
from backend.app import (
    CoPilotAskRequest,
    ConfirmFenceRequest,
    GatewayVersionRequest,
    InterceptTestRequest,
    REPO_DIR,
    ask_copilot,
    confirm_fence_by_voice,
    get_briefing,
    rescan_repository,
    simulate_agent_intercept,
    update_gateway_version,
)
from backend.whyline.ast_scanner import scan_file_for_anomalies, scan_repository
from backend.whyline.gnani_speech import rescore_transcript_with_ast
from scripts.seed_healthconnect import seed_healthconnect


def setup_module() -> None:
    seed_healthconnect(force=False)


def test_ast_scanner_detects_all_10_anomalies_and_ignores_crud() -> None:
    anomalies = scan_repository(REPO_DIR)
    assert len(anomalies) == 10, f"Expected 10 anomalies, got {len(anomalies)}"
    assert "GatewayRouter.java" in anomalies[0].file_path

    crud_file = REPO_DIR / "src/main/java/com/healthconnect/patient/PatientProfileService.java"
    crud_anomalies = scan_file_for_anomalies(REPO_DIR, crud_file)
    assert crud_anomalies == [], "Routine CRUD file must produce zero AST anomaly false positives"


def test_ast_vocabulary_rescorer_maps_code_mixed_speech() -> None:
    raw = (
        "Avunu, gateway router lo retry count = 5 alage unchandi until "
        "application yml lo gateway dot version v2 ki marustaru."
    )
    res = rescore_transcript_with_ast(raw)
    rescored = res["rescored_transcript"]
    assert "GatewayRouter.java" in rescored
    assert "retryCount" in rescored
    assert "application.yml" in rescored
    assert "gateway.version" in rescored
    assert len(res["ast_replacements"]) >= 4


def test_end_to_end_90s_demo_lifecycle_via_api() -> None:
    async def _run() -> None:
        await rescan_repository()
        briefing = await get_briefing()
        assert briefing["kpis"]["total_fences"] == 10
        fence_001 = next(f for f in briefing["fences"] if f["id"] == "FENCE-001")
        assert fence_001["status"] == "PENDING_CONFIRMATION"
        assert fence_001["provenance"]["pr_number"] == "#212"

        # 2. Confirm FENCE-001 via 10s Telugu voice confirmation
        confirmed_data = await confirm_fence_by_voice(
            "FENCE-001",
            ConfirmFenceRequest(
                transcript_text="Avunu, correct! gateway router lo retry count = 5 alage unchandi until application yml lo gateway dot version v2.",
                language="te-IN",
                author_handle="@anjani",
            ),
        )
        assert confirmed_data["fence"]["status"] == "VERIFIED_ACTIVE"
        assert "GatewayRouter.java" in confirmed_data["fence"]["transcript"]

        # 3. Simulate naive AI agent edit on GatewayRouter.java -> REJECT_EDIT
        intercept_resp = await simulate_agent_intercept(
            InterceptTestRequest(
                file_path="src/main/java/com/healthconnect/payments/GatewayRouter.java",
                proposed_diff="- int retryCount = 5;\n+ int retryCount = 1;",
                agent_name="Cursor Agent",
                declared_assumptions=["Assumes retryCount = 5 is redundant"],
            )
        )
        assert intercept_resp["fence_check"]["decision"] == "REJECT_EDIT"
        assert intercept_resp["assumption_entry"]["verdict"] == "REJECTED_BY_FENCE"

        # 4. Simulate edit on departed author file JwtClockSkewFilter.java -> WARN_AND_REQUIRE_CONFIRMATION
        hist_resp = await simulate_agent_intercept(
            InterceptTestRequest(
                file_path="src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java",
                proposed_diff="- int clockSkewSeconds = 180;\n+ int clockSkewSeconds = 5;",
                agent_name="Claude Code",
                declared_assumptions=["Assumes NTP is active everywhere"],
            )
        )
        assert hist_resp["fence_check"]["decision"] == "WARN_AND_REQUIRE_CONFIRMATION"

        # 5. Ask the Repo Co-Pilot -> RRF < 50ms + 3 strategies
        copilot_resp = await ask_copilot(
            CoPilotAskRequest(
                question="How do we safely fix the double-charge bug in GatewayRouter.java?",
                language="te-IN",
            )
        )
        assert len(copilot_resp["strategies"]) == 3
        assert copilot_resp["rrf_telemetry"]["latency_ms"] < 50.0

        # 6. Flip gateway.version to v2 in config/application.yml -> FENCE-001 becomes EXPIRED_SAFE_TO_REMOVE
        exp_resp = await update_gateway_version(GatewayVersionRequest(version="v2"))
        assert exp_resp["updated_fence"]["status"] == "EXPIRED_SAFE_TO_REMOVE"

        # Reset back to v1 for clean state
        reset_resp = await update_gateway_version(GatewayVersionRequest(version="v1"))
        assert reset_resp["updated_fence"]["status"] == "VERIFIED_ACTIVE"

    asyncio.run(_run())
