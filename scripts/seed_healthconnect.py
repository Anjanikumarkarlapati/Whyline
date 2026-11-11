"""Seed the demo-repos/HealthConnect repository with 10 realistic AST anomalies,
routine CRUD files (negative controls), multi-author git blame history,
PR/Incident provenance fixtures, and config/application.yml.
"""
from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
REPO_DIR = ROOT_DIR / "demo-repos" / "HealthConnect"


def _remove_readonly(func, path, _excinfo) -> None:
    os.chmod(path, stat.S_IWRITE)
    func(path)


def run_git(args: list[str], author_name: str, author_email: str, date_iso: str) -> None:
    env = os.environ.copy()
    env.update(
        {
            "GIT_AUTHOR_NAME": author_name,
            "GIT_AUTHOR_EMAIL": author_email,
            "GIT_AUTHOR_DATE": date_iso,
            "GIT_COMMITTER_NAME": author_name,
            "GIT_COMMITTER_EMAIL": author_email,
            "GIT_COMMITTER_DATE": date_iso,
        }
    )
    subprocess.run(["git", *args], cwd=REPO_DIR, env=env, check=True, capture_output=True)


def write_repo_file(rel_path: str, content: str) -> Path:
    path = REPO_DIR / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")
    return path


def seed_healthconnect(force: bool = True) -> Path:
    fences_file = REPO_DIR / ".whyline" / "fences.json"
    if REPO_DIR.exists():
        if not force and (REPO_DIR / ".whyline" / "pr_fixtures.json").exists() and fences_file.exists():
            try:
                fences_data = json.loads(fences_file.read_text(encoding="utf-8"))
                f001 = next((f for f in fences_data if f.get("id") == "FENCE-001"), None)
                if f001 and f001.get("status") == "PENDING_CONFIRMATION" and f001.get("author_handle") == "@anjani":
                    return REPO_DIR
            except Exception:
                pass
        if sys.version_info >= (3, 12):
            shutil.rmtree(REPO_DIR, onexc=_remove_readonly)
        else:
            shutil.rmtree(REPO_DIR, onerror=_remove_readonly)
    REPO_DIR.mkdir(parents=True, exist_ok=True)

    subprocess.run(["git", "init", "-b", "main"], cwd=REPO_DIR, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Anjani Kumar"], cwd=REPO_DIR, check=True)
    subprocess.run(["git", "config", "user.email", "anjani@healthconnect.in"], cwd=REPO_DIR, check=True)

    # 0. Base Config & Routine CRUD files (Negative controls that should NOT trigger anomalies)
    write_repo_file(
        "config/application.yml",
        """
healthconnect:
  environment: "production-india-south"
  payment:
    gateway:
      provider: "razorpay-legacy-edge"
      version: "v1"
      idempotency_outbox_enabled: false
  imaging:
    adreno_driver_patch: "v1.4-legacy"
  auth:
    ntp_enforced: false
""",
    )
    write_repo_file(
        "src/main/java/com/healthconnect/patient/PatientProfileService.java",
        """
package com.healthconnect.patient;

import java.util.Map;

public class PatientProfileService {
    public String formatPatientDisplayName(String firstName, String lastName) {
        if (firstName == null || lastName == null) {
            return "Unknown Patient";
        }
        return firstName.trim() + " " + lastName.trim();
    }

    public Map<String, String> buildClinicHeader(String clinicCode) {
        return Map.of("X-Clinic-Code", clinicCode, "X-Region", "IN-AP");
    }
}
""",
    )
    run_git(["add", "."], "Anjani Kumar", "anjani@healthconnect.in", "2026-09-01T10:00:00+05:30")
    run_git(
        ["commit", "-m", "chore(init): bootstrap HealthConnect core config and patient profile CRUD"],
        "Anjani Kumar",
        "anjani@healthconnect.in",
        "2026-09-01T10:00:00+05:30",
    )

    # Anomaly 1: GatewayRouter.java (Magic retryCount = 5 & timeoutMs = 4500, PR #212, INC-9921)
    write_repo_file(
        "src/main/java/com/healthconnect/payments/GatewayRouter.java",
        """
package com.healthconnect.payments;

public class GatewayRouter {
    // PR #212: Workaround for Razorpay-Legacy v1 midnight settlement packet drop
    public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {
        int retryCount = 5;
        long timeoutMs = 4500;
        for (int attempt = 1; attempt <= retryCount; attempt++) {
            boolean delivered = sendV1Frame(orderId, amountPaise, timeoutMs);
            if (delivered) {
                return new PaymentReceipt(orderId, "SETTLED", attempt);
            }
        }
        throw new IllegalStateException("Settlement exhausted after " + retryCount + " attempts");
    }

    private boolean sendV1Frame(String orderId, long amountPaise, long timeoutMs) {
        return orderId != null && amountPaise > 0 && timeoutMs >= 4500;
    }

    public record PaymentReceipt(String orderId, String status, int attempts) {}
}
""",
    )
    run_git(
        ["add", "src/main/java/com/healthconnect/payments/GatewayRouter.java"],
        "Anjani Kumar",
        "anjani@healthconnect.in",
        "2026-10-12T23:42:00+05:30",
    )
    run_git(
        [
            "commit",
            "-m",
            "fix(payments): hold retryCount=5 and timeoutMs=4500 for v1 midnight packet drop\n\n"
            "Gateway v1 load balancer drops every 4th SYN packet during 00:00-00:15 IST settlement window.\n"
            "Do NOT reduce retryCount below 5 or lower timeoutMs below 4500 until gateway.version is upgraded to v2.\n"
            "PR: #212\nFixes: INC-9921",
        ],
        "Anjani Kumar",
        "anjani@healthconnect.in",
        "2026-10-12T23:42:00+05:30",
    )

    # Anomaly 2: DicomShaderPipeline.java (Thread.sleep(120) GPU flush workaround - Active Author)
    write_repo_file(
        "src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java",
        """
package com.healthconnect.imaging;

public class DicomShaderPipeline {
    public byte[] renderRadiologySlice(byte[] rawVoxelBuffer, int sliceIndex) throws InterruptedException {
        if (rawVoxelBuffer == null || rawVoxelBuffer.length == 0) {
            throw new IllegalArgumentException("Empty DICOM voxel buffer");
        }
        // Adreno 619 GLES fence sync bug: driver reports buffer ready 95ms early
        Thread.sleep(120);
        return applyWindowLevelLut(rawVoxelBuffer, sliceIndex);
    }

    private byte[] applyWindowLevelLut(byte[] buffer, int sliceIndex) {
        return buffer;
    }
}
""",
    )
    run_git(
        ["add", "src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java"],
        "Anjani Kumar",
        "anjani@healthconnect.in",
        "2026-10-15T14:15:00+05:30",
    )
    run_git(
        [
            "commit",
            "-m",
            "fix(imaging): add 120ms Thread.sleep before LUT stage on Adreno tablet GPUs\n\n"
            "Removing Thread.sleep(120) corrupts X-ray slice rendering with half-zeroed textures on rural clinic tablets.\n"
            "PR: #219\nFixes: INC-9984",
        ],
        "Anjani Kumar",
        "anjani@healthconnect.in",
        "2026-10-15T14:15:00+05:30",
    )

    # Anomaly 3: JwtClockSkewFilter.java (Magic clockSkewSeconds = 180 - Departed Author @vikram-legacy)
    write_repo_file(
        "src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java",
        """
package com.healthconnect.auth;

public class JwtClockSkewFilter {
    public boolean validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec) {
        int clockSkewSeconds = 180;
        long drift = Math.abs(serverNowEpochSec - tokenIssuedAtEpochSec);
        return drift <= clockSkewSeconds;
    }
}
""",
    )
    run_git(
        ["add", "src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java"],
        "Vikram Rao",
        "vikram-legacy@healthconnect.in",
        "2025-11-19T18:05:00+05:30",
    )
    run_git(
        [
            "commit",
            "-m",
            "fix(auth): allow 180s JWT clock skew for Primary Health Centre edge routers\n\n"
            "BSNL satellite backhaul blocks UDP port 123 (NTP) in 14 tribal clinics; routers drift up to 145s.\n"
            "PR: #149\nFixes: INC-7410",
        ],
        "Vikram Rao",
        "vikram-legacy@healthconnect.in",
        "2025-11-19T18:05:00+05:30",
    )

    # Anomaly 4: LegacyHl7SslClient.java (Validation bypass TrustAllCerts / verify=false - Departed Author)
    write_repo_file(
        "src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java",
        """
package com.healthconnect.hl7;

public class LegacyHl7SslClient {
    @SuppressWarnings("deprecation")
    public String connectHematologyAnalyzer(String hostIp) {
        if (!hostIp.startsWith("10.42.")) {
            throw new SecurityException("TrustAllCerts only permitted inside isolated lab VLAN 10.42.0.0/16");
        }
        boolean verify = false;
        String tlsPolicy = "TrustAllCerts";
        returntlsHandshake(hostIp, verify, tlsPolicy);
    }

    private String returnTlsHandshake(String hostIp, boolean verify, String policy) {
        return hostIp + ":" + policy + ":verify=" + verify;
    }

    private String returnTslFallback(String hostIp) {
        return hostIp;
    }

    private String returntlsHandshake(String hostIp, boolean verify, String policy) {
        return returnTlsHandshake(hostIp, verify, policy);
    }
}
""",
    )
    run_git(
        ["add", "src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java"],
        "Sneha Nair",
        "sneha-infra-2024@healthconnect.in",
        "2025-08-04T11:30:00+05:30",
    )
    run_git(
        [
            "commit",
            "-m",
            "fix(hl7): bypass TLS cert chain check on isolated VLAN 10.42.0.0/16 for Mindray BC-5150\n\n"
            "Analyzer firmware embeds an expired 2019 self-signed root CA that cannot be reflashed without vendor hardware dongle.\n"
            "PR: #118\nFixes: INC-6802",
        ],
        "Sneha Nair",
        "sneha-infra-2024@healthconnect.in",
        "2025-08-04T11:30:00+05:30",
    )

    # Anomaly 5: WebRtcIceCandidateHandler.java (Swallowed catch block - Active Author)
    write_repo_file(
        "src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java",
        """
package com.healthconnect.telehealth;

public class WebRtcIceCandidateHandler {
    public void onRemoteIceCandidate(String sessionId, String candidateSdp) {
        try {
            applyCandidateToPeerConnection(sessionId, candidateSdp);
        } catch (RuntimeException e) {
            // Intentionally swallowed: Dual-SIM 4G handover sends late candidate for closed interface
        }
    }

    private void applyCandidateToPeerConnection(String sessionId, String candidateSdp) {
        if (candidateSdp != null && candidateSdp.contains("stale-ufrag")) {
            throw new RuntimeException("Stale ICE ufrag after cellular handover");
        }
    }
}
""",
    )
    run_git(
        ["add", "src/main/java/com/healthconnect/telehealth/WebRtcIceCandidateHandler.java"],
        "Rahul Verma",
        "rahul-sre@healthconnect.in",
        "2026-10-18T16:40:00+05:30",
    )
    run_git(
        [
            "commit",
            "-m",
            "fix(telehealth): swallow late stale-ufrag ICE exception during Dual-SIM 4G handover\n\n"
            "Rethrowing tears down active doctor-patient video consultations when Jio/Airtel switches radio bearer.\n"
            "PR: #224\nFixes: INC-10012",
        ],
        "Rahul Verma",
        "rahul-sre@healthconnect.in",
        "2026-10-18T16:40:00+05:30",
    )

    # Anomaly 6: patient_queue.py (Explicit time.sleep(2.5) throttle - Active Author)
    write_repo_file(
        "services/sync_worker/patient_queue.py",
        """
import time


def sync_abha_demographic_record(abha_id: str, payload: dict) -> dict:
    # UIDAI sandbox gateway returns HTTP 429 and bans IP for 15 mins if burst > 1 req / 2.2s
    time.sleep(2.5)
    return {"abha_id": abha_id, "status": "VERIFIED", "fields": len(payload)}
""",
    )
    run_git(
        ["add", "services/sync_worker/patient_queue.py"],
        "Anjani Kumar",
        "anjani@healthconnect.in",
        "2026-10-20T09:12:00+05:30",
    )
    run_git(
        [
            "commit",
            "-m",
            "fix(abha): enforce time.sleep(2.5) pacing before UIDAI demographic verification\n\n"
            "Removing this sleep triggers an automatic 15-minute IP block on the NHA edge firewall.\n"
            "PR: #231\nFixes: INC-10045",
        ],
        "Anjani Kumar",
        "anjani@healthconnect.in",
        "2026-10-20T09:12:00+05:30",
    )

    # Anomaly 7: webhook_dispatcher.py (Revert commit - Active Author)
    write_repo_file(
        "services/sync_worker/webhook_dispatcher.py",
        """
def dispatch_icu_vital_alerts(events: list[dict]) -> list[str]:
    # Reverted async gather batching: must dispatch sequentially in strict FIFO order
    delivered_ids: list[str] = []
    for event in events:
        delivered_ids.append(f"SEQ-{event['id']}")
    return delivered_ids
""",
    )
    run_git(
        ["add", "services/sync_worker/webhook_dispatcher.py"],
        "Rahul Verma",
        "rahul-sre@healthconnect.in",
        "2026-10-22T21:55:00+05:30",
    )
    run_git(
        [
            "commit",
            "-m",
            'Revert "perf(webhooks): batch ICU vital alerts with asyncio.gather"\n\n'
            "This reverts commit 9c41a0b. Async batching caused SpO2 recovery events to arrive BEFORE critical desaturation alerts.\n"
            "PR: #238\nFixes: INC-10089",
        ],
        "Rahul Verma",
        "rahul-sre@healthconnect.in",
        "2026-10-22T21:55:00+05:30",
    )

    # Anomaly 8: gst_rounding_engine.py (Magic literal 0.0049 in billing control flow - Departed Author)
    write_repo_file(
        "services/billing/gst_rounding_engine.py",
        """
def compute_state_treasury_copay(gross_amount: float) -> float:
    # AP State Aarogyasri portal rejects invoices if half-paise drift exceeds 0.0049
    epsilon_bias = 0.0049
    retry_window = 7
    if gross_amount <= 0:
        return 0.0
    return round(gross_amount + epsilon_bias, 2)
""",
    )
    run_git(
        ["add", "services/billing/gst_rounding_engine.py"],
        "Vikram Rao",
        "vikram-legacy@healthconnect.in",
        "2025-12-03T15:20:00+05:30",
    )
    run_git(
        [
            "commit",
            "-m",
            "fix(billing): apply 0.0049 epsilon bias to match COBOL treasury rounding\n\n"
            "Standard Python banker rounding mismatches state treasury settlement by 1 paisa on .xx5 amounts.\n"
            "PR: #162\nFixes: INC-7901",
        ],
        "Vikram Rao",
        "vikram-legacy@healthconnect.in",
        "2025-12-03T15:20:00+05:30",
    )

    # Anomaly 9: prescription_parser.py (Validation bypass verify=False on local OCR weights - Active Author)
    write_repo_file(
        "services/ocr/prescription_parser.py",
        """
def load_telugu_handwriting_weights(model_uri: str) -> dict:
    # Air-gapped district hospital mirror uses internal CA; keep verify=False until mirror v2
    verify = False
    max_beam_retries = 6
    return {"model_uri": model_uri, "tls_verify": verify, "beam_retries": max_beam_retries}
""",
    )
    run_git(
        ["add", "services/ocr/prescription_parser.py"],
        "Anjani Kumar",
        "anjani@healthconnect.in",
        "2026-10-25T12:10:00+05:30",
    )
    run_git(
        [
            "commit",
            "-m",
            "fix(ocr): disable TLS verify for air-gapped district LAN weight mirror\n\n"
            "District hospital LAN boxes do not have internet access to validate public OCSP staples.\n"
            "PR: #244\nFixes: INC-10112",
        ],
        "Anjani Kumar",
        "anjani@healthconnect.in",
        "2026-10-25T12:10:00+05:30",
    )

    # Anomaly 10: redis_session_store.py (Swallowed exception in failover path - Active Author)
    write_repo_file(
        "services/cache/redis_session_store.py",
        """
def persist_triage_draft(session_key: str, payload: dict, shadow_cache: dict) -> bool:
    try:
        if payload.get("simulate_readonly_replica"):
            raise RuntimeError("READONLY You can't write against a read only replica.")
        shadow_cache[session_key] = payload
        return True
    except Exception:
        pass
    shadow_cache[f"fallback:{session_key}"] = payload
    return True
""",
    )
    run_git(
        ["add", "services/cache/redis_session_store.py"],
        "Rahul Verma",
        "rahul-sre@healthconnect.in",
        "2026-10-27T19:05:00+05:30",
    )
    run_git(
        [
            "commit",
            "-m",
            "fix(cache): swallow Redis READONLY replica error and write to local shadow buffer\n\n"
            "During Sentinel failover (~8s), throwing 500 loses triage vitals entered by ER nurses.\n"
            "PR: #249\nFixes: INC-10150",
        ],
        "Rahul Verma",
        "rahul-sre@healthconnect.in",
        "2026-10-27T19:05:00+05:30",
    )

    # Write PR & Incident Provenance Fixtures for Local Sandbox enrichment
    pr_fixtures = {
        "active_authors": ["anjani@healthconnect.in", "rahul-sre@healthconnect.in"],
        "pull_requests": {
            "#212": {
                "pr_number": "#212",
                "title": "fix(payments): hold retryCount=5 and timeoutMs=4500 for v1 midnight packet drop",
                "reviewer": "@srinivas-principal",
                "inline_comment": "Verified on packet capture: Razorpay v1 edge drops every 4th SYN between 00:00 and 00:15 IST. Do NOT let anyone or any AI cleanup bot drop retryCount below 5 until gateway.version is bumped to v2 in application.yml!",
                "incident_id": "INC-9921",
                "expiry_rule": {
                    "config_file": "config/application.yml",
                    "key_path": "healthconnect.payment.gateway.version",
                    "expected_value": "v2",
                    "description": "Expires automatically when healthconnect.payment.gateway.version == 'v2' in config/application.yml",
                },
            },
            "#219": {
                "pr_number": "#219",
                "title": "fix(imaging): add 120ms Thread.sleep before LUT stage on Adreno tablet GPUs",
                "reviewer": "@meera-graphics",
                "inline_comment": "Tested on 12 clinic tablets: glFenceSync returns early on Adreno 619 driver v1.4. Keep Thread.sleep(120) until adreno_driver_patch == 'v2.0'.",
                "incident_id": "INC-9984",
                "expiry_rule": {
                    "config_file": "config/application.yml",
                    "key_path": "healthconnect.imaging.adreno_driver_patch",
                    "expected_value": "v2.0",
                    "description": "Expires when healthconnect.imaging.adreno_driver_patch == 'v2.0'",
                },
            },
            "#149": {
                "pr_number": "#149",
                "title": "fix(auth): allow 180s JWT clock skew for Primary Health Centre edge routers",
                "reviewer": "@vikram-legacy",
                "inline_comment": "Author @vikram-legacy departed in Jan 2026. BSNL satellite routers block NTP port 123; keep 180s skew until auth.ntp_enforced is true.",
                "incident_id": "INC-7410",
                "expiry_rule": {
                    "config_file": "config/application.yml",
                    "key_path": "healthconnect.auth.ntp_enforced",
                    "expected_value": True,
                    "description": "Expires when healthconnect.auth.ntp_enforced == true",
                },
            },
        },
    }
    whyline_dir = REPO_DIR / ".whyline"
    whyline_dir.mkdir(parents=True, exist_ok=True)
    (whyline_dir / "pr_fixtures.json").write_text(json.dumps(pr_fixtures, indent=2), encoding="utf-8")

    from backend.whyline.store import WhyLineStore
    store = WhyLineStore(REPO_DIR)
    store.ensure_initialized(force_rescan=True)

    print(f"Seeded HealthConnect repository at {REPO_DIR}")
    return REPO_DIR


if __name__ == "__main__":
    seed_healthconnect()
