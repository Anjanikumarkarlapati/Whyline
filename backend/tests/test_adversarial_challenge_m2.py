"""Adversarial Empirical Challenge & Stress Test Suite for Milestone M2_R2 (challenger_1_r2_m2).

Adversarial Stress Targets:
1. AST Scanner Revert Detection:
   - Does it flag ANOMALY_REVERT_COMMIT when git is absent?
   - Does it avoid false positives on negative control files (e.g. PatientProfileService.java)?
   - Does it handle varied comment styles (# Reverted ..., // Reverted ..., inline comments)?
2. FastMCP Path Normalization:
   - Test redundant slashes (src//main), dot segments (src/./main), backslashes (src\\main),
     mixed case (GATEWAYROUTER.JAVA), and traversal (src/../src/main).
   - Verify check_fences catches all of them deterministically.
3. Staged Hook Blocking:
   - Test execute_check_staged blocking active and pending confirmation fences with exit code 1.
   - Verify unmonitored, expired, and historical fences behave correctly.
"""
from __future__ import annotations

import json
import os
import shutil
import stat
import tempfile
from pathlib import Path
import pytest

from backend.whyline.ast_scanner import (
    ANOMALY_REVERT_COMMIT,
    scan_file_for_anomalies,
    scan_repository,
)
from backend.whyline.mcp_server import WhyLineMcpEngine
from backend.whyline.store import WhyLineStore
from backend.whyline.cli_and_hooks import execute_check_staged

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
HEALTHCONNECT_DIR = REPO_ROOT / "demo-repos" / "HealthConnect"


# ============================================================================
# TARGET 1: AST Scanner Revert Detection
# ============================================================================

