"""Tier 5: Adversarial Coverage Hardening End-to-End Suite.

Empirical Challenger verification probing the WhyLine system adversarially:
1. Tree-sitter AST scanner:
   - Deeply nested functions & lambdas in Python and Java
   - Anonymous inner classes & Runnable execution
   - Idiomatic Thread.currentThread().interrupt() handling in catch blocks
   - Comments & docstrings containing anomaly tokens (MUST NOT trigger false positives)
   - Swallowed exceptions with varied whitespace, multi-line blocks, and logging variations
   - Non-ASCII, Unicode, Indic scripts (Telugu/Devanagari), and emojis in code & comments
   - Syntactically corrupt files and massive 15,000-line synthetic sources
2. FastMCP tools:
   - Path normalization vulnerability probing (// and /./ bypass vectors)
   - Case-sensitivity vulnerability on Windows/NTFS (GATEWAYROUTER.JAVA)
   - Empty string path behavior (matches first fence via endswith(""))
   - Unhandled NoneType vulnerability in get_fence_audio(None) and check_fences(None)
   - verify_diff_against_fences with empty diffs, deleted files, and extreme assumptions
   - log_or_resume_context with invalid actions, non-ASCII branch names, and empty data
3. Invariant Test Compiler & Config Expiry:
   - evaluate_expiry with missing config, corrupted YAML, and deeply nested keys
   - evaluate_expiry_conditions with unknown fence IDs and non-standard fence schemas
   - Unhandled NoneType vulnerability when matched_token is None in test generation
   - generate_junit_and_pytest_artifacts with arbitrary fence schemas and special characters
4. Git Pre-Commit Hook & CLI:
   - execute_check_staged with missing .git, clean repos, non-fenced staged files
   - Staged diffs with binary content, whitespace-only modifications, and deleted files
   - CLI commands execution (check-edit, resume, pause, benchmark, install-hooks)
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import pytest
import yaml

from backend.whyline.ast_scanner import (
    ANOMALY_MAGIC_LITERAL,
    ANOMALY_SWALLOWED_EXCEPTION,
    ANOMALY_THREAD_HALT,
    ANOMALY_VALIDATION_BYPASS,
    compute_ast_signature_hash,
    extract_repository_vocabulary,
    scan_file_for_anomalies,
    scan_repository,
)
from backend.whyline.cli_and_hooks import execute_check_staged, install_git_hooks
from backend.whyline.fence_compiler import (
    evaluate_expiry,
    evaluate_expiry_conditions,
    generate_junit_and_pytest_artifacts,
    generate_junit_test,
    generate_pytest_test,
)
from backend.whyline.mcp_server import WhyLineMcpEngine
from backend.whyline.store import WhyLineStore
from mcp.whyline_mcp import (
    check_fences as mcp_check_fences,
    get_fence_audio as mcp_get_fence_audio,
    log_or_resume_context as mcp_log_or_resume_context,
    resolve_repo_dir,
    verify_diff_against_fences as mcp_verify_diff_against_fences,
)


# ==============================================================================
# SECTION 1: Tree-sitter AST Scanner Adversarial Probing
# ==============================================================================

def test_tier5_ast_scanner_nested_functions_python(tmp_path: Path):
    """Verify scanner correctly navigates deeply nested Python functions to anchor the anomaly."""
    py_code = '''
def outer_service(request):
    def validation_layer():
        def dispatch_worker():
            import time
            time.sleep(2.5)
            return "dispatched"
        return dispatch_worker()
    return validation_layer()
'''
    target = tmp_path / "nested_worker.py"
    target.write_text(py_code, encoding="utf-8")

    anomalies = scan_file_for_anomalies(tmp_path, target)
    assert len(anomalies) == 1
    anom = anomalies[0]
    assert anom.anomaly_type == ANOMALY_THREAD_HALT
    assert anom.method_name == "dispatch_worker"
    assert "time.sleep(2.5)" in anom.matched_token


def test_tier5_ast_scanner_nested_classes_and_runnable_java(tmp_path: Path):
    """Verify scanner identifies Thread.sleep inside anonymous Runnable inside Java method."""
    java_code = '''
package com.healthconnect.async;

public class AsyncWorkerPool {
    public void submitTask() throws Exception {
        Runnable r = new Runnable() {
            @Override
            public void run() {
                try {
                    Thread.sleep(120);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }
        };
        new Thread(r).start();
    }
}
'''
    target = tmp_path / "AsyncWorkerPool.java"
    target.write_text(java_code, encoding="utf-8")

    anomalies = scan_file_for_anomalies(tmp_path, target)
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == ANOMALY_THREAD_HALT
    assert "Thread.sleep(120)" in anomalies[0].matched_token
    assert anomalies[0].method_name == "run"


def test_tier5_ast_scanner_idiomatic_interrupt_treated_as_swallowed_vulnerability(tmp_path: Path):
    """Vulnerability probe: Idiomatic Thread.currentThread().interrupt() is classified as SWALLOWED_EXCEPTION.
    
    WhyLine's AST heuristic only checks for 'throw ', 'return ', or 'log'. It does not recognize
    Thread.currentThread().interrupt(), causing an idiomatic Java thread interrupt handler to be flagged
    as a swallowed exception.
    """
    java_code = '''
package com.healthconnect.async;

public class ThreadInterruptService {
    public void executeWorker() {
        try {
            doTask();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); // Standard Java idiom
        }
    }
    private void doTask() throws InterruptedException {}
}
'''
    target = tmp_path / "ThreadInterruptService.java"
    target.write_text(java_code, encoding="utf-8")

    anomalies = scan_file_for_anomalies(tmp_path, target)
    # Idiomatic Thread.currentThread().interrupt() is recognized as handling the exception
    assert len(anomalies) == 0


def test_tier5_ast_scanner_comments_and_docstrings_false_positive_immunity(tmp_path: Path):
    """Verify scanner does NOT flag anomaly tokens inside comments or docstrings."""
    py_code = '''
"""
Module Documentation:
Do NOT use time.sleep(10) in this module.
Never set verify = False in production.
Legacy timeout: timeoutMs = 5000.
"""

# Single line comment mentioning Thread.sleep(500) and retryCount = 10
def clean_payment_calculator(principal: float, rate: float) -> float:
    # verify = False was deprecated in v1.2
    # retryCount = 999 is dangerous
    interest = principal * rate
    return principal + interest
'''
    target = tmp_path / "docstring_service.py"
    target.write_text(py_code, encoding="utf-8")

    anomalies = scan_file_for_anomalies(tmp_path, target)
    assert len(anomalies) == 0, f"False positive triggered by docstrings/comments: {anomalies}"


def test_tier5_ast_scanner_java_multiline_block_comments_immunity(tmp_path: Path):
    """Verify scanner does NOT flag anomaly patterns inside Java /* ... */ comments."""
    java_code = '''
package com.healthconnect.audit;

/*
 * Legacy Reference Notes:
 * In v1.0, we used:
 *   Thread.sleep(120);
 *   retryCount = 5;
 *   timeoutMs = 4500;
 *   @SuppressWarnings("deprecation")
 *   String s = "TrustAllCerts";
 */
public class CleanAuditReport {
    /**
     * @deprecated replaced by secureAuditMethod()
     * Note: do not use verify = false
     */
    public boolean generateReport(String reportId) {
        // Comment: Thread.sleep(50)
        return reportId != null && !reportId.isEmpty();
    }
}
'''
    target = tmp_path / "CleanAuditReport.java"
    target.write_text(java_code, encoding="utf-8")

    anomalies = scan_file_for_anomalies(tmp_path, target)
    assert len(anomalies) == 0, f"False positive triggered by Java comments: {anomalies}"


def test_tier5_ast_scanner_swallowed_catch_variations(tmp_path: Path):
    """Verify swallowed catch flags empty blocks but permits logged or rethrown exceptions."""
    java_code = '''
package com.healthconnect.handlers;

public class ExceptionTestCases {
    // Should be flagged: completely empty catch
    public void emptyCatch() {
        try {
            doSomething();
        } catch (Exception e) {
        }
    }

    // Should NOT be flagged: logged exception
    public void loggedCatch() {
        try {
            doSomething();
        } catch (Exception e) {
            logger.warn("Caught expected error", e);
        }
    }

    // Should NOT be flagged: rethrown exception
    public void rethrownCatch() {
        try {
            doSomething();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void doSomething() {}
}
'''
    target = tmp_path / "ExceptionTestCases.java"
    target.write_text(java_code, encoding="utf-8")

    anomalies = scan_file_for_anomalies(tmp_path, target)
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == ANOMALY_SWALLOWED_EXCEPTION
    assert anomalies[0].method_name == "emptyCatch"


def test_tier5_ast_scanner_non_ascii_and_indic_tokens(tmp_path: Path):
    """Verify scanner parses files containing Telugu comments, Unicode identifiers, and emojis."""
    py_code = '''
# 🏥 హెల్త్‌కనెక్ట్ సర్వీస్ - HealthConnect Telugu Service
def process_prescription_డేటా(రోగి_id: str) -> dict:
    """ఆసుపత్రి ప్రిస్క్రిప్షన్ ప్రాసెసింగ్"""
    # జాగ్రత్త: ఇక్కడ time.sleep వాడకూడదు
    timeoutMs = 3000  # Magic timeout
    return {"status": "SUCCESS", "patient": రోగి_id, "badge": "🩺"}
'''
    target = tmp_path / "indic_service.py"
    target.write_text(py_code, encoding="utf-8")

    anomalies = scan_file_for_anomalies(tmp_path, target)
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == ANOMALY_MAGIC_LITERAL
    assert "timeoutMs = 3000" in anomalies[0].matched_token


def test_tier5_ast_scanner_massive_synthetic_source(tmp_path: Path):
    """Verify scanner handles 15,000-line source file with single buried anomaly."""
    lines = ["package com.healthconnect.big;\n", "public class MassiveClass {\n"]
    for i in range(1, 15000):
        if i == 7500:
            lines.append("    public void buriedMethod() { int retryCount = 5; }\n")
        else:
            lines.append(f"    public int routineCalc{i}(int x) {{ return x + {i % 10}; }}\n")
    lines.append("}\n")

    target = tmp_path / "MassiveClass.java"
    target.write_text("".join(lines), encoding="utf-8")

    anomalies = scan_file_for_anomalies(tmp_path, target)
    assert len(anomalies) == 1
    assert anomalies[0].method_name == "buriedMethod"
    assert anomalies[0].start_line == 7502


# ==============================================================================
# SECTION 2: FastMCP Tools Adversarial Probing
# ==============================================================================

def test_tier5_mcp_check_fences_clean_path_matching(repo_dir: Path):
    """Verify check_fences behavior across standard path formulations."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)

    # 1. Non-existent file returns ALLOW_EDIT
    res = engine.check_fences("com/healthconnect/NonExistent.java")
    assert res["decision"] == "ALLOW_EDIT"
    assert res["fence"] is None

    # 2. Leading ./ with normalized subpath matches FENCE-001
    clean_rel = "./src/main/java/com/healthconnect/payments/GatewayRouter.java"
    res_clean = engine.check_fences(clean_rel)
    assert res_clean["fence"]["id"] == "FENCE-001"

    # 3. Simple filename match
    res_file = engine.check_fences("GatewayRouter.java")
    assert res_file["fence"]["id"] == "FENCE-001"


