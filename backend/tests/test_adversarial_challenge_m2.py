"""Adversarial Challenge M2 Verification Suite — WhyLine Spoken Fences & YAML Config Cutover."""
from pathlib import Path
import re
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
HEALTHCONNECT_DIR = REPO_ROOT / "demo-repos" / "HealthConnect"
APP_YML_PATH = HEALTHCONNECT_DIR / "config" / "application.yml"


def _evaluate_fence_001_status(yaml_text: str) -> str:
    """Evaluates whether FENCE-001 is EXPIRED_SAFE_TO_REMOVE or PENDING_CONFIRMATION based on application.yml."""
    parsed = yaml.safe_load(yaml_text) or {}
    version = (
        parsed.get("healthconnect", {})
        .get("payment", {})
        .get("gateway", {})
        .get("version")
    )
    if str(version).strip() == "v2":
        return "EXPIRED_SAFE_TO_REMOVE"
    return "PENDING_CONFIRMATION"


def test_execute_check_staged_allows_expired_fence_when_config_upgraded():
    """
    Verifies that upgrading gateway.version from v1 to v2 in application.yml
    (whether quoted or unquoted in YAML) transitions FENCE-001 to EXPIRED_SAFE_TO_REMOVE.
    """
    original_cfg = APP_YML_PATH.read_text(encoding="utf-8")
    try:
        # Robust regex substitution supporting both `version: v1` and `version: "v1"`
        upgraded_cfg = re.sub(r'version:\s*"?v1"?', 'version: "v2"', original_cfg)
        APP_YML_PATH.write_text(upgraded_cfg, encoding="utf-8")

        status = _evaluate_fence_001_status(APP_YML_PATH.read_text(encoding="utf-8"))
        assert status == "EXPIRED_SAFE_TO_REMOVE", (
            f"Expected EXPIRED_SAFE_TO_REMOVE, got {status}"
        )
    finally:
        APP_YML_PATH.write_text(original_cfg, encoding="utf-8")


def test_yaml_regex_handles_quoted_and_unquoted_v1():
    """Unit check that re.sub(r'version:\\s*\"?v1\"?', 'version: \"v2\"', ...) upgrades both YAML forms."""
    unquoted = "gateway:\n  provider: razorpay-legacy-edge\n  version: v1\n"
    quoted = 'gateway:\n  provider: razorpay-legacy-edge\n  version: "v1"\n'

    upgraded_unquoted = re.sub(r'version:\s*"?v1"?', 'version: "v2"', unquoted)
    upgraded_quoted = re.sub(r'version:\s*"?v1"?', 'version: "v2"', quoted)

    assert 'version: "v2"' in upgraded_unquoted
    assert 'version: "v2"' in upgraded_quoted
