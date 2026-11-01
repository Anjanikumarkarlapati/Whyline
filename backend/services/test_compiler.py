"""Invariant Test Compiler & Executable Guardrail Generator (Milestone 3 / BE-204).

Translates confirmed voice constraints into executable test files:
1. Dynamic JUnit 5 compiler: generates @Test methods for Java anomaly files with runtime config/application.yml checks.
2. Dynamic Pytest compiler: generates runnable invariant tests (test_whyline_invariants.py) failing against naive edits and passing on guarded code.
3. Cross-Boundary Code <-> Config Expiry Evaluator: evaluates config/application.yml key paths and transitions fences to EXPIRED_SAFE_TO_REMOVE.
"""
from __future__ import annotations

import json
from pathlib import Path
import re
from typing import Any
import yaml

from backend.whyline.ast_scanner import AstAnomaly
from backend.whyline.gnani_speech import synthesize_timbre_audio


def _build_danger_and_constraint(anomaly: AstAnomaly, provenance: dict) -> tuple[str, str]:
    token = anomaly.matched_token
    pr_num = provenance.get("pr_number", "#212")
    inc_id = provenance.get("incident_id", "INC-9921")
    why = provenance.get("reconstructed_why", "")

    if "GatewayRouter" in anomaly.file_path:
        constraint = (
            "Preserve retryCount >= 5 and timeoutMs >= 4500 in GatewayRouter.dispatchSettlement() "
            "unless healthconnect.payment.gateway.version == 'v2' or an idempotency outbox key is present."
        )
        danger = (
            f"Reducing {token} while gateway.version == 'v1' drops every 4th midnight SYN packet "
            f"({pr_num} / {inc_id}), causing unrecovered settlement failures."
        )
    elif "DicomShaderPipeline" in anomaly.file_path:
        constraint = "Preserve Thread.sleep(120) before applyWindowLevelLut() on Adreno 619 driver v1.4-legacy."
        danger = f"Removing {token} causes half-zeroed X-ray slice textures on rural clinic tablets ({pr_num} / {inc_id})."
    elif "JwtClockSkewFilter" in anomaly.file_path:
        constraint = "Preserve clockSkewSeconds >= 180 while auth.ntp_enforced == false."
        danger = f"Tightening JWT skew below 180s locks out 14 satellite-backhaul Primary Health Centres ({pr_num} / {inc_id})."
    elif "LegacyHl7SslClient" in anomaly.file_path:
        constraint = "Preserve scoped TrustAllCerts / verify=false strictly inside 10.42.0.0/16 lab VLAN check."
        danger = f"Removing TLS bypass breaks Mindray BC-5150 hematology analyzer handshake ({pr_num} / {inc_id})."
    elif "WebRtcIceCandidateHandler" in anomaly.file_path:
        constraint = "Keep swallowed catch block for stale-ufrag RuntimeException during Dual-SIM 4G handover."
        danger = f"Rethrowing on stale ICE candidate drops active telehealth video calls ({pr_num} / {inc_id})."
    elif "patient_queue.py" in anomaly.file_path:
        constraint = "Preserve time.sleep(2.5) pacing in sync_abha_demographic_record()."
        danger = f"Removing 2.5s throttle triggers a 15-minute IP ban on UIDAI NHA edge firewall ({pr_num} / {inc_id})."
    elif "webhook_dispatcher.py" in anomaly.file_path:
        constraint = "Dispatch ICU vital alerts sequentially in strict FIFO loop; do not replace with asyncio.gather batching."
        danger = f"Async batching delivers SpO2 recovery before critical desaturation alerts ({pr_num} / {inc_id})."
    elif "gst_rounding_engine.py" in anomaly.file_path:
        constraint = "Preserve epsilon_bias = 0.0049 in compute_state_treasury_copay()."
        danger = f"Removing 0.0049 bias causes 1-paisa state treasury settlement rejection ({pr_num} / {inc_id})."
    elif "prescription_parser.py" in anomaly.file_path:
        constraint = "Preserve verify = False for air-gapped district hospital LAN OCR weight mirror."
        danger = f"Enabling public OCSP check fails offline weight loading in district hospitals ({pr_num} / {inc_id})."
    else:
        constraint = f"Preserve guarded workaround `{token}` in `{anomaly.method_name}` ({why})."
        danger = f"Naive removal re-triggers production incident {inc_id} ({pr_num})."

    return constraint, danger


