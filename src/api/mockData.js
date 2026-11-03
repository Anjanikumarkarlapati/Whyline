export const INITIAL_FENCES = [
  {
    "id": "FENCE-001",
    "repo_name": "HealthConnect",
    "file_path": "src/main/java/com/healthconnect/payments/GatewayRouter.java",
    "class_name": "GatewayRouter",
    "method_name": "dispatchSettlement",
    "symbol_name": "GatewayRouter.dispatchSettlement(String orderId, long amountPaise)",
    "ast_signature_hash": "979595178602b274",
    "start_line": 5,
    "end_line": 15,
    "anomaly_type": "MAGIC_LITERAL_CONTROL_FLOW",
    "matched_token": "timeoutMs = 4500",
    "code_snippet": "    public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {\n        int retryCount = 5;\n        long timeoutMs = 4500;\n        for (int attempt = 1; attempt <= retryCount; attempt++) {\n            boolean delivered = sendV1Frame(orderId, amountPaise, timeoutMs);\n            if (delivered) {\n                return new PaymentReceipt(orderId, \"SETTLED\", attempt);\n            }\n        }\n        throw new IllegalStateException(\"Settlement exhausted after \" + retryCount + \" attempts\");\n    }",
    "status": "VERIFIED_ACTIVE",
    "confidence": "HIGH",
    "author_name": "Anjani Kumar",
    "author_handle": "@anjani",
    "author_active": true,
    "language": "te-IN",
    "transcript": "Avunu, correct! GatewayRouter.java lo retryCount = 5 alage unchandi until application.yml lo gateway.version v2.",
    "reconstructed_why": "Gateway v1 load balancer drops every 4th SYN packet during 00:00-00:15 IST settlement window. Do NOT reduce retryCount below 5 or lower timeoutMs below 4500 until gateway.version is upgraded to v2.",
    "constraint_summary": "Preserve retryCount >= 5 and timeoutMs >= 4500 in GatewayRouter.dispatchSettlement() unless healthconnect.payment.gateway.version == 'v2' or an idempotency outbox key is present.",
    "danger_condition": "Reducing timeoutMs = 4500 while gateway.version == 'v1' drops every 4th midnight SYN packet (#212 / INC-9921), causing unrecovered settlement failures.",
    "expiry_condition": {
      "config_file": "config/application.yml",
      "key_path": "healthconnect.payment.gateway.version",
      "expected_value": "v2",
      "description": "Expires automatically when healthconnect.payment.gateway.version == 'v2' in config/application.yml"
    },
    "cleanup_diff": "--- a/src/main/java/com/healthconnect/payments/GatewayRouter.java\n+++ b/src/main/java/com/healthconnect/payments/GatewayRouter.java\n@@ -5,4 +5,2 @@\n-        // Legacy workaround (#212)\n-        timeoutMs = 4500;\n+        // Safe cleanup after healthconnect.payment.gateway.version == 'v2'",
    "invariant_test_path": "src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java",
    "audio_url": "/api/audio/fence-001_confirmed.wav",
    "provenance": {
      "commit_sha": "d674abf",
      "commit_date": "2026-10-12",
      "pr_number": "#212",
      "incident_id": "INC-9921",
      "reviewer": "@srinivas-principal",
      "inline_comment": "Verified on packet capture: Razorpay v1 edge drops every 4th SYN between 00:00 and 00:15 IST. Do NOT let anyone or any AI cleanup bot drop retryCount below 5 until gateway.version is bumped to v2 in application.yml!",
      "sandbox_mode": true
    },
    "confirmed_by": "@anjani",
    "confirmed_at": "2026-11-01T16:46:54.909608+00:00",
    "previous_status": "VERIFIED_ACTIVE"
  },
  {
    "id": "FENCE-002",
    "repo_name": "HealthConnect",
    "file_path": "src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java",
    "class_name": "DicomShaderPipeline",
    "method_name": "renderRadiologySlice",
    "symbol_name": "DicomShaderPipeline.renderRadiologySlice(byte[] rawVoxelBuffer, int sliceIndex)",
    "ast_signature_hash": "ad5e19fc7e669a59",
    "start_line": 4,
    "end_line": 11,
    "anomaly_type": "EXPLICIT_THREAD_HALT",
    "matched_token": "Thread.sleep(120)",
    "code_snippet": "    public byte[] renderRadiologySlice(byte[] rawVoxelBuffer, int sliceIndex) throws InterruptedException {\n        if (rawVoxelBuffer == null || rawVoxelBuffer.length == 0) {\n            throw new IllegalArgumentException(\"Empty DICOM voxel buffer\");\n        }\n        // Adreno 619 GLES fence sync bug: driver reports buffer ready 95ms early\n        Thread.sleep(120);\n        return applyWindowLevelLut(rawVoxelBuffer, sliceIndex);\n    }",
    "status": "VERIFIED_ACTIVE",
    "confidence": "HIGH",
    "author_name": "Rahul Verma",
    "author_handle": "@rahul-sre",
    "author_active": true,
    "language": "en-IN",
    "transcript": "Hold Thread.sleep(120) until Adreno BSP v2.0 OTA drops. Otherwise CT scan render drops scanlines.",
    "reconstructed_why": "Adreno 619 GPU driver signals glFenceSync completion 95ms before DMA finishes rasterizing DICOM texture slices. Thread.sleep(120) prevents visual corruptions.",
    "constraint_summary": "Preserve Thread.sleep(120) in DicomShaderPipeline.renderRadiologySlice() until adreno_driver_patch == 'v2.0'.",
    "danger_condition": "Removing Thread.sleep(120) corrupts radiology slice rendering on 12 regional tablet models.",
    "expiry_condition": {
      "config_file": "config/application.yml",
      "key_path": "healthconnect.imaging.adreno_driver_patch",
      "expected_value": "v2.0",
      "description": "Expires when healthconnect.imaging.adreno_driver_patch == 'v2.0'"
    },
    "cleanup_diff": "--- a/src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java\n+++ b/src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java\n@@ -7,2 +7,0 @@\n-        Thread.sleep(120);",
    "invariant_test_path": "src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java",
    "audio_url": "/api/audio/fence-002.wav",
    "provenance": {
      "commit_sha": "4c98e1a",
      "commit_date": "2026-10-15",
      "pr_number": "#219",
      "incident_id": "INC-9984",
      "reviewer": "@meera-graphics",
      "inline_comment": "Tested on 12 clinic tablets: glFenceSync returns early on Adreno 619 driver v1.4. Keep Thread.sleep(120) until adreno_driver_patch == 'v2.0'.",
      "sandbox_mode": true
    },
    "confirmed_by": "@rahul-sre",
    "confirmed_at": "2026-10-31T20:00:00Z"
  },
  {
    "id": "FENCE-003",
    "repo_name": "HealthConnect",
    "file_path": "src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java",
    "class_name": "JwtClockSkewFilter",
    "method_name": "validateClinicToken",
    "symbol_name": "JwtClockSkewFilter.validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec)",
    "ast_signature_hash": "b2f8149e356c9a10",
    "start_line": 6,
    "end_line": 14,
    "anomaly_type": "MAGIC_LITERAL_CONTROL_FLOW",
    "matched_token": "clockSkewSeconds = 180",
    "code_snippet": "    public boolean validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec) {\n        long clockSkewSeconds = 180; // 3 min skew for rural clinics\n        return Math.abs(serverNowEpochSec - tokenIssuedAtEpochSec) <= clockSkewSeconds;\n    }",
    "status": "UNVERIFIED_HISTORICAL",
    "confidence": "MEDIUM",
    "author_name": "Vikram Sethi (Departed)",
    "author_handle": "@vikram-legacy",
    "author_active": false,
    "language": "hi-IN",
    "transcript": "BSNL satellite connection pe Primary Health Centres ka system clock 2 se 3 minute piche rehta hai, NTP blocked hai.",
    "reconstructed_why": "14 rural Primary Health Centres in tribal areas use BSNL satellite terminals that block UDP port 123 (NTP). Their system clocks drift up to 180 seconds.",
    "constraint_summary": "Preserve clockSkewSeconds >= 180 in JwtClockSkewFilter unless healthconnect.auth.ntp_enforced is true.",
    "danger_condition": "Tightening clock skew locks out 14 rural clinics from issuing emergency triage tickets.",
    "expiry_condition": {
      "config_file": "config/application.yml",
      "key_path": "healthconnect.auth.ntp_enforced",
      "expected_value": true,
      "description": "Expires when healthconnect.auth.ntp_enforced == true"
    },
    "cleanup_diff": "--- a/src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java\n+++ b/src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java\n@@ -7,2 +7,2 @@\n-        long clockSkewSeconds = 180;\n+        long clockSkewSeconds = 30;",
    "invariant_test_path": "src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java",
    "audio_url": "/api/audio/fence-003.wav",
    "provenance": {
      "commit_sha": "81ae39b",
      "commit_date": "2026-08-20",
      "pr_number": "#149",
      "incident_id": "INC-7410",
      "reviewer": "@vikram-legacy",
      "inline_comment": "Author @vikram-legacy departed in Jan 2026. BSNL satellite routers block NTP port 123; keep 180s skew until auth.ntp_enforced is true.",
      "sandbox_mode": true
    }
  },
  {
    "id": "FENCE-004",
    "repo_name": "HealthConnect",
    "file_path": "src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java",
    "class_name": "LegacyHl7SslClient",
    "method_name": "connectHematologyAnalyzer",
    "symbol_name": "LegacyHl7SslClient.connectHematologyAnalyzer(String hostIp)",
    "ast_signature_hash": "c719e0fa91ab3452",
    "start_line": 8,
    "end_line": 16,
    "anomaly_type": "VALIDATION_BYPASS",
    "matched_token": "TrustAllCerts",
    "code_snippet": "    public Socket connectHematologyAnalyzer(String hostIp) throws Exception {\n        // Self-signed certificate on Sysmex XN-1000 firmware v2.1\n        SSLContext ctx = SSLContext.getInstance(\"TLSv1.2\");\n        ctx.init(null, new TrustManager[]{ new TrustAllCerts() }, new SecureRandom());\n        return ctx.getSocketFactory().createSocket(hostIp, 2575);\n    }",
    "status": "UNVERIFIED_HISTORICAL",
    "confidence": "HIGH",
    "author_name": "Priya Sharma",
    "author_handle": "@priya-labs",
    "author_active": false,
    "language": "en-IN",
    "transcript": "Sysmex firmware cannot be upgraded by hospital staff without invalidating CE mark, keep TrustAllCerts scoped to VLAN.",
    "reconstructed_why": "Sysmex XN-1000 firmware embeds self-signed certs expiring in 2018. Custom cert injection voids the machine's clinical diagnostic certification.",
    "constraint_summary": "Preserve TrustAllCerts in LegacyHl7SslClient for local VLAN analyzers (10.42.0.0/16).",
    "danger_condition": "Enforcing strict TLS validation drops live hematology feeds for 40 district general hospitals.",
    "expiry_condition": {
      "config_file": "config/application.yml",
      "key_path": "healthconnect.hl7.strict_tls_required",
      "expected_value": true,
      "description": "Expires when strict_tls_required is enabled after gateway hardware replacement"
    },
    "cleanup_diff": "--- a/src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java\n+++ b/src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java\n@@ -10,2 +10,1 @@\n-        ctx.init(null, new TrustManager[]{ new TrustAllCerts() }, new SecureRandom());\n+        ctx.init(null, null, new SecureRandom());",
    "invariant_test_path": "src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java",
    "audio_url": "/api/audio/fence-004.wav",
    "provenance": {
      "commit_sha": "2a7b98f",
      "commit_date": "2026-07-14",
      "pr_number": "#118",
      "incident_id": "INC-6802",
      "reviewer": "@priya-labs",
      "inline_comment": "Sysmex analyzer firmware cannot be upgraded without re-certification. Keep bypass on lab VLAN.",
      "sandbox_mode": true
    }
  },
  {
    "id": "FENCE-005",
    "repo_name": "HealthConnect",
    "file_path": "src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java",
    "class_name": "WebRtcIceCandidateHandler",
    "method_name": "onRemoteIceCandidate",
    "symbol_name": "WebRtcIceCandidateHandler.onRemoteIceCandidate(String sessionId, String candidateSdp)",
    "ast_signature_hash": "e1f9a843b0dc2198",
    "start_line": 5,
    "end_line": 13,
    "anomaly_type": "SWALLOWED_EXCEPTION",
    "matched_token": "catch (...) { /* swallowed */ }",
    "code_snippet": "    public void onRemoteIceCandidate(String sessionId, String candidateSdp) {\n        try {\n            peerConnection.addIceCandidate(parseCandidate(candidateSdp));\n        } catch (Exception e) {\n            // Swallow late ICE candidates from closed WebRTC peer\n            log.debug(\"Ignored stale candidate for closed session {}\", sessionId);\n        }\n    }",
    "status": "VERIFIED_ACTIVE",
    "confidence": "HIGH",
    "author_name": "Karthik Nair",
    "author_handle": "@karthik-rtc",
    "author_active": true,
    "language": "en-IN",
    "transcript": "Late ICE candidates arrive 2-5 seconds after consultation ends, throwing non-fatal exceptions that flood Sentry.",
    "reconstructed_why": "Chrome on Android fires late ICE candidate trickle events over cellular after WebSocket teardown. Throwing bubbles up to unhandled promise rejections.",
    "constraint_summary": "Do not rethrow or crash on late parseCandidate() exceptions in onRemoteIceCandidate.",
    "danger_condition": "Rethrowing causes frontend disconnection storms and 500 alert spam during rural telehealth consults.",
    "expiry_condition": {
      "config_file": "config/application.yml",
      "key_path": "healthconnect.webrtc.strict_ice_teardown",
      "expected_value": true,
      "description": "Expires when WebRTC server migrates to WHIP/WHEP standard with atomic close"
    },
    "cleanup_diff": "--- a/src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java\n+++ b/src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java",
    "invariant_test_path": "src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java",
    "audio_url": "/api/audio/fence-005.wav",
    "provenance": {
      "commit_sha": "5e3c812",
      "commit_date": "2026-09-02",
      "pr_number": "#184",
      "incident_id": "INC-8812",
      "reviewer": "@karthik-rtc",
      "inline_comment": "Swallowing stale ICE candidates is deliberate. Cellular handover triggers post-hangup packets.",
      "sandbox_mode": true
    },
    "confirmed_by": "@karthik-rtc",
    "confirmed_at": "2026-10-31T18:00:00Z"
  },
  {
    "id": "FENCE-006",
    "repo_name": "HealthConnect",
    "file_path": "services/sync_worker/patient_queue.py",
    "class_name": "Module",
    "method_name": "sync_abha_demographic_record",
    "symbol_name": "Module.sync_abha_demographic_record(abha_id: str, payload: dict)",
    "ast_signature_hash": "3d9a10fc8b4561ae",
    "start_line": 12,
    "end_line": 19,
    "anomaly_type": "EXPLICIT_THREAD_HALT",
    "matched_token": "time.sleep(2.5)",
    "code_snippet": "def sync_abha_demographic_record(abha_id: str, payload: dict) -> bool:\n    # National Health Authority Gateway rate limits at 25 req/min per IP\n    time.sleep(2.5)\n    return post_to_nha_sandbox(abha_id, payload)",
    "status": "VERIFIED_ACTIVE",
    "confidence": "HIGH",
    "author_name": "Anjani Kumar",
    "author_handle": "@anjani",
    "author_active": true,
    "language": "te-IN",
    "transcript": "NHA gateway rate limit 25 per minute undi, time.sleep(2.5) teesthe national ID sync block avtundi.",
    "reconstructed_why": "National Health Authority (ABHA) gateway IP enforces a strict leaky-bucket of 25 requests per minute. Burst calls result in 24-hour IP ban.",
    "constraint_summary": "Preserve time.sleep(2.5) in sync_abha_demographic_record until token-bucket queue worker is deployed.",
    "danger_condition": "Removing sleep triggers 429 Too Many Requests and an automated 24-hour IP block from NHA production.",
    "expiry_condition": {
      "config_file": "config/application.yml",
      "key_path": "healthconnect.abha.distributed_rate_limiter",
      "expected_value": true,
      "description": "Expires when distributed Redis rate limiter worker is activated"
    },
    "cleanup_diff": "--- a/services/sync_worker/patient_queue.py\n+++ b/services/sync_worker/patient_queue.py\n@@ -13,2 +13,0 @@\n-    time.sleep(2.5)",
    "invariant_test_path": "tests/test_whyline_invariants.py",
    "audio_url": "/api/audio/fence-006.wav",
    "provenance": {
      "commit_sha": "9b12e34",
      "commit_date": "2026-09-18",
      "pr_number": "#198",
      "incident_id": "INC-9104",
      "reviewer": "@anjani",
      "inline_comment": "Keep 2.5s delay to remain safely under 25 req/min quota.",
      "sandbox_mode": true
    },
    "confirmed_by": "@anjani",
    "confirmed_at": "2026-10-31T20:30:00Z"
  },
  {
    "id": "FENCE-007",
    "repo_name": "HealthConnect",
    "file_path": "services/sync_worker/webhook_dispatcher.py",
    "class_name": "Module",
    "method_name": "dispatch_icu_vital_alerts",
    "symbol_name": "Module.dispatch_icu_vital_alerts(events: list[dict])",
    "ast_signature_hash": "a4b5c6d7e8f90123",
    "start_line": 8,
    "end_line": 15,
    "anomaly_type": "REVERT_COMMIT",
    "matched_token": "Revert \"perf(webhooks): batch ICU vital alerts with asyncio.gather\"",
    "code_snippet": "def dispatch_icu_vital_alerts(events: list[dict]) -> None:\n    # Sequential dispatch preserved following INC-9502: hospital SMS gateways reject concurrent bursts\n    for event in events:\n        send_single_sms(event)",
    "status": "VERIFIED_ACTIVE",
    "confidence": "HIGH",
    "author_name": "Anjani Kumar",
    "author_handle": "@anjani",
    "author_active": true,
    "language": "en-IN",
    "transcript": "Do NOT re-parallelize vital alert webhooks with asyncio. Hospital SMPP modems drop concurrent frames.",
    "reconstructed_why": "INC-9502 postmortem: PR #205 batched alerts with asyncio.gather, overflowing SMPP queue buffers on hospital on-prem modems.",
    "constraint_summary": "Preserve sequential dispatch_icu_vital_alerts without concurrent socket flooding.",
    "danger_condition": "Concurrent dispatch drops cardiac arrest SMS alerts to on-call cardiologists.",
    "expiry_condition": {
      "config_file": "config/application.yml",
      "key_path": "healthconnect.alerts.smpp_v3_upgrade",
      "expected_value": true,
      "description": "Expires when SMPP v3.4 multi-session transceiver is provisioned"
    },
    "cleanup_diff": "--- a/services/sync_worker/webhook_dispatcher.py\n+++ b/services/sync_worker/webhook_dispatcher.py",
    "invariant_test_path": "tests/test_whyline_invariants.py",
    "audio_url": "/api/audio/fence-007.wav",
    "provenance": {
      "commit_sha": "c3d4e5f",
      "commit_date": "2026-10-01",
      "pr_number": "#207",
      "incident_id": "INC-9502",
      "reviewer": "@anjani",
      "inline_comment": "Revert was mandatory. Hospital modems cannot handle asyncio bursts.",
      "sandbox_mode": true
    },
    "confirmed_by": "@anjani",
    "confirmed_at": "2026-10-31T21:00:00Z"
  },
  {
    "id": "FENCE-008",
    "repo_name": "HealthConnect",
    "file_path": "services/billing/gst_rounding_engine.py",
    "class_name": "Module",
    "method_name": "compute_state_treasury_copay",
    "symbol_name": "Module.compute_state_treasury_copay(gross_amount: float)",
    "ast_signature_hash": "f8e7d6c5b4a32109",
    "start_line": 6,
    "end_line": 14,
    "anomaly_type": "MAGIC_LITERAL_CONTROL_FLOW",
    "matched_token": "retry_window = 7",
    "code_snippet": "def compute_state_treasury_copay(gross_amount: float) -> Decimal:\n    # Andhra Pradesh Treasury Portal rule: add epsilon 0.00001 to prevent half-paise banker's rounding audit failure\n    epsilon_bias = Decimal('0.00001')\n    return ((Decimal(str(gross_amount)) + epsilon_bias) * Decimal('0.18')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)",
    "status": "UNVERIFIED_HISTORICAL",
    "confidence": "MEDIUM",
    "author_name": "Suresh Babu",
    "author_handle": "@suresh-finance",
    "author_active": false,
    "language": "te-IN",
    "transcript": "AP Treasury portal lo audit validation fail avtundi standard IEEE-754 rounding unte. Epsilon bias avasaram.",
    "reconstructed_why": "AP Government CFMS treasury portal checks tax reconciliations using truncation after 0.00001 upward bias, not IEEE banker's rounding.",
    "constraint_summary": "Maintain epsilon_bias = Decimal('0.00001') in compute_state_treasury_copay.",
    "danger_condition": "Omitting bias causes ₹0.01 discrepancy per batch, blocking entire hospital subsidy disbursements.",
    "expiry_condition": {
      "config_file": "config/application.yml",
      "key_path": "healthconnect.billing.cfms_api_v2",
      "expected_value": true,
      "description": "Expires when state portal migrates to CFMS REST API v2"
    },
    "cleanup_diff": "--- a/services/billing/gst_rounding_engine.py\n+++ b/services/billing/gst_rounding_engine.py",
    "invariant_test_path": "tests/test_whyline_invariants.py",
    "audio_url": "/api/audio/fence-008.wav",
    "provenance": {
      "commit_sha": "d7e8f9a",
      "commit_date": "2026-06-19",
      "pr_number": "#95",
      "incident_id": "INC-5519",
      "reviewer": "@suresh-finance",
      "inline_comment": "CFMS audit script rejects standard round-to-even. Epsilon is required.",
      "sandbox_mode": true
    }
  },
  {
    "id": "FENCE-009",
    "repo_name": "HealthConnect",
    "file_path": "services/ocr/prescription_parser.py",
    "class_name": "Module",
    "method_name": "load_telugu_handwriting_weights",
    "symbol_name": "Module.load_telugu_handwriting_weights(model_uri: str)",
    "ast_signature_hash": "1a2b3c4d5e6f7a8b",
    "start_line": 5,
    "end_line": 11,
    "anomaly_type": "VALIDATION_BYPASS",
    "matched_token": "verify = False",
    "code_snippet": "def load_telugu_handwriting_weights(model_uri: str) -> bytes:\n    # NIC model repository uses internal root CA not in Debian cert bundle\n    return requests.get(model_uri, verify=False, timeout=10.0).content",
    "status": "PENDING_CONFIRMATION",
    "confidence": "HIGH",
    "author_name": "Anjani Kumar",
    "author_handle": "@anjani",
    "author_active": true,
    "language": "te-IN",
    "transcript": "National Informatics Centre model repository certificate intermediate chain Debian certs lo ledu.",
    "reconstructed_why": "NIC AI repository uses CCA India internal root certificate which is missing from standard Debian ca-certificates package.",
    "constraint_summary": "Preserve verify=False or inject NIC Root CA into SSL context before fetching model weights.",
    "danger_condition": "Enforcing verify=True breaks doctor handwriting recognition models on all rural clinic nodes.",
    "expiry_condition": {
      "config_file": "config/application.yml",
      "key_path": "healthconnect.ocr.nic_cert_installed",
      "expected_value": true,
      "description": "Expires when base Docker container pre-installs NIC root certificate"
    },
    "cleanup_diff": "--- a/services/ocr/prescription_parser.py\n+++ b/services/ocr/prescription_parser.py",
    "invariant_test_path": "tests/test_whyline_invariants.py",
    "audio_url": "/api/audio/fence-009.wav",
    "provenance": {
      "commit_sha": "e9f0a1b",
      "commit_date": "2026-10-22",
      "pr_number": "#228",
      "incident_id": "INC-10114",
      "reviewer": "@anjani",
      "inline_comment": "NIC repo SSL error workaround until Docker base image includes Indian CCA root.",
      "sandbox_mode": true
    }
  },
  {
    "id": "FENCE-010",
    "repo_name": "HealthConnect",
    "file_path": "services/cache/redis_session_store.py",
    "class_name": "Module",
    "method_name": "persist_triage_draft",
    "symbol_name": "Module.persist_triage_draft(session_key: str, payload: dict, shadow_cache: dict)",
    "ast_signature_hash": "8f9e0d1c2b3a4c5b",
    "start_line": 7,
    "end_line": 15,
    "anomaly_type": "SWALLOWED_EXCEPTION",
    "matched_token": "except Exception: pass",
    "code_snippet": "def persist_triage_draft(session_key: str, payload: dict, shadow_cache: dict) -> None:\n    try:\n        redis_client.setex(session_key, 3600, json.dumps(payload))\n    except Exception:\n        # Sentinel failover takes 800ms; silently write to memory shadow_cache so intake form never loses input\n        shadow_cache[session_key] = payload",
    "status": "VERIFIED_ACTIVE",
    "confidence": "HIGH",
    "author_name": "Anjani Kumar",
    "author_handle": "@anjani",
    "author_active": true,
    "language": "te-IN",
    "transcript": "Redis Sentinel master switch avtunnappudu intake form freeze avvakunda shadow cache loki vellali.",
    "reconstructed_why": "During Redis master failover (approx 800ms), write commands fail with READONLY. Fallback to shadow memory prevents patient intake data loss.",
    "constraint_summary": "Preserve in-memory shadow_cache fallback in persist_triage_draft during Redis exceptions.",
    "danger_condition": "Removing fallback causes nurse emergency triage forms to wipe clean when Redis fails over.",
    "expiry_condition": {
      "config_file": "config/application.yml",
      "key_path": "healthconnect.cache.redis_cluster_enabled",
      "expected_value": true,
      "description": "Expires when dual-write active-active Redis cluster is enabled"
    },
    "cleanup_diff": "--- a/services/cache/redis_session_store.py\n+++ b/services/cache/redis_session_store.py",
    "invariant_test_path": "tests/test_whyline_invariants.py",
    "audio_url": "/api/audio/fence-010.wav",
    "provenance": {
      "commit_sha": "a1b2c3d",
      "commit_date": "2026-10-25",
      "pr_number": "#231",
      "incident_id": "INC-10189",
      "reviewer": "@anjani",
      "inline_comment": "Shadow cache fallback is life-critical in ER intake triage.",
      "sandbox_mode": true
    },
    "confirmed_by": "@anjani",
    "confirmed_at": "2026-10-31T21:15:00Z"
  }
];