def test_tier5_mcp_path_normalization_bypass_vulnerability(repo_dir: Path):
    """Verify non-normalized path separators are canonicalized and intercepted."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)

    # Standard clean path: hard intercepted
    res_clean = engine.check_fences("src/main/java/com/healthconnect/payments/GatewayRouter.java")
    assert res_clean["decision"] == "REJECT_EDIT"
    assert res_clean["fence"]["id"] == "FENCE-001"

    # Redundant slash bypass vector: canonicalized and hard intercepted
    res_double_slash = engine.check_fences("src//main/java/com/healthconnect/payments/GatewayRouter.java")
    assert res_double_slash["decision"] == "REJECT_EDIT"
    assert res_double_slash["fence"]["id"] == "FENCE-001"

    # Relative dot bypass vector: canonicalized and hard intercepted
    res_dot_slash = engine.check_fences("src/./main/java/com/healthconnect/payments/GatewayRouter.java")
    assert res_dot_slash["decision"] == "REJECT_EDIT"
    assert res_dot_slash["fence"]["id"] == "FENCE-001"


def test_tier5_mcp_case_sensitivity_bypass_vulnerability(repo_dir: Path):
    """Verify case-insensitive matching prevents uppercase bypass."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)

    res_upper = engine.check_fences("GATEWAYROUTER.JAVA")
    assert res_upper["decision"] == "REJECT_EDIT"
    assert res_upper["fence"]["id"] == "FENCE-001"


