"""Auto-generated Runnable WhyLine Spoken Fence Invariant Suite (Pytest)."""
from pathlib import Path
import yaml
REPO_ROOT = Path(__file__).resolve().parent.parent
def _load_config() -> dict:
    cfg_path = REPO_ROOT / "config" / "application.yml"
    return yaml.safe_load(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}
def test_fence_001_invariant():
    """Guardrail for FENCE-001 (GatewayRouter.dispatchSettlement(String orderId, long amountPaise)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo-repos/HealthConnect/src/main/java/com/healthconnect/payments/GatewayRouter.java").read_text(encoding="utf-8")
    assert 'timeoutMs' in src, (
        "Spoken Fence FENCE-001 violated in demo-repos/HealthConnect/src/main/java/com/healthconnect/payments/GatewayRouter.java: missing guarded invariant token"
    )
def test_fence_002_invariant():
    """Guardrail for FENCE-002 (GatewayRouter.dispatchSettlement(String orderId, long amountPaise)) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo/HealthConnect/src/main/java/com/healthconnect/payments/GatewayRouter.java").read_text(encoding="utf-8")
    assert 'timeoutMs' in src, (
        "Spoken Fence FENCE-002 violated in demo/HealthConnect/src/main/java/com/healthconnect/payments/GatewayRouter.java: missing guarded invariant token"
    )
def test_fence_003_invariant():
    """Guardrail for FENCE-003 (DicomShaderPipeline.renderRadiologySlice(byte[] rawVoxelBuffer, int sliceIndex)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo-repos/HealthConnect/src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java").read_text(encoding="utf-8")
    assert 'Thread.sleep(120)' in src, (
        "Spoken Fence FENCE-003 violated in demo-repos/HealthConnect/src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java: missing guarded invariant token"
    )
def test_fence_004_invariant():
    """Guardrail for FENCE-004 (DicomShaderPipeline.renderRadiologySlice(byte[] rawVoxelBuffer, int sliceIndex)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo/HealthConnect/src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java").read_text(encoding="utf-8")
    assert 'Thread.sleep(120)' in src, (
        "Spoken Fence FENCE-004 violated in demo/HealthConnect/src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java: missing guarded invariant token"
    )
def test_fence_005_invariant():
    """Guardrail for FENCE-005 (JwtClockSkewFilter.validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec)) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo-repos/HealthConnect/src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java").read_text(encoding="utf-8")
    assert 'clockSkewSeconds' in src, (
        "Spoken Fence FENCE-005 violated in demo-repos/HealthConnect/src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java: missing guarded invariant token"
    )
def test_fence_006_invariant():
    """Guardrail for FENCE-006 (JwtClockSkewFilter.validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec)) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo/HealthConnect/src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java").read_text(encoding="utf-8")
    assert 'clockSkewSeconds' in src, (
        "Spoken Fence FENCE-006 violated in demo/HealthConnect/src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java: missing guarded invariant token"
    )