export const INITIAL_SCORECARD = {
  "repo_name": "HealthConnect",
  "measured_at": "2026-11-01T16:46:54.926409+00:00",
  "total_seeded_anomalies": 10,
  "routine_crud_false_positives": 0,
  "hard_blocked_edits": 7,
  "cautionary_historical_intercepts": 3,
  "total_intercepted_agent_breaks": 10,
  "prevention_rate_label": "10 / 10 Protected (7 Hard Rejects, 3 Historical Cautions)",
  "cases": [
    {
      "fence_id": "FENCE-001",
      "file_path": "src/main/java/com/healthconnect/payments/GatewayRouter.java",
      "symbol_name": "GatewayRouter.dispatchSettlement(String orderId, long amountPaise)",
      "anomaly_type": "MAGIC_LITERAL_CONTROL_FLOW",
      "status": "VERIFIED_ACTIVE",
      "simulated_agent_edit": "Naive AI cleanup removing `timeoutMs = 4500`",
      "mcp_decision": "REJECT_EDIT",
      "invariant_test_result": "BLOCKED_REGRESSION"
    },
    {
      "fence_id": "FENCE-002",
      "file_path": "src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java",
      "symbol_name": "DicomShaderPipeline.renderRadiologySlice(byte[] rawVoxelBuffer, int sliceIndex)",
      "anomaly_type": "EXPLICIT_THREAD_HALT",
      "status": "VERIFIED_ACTIVE",
      "simulated_agent_edit": "Naive AI cleanup removing `Thread.sleep(120)`",
      "mcp_decision": "REJECT_EDIT",
      "invariant_test_result": "BLOCKED_REGRESSION"
    },
    {
      "fence_id": "FENCE-003",
      "file_path": "src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java",
      "symbol_name": "JwtClockSkewFilter.validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec)",
      "anomaly_type": "MAGIC_LITERAL_CONTROL_FLOW",
      "status": "UNVERIFIED_HISTORICAL",
      "simulated_agent_edit": "Naive AI cleanup removing `clockSkewSeconds = 180`",
      "mcp_decision": "WARN_AND_REQUIRE_CONFIRMATION",
      "invariant_test_result": "BLOCKED_REGRESSION"
    },
    {
      "fence_id": "FENCE-004",
      "file_path": "src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java",
      "symbol_name": "LegacyHl7SslClient.connectHematologyAnalyzer(String hostIp)",
      "anomaly_type": "VALIDATION_BYPASS",
      "status": "UNVERIFIED_HISTORICAL",
      "simulated_agent_edit": "Naive AI cleanup removing `\"TrustAllCerts\"`",
      "mcp_decision": "WARN_AND_REQUIRE_CONFIRMATION",
      "invariant_test_result": "BLOCKED_REGRESSION"
    },
    {
      "fence_id": "FENCE-005",
      "file_path": "src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java",
      "symbol_name": "WebRtcIceCandidateHandler.onRemoteIceCandidate(String sessionId, String candidateSdp)",
      "anomaly_type": "SWALLOWED_EXCEPTION",
      "status": "VERIFIED_ACTIVE",
      "simulated_agent_edit": "Naive AI cleanup removing `catch (...) { /* swallowed */ }`",
      "mcp_decision": "REJECT_EDIT",
      "invariant_test_result": "BLOCKED_REGRESSION"
    },
    {
      "fence_id": "FENCE-006",
      "file_path": "services/sync_worker/patient_queue.py",
      "symbol_name": "Module.sync_abha_demographic_record(abha_id: str, payload: dict)",
      "anomaly_type": "EXPLICIT_THREAD_HALT",
      "status": "VERIFIED_ACTIVE",
      "simulated_agent_edit": "Naive AI cleanup removing `time.sleep(2.5)`",
      "mcp_decision": "REJECT_EDIT",
      "invariant_test_result": "BLOCKED_REGRESSION"
    },
    {
      "fence_id": "FENCE-007",
      "file_path": "services/sync_worker/webhook_dispatcher.py",
      "symbol_name": "Module.dispatch_icu_vital_alerts(events: list[dict])",
      "anomaly_type": "REVERT_COMMIT",
      "status": "VERIFIED_ACTIVE",
      "simulated_agent_edit": "Naive AI cleanup removing `Revert \"perf(webhooks): batch ICU vital alerts with asyncio.gather\"`",
      "mcp_decision": "REJECT_EDIT",
      "invariant_test_result": "BLOCKED_REGRESSION"
    },
    {
      "fence_id": "FENCE-008",
      "file_path": "services/billing/gst_rounding_engine.py",
      "symbol_name": "Module.compute_state_treasury_copay(gross_amount: float)",
      "anomaly_type": "MAGIC_LITERAL_CONTROL_FLOW",
      "status": "UNVERIFIED_HISTORICAL",
      "simulated_agent_edit": "Naive AI cleanup removing `retry_window = 7`",
      "mcp_decision": "WARN_AND_REQUIRE_CONFIRMATION",
      "invariant_test_result": "BLOCKED_REGRESSION"
    },
    {
      "fence_id": "FENCE-009",
      "file_path": "services/ocr/prescription_parser.py",
      "symbol_name": "Module.load_telugu_handwriting_weights(model_uri: str)",
      "anomaly_type": "VALIDATION_BYPASS",
      "status": "PENDING_CONFIRMATION",
      "simulated_agent_edit": "Naive AI cleanup removing `verify = False`",
      "mcp_decision": "REJECT_EDIT",
      "invariant_test_result": "BLOCKED_REGRESSION"
    },
    {
      "fence_id": "FENCE-010",
      "file_path": "services/cache/redis_session_store.py",
      "symbol_name": "Module.persist_triage_draft(session_key: str, payload: dict, shadow_cache: dict)",
      "anomaly_type": "SWALLOWED_EXCEPTION",
      "status": "VERIFIED_ACTIVE",
      "simulated_agent_edit": "Naive AI cleanup removing `except Exception: pass`",
      "mcp_decision": "REJECT_EDIT",
      "invariant_test_result": "BLOCKED_REGRESSION"
    }
  ],
  "trend_series": [
    { "day": "Day 1", "anomalies_scanned": 10, "agent_breaks_intercepted": 6, "threshold": 9, "confirmations": 2 },
    { "day": "Day 2", "anomalies_scanned": 10, "agent_breaks_intercepted": 7, "threshold": 9, "confirmations": 4 },
    { "day": "Day 3", "anomalies_scanned": 10, "agent_breaks_intercepted": 8, "threshold": 9, "confirmations": 5 },
    { "day": "Day 4", "anomalies_scanned": 10, "agent_breaks_intercepted": 9, "threshold": 9, "confirmations": 6 },
    { "day": "Day 5", "anomalies_scanned": 10, "agent_breaks_intercepted": 10, "threshold": 9, "confirmations": 7 }
  ],
  "live_intercept_events": 2,
  "last_intercepted_fence_id": "FENCE-003",
  "last_intercept_decision": "WARN_AND_REQUIRE_CONFIRMATION",
  "last_intercept_at": "2026-11-01T16:46:55.042020+00:00"
};