def test_tier5_mcp_empty_path_matches_first_fence_anomaly(repo_dir: Path):
    """Verify empty file_path returns ALLOW_EDIT without false-matching any fence."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)

    res_empty = engine.check_fences("")
    assert res_empty["decision"] == "ALLOW_EDIT"
    assert res_empty["reason"] == "Empty target path specified."
    assert res_empty["fence"] is None


def test_tier5_mcp_unhandled_none_type_exceptions(repo_dir: Path):
    """Verify passing None to MCP engine methods is handled gracefully without exceptions."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)

    res_audio = engine.get_fence_audio(None)
    assert res_audio == {"error": "Invalid fence_id"}

    res_check = engine.check_fences(None)
    assert res_check["decision"] == "ALLOW_EDIT"
    assert res_check["reason"] == "Empty target path specified."
    assert res_check["fence"] is None


def test_tier5_mcp_verify_diff_extreme_assumptions(temp_repo: Path):
    """Verify verify_diff_against_fences handles empty assumptions, None, and massive list."""
    store = WhyLineStore(temp_repo)
    engine = WhyLineMcpEngine(store)

    # 1. FastMCP wrapper defaults None to []
    res_mcp = mcp_verify_diff_against_fences(
        target_file="src/main/java/com/healthconnect/payments/GatewayRouter.java",
        proposed_diff="--- a\n+++ b\n",
        agent_assumptions=None,
    )
    assert res_mcp["assumption_entry"]["declared_assumptions"] == []

    # 2. Large list with 500 assumptions including Telugu and emojis
    large_assumptions = [f"Hypothesis {i}: 🏥 నెట్‌వర్క్ ప్యాకెట్ డ్రాప్ కాలేదు 👍" for i in range(500)]
    res_large = engine.verify_diff_against_fences(
        target_file="src/main/java/com/healthconnect/payments/GatewayRouter.java",
        proposed_diff="- int retryCount = 5;\n+ int retryCount = 1;",
        agent_assumptions=large_assumptions,
        agent_name="Adversarial Stress Agent",
    )
    assert len(res_large["assumption_entry"]["declared_assumptions"]) == 500
    assert res_large["assumption_entry"]["verdict"] == "REJECTED_BY_FENCE"