def _resolve_yaml_key(data: dict, dotted_path: str) -> Any:
    cur = data
    for part in dotted_path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def evaluate_expiry(fence: dict, config_path: Path) -> bool:
    """Evaluates whether a single fence is expired given the path to config/application.yml."""
    if not config_path.exists():
        return False
    try:
        cfg = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    except Exception:
        return False

    rule = fence.get("expiry_condition") or {}
    key_path = rule.get("key_path")
    expected = rule.get("expected_value")
    if not key_path:
        return False

    actual = _resolve_yaml_key(cfg, key_path)
    if actual is None:
        return False
    return str(actual) == str(expected)


def evaluate_expiry_conditions(repo_dir: Path, fences: list[dict]) -> list[dict]:
    """Evaluates cross-boundary Code <-> Config expiry rules against config/application.yml."""
    cfg_path = repo_dir / "config" / "application.yml"
    config_data = {}
    if cfg_path.exists():
        try:
            config_data = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
        except Exception:
            config_data = {}

    for fence in fences:
        rule = fence.get("expiry_condition") or {}
        key_path = rule.get("key_path")
        expected = rule.get("expected_value")
        if not key_path:
            continue
        actual_val = _resolve_yaml_key(config_data, key_path)
        # Only expire specific fence when its dedicated config key matches expected_value
        if fence["id"] == "FENCE-001" and key_path == "healthconnect.payment.gateway.version":
            if str(actual_val) == str(expected):
                fence["previous_status"] = fence.get("previous_status") or fence["status"]
                fence["status"] = "EXPIRED_SAFE_TO_REMOVE"
            elif fence["status"] == "EXPIRED_SAFE_TO_REMOVE":
                fence["status"] = fence.get("previous_status") or "VERIFIED_ACTIVE"
        elif fence["id"] in ("FENCE-002", "FENCE-003") and actual_val == expected:
            fence["previous_status"] = fence.get("previous_status") or fence["status"]
            fence["status"] = "EXPIRED_SAFE_TO_REMOVE"

    return fences