def test_ast_scanner_revert_detected_when_git_absent():
    """Verify that ANOMALY_REVERT_COMMIT is flagged even when .git is completely absent."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        # Ensure there is NO .git directory in tmp_path
        assert not (tmp_path / ".git").exists()

        # Python file with in-source revert comment
        py_file = tmp_path / "webhook_dispatcher.py"
        py_file.write_text(
            'def dispatch_vital_alerts(events: list) -> list:\n'
            '    # Reverted async gather batching: must dispatch sequentially in strict FIFO order\n'
            '    delivered = []\n'
            '    for e in events:\n'
            '        delivered.append(e)\n'
            '    return delivered\n',
            encoding="utf-8",
        )

        anomalies_py = scan_file_for_anomalies(tmp_path, py_file)
        revert_anomalies_py = [a for a in anomalies_py if a.anomaly_type == ANOMALY_REVERT_COMMIT]
        assert len(revert_anomalies_py) == 1, f"Expected 1 revert anomaly in Python, got {len(revert_anomalies_py)}"
        assert "Reverted async gather batching" in revert_anomalies_py[0].matched_token
        assert revert_anomalies_py[0].method_name == "dispatch_vital_alerts"

        # Java file with in-source revert comment
        java_file = tmp_path / "BatchProcessor.java"
        java_file.write_text(
            'package com.test;\n'
            'public class BatchProcessor {\n'
            '    // Reverted parallelStream() back to sequential for thread safety\n'
            '    public void processItems(java.util.List<String> items) {\n'
            '        for (String item : items) {\n'
            '            System.out.println(item);\n'
            '        }\n'
            '    }\n'
            '}\n',
            encoding="utf-8",
        )

        anomalies_java = scan_file_for_anomalies(tmp_path, java_file)
        revert_anomalies_java = [a for a in anomalies_java if a.anomaly_type == ANOMALY_REVERT_COMMIT]
        assert len(revert_anomalies_java) == 1, f"Expected 1 revert anomaly in Java, got {len(revert_anomalies_java)}"
        assert "Reverted parallelStream" in revert_anomalies_java[0].matched_token
        # In Java, methods are nested under class_declaration, so root-level child check defaults to Module / module_scope
        assert revert_anomalies_java[0].class_name in ("BatchProcessor", "Module")
        assert revert_anomalies_java[0].method_name in ("processItems", "module_scope")


def test_ast_scanner_negative_control_files_zero_false_positives():
    """Verify negative control files (e.g. PatientProfileService.java) produce 0 false positives."""
    patient_profile_java = HEALTHCONNECT_DIR / "src" / "main" / "java" / "com" / "healthconnect" / "patient" / "PatientProfileService.java"
    assert patient_profile_java.exists(), f"File does not exist: {patient_profile_java}"

    anomalies = scan_file_for_anomalies(HEALTHCONNECT_DIR, patient_profile_java)
    assert len(anomalies) == 0, f"Expected 0 anomalies in negative control PatientProfileService.java, got {len(anomalies)}"

    # Also test an arbitrary routine CRUD Python file
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        crud_py = tmp_path / "user_repository.py"
        crud_py.write_text(
            'class UserRepository:\n'
            '    def __init__(self):\n'
            '        self._users = {}\n'
            '    def get_user_by_id(self, user_id: str) -> dict:\n'
            '        return self._users.get(user_id, {})\n'
            '    def save_user(self, user_id: str, data: dict) -> None:\n'
            '        self._users[user_id] = data\n',
            encoding="utf-8",
        )
        anomalies_crud = scan_file_for_anomalies(tmp_path, crud_py)
        assert len(anomalies_crud) == 0, f"Expected 0 anomalies in routine CRUD python file, got {len(anomalies_crud)}"


def test_ast_scanner_revert_comment_variations():
    """Empirically test varied comment styles: whole-line, leading whitespace, and case-insensitivity."""
    test_cases = [
        # (code_snippet, is_java, expected_detected, comment_style_desc)
        (
            'def run():\n    # Reverted async batching\n    pass\n',
            False, True, "Python whole line with leading 4 spaces"
        ),
        (
            'def run():\n# Reverted async batching\n    pass\n',
            False, True, "Python whole line 0 spaces"
        ),
        (
            'public class X {\n    // Reverted batching\n    void m() {}\n}\n',
            True, True, "Java whole line with leading 4 spaces"
        ),
        (
            'public class X {\n// Reverted batching\n    void m() {}\n}\n',
            True, True, "Java whole line 0 spaces"
        ),
        (
            'def run():\n    # reverted lowercase token\n    pass\n',
            False, True, "Python lowercase 'reverted'"
        ),
        (
            'public class X {\n    //   REVERTED uppercase token\n    void m() {}\n}\n',
            True, True, "Java uppercase 'REVERTED' with extra spaces"
        ),
    ]

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        for idx, (code, is_java, expected_match, desc) in enumerate(test_cases):
            ext = ".java" if is_java else ".py"
            fname = tmp_path / f"test_{idx}{ext}"
            fname.write_text(code, encoding="utf-8")
            anomalies = scan_file_for_anomalies(tmp_path, fname)
            revert_anomalies = [a for a in anomalies if a.anomaly_type == ANOMALY_REVERT_COMMIT]
            assert (len(revert_anomalies) > 0) == expected_match, (
                f"Failed for case: {desc}. Expected match={expected_match}, got {len(revert_anomalies)}"
            )


def test_ast_scanner_inline_comment_limitation_behavior():
    """Document empirical behavior on inline comments: line containing code followed by # Reverted or // Reverted.
    
    The current regex is: `r"^\\s*(?:#|//)\\s*(Reverted\\b[^\\r\\n]*)"`
    Because it enforces `^\\s*`, inline comments after code do NOT match.
    We test and document this exact boundary behavior.
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        inline_py = tmp_path / "inline_test.py"
        inline_py.write_text(
            'def run():\n'
            '    batch_size = 1  # Reverted async batching: sequential only\n'
            '    return batch_size\n',
            encoding="utf-8",
        )
        anomalies_inline = scan_file_for_anomalies(tmp_path, inline_py)
        revert_anomalies = [a for a in anomalies_inline if a.anomaly_type == ANOMALY_REVERT_COMMIT]
        # Empirical finding: inline comments are NOT matched by the regex because of ^\s*
        matched = len(revert_anomalies) > 0
        print(f"\n[Empirical Observation] Inline comment matched: {matched}")
        assert not matched, "Inline comments do not match ^\\s*(?:#|//) anchor as currently designed."


# ============================================================================
# TARGET 2: FastMCP Path Normalization
# ============================================================================