def test_tier5_mcp_log_or_resume_context_invalid_actions(temp_repo: Path):
    """Verify log_or_resume_context handles arbitrary actions safely without raising exceptions."""
    store = WhyLineStore(temp_repo)
    engine = WhyLineMcpEngine(store)

    # 1. Unrecognized action string
    res_unknown = engine.log_or_resume_context(
        branch_name="feature/adversarial",
        action="unexpected_action_mode",
    )
    assert res_unknown["action"] == "resume_briefing"

    # 2. Pause with Telugu branch name and empty lists
    res_pause = engine.log_or_resume_context(
        branch_name="శాఖ/చెల్లింపు-గేట్‌వే",
        action="pause",
        author_handle="@పరిశోధకుడు",
        summary="తెలుగు సారాంశం",
        ruled_out_dead_ends=None,
        next_untested_action="తదుపరి చర్య",
    )
    assert res_pause["action"] == "pause_saved"
    assert res_pause["checkpoint"]["branch_name"] == "శాఖ/చెల్లింపు-గేట్‌వే"

    # 3. Resume the exact Telugu branch
    res_resume = engine.log_or_resume_context(
        branch_name="శాఖ/చెల్లింపు-గేట్‌వే",
        action="resume",
    )
    assert res_resume["checkpoint"]["author_handle"] == "@పరిశోధకుడు"