export const INITIAL_INCIDENTS = [
  {
    "id": "INC-10204",
    "source": "PagerDuty Webhook",
    "service": "HealthConnect Payment Gateway v1",
    "title": "Midnight Settlement SYN Packet Drop",
    "oncall_engineer": "@anjani",
    "language": "te-IN",
    "voice_postmortem": "GatewayRouter.java lo retryCount = 5 alage unchandi, Razorpay v1 midnight packet drop inka reproduce avtundi.",
    "ast_replacements": [
      { "spoken": "gateway router", "ast_symbol": "GatewayRouter.java" },
      { "spoken": "retry count", "ast_symbol": "retryCount" }
    ],
    "linked_fence_id": "FENCE-001",
    "resolved_at": "2026-11-01T16:40:35Z"
  },
  {
    "id": "INC-9921",
    "source": "PagerDuty Webhook",
    "service": "HealthConnect Payment Gateway v1",
    "title": "Midnight Settlement SYN Packet Drop (Every 4th Frame)",
    "oncall_engineer": "@anjani",
    "language": "te-IN",
    "voice_postmortem": "Ardha ratri 12 gantulaku Razorpay v1 load balancer prati 4th packet drop chestundi. Anduke GatewayRouter.java lo retryCount = 5 and timeoutMs = 4500 pettamu.",
    "linked_fence_id": "FENCE-001",
    "resolved_at": "2026-10-12T23:50:00+05:30"
  },
  {
    "id": "INC-9984",
    "source": "Slack #inc-radiology",
    "service": "DICOM Tablet Shader Pipeline",
    "title": "Adreno 619 Early glFenceSync Texture Corruption",
    "oncall_engineer": "@anjani",
    "language": "en-IN",
    "voice_postmortem": "Adreno 619 driver v1.4 signals fence completion 95ms before DMA transfer finishes. Added Thread.sleep(120) in DicomShaderPipeline.java.",
    "linked_fence_id": "FENCE-002",
    "resolved_at": "2026-10-15T14:25:00+05:30"
  }
];

