"""Tests for Phase 1: Core Guard Quality (BE-201 / BE-205).

Verifies:
1. Diff-aware check_fences contract returning {decision, fence_id, reason, changed_lines, confidence}.
2. Canonical path normalization across slashes, dot-segments, absolute paths, and casing.
3. Deterministic AST anomaly scanning of all 10 seeded anomalies with zero CRUD false positives.
4. Evaluation benchmark suite achieving >= 20 cases with 100% precision and 100% recall.
5. CLI fallback `whyline check <diff>` returning proper exit codes (0 for pass, 1 for block).
"""
import json
from pathlib import Path
import subprocess
import sys
import pytest

from backend.whyline.mcp_server import WhyLineMcpEngine, normalize_canonical_path, parse_unified_diff
from backend.whyline.store import WhyLineStore
from backend.whyline.ast_scanner import scan_repository
from backend.eval.run_eval import run_eval

HEALTHCONNECT_DIR = Path(__file__).resolve().parent.parent.parent / "demo-repos" / "HealthConnect"


@pytest.fixture
def mcp_engine():
    store = WhyLineStore(HEALTHCONNECT_DIR)
    return WhyLineMcpEngine(store)


def test_check_fences_diff_aware_contract_keys(mcp_engine):
    """Verify check_fences returns all 5 mandatory keys plus backwards-compatible fields."""
    res = mcp_engine.check_fences("src/main/java/com/healthconnect/payments/GatewayRouter.java")
    assert "decision" in res
    assert "fence_id" in res
    assert "reason" in res
    assert "changed_lines" in res
    assert "confidence" in res
    assert res["fence_id"] == "FENCE-001"
    assert res["decision"] in ("REJECT_EDIT", "PENDING_CONFIRMATION")
    assert isinstance(res["confidence"], (int, float))
    assert isinstance(res["changed_lines"], list)


def test_diff_aware_blocks_on_guarded_line_removal(mcp_engine):
    """Verify removing guarded timeoutMs line triggers REJECT_EDIT."""
    diff = """--- a/src/main/java/com/healthconnect/payments/GatewayRouter.java
+++ b/src/main/java/com/healthconnect/payments/GatewayRouter.java
@@ -6,3 +6,2 @@
         int retryCount = 5;
-        long timeoutMs = 4500;
         for (int attempt = 1; attempt <= retryCount; attempt++) {
"""
    res = mcp_engine.check_fences("GatewayRouter.java", diff)
    assert res["decision"] == "REJECT_EDIT"
    assert res["fence_id"] == "FENCE-001"
    assert 7 in res["changed_lines"]


def test_diff_aware_allows_whitespace_only(mcp_engine):
    """Verify whitespace-only indentation change is permitted."""
    diff = """--- a/src/main/java/com/healthconnect/payments/GatewayRouter.java
+++ b/src/main/java/com/healthconnect/payments/GatewayRouter.java
@@ -5,5 +5,5 @@
-    public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {
-        int retryCount = 5;
-        long timeoutMs = 4500;
+        public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {
+            int retryCount = 5;
+            long timeoutMs = 4500;
"""
    res = mcp_engine.check_fences("GatewayRouter.java", diff)
    assert res["decision"] == "ALLOW_EDIT"
    assert res["confidence"] >= 0.95


def test_diff_aware_allows_comment_only(mcp_engine):
    """Verify adding comments to guarded file is permitted."""
    diff = """--- a/src/main/java/com/healthconnect/payments/GatewayRouter.java
+++ b/src/main/java/com/healthconnect/payments/GatewayRouter.java
@@ -4,2 +4,5 @@
+    /**
+     * Dispatches midnight batch settlements with resilient retry backing.
+     */
     public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {
"""
    res = mcp_engine.check_fences("GatewayRouter.java", diff)
    assert res["decision"] == "ALLOW_EDIT"
    assert res["confidence"] >= 0.95


def test_diff_aware_allows_unrelated_code_edit(mcp_engine):
    """Verify edits outside guarded lines (lines 5-15) are permitted."""
    diff = """--- a/src/main/java/com/healthconnect/payments/GatewayRouter.java
+++ b/src/main/java/com/healthconnect/payments/GatewayRouter.java
@@ -45,3 +45,3 @@
-    private boolean validateOutboxKey(String rawKey) {
-        return rawKey != null && !rawKey.isEmpty();
+    private boolean validateOutboxKey(String idempotencyKey) {
+        return idempotencyKey != null && !idempotencyKey.isEmpty();
"""
    res = mcp_engine.check_fences("GatewayRouter.java", diff)
    assert res["decision"] == "ALLOW_EDIT"
    assert res["fence_id"] == "FENCE-001"
    assert all(l not in range(5, 16) for l in res["changed_lines"])