def test_tier5_mcp_get_fence_audio_edge_ids(repo_dir: Path):
    """Verify get_fence_audio handling of lowercase, uppercase, unknown, and SQL injection strings."""
    store = WhyLineStore(repo_dir)
    engine = WhyLineMcpEngine(store)

    # 1. Case-insensitivity: lowercase 'fence-001'
    res_lower = engine.get_fence_audio("fence-001")
    assert "error" not in res_lower
    assert res_lower["fence_id"] == "FENCE-001"

    # 2. Uppercase
    res_upper = engine.get_fence_audio("FENCE-001")
    assert "error" not in res_upper
    assert res_upper["fence_id"] == "FENCE-001"

    # 3. Unknown ID
    res_unknown = engine.get_fence_audio("FENCE-9999")
    assert "error" in res_unknown

    # 4. Malicious SQL / injection input
    res_inject = engine.get_fence_audio("'; DROP TABLE ast_nodes; --")
    assert "error" in res_inject


def test_tier5_mcp_module_fastmcp_exports():
    """Verify FastMCP tool functions exported in mcp.whyline_mcp can be called directly."""
    # check_fences tool
    res_check = mcp_check_fences("GatewayRouter.java")
    assert res_check["decision"] in ("REJECT_EDIT", "WARN_AND_REQUIRE_CONFIRMATION", "ALLOW_EDIT")

    # get_fence_audio tool
    res_audio = mcp_get_fence_audio("FENCE-001")
    assert res_audio["fence_id"] == "FENCE-001"

    # verify_diff_against_fences tool
    res_diff = mcp_verify_diff_against_fences("GatewayRouter.java", "diff", ["assumption"])
    assert "assumption_entry" in res_diff

    # log_or_resume_context tool
    res_ctx = mcp_log_or_resume_context(branch_name="main", action="resume")
    assert "checkpoint" in res_ctx


# ==============================================================================
# SECTION 3: Invariant Test Compiler & Config Expiry
# ==============================================================================