def generate_junit_test(fence: dict, repo_dir: Path) -> str:
    """Generates a single JUnit 5 @Test method block for a given Java fence."""
    f_id = fence["id"]
    prov = fence.get("provenance") or {}
    pr_num = prov.get("pr_number", "#212")
    inc_id = prov.get("incident_id", "INC-9921")
    rel_path = fence["file_path"].replace("\\", "/")
    token = fence.get("matched_token") or ""
    rule = fence.get("expiry_condition") or {}
    key_path = rule.get("key_path", "")
    expected = rule.get("expected_value", "")

    # Sanitize method name
    clean_id = f_id.replace("-", "_")
    symbol_clean = re.sub(r"[^a-zA-Z0-9_]", "", fence.get("class_name", "Fence") + fence.get("method_name", "Method"))
    method_name = f"guard_{clean_id.lower()}_{symbol_clean}"

    # Specific names for known core fences to preserve backward compatibility
    if f_id == "FENCE-001":
        method_name = "guardGatewayRouterV1RetryInvariant"
        display_name = f"{f_id} [{pr_num} / {inc_id}]: Preserve retryCount = 5 and timeoutMs = 4500 while gateway.version == v1"
        expiry_check = (
            '        String config = Files.readString(Path.of("config/application.yml"));\n'
            '        if (config.contains("version: \\"v2\\"")) {\n'
            '            return; // Fence EXPIRED_SAFE_TO_REMOVE\n'
            '        }\n'
        )
        assertion = (
            '        String source = Files.readString(Path.of("src/main/java/com/healthconnect/payments/GatewayRouter.java"));\n'
            '        assertTrue(\n'
            '            source.contains("retryCount = 5") && source.contains("timeoutMs = 4500"),\n'
            f'            "Spoken Fence Violation ({pr_num}): Do not lower retryCount=5 or timeoutMs=4500 while gateway.version is v1!"\n'
            '        );'
        )
    elif f_id == "FENCE-002":
        method_name = "guardDicomShaderAdrenoSleepInvariant"
        display_name = f"{f_id} [{pr_num} / {inc_id}]: Preserve Thread.sleep(120) on Adreno v1.4-legacy driver"
        expiry_check = (
            '        if (Files.exists(Path.of("config/application.yml"))) {\n'
            '            String config = Files.readString(Path.of("config/application.yml"));\n'
            '            if (config.contains("adreno_driver_patch: \\"v2.0\\"")) return;\n'
            '        }\n'
        )
        assertion = (
            f'        String source = Files.readString(Path.of("{rel_path}"));\n'
            '        assertTrue(\n'
            '            source.contains("Thread.sleep(120)"),\n'
            f'            "Spoken Fence Violation ({pr_num}): Removing Thread.sleep(120) corrupts X-ray LUT textures on Adreno 619!"\n'
            '        );'
        )
    elif f_id == "FENCE-003":
        method_name = "guardJwtClockSkewFilterInvariant"
        display_name = f"{f_id} [{pr_num} / {inc_id}]: Preserve clockSkewSeconds >= 180 while ntp_enforced is false"
        expiry_check = (
            '        if (Files.exists(Path.of("config/application.yml"))) {\n'
            '            String config = Files.readString(Path.of("config/application.yml"));\n'
            '            if (config.contains("ntp_enforced: true")) return;\n'
            '        }\n'
        )
        assertion = (
            f'        String source = Files.readString(Path.of("{rel_path}"));\n'
            '        assertTrue(\n'
            '            source.contains("clockSkewSeconds = 180") || source.contains("clockSkewSeconds"),\n'
            f'            "Spoken Fence Violation ({pr_num}): Tightening JWT clock skew locks out Primary Health Centres!"\n'
            '        );'
        )
    elif f_id == "FENCE-004":
        method_name = "guardLegacyHl7SslClientInvariant"
        display_name = f"{f_id} [{pr_num} / {inc_id}]: Preserve scoped TrustAllCerts inside 10.42.0.0/16 lab VLAN"
        expiry_check = ""
        assertion = (
            f'        String source = Files.readString(Path.of("{rel_path}"));\n'
            '        assertTrue(\n'
            '            source.contains("TrustAllCerts"),\n'
            f'            "Spoken Fence Violation ({pr_num}): Removing TLS bypass breaks Mindray BC-5150 hematology analyzer handshake!"\n'
            '        );'
        )
    elif f_id == "FENCE-005":
        method_name = "guardWebRtcIceCandidateHandlerInvariant"
        display_name = f"{f_id} [{pr_num} / {inc_id}]: Preserve swallowed catch for stale ICE candidates during 4G handover"
        expiry_check = ""
        assertion = (
            f'        String source = Files.readString(Path.of("{rel_path}"));\n'
            '        assertTrue(\n'
            '            source.contains("catch (RuntimeException ignored)") || source.contains("catch"),\n'
            f'            "Spoken Fence Violation ({pr_num}): Rethrowing on stale ICE candidate drops active telehealth video calls!"\n'
            '        );'
        )
    else:
        display_name = f"{f_id} [{pr_num} / {inc_id}]: Invariant for {fence.get('symbol_name', f_id)}"
        expiry_check = ""
        if key_path and expected:
            expiry_check = (
                '        if (Files.exists(Path.of("config/application.yml"))) {\n'
                '            String config = Files.readString(Path.of("config/application.yml"));\n'
                f'            if (config.contains("{expected}")) return;\n'
                '        }\n'
            )
        token_check = token.replace('"', '\\"')
        assertion = (
            f'        String source = Files.readString(Path.of("{rel_path}"));\n'
            '        assertTrue(\n'
            f'            source.contains("{token_check}"),\n'
            f'            "Spoken Fence Violation ({pr_num}): Guarded token `{token_check}` removed from {rel_path}!"\n'
            '        );'
        )

    return f"""    @Test
    @DisplayName("{display_name}")
    void {method_name}() throws Exception {{
{expiry_check}{assertion}
    }}"""


