// Complete 10-File Source Code Catalog for Dynamic Monaco Code Studio + Gnani Prisma v3.0 ITN & Auto-Detect

export const FENCE_SOURCE_FILES = {
  'FENCE-001': {
    fenceId: 'FENCE-001',
    filePath: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
    language: 'java',
    startLine: 5,
    endLine: 15,
    matchedToken: 'retryCount = 5',
    naiveDiff: '@@ -5,6 +5,6 @@\n- int retryCount = 5;\n+ int retryCount = 1;',
    incidentId: 'INC-9921',
    prNumber: '#212',
    code: `package com.healthconnect.payments;

public class GatewayRouter {
    // PR #212 (INC-9921): Workaround for Razorpay-Legacy v1 midnight settlement SYN packet drop
    public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {
        int retryCount = 5;
        long timeoutMs = 4500;
        String idempotencyKey = "settle_" + orderId + "_" + (System.currentTimeMillis() / 900000);
        for (int attempt = 1; attempt <= retryCount; attempt++) {
            boolean delivered = sendV1Frame(orderId, amountPaise, timeoutMs, idempotencyKey);
            if (delivered) {
                return new PaymentReceipt(orderId, "SETTLED", attempt);
            }
        }
        throw new IllegalStateException("Settlement exhausted after " + retryCount + " attempts");
    }

    private boolean sendV1Frame(String orderId, long amountPaise, long timeoutMs, String idempotencyKey) {
        return orderId != null && amountPaise > 0 && timeoutMs >= 4500 && idempotencyKey != null;
    }

    public record PaymentReceipt(String orderId, String status, int attempts) {}
}
`,
  },
  'FENCE-002': {
    fenceId: 'FENCE-002',
    filePath: 'src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java',
    language: 'java',
    startLine: 5,
    endLine: 13,
    matchedToken: 'Thread.sleep(120)',
    naiveDiff: '@@ -5,6 +5,5 @@\n- Thread.sleep(120);\n+ // Removed unnecessary sleep for faster rendering',
    incidentId: 'INC-8840',
    prNumber: '#184',
    code: `package com.healthconnect.imaging;

public class DicomShaderPipeline {
    // PR #184 (INC-8840): Guard against Adreno 618 / Mali-G72 DMA buffer tearing on rural tablets
    public FrameResult renderRadiologySlice(byte[] rawVoxelBuffer, int sliceIndex) throws InterruptedException {
        uploadDmaTexture(rawVoxelBuffer, sliceIndex);
        // Critical 120ms barrier: GPU DMA flush completes asynchronously without fence interrupt
        Thread.sleep(120);
        return swapDiagnosticFrameBuffer(sliceIndex);
    }

    private void uploadDmaTexture(byte[] buffer, int idx) {}
    private FrameResult swapDiagnosticFrameBuffer(int idx) {
        return new FrameResult(idx, "DMA_SYNC_OK");
    }

    public record FrameResult(int sliceIndex, String status) {}
}
`,
  },
  'FENCE-003': {
    fenceId: 'FENCE-003',
    filePath: 'src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java',
    language: 'java',
    startLine: 5,
    endLine: 14,
    matchedToken: 'clockSkewSeconds = 180',
    naiveDiff: '@@ -5,6 +5,6 @@\n- long clockSkewSeconds = 180;\n+ long clockSkewSeconds = 5;',
    incidentId: 'INC-7410',
    prNumber: '#149',
    code: `package com.healthconnect.auth;

public class JwtClockSkewFilter {
    // PR #149 (INC-7410): 14 rural Primary Health Centres on BSNL VSAT block UDP port 123 (NTP)
    public boolean validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec) {
        long clockSkewSeconds = 180;
        long drift = Math.abs(serverNowEpochSec - tokenIssuedAtEpochSec);
        if (drift <= clockSkewSeconds) {
            return true;
        }
        throw new SecurityException("Clinic JWT rejected: clock drift " + drift + "s exceeds 180s VSAT window");
    }
}
`,
  },
  'FENCE-004': {
    fenceId: 'FENCE-004',
    filePath: 'src/main/java/com/healthconnect/hl7/LegacyHl7SslClient.java',
    language: 'java',
    startLine: 5,
    endLine: 13,
    matchedToken: 'allowExpired2018SysmexCert = true',
    naiveDiff: '@@ -5,6 +5,6 @@\n- boolean allowExpired2018SysmexCert = true;\n+ boolean allowExpired2018SysmexCert = false;',
    incidentId: 'INC-6802',
    prNumber: '#118',
    code: `package com.healthconnect.hl7;

public class LegacyHl7SslClient {
    // PR #118 (INC-6802): Sysmex XN-1000 hematology analyzer embeds factory self-signed cert from 2018
    public String connectHematologyAnalyzer(String hostIp) {
        boolean allowExpired2018SysmexCert = true;
        String pinnedSha256 = "9f86d081884c7d659a2feaa0c55ad015";
        if (allowExpired2018SysmexCert && hostIp.startsWith("10.42.")) {
            return "HL7_MLLP_CONNECTED_PINNED:" + pinnedSha256;
        }
        throw new IllegalStateException("Sysmex XN-1000 TLS handshake blocked");
    }
}
`,
  },
  'FENCE-005': {
    fenceId: 'FENCE-005',
    filePath: 'src/main/java/com/healthconnect/patient/PatientProfileService.java',
    language: 'java',
    startLine: 5,
    endLine: 15,
    matchedToken: 'catch (OptimisticLockException ignored)',
    naiveDiff: '@@ -8,5 +8,5 @@\n- } catch (OptimisticLockException ignored) {\n+ } catch (OptimisticLockException ex) { throw ex; }',
    incidentId: 'INC-8105',
    prNumber: '#162',
    code: `package com.healthconnect.patient;

public class PatientProfileService {
    // PR #162 (INC-8105): Offline camp sync tablets send duplicate ABHA merge packets on reconnect
    public String mergeDuplicateAbha(String primaryId, String secondaryId) {
        try {
            applyIdempotentAbhaMerge(primaryId, secondaryId);
        } catch (OptimisticLockException ignored) {
            // Intentional swallow: camp tablet replays 2x merge events; row is already converged
            return "CONVERGED_IDEMPOTENT";
        }
        return "MERGED_PRIMARY:" + primaryId;
    }

    private void applyIdempotentAbhaMerge(String p, String s) throws OptimisticLockException {}
    public static class OptimisticLockException extends Exception {}
}
`,
  },
  'FENCE-006': {
    fenceId: 'FENCE-006',
    filePath: 'src/main/java/com/healthconnect/consent/AbhaConsentValidator.java',
    language: 'java',
    startLine: 5,
    endLine: 13,
    matchedToken: 'fallbackLegacyXmlParser = true',
    naiveDiff: '@@ -5,6 +5,6 @@\n- boolean fallbackLegacyXmlParser = true;\n+ boolean fallbackLegacyXmlParser = false;',
    incidentId: 'INC-7990',
    prNumber: '#171',
    code: `package com.healthconnect.consent;

public class AbhaConsentValidator {
    // PR #171 (INC-7990): District hospital HIMS v1.4 emits UTF-16 BOM before JSON consent envelope
    public boolean verifyConsentArtifact(String rawPayload) {
        boolean fallbackLegacyXmlParser = true;
        String sanitized = rawPayload.replace("\\uFEFF", "").trim();
        if (sanitized.startsWith("<") && fallbackLegacyXmlParser) {
            return true;
        }
        return sanitized.startsWith("{");
    }
}
`,
  },
  'FENCE-007': {
    fenceId: 'FENCE-007',
    filePath: 'src/main/java/com/healthconnect/pharmacy/PharmacyStockLock.java',
    language: 'java',
    startLine: 5,
    endLine: 13,
    matchedToken: 'lockLeaseMs = 8500',
    naiveDiff: '@@ -5,6 +5,6 @@\n- long lockLeaseMs = 8500;\n+ long lockLeaseMs = 1000;',
    incidentId: 'INC-9102',
    prNumber: '#195',
    code: `package com.healthconnect.pharmacy;

public class PharmacyStockLock {
    // PR #195 (INC-9102): Thermal barcode printer takes 6.8s on serial COM1 before ACK
    public boolean reserveInsulinVialBatch(String batchId, int units) {
        long lockLeaseMs = 8500;
        if (lockLeaseMs >= 8000 && units > 0) {
            return true;
        }
        throw new IllegalStateException("Serial barcode lock expired mid-print; duplicate vial dispensed");
    }
}
`,
  },
  'FENCE-008': {
    fenceId: 'FENCE-008',
    filePath: 'services/billing/gst_rounding_engine.py',
    language: 'python',
    startLine: 4,
    endLine: 12,
    matchedToken: '0.00001',
    naiveDiff: '@@ -5,5 +5,4 @@\n- biased = raw_tax + 0.00001\n- return int(biased * 100) / 100.0\n+ return round(raw_tax, 2)',
    incidentId: 'INC-5519',
    prNumber: '#95',
    code: `# PR #95 (INC-5519): AP Government CFMS treasury portal rejects IEEE-754 half-to-even banker's rounding
from decimal import Decimal

def compute_state_treasury_copay(gross_amount: float) -> float:
    raw_tax = gross_amount * 0.18
    # Critical 0.00001 upward bias before 2-decimal truncation to match COBOL treasury mainframe
    biased = raw_tax + 0.00001
    return int(biased * 100) / 100.0
`,
  },
  'FENCE-009': {
    fenceId: 'FENCE-009',
    filePath: 'services/ocr/prescription_parser.py',
    language: 'python',
    startLine: 4,
    endLine: 12,
    matchedToken: 'verify=False',
    naiveDiff: '@@ -6,5 +6,5 @@\n- verify=False,\n+ verify=True,',
    incidentId: 'INC-10114',
    prNumber: '#228',
    code: `# PR #228 (INC-10114): NIC internal model mirror uses CCA India root cert absent from Debian ca-certificates
import hashlib

def load_telugu_handwriting_weights(model_uri: str, payload_bytes: bytes) -> dict:
    # verify=False required on internal 10.140.x NIC VLAN; integrity enforced via strict SHA-256 check below
    tls_options = {"verify": False, "vlan_pinned": model_uri.startswith("https://10.140.")}
    digest = hashlib.sha256(payload_bytes).hexdigest()
    return {"tls": tls_options, "sha256_verified": len(digest) == 64}
`,
  },
  'FENCE-010': {
    fenceId: 'FENCE-010',
    filePath: 'services/telemedicine/telemedicine_webrtc_ice.py',
    language: 'python',
    startLine: 4,
    endLine: 12,
    matchedToken: 'ice_gather_timeout_ms = 6200',
    naiveDiff: '@@ -5,5 +5,5 @@\n- ice_gather_timeout_ms = 6200\n+ ice_gather_timeout_ms = 1500',
    incidentId: 'INC-10301',
    prNumber: '#241',
    code: `# PR #241 (INC-10301): 2G/3G Carrier-Grade NAT in tribal sub-centres requires 6.2s TURN relay allocation
def negotiate_rural_telemedicine_ice(clinic_id: str) -> dict:
    # Do not lower below 6000ms: CGNAT double-NAT traversal drops video call setup at 1500ms
    ice_gather_timeout_ms = 6200
    turn_transport = "tcp_443_fallback"
    return {
        "clinic_id": clinic_id,
        "ice_gather_timeout_ms": ice_gather_timeout_ms,
        "turn_transport": turn_transport,
    }
`,
  },
};