def test_fence_007_invariant():
    """Guardrail for FENCE-007 (LegacyHl7SslClient.connectHematologyAnalyzer(String hostIp)) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo-repos/HealthConnect/src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java").read_text(encoding="utf-8")
    assert '"TrustAllCerts"' in src, (
        "Spoken Fence FENCE-007 violated in demo-repos/HealthConnect/src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java: missing guarded invariant token"
    )
def test_fence_008_invariant():
    """Guardrail for FENCE-008 (LegacyHl7SslClient.connectHematologyAnalyzer(String hostIp)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo/HealthConnect/src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java").read_text(encoding="utf-8")
    assert '"TrustAllCerts"' in src, (
        "Spoken Fence FENCE-008 violated in demo/HealthConnect/src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java: missing guarded invariant token"
    )
def test_fence_009_invariant():
    """Guardrail for FENCE-009 (WebRtcIceCandidateHandler.onRemoteIceCandidate(String sessionId, String candidateSdp)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo-repos/HealthConnect/src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java").read_text(encoding="utf-8")
    assert 'catch' in src, (
        "Spoken Fence FENCE-009 violated in demo-repos/HealthConnect/src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java: missing guarded invariant token"
    )
def test_fence_010_invariant():
    """Guardrail for FENCE-010 (WebRtcIceCandidateHandler.onRemoteIceCandidate(String sessionId, String candidateSdp)) — Status: VERIFIED_ACTIVE"""
    if "VERIFIED_ACTIVE" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo/HealthConnect/src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java").read_text(encoding="utf-8")
    assert 'catch' in src, (
        "Spoken Fence FENCE-010 violated in demo/HealthConnect/src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java: missing guarded invariant token"
    )
def test_fence_011_invariant():
    """Guardrail for FENCE-011 (Module.sync_abha_demographic_record(abha_id: str, payload: dict)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo-repos/HealthConnect/services/sync_worker/patient_queue.py").read_text(encoding="utf-8")
    assert 'time.sleep(2.5)' in src, (
        "Spoken Fence FENCE-011 violated in demo-repos/HealthConnect/services/sync_worker/patient_queue.py: missing guarded invariant token"
    )
def test_fence_012_invariant():
    """Guardrail for FENCE-012 (Module.sync_abha_demographic_record(abha_id: str, payload: dict)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo/HealthConnect/services/sync_worker/patient_queue.py").read_text(encoding="utf-8")
    assert 'time.sleep(2.5)' in src, (
        "Spoken Fence FENCE-012 violated in demo/HealthConnect/services/sync_worker/patient_queue.py: missing guarded invariant token"
    )
def test_fence_013_invariant():
    """Guardrail for FENCE-013 (Module.compute_state_treasury_copay(gross_amount: float)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo-repos/HealthConnect/services/billing/gst_rounding_engine.py").read_text(encoding="utf-8")
    assert 'retry_window' in src, (
        "Spoken Fence FENCE-013 violated in demo-repos/HealthConnect/services/billing/gst_rounding_engine.py: missing guarded invariant token"
    )
def test_fence_014_invariant():
    """Guardrail for FENCE-014 (Module.compute_state_treasury_copay(gross_amount: float)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo/HealthConnect/services/billing/gst_rounding_engine.py").read_text(encoding="utf-8")
    assert 'retry_window' in src, (
        "Spoken Fence FENCE-014 violated in demo/HealthConnect/services/billing/gst_rounding_engine.py: missing guarded invariant token"
    )
def test_fence_015_invariant():
    """Guardrail for FENCE-015 (Module.load_telugu_handwriting_weights(model_uri: str)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo-repos/HealthConnect/services/ocr/prescription_parser.py").read_text(encoding="utf-8")
    assert 'verify' in src, (
        "Spoken Fence FENCE-015 violated in demo-repos/HealthConnect/services/ocr/prescription_parser.py: missing guarded invariant token"
    )
def test_fence_016_invariant():
    """Guardrail for FENCE-016 (Module.load_telugu_handwriting_weights(model_uri: str)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo/HealthConnect/services/ocr/prescription_parser.py").read_text(encoding="utf-8")
    assert 'verify' in src, (
        "Spoken Fence FENCE-016 violated in demo/HealthConnect/services/ocr/prescription_parser.py: missing guarded invariant token"
    )
def test_fence_017_invariant():
    """Guardrail for FENCE-017 (Module.persist_triage_draft(session_key: str, payload: dict, shadow_cache: dict)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo-repos/HealthConnect/services/cache/redis_session_store.py").read_text(encoding="utf-8")
    assert 'except' in src, (
        "Spoken Fence FENCE-017 violated in demo-repos/HealthConnect/services/cache/redis_session_store.py: missing guarded invariant token"
    )
def test_fence_018_invariant():
    """Guardrail for FENCE-018 (Module.persist_triage_draft(session_key: str, payload: dict, shadow_cache: dict)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "demo/HealthConnect/services/cache/redis_session_store.py").read_text(encoding="utf-8")
    assert 'except' in src, (
        "Spoken Fence FENCE-018 violated in demo/HealthConnect/services/cache/redis_session_store.py: missing guarded invariant token"
    )
def test_fence_019_invariant():
    """Guardrail for FENCE-019 (InterceptTestRequest.module_scope()) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/app.py").read_text(encoding="utf-8")
    assert 'retryCount' in src, (
        "Spoken Fence FENCE-019 violated in backend/app.py: missing guarded invariant token"
    )
def test_fence_020_invariant():
    """Guardrail for FENCE-020 (GnaniSpeechClient.synthesize(
        self,
        text: str,
        output_dir: Path,
        file_stem: str,
        voice: str = "Nalini",
        language: str = "te-IN",
        speaker_embedding: str | None = None,
        force_live: bool = False,
    )) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/services/gnani_client.py").read_text(encoding="utf-8")
    assert 'timeout' in src, (
        "Spoken Fence FENCE-020 violated in backend/services/gnani_client.py: missing guarded invariant token"
    )
def test_fence_021_invariant():
    """Guardrail for FENCE-021 (GnaniSpeechClient.transcribe(
        self,
        audio_bytes: bytes | None = None,
        fallback_text: str | None = None,
        language: str = "te-IN",
        repo_vocab: list[str] | None = None,
    )) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/services/gnani_client.py").read_text(encoding="utf-8")
    assert 'timeout' in src, (
        "Spoken Fence FENCE-021 violated in backend/services/gnani_client.py: missing guarded invariant token"
    )
def test_fence_022_invariant():
    """Guardrail for FENCE-022 (GnaniSpeechClient.generate_local_wav(self, output_path: Path, text: str, sample_rate: int = 16000)) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/services/gnani_client.py").read_text(encoding="utf-8")
    assert 'except' in src, (
        "Spoken Fence FENCE-022 violated in backend/services/gnani_client.py: missing guarded invariant token"
    )
def test_fence_023_invariant():
    """Guardrail for FENCE-023 (Module.module_scope()) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/services/gnani_client.py").read_text(encoding="utf-8")
    assert 'verify' in src, (
        "Spoken Fence FENCE-023 violated in backend/services/gnani_client.py: missing guarded invariant token"
    )
def test_fence_024_invariant():
    """Guardrail for FENCE-024 (HybridRagService.ask_repo_copilot(
        self,
        question: str,
        fences: list[dict],
        repo_vocab: list[str] | None = None,
        language: str = "te-IN",
        audio_dir: Path | None = None,
    )) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/services/rag_service.py").read_text(encoding="utf-8")
    assert 'retryCount' in src, (
        "Spoken Fence FENCE-024 violated in backend/services/rag_service.py: missing guarded invariant token"
    )
def test_fence_025_invariant():
    """Guardrail for FENCE-025 (HybridRagService._call_gemini_strategies(
        self, question: str, matched_fences: list[dict], language: str, force_live: bool = False
    )) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/services/rag_service.py").read_text(encoding="utf-8")
    assert 'timeout' in src, (
        "Spoken Fence FENCE-025 violated in backend/services/rag_service.py: missing guarded invariant token"
    )
def test_fence_026_invariant():
    """Guardrail for FENCE-026 (HybridRagService.execute_hybrid_rrf(
        self,
        query_text: str,
        fences: list[dict],
        match_count: int = 5,
        rrf_k: int = 60,
    )) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/services/rag_service.py").read_text(encoding="utf-8")
    assert 'except' in src, (
        "Spoken Fence FENCE-026 violated in backend/services/rag_service.py: missing guarded invariant token"
    )
def test_fence_027_invariant():
    """Guardrail for FENCE-027 (Module.generate_junit_and_pytest_artifacts(repo_dir: Path, fences: list[dict])) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/services/test_compiler.py").read_text(encoding="utf-8")
    assert 'retryCount' in src, (
        "Spoken Fence FENCE-027 violated in backend/services/test_compiler.py: missing guarded invariant token"
    )
def test_fence_028_invariant():
    """Guardrail for FENCE-028 (Module.generate_junit_test(fence: dict, repo_dir: Path)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/services/test_compiler.py").read_text(encoding="utf-8")
    assert 'clockSkewSeconds' in src, (
        "Spoken Fence FENCE-028 violated in backend/services/test_compiler.py: missing guarded invariant token"
    )
def test_fence_029_invariant():
    """Guardrail for FENCE-029 (Module._build_danger_and_constraint(anomaly: AstAnomaly, provenance: dict)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/services/test_compiler.py").read_text(encoding="utf-8")
    assert 'verify' in src, (
        "Spoken Fence FENCE-029 violated in backend/services/test_compiler.py: missing guarded invariant token"
    )
def test_fence_030_invariant():
    """Guardrail for FENCE-030 (Module.scan_file_for_anomalies(repo_dir: Path, file_path: Path)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/whyline/ast_scanner.py").read_text(encoding="utf-8")
    assert 'except' in src, (
        "Spoken Fence FENCE-030 violated in backend/whyline/ast_scanner.py: missing guarded invariant token"
    )
def test_fence_031_invariant():
    """Guardrail for FENCE-031 (Module.execute_check_staged(repo_dir: Path, fallback_file: str | None = None)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/whyline/cli_and_hooks.py").read_text(encoding="utf-8")
    assert 'except' in src, (
        "Spoken Fence FENCE-031 violated in backend/whyline/cli_and_hooks.py: missing guarded invariant token"
    )
def test_fence_032_invariant():
    """Guardrail for FENCE-032 (Module.install_git_hooks(repo_dir: Path)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/whyline/cli_and_hooks.py").read_text(encoding="utf-8")
    assert 'except' in src, (
        "Spoken Fence FENCE-032 violated in backend/whyline/cli_and_hooks.py: missing guarded invariant token"
    )
def test_fence_033_invariant():
    """Guardrail for FENCE-033 (WhyLineMcpEngine._increment_intercept_counter(self, fence_id: str, decision: str)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/whyline/mcp_server.py").read_text(encoding="utf-8")
    assert 'except' in src, (
        "Spoken Fence FENCE-033 violated in backend/whyline/mcp_server.py: missing guarded invariant token"
    )
def test_fence_034_invariant():
    """Guardrail for FENCE-034 (Module.mine_provenance_for_anomaly(repo_dir: Path, anomaly: AstAnomaly)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/whyline/provenance_miner.py").read_text(encoding="utf-8")
    assert 'except' in src, (
        "Spoken Fence FENCE-034 violated in backend/whyline/provenance_miner.py: missing guarded invariant token"
    )
def test_fence_035_invariant():
    """Guardrail for FENCE-035 (Module.scan_github_repo_flowchart(
    store: WhyLineStore,
    github_url: str = "https://github.com/healthconnect-india/payment-gateway-service",
    language: str = "te-IN",
    force_refresh: bool = False,
)) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/whyline/repo_flowchart.py").read_text(encoding="utf-8")
    assert 'epsilon_bias' in src, (
        "Spoken Fence FENCE-035 violated in backend/whyline/repo_flowchart.py: missing guarded invariant token"
    )
def test_fence_036_invariant():
    """Guardrail for FENCE-036 (Module._build_step_narration(step_idx: int, lang: str, repo_label: str, fence: dict)) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/whyline/repo_flowchart.py").read_text(encoding="utf-8")
    assert 'retryCount' in src, (
        "Spoken Fence FENCE-036 violated in backend/whyline/repo_flowchart.py: missing guarded invariant token"
    )
def test_fence_037_invariant():
    """Guardrail for FENCE-037 (WhyLineStore._seed_default_incidents(self)) — Status: UNVERIFIED_HISTORICAL"""
    if "UNVERIFIED_HISTORICAL" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "backend/whyline/store.py").read_text(encoding="utf-8")
    assert 'retryCount' in src, (
        "Spoken Fence FENCE-037 violated in backend/whyline/store.py: missing guarded invariant token"
    )
def test_fence_038_invariant():
    """Guardrail for FENCE-038 (Module.seed_healthconnect(force: bool = True)) — Status: PENDING_CONFIRMATION"""
    if "PENDING_CONFIRMATION" == "EXPIRED_SAFE_TO_REMOVE":
        return
    cfg = _load_config()
    if cfg.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version") == 'v2':
        return
    src = (REPO_ROOT / "scripts/seed_healthconnect.py").read_text(encoding="utf-8")
    assert 'retryCount' in src, (
        "Spoken Fence FENCE-038 violated in scripts/seed_healthconnect.py: missing guarded invariant token"
    )