def test_fastmcp_path_normalization_adversarial_vectors():
    """Adversarially stress-test check_fences with redundant slashes, dot segments,
    backslashes, uppercase/mixed case, and directory traversal.
    """
    store = WhyLineStore(HEALTHCONNECT_DIR)
    mcp = WhyLineMcpEngine(store)

    adversarial_paths = [
        # Redundant slashes
        "src//main/java/com/healthconnect/payments/GatewayRouter.java",
        "src///main///java///com///healthconnect///payments///GatewayRouter.java",
        "//src/main/java/com/healthconnect/payments/GatewayRouter.java",
        # Dot segments
        "src/./main/java/com/healthconnect/payments/GatewayRouter.java",
        "./src/main/java/com/healthconnect/payments/GatewayRouter.java",
        "src/main/./java/./com/healthconnect/./payments/GatewayRouter.java",
        # Windows-style backslashes
        r"src\main\java\com\healthconnect\payments\GatewayRouter.java",
        r"src\\main\\java\\com\\healthconnect\\payments\\GatewayRouter.java",
        r"src/main\java/com\healthconnect/payments\GatewayRouter.java",
        # Mixed and uppercase
        "GATEWAYROUTER.JAVA",
        "src/main/java/com/healthconnect/payments/GATEWAYROUTER.JAVA",
        "src/main/java/com/healthconnect/payments/Gatewayrouter.Java",
        "SRC/MAIN/JAVA/COM/HEALTHCONNECT/PAYMENTS/GATEWAYROUTER.JAVA",
        # Directory traversal (.. segments)
        "src/../src/main/java/com/healthconnect/payments/GatewayRouter.java",
        "src/main/java/com/healthconnect/payments/dummy/../GatewayRouter.java",
        "src/main/java/../../src/main/java/com/healthconnect/payments/GatewayRouter.java",
        # Partial relative paths
        "com/healthconnect/payments/GatewayRouter.java",
        "payments/GatewayRouter.java",
        "GatewayRouter.java",
    ]

    for p in adversarial_paths:
        res = mcp.check_fences(p)
        assert res["decision"] == "REJECT_EDIT", (
            f"Failed to reject edit for path: {p!r}. Got decision={res['decision']}, reason={res['reason']}"
        )
        assert res["fence"] is not None, f"Expected matched fence for path: {p!r}"
        assert res["fence"]["id"] == "FENCE-001", (
            f"Expected FENCE-001 for path: {p!r}, got {res['fence']['id']}"
        )


def test_fastmcp_path_normalization_safe_and_empty_paths():
    """Verify that empty, dot, and unmonitored paths are safely handled."""
    store = WhyLineStore(HEALTHCONNECT_DIR)
    mcp = WhyLineMcpEngine(store)

    assert mcp.check_fences("")["decision"] == "ALLOW_EDIT"
    assert mcp.check_fences(".")["decision"] == "ALLOW_EDIT"
    assert mcp.check_fences(None)["decision"] == "ALLOW_EDIT"

    unmonitored = "src/main/java/com/healthconnect/utils/DateHelper.java"
    res = mcp.check_fences(unmonitored)
    assert res["decision"] == "ALLOW_EDIT"
    assert res["fence"] is None


# ============================================================================
# TARGET 3: Staged Hook Blocking
# ============================================================================

def test_execute_check_staged_blocks_active_fence():
    """Verify execute_check_staged blocks active fence edits with exit code 1."""
    store = WhyLineStore(HEALTHCONNECT_DIR)
    fences = store.get_fences()
    f001 = next(f for f in fences if f["id"] == "FENCE-001")
    f001["status"] = "VERIFIED_ACTIVE"
    store.save_fences(fences)

    exit_code, res = execute_check_staged(
        HEALTHCONNECT_DIR,
        fallback_file="src/main/java/com/healthconnect/payments/GatewayRouter.java"
    )
    assert exit_code == 1, f"Expected exit code 1 for active fence edit, got {exit_code}"
    assert res["decision"] == "REJECT_EDIT"
    assert res["violations_count"] >= 1


def test_execute_check_staged_blocks_pending_confirmation_fence():
    """Verify execute_check_staged blocks pending confirmation fence edits with exit code 1."""
    store = WhyLineStore(HEALTHCONNECT_DIR)
    fences = store.get_fences()
    f001 = next(f for f in fences if f["id"] == "FENCE-001")
    f001["status"] = "PENDING_CONFIRMATION"
    store.save_fences(fences)

    exit_code, res = execute_check_staged(
        HEALTHCONNECT_DIR,
        fallback_file="src/main/java/com/healthconnect/payments/GatewayRouter.java"
    )
    assert exit_code == 1, f"Expected exit code 1 for pending confirmation fence edit, got {exit_code}"
    assert res["decision"] == "REJECT_EDIT"
    assert res["violations_count"] >= 1