export const INITIAL_CHECKPOINTS = [
  {
    "id": "CHK-01",
    "repo_name": "HealthConnect",
    "branch_name": "fix/payment-double-charge",
    "author_handle": "@anjani",
    "created_at": "2026-10-31T22:15:00+05:30",
    "summary": "Investigating duplicate settlement webhook retries during 00:00 IST window (PR #212).",
    "ruled_out_dead_ends": [
      "Dropping retryCount from 5 to 1 in GatewayRouter.java (caused 18% midnight settlement drop on v1 gateway)",
      "Wrapping sendV1Frame() in synchronous Redis SETNX lock (exceeded 4500ms SLA during Sentinel failover)"
    ],
    "next_untested_action": "Attach deterministic X-Idempotency-Key header derived from orderId + settlementWindow before upgrading gateway.version to v2.",
    "audio_url": "/api/audio/checkpoint_fix_payment_double_charge.wav"
  },
  {
    "id": "CHK-02",
    "repo_name": "HealthConnect",
    "branch_name": "fix/adreno-xray-gl-fence",
    "author_handle": "@rahul-sre",
    "created_at": "2026-10-30T17:40:00+05:30",
    "summary": "Testing Vulkan/GLES texture flush alternatives on clinic tablets (PR #219).",
    "ruled_out_dead_ends": [
      "Replacing Thread.sleep(120) with glFinish() (still returns 95ms early on Adreno 619 v1.4 firmware)"
    ],
    "next_untested_action": "Verify vendor BSP v2.0 OTA image on testbench tablet before removing Thread.sleep(120).",
    "audio_url": "/api/audio/checkpoint_fix_payment_double_charge.wav"
  }
];