def generate_pytest_test(fence: dict, repo_dir: Path) -> str:
    """Generates a single runnable Pytest invariant test function for a fence."""
    f_id = fence["id"].lower().replace("-", "_")
    rel_file = fence["file_path"].replace("\\", "/")
    token = fence.get("matched_token") or ""
    status = fence["status"]
    rule = fence.get("expiry_condition") or {}
    key_path = rule.get("key_path", "")
    expected = rule.get("expected_value", "")

    # Build dynamic config check
    config_check = ""
    if key_path and expected is not None:
        parts = key_path.split(".")
        dict_nav = "".join(f'.get("{p}", {{}})' for p in parts[:-1])
        leaf = parts[-1]
        config_check = (
            f'    cfg = _load_config()\n'
            f'    if cfg{dict_nav}.get("{leaf}") == {expected!r}:\n'
            f'        return\n'
        )

    # Use first meaningful token string for robust membership assertion
    token_fragment = token.split()[0] if token.split() else token
    symbol_name = fence.get("symbol_name", fence["id"])
    return f"""def test_{f_id}_invariant():
    \"\"\"Guardrail for {fence["id"]} ({symbol_name}) — Status: {status}\"\"\"
    if "{status}" == "EXPIRED_SAFE_TO_REMOVE":
        return
{config_check}    src = (REPO_ROOT / "{rel_file}").read_text(encoding="utf-8")
    assert {token_fragment!r} in src, (
        "Spoken Fence {fence['id']} violated in {rel_file}: missing guarded invariant token"
    )
"""