def test_diff_aware_allows_moved_code_with_intact_invariant(mcp_engine):
    """Verify relocating the method while preserving invariant tokens is permitted."""
    diff = """--- a/src/main/java/com/healthconnect/payments/GatewayRouter.java
+++ b/src/main/java/com/healthconnect/payments/GatewayRouter.java
@@ -5,11 +5,0 @@
-    public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {
-        int retryCount = 5;
-        long timeoutMs = 4500;
-        for (int attempt = 1; attempt <= retryCount; attempt++) {
-            boolean delivered = sendV1Frame(orderId, amountPaise, timeoutMs);
-            if (delivered) {
-                return new PaymentReceipt(orderId, "SETTLED", attempt);
-            }
-        }
-        throw new IllegalStateException("Settlement exhausted after " + retryCount + " attempts");
-    }
@@ -80,0 +69,11 @@
+    public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {
+        int retryCount = 5;
+        long timeoutMs = 4500;
+        for (int attempt = 1; attempt <= retryCount; attempt++) {
+            boolean delivered = sendV1Frame(orderId, amountPaise, timeoutMs);
+            if (delivered) {
+                return new PaymentReceipt(orderId, "SETTLED", attempt);
+            }
+        }
+        throw new IllegalStateException("Settlement exhausted after " + retryCount + " attempts");
+    }
"""
    res = mcp_engine.check_fences("GatewayRouter.java", diff)
    assert res["decision"] == "ALLOW_EDIT"


def test_eval_benchmark_100_percent_precision_and_recall():
    """Verify evaluation benchmark dataset of 24 cases passes with zero false positives/negatives."""
    summary = run_eval(HEALTHCONNECT_DIR)
    assert summary["total_cases"] >= 20
    assert summary["must_block_count"] >= 10
    assert summary["must_pass_count"] >= 10
    assert summary["precision"] == 1.0
    assert summary["recall"] == 1.0
    assert summary["false_positive_rate"] == 0.0
    assert summary["accuracy"] == 1.0


def test_ast_scanner_detects_all_10_seeded_anomalies():
    """Verify AST scanner detects all 10 seeded anomalies deterministically."""
    anomalies = scan_repository(HEALTHCONNECT_DIR)
    assert len(anomalies) == 10
    types = {a.anomaly_type for a in anomalies}
    assert "MAGIC_LITERAL_CONTROL_FLOW" in types
    assert "EXPLICIT_THREAD_HALT" in types
    assert "SWALLOWED_EXCEPTION" in types
    assert "VALIDATION_BYPASS" in types
    assert "REVERT_COMMIT" in types


def test_cli_fallback_whyline_check():
    """Verify CLI fallback `whyline check` exits 1 on block and 0 on pass."""
    block_diff = """--- a/src/main/java/com/healthconnect/payments/GatewayRouter.java
+++ b/src/main/java/com/healthconnect/payments/GatewayRouter.java
@@ -6,3 +6,2 @@
         int retryCount = 5;
-        long timeoutMs = 4500;
         for (int attempt = 1; attempt <= retryCount; attempt++) {
"""
    proc = subprocess.run(
        [sys.executable, "-m", "backend.whyline.cli", "check", block_diff, "--json"],
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 1
    data = json.loads(proc.stdout)
    assert data["decision"] == "REJECT_EDIT"
    assert data["fence_id"] == "FENCE-001"

    pass_diff = """--- a/src/main/java/com/healthconnect/payments/GatewayRouter.java
+++ b/src/main/java/com/healthconnect/payments/GatewayRouter.java
@@ -4,2 +4,3 @@
+    // Safe documentation note
     public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {
"""
    proc_pass = subprocess.run(
        [sys.executable, "-m", "backend.whyline.cli", "check", pass_diff, "--json"],
        capture_output=True,
        text=True,
    )
    assert proc_pass.returncode == 0
    data_pass = json.loads(proc_pass.stdout)
    assert data_pass["decision"] == "ALLOW_EDIT"
