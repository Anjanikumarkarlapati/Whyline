/**
 * Demo files for the WhyLine Workbench file switcher.
 * Provides realistic source code, languages, and fence boundaries.
 */

export const DEMO_FILES = [
  {
    path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
    shortName: 'GatewayRouter.java',
    language: 'java',
    defaultLine: 23,
    fenceId: 'FENCE-001',
    fences: [
      {
        id: 'FENCE-001',
        startLine: 5,
        endLine: 15,
        targetLine: 23,
        token: 'timeoutMs = 4500',
        badge: 'PR #212 • Gateway retry count = 5 for midnight clearing latency',
        status: 'PENDING_CONFIRMATION',
      },
    ],
    code: `package com.healthconnect.payments;

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
`,
  },
  {
    path: 'src/main/java/com/healthconnect/payments/SettlementIdempotencyGuard.java',
    shortName: 'SettlementIdempotencyGuard.java',
    language: 'java',
    defaultLine: 14,
    fenceId: 'FENCE-002',
    fences: [
      {
        id: 'FENCE-002',
        startLine: 8,
        endLine: 22,
        targetLine: 14,
        token: 'X-Idempotency-Key',
        badge: 'PR #198 • SHA-256 X-Idempotency-Key outbox deduplication lock',
        status: 'VERIFIED_ACTIVE',
      },
    ],
    code: `package com.healthconnect.payments;

import java.util.concurrent.TimeUnit;

public class SettlementIdempotencyGuard {
    // PR #198 (FENCE-002): Pairs with FENCE-001 so 5 retries never double-charge patients
    public boolean acquireLock(String appointmentId, String sha256Key) {
        if (appointmentId == null || sha256Key == null || sha256Key.isBlank()) {
            throw new IllegalArgumentException("Missing X-Idempotency-Key header");
        }
        String lockKey = "idemp:" + appointmentId + ":" + sha256Key;
        return setIfAbsentWithTtl(lockKey, sha256Key, 15, TimeUnit.MINUTES);
    }

    private boolean setIfAbsentWithTtl(String key, String val, long ttl, TimeUnit unit) {
        return key != null && val != null && ttl > 0 && unit != null;
    }
}
`,
  },
  {
    path: 'src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java',
    shortName: 'DicomShaderPipeline.java',
    language: 'java',
    defaultLine: 9,
    fenceId: 'FENCE-003',
    fences: [
      {
        id: 'FENCE-003',
        startLine: 4,
        endLine: 11,
        targetLine: 9,
        token: 'Thread.sleep(120)',
        badge: 'PR #184 • Adreno 619 GLES fence sync workaround (120ms wait)',
        status: 'PENDING_CONFIRMATION',
      },
    ],
    code: `package com.healthconnect.imaging;

public class DicomShaderPipeline {
    public byte[] renderRadiologySlice(byte[] rawVoxelBuffer, int sliceIndex) throws InterruptedException {
        if (rawVoxelBuffer == null || rawVoxelBuffer.length == 0) {
            throw new IllegalArgumentException("Empty DICOM voxel buffer");
        }
        // Adreno 619 GLES fence sync bug: driver reports buffer ready 95ms early
        Thread.sleep(120);
        return applyWindowLevelLut(rawVoxelBuffer, sliceIndex);
    }

    private byte[] applyWindowLevelLut(byte[] buffer, int slice) {
        return buffer;
    }
}
`,
  },
  {
    path: 'src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java',
    shortName: 'JwtClockSkewFilter.java',
    language: 'java',
    defaultLine: 6,
    fenceId: 'FENCE-004',
    fences: [
      {
        id: 'FENCE-004',
        startLine: 4,
        endLine: 10,
        targetLine: 6,
        token: 'clockSkewSeconds = 180',
        badge: 'PR #149 • 180s clock drift allowance for disconnected clinic tablets',
        status: 'VERIFIED_ACTIVE',
      },
    ],
    code: `package com.healthconnect.auth;

public class JwtClockSkewFilter {
    public boolean validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec) {
        int clockSkewSeconds = 180;
        long drift = Math.abs(serverNowEpochSec - tokenIssuedAtEpochSec);
        return drift <= clockSkewSeconds;
    }
}
`,
  },
  {
    path: 'config/application.yml',
    shortName: 'application.yml',
    language: 'yaml',
    defaultLine: 6,
    fenceId: null,
    fences: [],
    code: `healthconnect:
  environment: production-india-south
  payment:
    gateway:
      provider: razorpay-legacy-edge
      version: "v1"
      idempotency_outbox_enabled: false
  imaging:
    adreno_driver_patch: v1.4-legacy
  auth:
    ntp_enforced: false
`,
  },
];