def test_execute_check_staged_allows_expired_fence_when_config_upgraded():
    """Verify execute_check_staged allows editing expired fences with exit code 0 when config is upgraded to v2."""
    cfg_file = HEALTHCONNECT_DIR / "config" / "application.yml"
    original_cfg = cfg_file.read_text(encoding="utf-8")
    upgraded_cfg = original_cfg.replace('version: "v1"', 'version: "v2"')

    try:
        cfg_file.write_text(upgraded_cfg, encoding="utf-8")
        store = WhyLineStore(HEALTHCONNECT_DIR)
        fences = store.get_fences()
        f001 = next(f for f in fences if f["id"] == "FENCE-001")
        assert f001["status"] == "EXPIRED_SAFE_TO_REMOVE", f"Expected EXPIRED_SAFE_TO_REMOVE, got {f001['status']}"

        exit_code, res = execute_check_staged(
            HEALTHCONNECT_DIR,
            fallback_file="src/main/java/com/healthconnect/payments/GatewayRouter.java"
        )
        assert exit_code == 0, f"Expected exit code 0 for expired fence, got {exit_code}"
        assert res["decision"] == "ALLOW_EDIT"
    finally:
        cfg_file.write_text(original_cfg, encoding="utf-8")
        # Restore fences
        store = WhyLineStore(HEALTHCONNECT_DIR)
        store.get_fences()


def test_execute_check_staged_allows_unmonitored_file():
    """Verify execute_check_staged allows unmonitored files with exit code 0."""
    exit_code, res = execute_check_staged(
        HEALTHCONNECT_DIR,
        fallback_file="src/main/java/com/healthconnect/patient/PatientProfileService.java"
    )
    assert exit_code == 0, f"Expected exit code 0 for unmonitored file, got {exit_code}"
    assert res["decision"] == "ALLOW_EDIT"


def test_execute_check_staged_no_staged_files():
    """Verify execute_check_staged returns 0 when no files are staged in the repository."""
    exit_code, res = execute_check_staged(HEALTHCONNECT_DIR, fallback_file=None)
    assert exit_code == 0, f"Expected exit code 0 when no staged files, got {exit_code}"
    assert res["decision"] == "ALLOW_EDIT"


def test_execute_check_staged_historical_fence_cautionary_warning():
    """Verify execute_check_staged warns but returns exit code 0 for UNVERIFIED_HISTORICAL fences."""
    exit_code, res = execute_check_staged(
        HEALTHCONNECT_DIR,
        fallback_file="src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java"
    )
    assert exit_code == 0, f"Expected exit code 0 for cautionary historical fence, got {exit_code}"
    assert res["decision"] == "ALLOW_EDIT"


def test_execute_check_staged_with_real_git_staged_file():
    """Verify execute_check_staged detects actual git diff --cached staged files and blocks with exit code 1."""
    import subprocess
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        subprocess.run(["git", "init"], cwd=tmp, check=True, capture_output=True)
        subprocess.run(["git", "config", "user.name", "Tester"], cwd=tmp, check=True)
        subprocess.run(["git", "config", "user.email", "test@test.com"], cwd=tmp, check=True)

        whyline_dir = tmp / ".whyline"
        whyline_dir.mkdir()
        fences = [{
            "id": "FENCE-001",
            "file_path": "src/GatewayRouter.java",
            "symbol_name": "GatewayRouter.dispatch",
            "status": "VERIFIED_ACTIVE",
            "matched_token": "timeoutMs = 4500",
            "ast_signature_hash": "1234",
            "constraint_summary": "Preserve timeoutMs",
            "danger_condition": "Drops packets",
            "author_handle": "@test",
            "audio_url": "/api/audio/f001.wav",
            "invariant_test_path": "test.py",
            "provenance": {"pr_number": "#1", "incident_id": "INC-1"}
        }]
        (whyline_dir / "fences.json").write_text(json.dumps(fences), encoding="utf-8")
        (whyline_dir / "scorecard.json").write_text(json.dumps({"live_intercept_events": 0}), encoding="utf-8")

        src_dir = tmp / "src"
        src_dir.mkdir()
        target_file = src_dir / "GatewayRouter.java"
        target_file.write_text("class GatewayRouter { int timeoutMs = 1000; }", encoding="utf-8")
        subprocess.run(["git", "add", "src/GatewayRouter.java"], cwd=tmp, check=True)

        exit_code, res = execute_check_staged(tmp, fallback_file=None)
        assert exit_code == 1, f"Expected exit code 1 for real staged active fence file, got {exit_code}"
        assert res["decision"] == "REJECT_EDIT"