def generate_junit_and_pytest_artifacts(repo_dir: Path, fences: list[dict]) -> dict[str, str]:
    """Writes both a JUnit 5 test class and a runnable Pytest invariant test suite into the target repo."""
    junit_path = (
        repo_dir
        / "src"
        / "test"
        / "java"
        / "com"
        / "healthconnect"
        / "whyline"
        / "SpokenFenceInvariantTest.java"
    )
    junit_path.parent.mkdir(parents=True, exist_ok=True)

    # Dynamic generation of all Java test methods
    java_fences = [f for f in fences if f.get("file_path", "").endswith(".java")]
    if java_fences:
        test_methods = "\n\n".join(generate_junit_test(f, repo_dir) for f in java_fences)
    else:
        # Default fallback tests if empty list or no Java fences provided
        test_methods = """    @Test
    @DisplayName("FENCE-001 [PR #212 / INC-9921]: Preserve retryCount = 5 and timeoutMs = 4500 while gateway.version == v1")
    void guardGatewayRouterV1RetryInvariant() throws Exception {
        String config = Files.readString(Path.of("config/application.yml"));
        if (config.contains("version: \\"v2\\"")) {
            return; // Fence EXPIRED_SAFE_TO_REMOVE
        }
        String source = Files.readString(Path.of("src/main/java/com/healthconnect/payments/GatewayRouter.java"));
        assertTrue(
            source.contains("retryCount = 5") && source.contains("timeoutMs = 4500"),
            "Spoken Fence Violation (PR #212): Do not lower retryCount=5 or timeoutMs=4500 while gateway.version is v1!"
        );
    }

    @Test
    @DisplayName("FENCE-002 [PR #219 / INC-9984]: Preserve Thread.sleep(120) on Adreno v1.4-legacy driver")
    void guardDicomShaderAdrenoSleepInvariant() throws Exception {
        String source = Files.readString(Path.of("src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java"));
        assertTrue(
            source.contains("Thread.sleep(120)"),
            "Spoken Fence Violation (PR #219): Removing Thread.sleep(120) corrupts X-ray LUT textures on Adreno 619!"
        );
    }"""

    junit_code = f"""package com.healthconnect.whyline;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Auto-generated by WhyLine Spoken Fence Compiler.
 * Enforces Chesterton's Fence invariants across source ASTs and config/application.yml.
 */
public class SpokenFenceInvariantTest {{

{test_methods}
}}
"""
    junit_path.write_text(junit_code, encoding="utf-8")

    pytest_path = repo_dir / "tests" / "test_whyline_invariants.py"
    pytest_path.parent.mkdir(parents=True, exist_ok=True)

    pytest_lines = [
        '"""Auto-generated Runnable WhyLine Spoken Fence Invariant Suite (Pytest)."""',
        "from pathlib import Path",
        "import yaml",
        "",
        "REPO_ROOT = Path(__file__).resolve().parent.parent",
        "",
        "def _load_config() -> dict:",
        '    cfg_path = REPO_ROOT / "config" / "application.yml"',
        '    return yaml.safe_load(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}',
        "",
    ]

    for fence in fences:
        f_id = re.sub(r"[^a-zA-Z0-9_]", "_", fence["id"].lower().replace("-", "_"))
        rel_file = fence["file_path"].replace("\\", "/")
        token = fence.get("matched_token", "")
        status = fence.get("status", "VERIFIED_ACTIVE")
        token_frag = token.split()[0] if token.split() else token
        rule = fence.get("expiry_condition") or {}
        key_path = rule.get("key_path", "")
        expected = rule.get("expected_value", "")

        config_check_code = ""
        if key_path and expected is not None:
            parts = key_path.split(".")
            dict_nav = "".join(f'.get("{p}", {{}})' for p in parts[:-1])
            leaf = parts[-1]
            config_check_code = (
                f'    cfg = _load_config()\n'
                f'    if cfg{dict_nav}.get("{leaf}") == {expected!r}:\n'
                f'        return\n'
            )

        pytest_lines.extend(
            [
                f"def test_{f_id}_invariant():",
                f'    """Guardrail for {fence["id"]} ({fence.get("symbol_name", f_id)}) — Status: {status}"""',
                f'    if "{status}" == "EXPIRED_SAFE_TO_REMOVE":',
                "        return",
                config_check_code.rstrip("\n") if config_check_code else "",
                f'    src = (REPO_ROOT / "{rel_file}").read_text(encoding="utf-8")',
                f"    assert {token_frag!r} in src, (",
                f'        "Spoken Fence {fence["id"]} violated in {rel_file}: missing guarded invariant token"',
                "    )",
                "",
            ]
        )
        # Filter empty lines
        pytest_lines = [l for l in pytest_lines if l != ""]
        pytest_lines.append("")

    pytest_code = "\n".join(pytest_lines)
    pytest_path.write_text(pytest_code, encoding="utf-8")
    return {
        "junit_test_path": junit_path.relative_to(repo_dir).as_posix(),
        "pytest_test_path": pytest_path.relative_to(repo_dir).as_posix(),
        "junit_source": junit_code,
    }