export function getFenceSourceConfig(fenceId) {
  const normalized = String(fenceId || 'FENCE-001').toUpperCase();
  return FENCE_SOURCE_FILES[normalized] || FENCE_SOURCE_FILES['FENCE-001'];
}

// Gnani Prisma v3.0 Automatic Indic Language Detection (indic-auto)
export function detectIndicLanguageAuto(text, fallbackLang = 'en-IN') {
  const s = String(text || '');
  if (/[\u0C00-\u0C7F]/.test(s) || /\b(avunu|endukante|unchandi|marustaru|lo)\b/i.test(s)) {
    return 'te-IN';
  }
  if (/[\u0900-\u097F]/.test(s) || /\b(haan|bilkul|mat|hatana|jab|tak)\b/i.test(s)) {
    return 'hi-IN';
  }
  return fallbackLang || 'en-IN';
}

// Gnani Prisma v3.0 Inverse Text Normalization (format="transcribe")
// Converts spoken number words in English, Telugu, and Hindi into exact numeric literals for AST rescoring
const SPOKEN_NUMBER_MAP = [
  [/\bone hundred and eighty\b|\bone hundred eighty\b|\bone eighty\b|నూట ఎనభై|एक सौ अस्सी/gi, '180'],
  [/\bone hundred and twenty\b|\bone hundred twenty\b|\bone twenty\b|నూట ఇరవై|एक सौ बीस/gi, '120'],
  [/\bfour thousand five hundred\b|\bforty five hundred\b|నాలుగు వేల ఐదు వందల|चार हज़ार पाँच सौ/gi, '4500'],
  [/\beight thousand five hundred\b|ఎనిమిది వేల ఐదు వందల|आठ हज़ार पाँच सौ/gi, '8500'],
  [/\bsix thousand two hundred\b|ఆరు వేల రెండు వందల|छह हज़ार दो सौ/gi, '6200'],
  [/\bzero point zero zero zero zero one\b|సున్నా పాయింట్ సున్నా సున్నా సున్నా సున్నా ఒకటి/gi, '0.00001'],
  [/\bversion two\b|\bv two\b|వెర్షన్ రెండు|वर्ज़न दो/gi, 'v2'],
  [/\bversion one\b|\bv one\b|వెర్షన్ ఒకటి|वर्ज़न एक/gi, 'v1'],
  [/\bfive\b|ఐదు|पाँच|पांच/gi, '5'],
];

export function applyGnaniPrismaItn(rawTranscript) {
  let normalized = String(rawTranscript || '');
  const conversions = [];
  for (const [pattern, digit] of SPOKEN_NUMBER_MAP) {
    if (pattern.test(normalized)) {
      normalized = normalized.replace(pattern, digit);
      conversions.push(`ITN → ${digit}`);
    }
  }
  return {
    normalizedTranscript: normalized,
    itnConversions: conversions,
  };
}