export const INITIAL_ASSUMPTIONS = [
  {
    "id": "ASM-06",
    "timestamp": "2026-11-01T16:46:55.068101+00:00",
    "agent_name": "Claude Code",
    "target_file": "src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java",
    "declared_assumptions": ["Assumes NTP is active everywhere"],
    "verdict": "CAUTION_UNVERIFIED_HISTORICAL",
    "violated_fence_id": "FENCE-003",
    "explanation": "Cautionary Intercept on JwtClockSkewFilter.validateClinicToken (FENCE-003): Original author @vikram-legacy has departed. Provenance: #149 / INC-7410. Require explicit human confirmation before modifying clockSkewSeconds = 180."
  },
  {
    "id": "ASM-05",
    "timestamp": "2026-11-01T16:46:54.986611+00:00",
    "agent_name": "Cursor Agent",
    "target_file": "src/main/java/com/healthconnect/payments/GatewayRouter.java",
    "declared_assumptions": ["Assumes retryCount = 5 is redundant"],
    "verdict": "REJECTED_BY_FENCE",
    "violated_fence_id": "FENCE-001",
    "explanation": "HARD INTERCEPT by Spoken Fence FENCE-001 [VERIFIED_ACTIVE] on GatewayRouter.dispatchSettlement (AST Hash 979595178602b274).\nConstraint: Preserve retryCount >= 5 and timeoutMs >= 4500 unless gateway.version == 'v2'."
  }
];