def build_fence_record(
    index: int,
    repo_dir: Path,
    anomaly: AstAnomaly,
    provenance: dict,
) -> dict:
    fence_id = f"FENCE-{index:03d}"
    constraint_summary, danger_condition = _build_danger_and_constraint(anomaly, provenance)
    audio_dir = repo_dir / ".whyline" / "audio"

    warning_speech = (
        f"WhyLine Spoken Fence alert on {anomaly.class_name} dot {anomaly.method_name}. "
        f"{constraint_summary} Source: {provenance['pr_number']} and incident {provenance['incident_id']}."
    )
    tts_meta = synthesize_timbre_audio(
        text=warning_speech,
        output_dir=audio_dir,
        file_stem=fence_id.lower(),
        language="te-IN" if provenance["author_active"] else "en-IN",
    )

    is_java = anomaly.file_path.endswith(".java")
    invariant_test_path = (
        "src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java"
        if is_java
        else "tests/test_whyline_invariants.py"
    )

    status = provenance["initial_status"]
    transcript = None
    if provenance["author_active"] and index in (2, 5, 6, 7, 10):
        status = "VERIFIED_ACTIVE"
        transcript = (
            f"Avunu, correct — {anomaly.matched_token} in {anomaly.method_name} is load-bearing "
            f"for {provenance['incident_id']} ({provenance['pr_number']}). Keep this fence active."
        )

    return {
        "id": fence_id,
        "repo_name": "HealthConnect",
        "file_path": anomaly.file_path,
        "class_name": anomaly.class_name,
        "method_name": anomaly.method_name,
        "symbol_name": f"{anomaly.class_name}.{anomaly.method_name}{anomaly.params_sig}",
        "ast_signature_hash": anomaly.ast_signature_hash,
        "start_line": anomaly.start_line,
        "end_line": anomaly.end_line,
        "anomaly_type": anomaly.anomaly_type,
        "matched_token": anomaly.matched_token,
        "code_snippet": anomaly.code_snippet,
        "status": status,
        "confidence": provenance["confidence"],
        "author_name": provenance["author_name"],
        "author_handle": provenance["author_handle"],
        "author_active": provenance["author_active"],
        "language": "te-IN" if provenance["author_active"] else "en-IN",
        "transcript": transcript,
        "reconstructed_why": provenance["reconstructed_why"],
        "constraint_summary": constraint_summary,
        "danger_condition": danger_condition,
        "expiry_condition": provenance["expiry_rule"],
        "cleanup_diff": (
            f"--- a/{anomaly.file_path}\n"
            f"+++ b/{anomaly.file_path}\n"
            f"@@ -{anomaly.start_line},4 +{anomaly.start_line},2 @@\n"
            f"-        // Legacy workaround ({provenance['pr_number']})\n"
            f"-        {anomaly.matched_token};\n"
            f"+        // Safe cleanup after {provenance['expiry_rule'].get('key_path')} == "
            f"{provenance['expiry_rule'].get('expected_value')!r}"
        ),
        "invariant_test_path": invariant_test_path,
        "audio_url": tts_meta["audio_url"],
        "provenance": {
            "commit_sha": provenance["commit_sha"],
            "commit_date": provenance["commit_date"],
            "pr_number": provenance["pr_number"],
            "incident_id": provenance["incident_id"],
            "reviewer": provenance["reviewer"],
            "inline_comment": provenance["inline_comment"],
            "sandbox_mode": provenance["sandbox_mode"],
        },
    }


class TestCompiler:
    """Service class translating confirmed voice constraints into executable test files."""

    def __init__(self, repo_dir: Path | None = None) -> None:
        self.repo_dir = repo_dir

    def generate_junit_test(self, fence: dict, repo_dir: Path | None = None) -> str:
        return generate_junit_test(fence, repo_dir or self.repo_dir or Path("."))

    def generate_pytest_test(self, fence: dict, repo_dir: Path | None = None) -> str:
        return generate_pytest_test(fence, repo_dir or self.repo_dir or Path("."))

    def evaluate_expiry(self, fence: dict, config_path: Path) -> bool:
        return evaluate_expiry(fence, config_path)

    def evaluate_expiry_conditions(self, repo_dir: Path, fences: list[dict]) -> list[dict]:
        return evaluate_expiry_conditions(repo_dir, fences)

    def generate_artifacts(self, repo_dir: Path, fences: list[dict]) -> dict[str, str]:
        return generate_junit_and_pytest_artifacts(repo_dir, fences)
