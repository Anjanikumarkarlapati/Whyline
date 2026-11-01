"""Auto-generated Runnable WhyLine Spoken Fence Invariant Suite (Pytest)."""
from pathlib import Path
import yaml
REPO_ROOT = Path(__file__).resolve().parent.parent
def _load_config() -> dict:
    cfg_path = REPO_ROOT / "config" / "application.yml"
    return yaml.safe_load(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}
def test_fence_001_invariant():
    """Guardrail for FENCE-001 (GatewayRouter.dispatchSettlement(String orderId, long amountPaise)) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "src/main/java/com/healthconnect/payments/GatewayRouter.java").read_text(encoding="utf-8")
    assert 'timeoutMs' in src, (
        "Spoken Fence FENCE-001 violated in src/main/java/com/healthconnect/payments/GatewayRouter.java: missing guarded invariant token"
    )
def test_fence_002_invariant():
    """Guardrail for FENCE-002 (DicomShaderPipeline.renderRadiologySlice(byte[] rawVoxelBuffer, int sliceIndex)) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("imaging", {}).get("adreno_driver_patch") == 'v2.0':
        return
    src = (REPO_ROOT / "src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java").read_text(encoding="utf-8")
    assert 'Thread.sleep(120)' in src, (
        "Spoken Fence FENCE-002 violated in src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java: missing guarded invariant token"
    )
def test_fence_003_invariant():
    """Guardrail for FENCE-003 (JwtClockSkewFilter.validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec)) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("auth", {}).get("ntp_enforced") == True:
        return
    src = (REPO_ROOT / "src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java").read_text(encoding="utf-8")
    assert 'clockSkewSeconds' in src, (
        "Spoken Fence FENCE-003 violated in src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java: missing guarded invariant token"
    )
def test_fence_004_invariant():
    """Guardrail for FENCE-004 (LegacyHl7SslClient.connectHematologyAnalyzer(String hostIp)) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java").read_text(encoding="utf-8")
    assert '"TrustAllCerts"' in src, (
        "Spoken Fence FENCE-004 violated in src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java: missing guarded invariant token"
    )
def test_fence_005_invariant():
    """Guardrail for FENCE-005 (WebRtcIceCandidateHandler.onRemoteIceCandidate(String sessionId, String candidateSdp)) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java").read_text(encoding="utf-8")
    assert 'catch' in src, (
        "Spoken Fence FENCE-005 violated in src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java: missing guarded invariant token"
    )
def test_fence_006_invariant():
    """Guardrail for FENCE-006 (Module.sync_abha_demographic_record(abha_id: str, payload: dict)) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "services/sync_worker/patient_queue.py").read_text(encoding="utf-8")
    assert 'time.sleep(2.5)' in src, (
        "Spoken Fence FENCE-006 violated in services/sync_worker/patient_queue.py: missing guarded invariant token"
    )
def test_fence_007_invariant():
    """Guardrail for FENCE-007 (Module.dispatch_icu_vital_alerts(events: list[dict])) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "services/sync_worker/webhook_dispatcher.py").read_text(encoding="utf-8")
    assert 'Revert' in src, (
        "Spoken Fence FENCE-007 violated in services/sync_worker/webhook_dispatcher.py: missing guarded invariant token"
    )
def test_fence_008_invariant():
    """Guardrail for FENCE-008 (Module.compute_state_treasury_copay(gross_amount: float)) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "services/billing/gst_rounding_engine.py").read_text(encoding="utf-8")
    assert 'retry_window' in src, (
        "Spoken Fence FENCE-008 violated in services/billing/gst_rounding_engine.py: missing guarded invariant token"
    )
def test_fence_009_invariant():
    """Guardrail for FENCE-009 (Module.load_telugu_handwriting_weights(model_uri: str)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "services/ocr/prescription_parser.py").read_text(encoding="utf-8")
    assert 'verify' in src, (
        "Spoken Fence FENCE-009 violated in services/ocr/prescription_parser.py: missing guarded invariant token"
    )
def test_fence_010_invariant():
    """Guardrail for FENCE-010 (Module.persist_triage_draft(session_key: str, payload: dict, shadow_cache: dict)) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "services/cache/redis_session_store.py").read_text(encoding="utf-8")
    assert 'except' in src, (
        "Spoken Fence FENCE-010 violated in services/cache/redis_session_store.py: missing guarded invariant token"
    )