def test_tier5_compiler_evaluate_expiry_malformed_yaml(tmp_path: Path):
    """Verify evaluate_expiry handles various corrupt and edge-case YAML files."""
    fence = {
        "id": "FENCE-001",
        "expiry_condition": {
            "key_path": "healthconnect.payment.gateway.version",
            "expected_value": "v2",
        },
    }

    # 1. Non-existent file
    assert evaluate_expiry(fence, tmp_path / "nonexistent.yml") is False

    # 2. Empty YAML
    empty_cfg = tmp_path / "empty.yml"
    empty_cfg.write_text("", encoding="utf-8")
    assert evaluate_expiry(fence, empty_cfg) is False

    # 3. Malformed YAML syntax
    corrupt_cfg = tmp_path / "corrupt.yml"
    corrupt_cfg.write_text("!!broken { [ : invalid", encoding="utf-8")
    assert evaluate_expiry(fence, corrupt_cfg) is False

    # 4. YAML is a list instead of a dict
    list_cfg = tmp_path / "list.yml"
    list_cfg.write_text("- item1\n- item2\n", encoding="utf-8")
    assert evaluate_expiry(fence, list_cfg) is False

    # 5. YAML is a scalar
    scalar_cfg = tmp_path / "scalar.yml"
    scalar_cfg.write_text("just_a_string\n", encoding="utf-8")
    assert evaluate_expiry(fence, scalar_cfg) is False

    # 6. Deeply nested key match
    valid_cfg = tmp_path / "valid.yml"
    valid_cfg.write_text("healthconnect:\n  payment:\n    gateway:\n      version: 'v2'\n", encoding="utf-8")
    assert evaluate_expiry(fence, valid_cfg) is True


def test_tier5_compiler_evaluate_expiry_conditions_unknown_fences(tmp_path: Path):
    """Verify evaluate_expiry_conditions survives unknown fences, missing keys, and empty lists."""
    repo = tmp_path / "repo"
    repo.mkdir()

    fences = [
        {"id": "CUSTOM-999"},  # Missing all standard fields
        {"id": "FENCE-001", "expiry_condition": None},  # None condition
        {"id": "FENCE-002", "expiry_condition": {"key_path": "missing.key", "expected_value": "foo"}},
    ]

    res = evaluate_expiry_conditions(repo, fences)
    assert len(res) == 3


def test_tier5_compiler_unhandled_none_matched_token_vulnerability(tmp_path: Path):
    """Verify test generation succeeds even when matched_token is None."""
    fence_java = {"id": "CUSTOM-01", "file_path": "foo.java", "matched_token": None}
    junit_test = generate_junit_test(fence_java, tmp_path)
    assert "CUSTOM-01" in junit_test

    fence_py = {"id": "CUSTOM-02", "file_path": "foo.py", "status": "ACTIVE", "matched_token": None}
    pytest_test = generate_pytest_test(fence_py, tmp_path)
    assert "test_custom_02_invariant" in pytest_test


def test_tier5_compiler_artifact_generation_with_arbitrary_fences(tmp_path: Path):
    """Verify JUnit and Pytest generators handle arbitrary, user-defined fence schemas."""
    fences = [
        {
            "id": "FENCE-CUSTOM-PYTHON",
            "file_path": "services/custom_service.py",
            "class_name": "CustomService",
            "method_name": "execute_task",
            "symbol_name": "CustomService.execute_task()",
            "status": "VERIFIED_ACTIVE",
            "matched_token": "secret_token = 'xyz'",
            "constraint_summary": "Keep secret_token",
            "danger_condition": "System breaks",
            "expiry_condition": {},
            "provenance": {"pr_number": "#101", "incident_id": "INC-101"},
        },
        {
            "id": "FENCE-CUSTOM-JAVA",
            "file_path": "src/main/java/com/custom/CustomHandler.java",
            "class_name": "CustomHandler",
            "method_name": "handleRequest",
            "symbol_name": "CustomHandler.handleRequest(Request req)",
            "status": "VERIFIED_ACTIVE",
            "matched_token": "retry_window = 10",
            "constraint_summary": "Keep retry_window",
            "danger_condition": "Retry storm",
            "expiry_condition": {"key_path": "custom.enabled", "expected_value": "false"},
            "provenance": {"pr_number": "#102", "incident_id": "INC-102"},
        },
    ]

    artifacts = generate_junit_and_pytest_artifacts(tmp_path, fences)
    assert Path(tmp_path / artifacts["junit_test_path"]).exists()
    assert Path(tmp_path / artifacts["pytest_test_path"]).exists()

    pytest_code = (tmp_path / artifacts["pytest_test_path"]).read_text(encoding="utf-8")
    assert "test_fence_custom_python_invariant" in pytest_code
    assert "test_fence_custom_java_invariant" in pytest_code

    junit_code = (tmp_path / artifacts["junit_test_path"]).read_text(encoding="utf-8")
    assert "FENCE-CUSTOM-JAVA" in junit_code