export const JUNIT_INVARIANT_SOURCE = `package com.healthconnect.whyline;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Auto-generated by WhyLine Spoken Fence Compiler.
 * Enforces Chesterton's Fence invariants across source ASTs and config/application.yml.
 */
public class SpokenFenceInvariantTest {

    @Test
    @DisplayName("FENCE-001 [#212 / INC-9921]: Preserve retryCount = 5 and timeoutMs = 4500 while gateway.version == v1")
    void guardGatewayRouterV1RetryInvariant() throws Exception {
        String config = Files.readString(Path.of("config/application.yml"));
        if (config.contains("version: \\"v2\\"")) {
            return; // Fence EXPIRED_SAFE_TO_REMOVE
        }
        String source = Files.readString(Path.of("src/main/java/com/healthconnect/payments/GatewayRouter.java"));
        assertTrue(
            source.contains("retryCount = 5") && source.contains("timeoutMs = 4500"),
            "Spoken Fence Violation (#212): Do not lower retryCount=5 or timeoutMs=4500 while gateway.version is v1!"
        );
    }

    @Test
    @DisplayName("FENCE-002 [#219 / INC-9984]: Preserve Thread.sleep(120) on Adreno v1.4-legacy driver")
    void guardDicomShaderAdrenoSleepInvariant() throws Exception {
        String source = Files.readString(Path.of("src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java"));
        assertTrue(
            source.contains("Thread.sleep(120)"),
            "Spoken Fence Violation (#219): Removing Thread.sleep(120) corrupts X-ray LUT textures on Adreno 619!"
        );
    }
}
`;