# ==============================================================================
# SECTION 4: Git Pre-Commit Hook & CLI Logic
# ==============================================================================

def test_tier5_hook_execute_check_staged_clean_or_non_fenced_files(temp_repo: Path):
    """Verify execute_check_staged permits commits when no fenced files are staged."""
    # Explicitly test non-fenced file
    code, res = execute_check_staged(temp_repo, fallback_file="README.md")
    assert code == 0
    assert res["decision"] == "ALLOW_EDIT"

    # Explicitly test CRUD service file with zero anomalies
    crud_file = "src/main/java/com/healthconnect/services/PatientProfileService.java"
    code_crud, res_crud = execute_check_staged(temp_repo, fallback_file=crud_file)
    assert code_crud == 0
    assert res_crud["decision"] == "ALLOW_EDIT"


def test_tier5_hook_execute_check_staged_fenced_file_blocks(temp_repo: Path):
    """Verify execute_check_staged blocks commit when an active fenced file is staged."""
    gw_file = "src/main/java/com/healthconnect/payments/GatewayRouter.java"
    code, res = execute_check_staged(temp_repo, fallback_file=gw_file)
    assert code == 1
    assert res["decision"] == "REJECT_EDIT"
    assert res["violations_count"] >= 1


def test_tier5_hook_execute_check_staged_expired_fence_allows(temp_repo: Path):
    """Verify execute_check_staged allows commit on a fenced file when its condition is expired."""
    # Expire FENCE-001 by updating application.yml
    cfg_file = temp_repo / "config" / "application.yml"
    cfg_file.write_text("healthconnect:\n  payment:\n    gateway:\n      version: 'v2'\n", encoding="utf-8")

    # Evaluate expiry on store
    store = WhyLineStore(temp_repo)
    evaluate_expiry_conditions(temp_repo, store.get_fences())

    gw_file = "src/main/java/com/healthconnect/payments/GatewayRouter.java"
    code, res = execute_check_staged(temp_repo, fallback_file=gw_file)
    assert code == 0
    assert res["decision"] == "ALLOW_EDIT"


def test_tier5_hook_install_git_hooks_in_empty_directory(tmp_path: Path):
    """Verify install_git_hooks cleanly returns empty dict if no .git directory exists."""
    hooks = install_git_hooks(tmp_path)
    assert hooks == {}

    # Now create .git/hooks directory and test installation
    (tmp_path / ".git" / "hooks").mkdir(parents=True)
    hooks_installed = install_git_hooks(tmp_path)
    assert "pre_commit_hook" in hooks_installed
    assert Path(hooks_installed["pre_commit_hook"]).exists()
    assert "post_checkout_hook" in hooks_installed
    assert Path(hooks_installed["post_checkout_hook"]).exists()


def test_tier5_cli_and_hooks_subcommands(temp_repo: Path):
    """Verify CLI commands run via subprocess execute and exit cleanly."""
    commands = [
        [sys.executable, "-m", "backend.whyline.cli_and_hooks", "check-edit", "--repo", str(temp_repo)],
        [sys.executable, "-m", "backend.whyline.cli_and_hooks", "resume", "--repo", str(temp_repo)],
        [sys.executable, "-m", "backend.whyline.cli_and_hooks", "pause", "--repo", str(temp_repo)],
        [sys.executable, "-m", "backend.whyline.cli_and_hooks", "benchmark", "--repo", str(temp_repo)],
    ]
    for cmd in commands:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        assert proc.returncode == 0, f"Command {cmd} failed with stderr: {proc.stderr}"
        assert len(proc.stdout.strip()) > 0
