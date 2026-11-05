"""Empirical Adversarial Verification Suite for Challenger 1 (Backend & Audio).

Mandate:
1. STT Base64 Robustness: corrupt, truncated, non-base64 characters, and bad padding to POST /api/gnani/stt fail with 400 (never 500).
2. Audio Retrieval & Header Validation: POST /api/tts generates audio, extract raw `id`, GET /api/audio/{id} returns 200, audio/wav, and valid 44-byte RIFF/WAVE header with 16000 Hz.
3. Webhook HMAC-SHA256 Attack Simulation: missing signature (401), invalid signature (401), tampered payload with valid signature (401), and replay duplicates (200 duplicate_ignored).
4. Adversarial Regression Suite Execution: full test pass.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import struct
import wave
import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app import app, store, REPO_DIR


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


# ============================================================================
# 1. STT Base64 Robustness
# ============================================================================

def test_stt_base64_robustness_adversarial_matrix(client: TestClient):
    """Adversarially probe POST /api/gnani/stt with malformed base64 inputs.
    Must return HTTP 400 and NEVER HTTP 500.
    """
    adversarial_payloads = [
        # (payload, description)
        ("not_base64_at_all!!@@##", "Arbitrary non-base64 ASCII symbols"),
        ("UklGR", "Truncated base64 with missing padding (5 chars)"),
        ("A", "Single character base64 (invalid quantum)"),
        ("AB", "Two character base64 without padding (unpadded)"),
        ("ABC", "Three character base64 without padding (unpadded)"),
        ("UklGRg==!!!", "Base64 with trailing invalid punctuation"),
        ("!!!UklGRg==", "Base64 with leading invalid punctuation"),
        ("Ukl GRg==", "Base64 containing illegal internal space"),
        ("Ukl\tGRg==", "Base64 containing illegal tab"),
        ("Ukl\nGRg==", "Base64 containing illegal newline with validate=True"),
        ("UklGRg=", "Single padding character on 6-character string (invalid)"),
        ("UklGRg===", "Excessive padding (3 '=' characters)"),
        ("UklGR==", "Two padding characters on 5-character string (invalid)"),
        ("====", "Padding characters only"),
        ("=", "Single padding character"),
        ("data:audio/wav;base64,invalid_inner_base64*&^%$#", "Data URI with corrupt base64 payload"),
        ("data:audio/wav;base64,UklGR", "Data URI with truncated unpadded base64"),
        ("data:audio/wav;base64,UklGRg===", "Data URI with bad padding"),
        ("???///%%%", "Punctuation characters outside base64 alphabet"),
        ("12345" * 100 + "!", "Long repetitive payload ending in invalid symbol"),
    ]

    for payload, desc in adversarial_payloads:
        resp = client.post(
            "/api/gnani/stt",
            json={
                "audio_base64": payload,
                "language": "indic-auto",
                "fallback_text": "testing error handling",
            },
        )
        assert resp.status_code == 400, (
            f"Expected HTTP 400 for [{desc}], got {resp.status_code}. Response: {resp.text}"
        )
        data = resp.json()
        assert "detail" in data
        assert "Invalid base64" in data["detail"] or "base64" in data["detail"].lower()


# ============================================================================
# 2. Audio Retrieval & Header Validation
# ============================================================================

def test_audio_retrieval_and_riff_wave_header_validation(client: TestClient):
    """Generate audio via POST /api/tts, retrieve it using the raw opaque `id`
    from GET /api/audio/{id}, and verify HTTP 200, Content-Type audio/wav,
    and 44-byte RIFF/WAVE header with 16000 Hz sample rate.
    """
    tts_test_cases = [
        {"text": "Preserve retryCount = 5 in GatewayRouter.java according to PR #212.", "language": "en-IN", "voice": "Nalini"},
        {"text": "Gateway router lo retry count = 5 alage unchandi.", "language": "te-IN", "voice": "Nalini"},
        {"text": "Gateway router mein retry count = 5 surakshit rakhein.", "language": "hi-IN", "voice": "Pranav"},
    ]

    for tc in tts_test_cases:
        # Step A: Invoke POST /api/tts
        post_resp = client.post("/api/tts", json=tc)
        assert post_resp.status_code == 200, f"POST /api/tts failed: {post_resp.text}"
        post_data = post_resp.json()
        assert "id" in post_data, "Response missing raw 'id'"
        opaque_id = post_data["id"]
        assert len(opaque_id) == 16, f"Expected 16-char hex id, got {opaque_id}"

        # Step B: Call GET /api/audio/{id} using raw opaque `id` (without tts_ prefix and without .wav)
        get_resp = client.get(f"/api/audio/{opaque_id}")
        assert get_resp.status_code == 200, (
            f"GET /api/audio/{opaque_id} returned {get_resp.status_code}: {get_resp.text}"
        )
        assert get_resp.headers.get("content-type") == "audio/wav", (
            f"Expected Content-Type audio/wav, got {get_resp.headers.get('content-type')}"
        )

        audio_bytes = get_resp.content
        assert len(audio_bytes) >= 44, f"Audio byte stream too short for WAV header: {len(audio_bytes)} bytes"

        # Step C: Verify 44-byte RIFF/WAVE header
        riff_magic = audio_bytes[0:4]
        wave_magic = audio_bytes[8:12]
        fmt_chunk = audio_bytes[12:16]

        assert riff_magic == b"RIFF", f"Expected b'RIFF', got {riff_magic!r}"
        assert wave_magic == b"WAVE", f"Expected b'WAVE', got {wave_magic!r}"
        assert fmt_chunk == b"fmt ", f"Expected b'fmt ', got {fmt_chunk!r}"

        # Extract audio format fields
        # fmt subchunk structure:
        # 16-20: Subchunk1Size (16 for PCM)
        # 20-22: AudioFormat (1 for PCM)
        # 22-24: NumChannels (1 for Mono)
        # 24-28: SampleRate (16000)
        # 28-32: ByteRate (SampleRate * NumChannels * BitsPerSample/8 = 16000 * 1 * 2 = 32000)
        # 32-34: BlockAlign (NumChannels * BitsPerSample/8 = 2)
        # 34-36: BitsPerSample (16)
        subchunk1_size, audio_format, num_channels, sample_rate, byte_rate, block_align, bits_per_sample = (
            struct.unpack("<IHHIIHH", audio_bytes[16:36])
        )
        assert audio_format == 1, f"Expected PCM format (1), got {audio_format}"
        assert num_channels == 1, f"Expected 1 channel (mono), got {num_channels}"
        assert sample_rate == 16000, f"Expected 16000 Hz sample rate, got {sample_rate}"
        assert bits_per_sample == 16, f"Expected 16 bits per sample, got {bits_per_sample}"
        assert byte_rate == 16000 * 2, f"Expected byte rate 32000, got {byte_rate}"
        assert block_align == 2, f"Expected block align 2, got {block_align}"

        # Step D: Confirm standard python wave module parses it cleanly
        with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
            assert wf.getnchannels() == 1
            assert wf.getsampwidth() == 2
            assert wf.getframerate() == 16000
            assert wf.getnframes() > 0

        # Step E: Also verify GET /api/audio/{id}.wav works identically
        get_wav_resp = client.get(f"/api/audio/{opaque_id}.wav")
        assert get_wav_resp.status_code == 200
        assert get_wav_resp.content == audio_bytes


# ============================================================================
# 3. Webhook HMAC-SHA256 Attack Simulation
# ============================================================================

def test_webhook_hmac_sha256_attack_simulation(client: TestClient):
    """Simulate HMAC-SHA256 attacks against POST /api/incidents/webhook:
    (a) missing signature -> 401
    (b) invalid signature -> 401
    (c) tampered payload with valid original signature -> 401
    (d) replay duplicates with valid signature -> 200 duplicate_ignored
    """
    secret = (os.getenv("WEBHOOK_SECRET") or os.getenv("INCIDENT_WEBHOOK_SECRET") or "whyline_test_webhook_secret_local").strip()

    payload_dict = {
        "incident_id": "INC-ADVERSARIAL-CHALLENGE-001",
        "source": "Empirical Attack Harness",
        "service": "HealthConnect Payment Gateway v1",
        "title": "Adversarial Midnight Packet Drop Simulation",
        "oncall_engineer": "@challenger_1",
        "language": "en-IN",
        "voice_postmortem": "Adversarial verification testing duplicate webhook and HMAC tamper safety.",
        "linked_fence_id": "FENCE-001",
    }
    raw_payload_bytes = json.dumps(payload_dict).encode("utf-8")
    valid_sig = hmac.new(secret.encode("utf-8"), raw_payload_bytes, hashlib.sha256).hexdigest()

    # Attack Vector (a): Missing signature header
    resp_missing = client.post(
        "/api/incidents/webhook",
        content=raw_payload_bytes,
        headers={"Content-Type": "application/json"},
    )
    assert resp_missing.status_code == 401, f"Expected 401 on missing signature, got {resp_missing.status_code}"
    assert "Missing HMAC signature header" in resp_missing.json()["detail"]

    # Attack Vector (b): Invalid signature header (corrupt hex)
    bad_sig = "a" * 64
    resp_bad = client.post(
        "/api/incidents/webhook",
        content=raw_payload_bytes,
        headers={
            "Content-Type": "application/json",
            "X-PagerDuty-Signature": bad_sig,
        },
    )
    assert resp_bad.status_code == 401, f"Expected 401 on invalid signature, got {resp_bad.status_code}"
    assert "Invalid HMAC-SHA256" in resp_bad.json()["detail"]

    # Attack Vector (b2): Invalid signature with prefix
    resp_bad_prefix = client.post(
        "/api/incidents/webhook",
        content=raw_payload_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Whyline-Signature": f"sha256={bad_sig}",
        },
    )
    assert resp_bad_prefix.status_code == 401
    assert "Invalid HMAC-SHA256" in resp_bad_prefix.json()["detail"]

    # Attack Vector (c): Tampered payload with valid original signature
    tampered_dict = dict(payload_dict)
    tampered_dict["title"] = "MALICIOUS TAMPERED TITLE: BYPASS SAFETY"
    tampered_bytes = json.dumps(tampered_dict).encode("utf-8")

    resp_tampered = client.post(
        "/api/incidents/webhook",
        content=tampered_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Whyline-Signature": f"sha256={valid_sig}",
        },
    )
    assert resp_tampered.status_code == 401, f"Expected 401 on tampered payload, got {resp_tampered.status_code}"
    assert "Invalid HMAC-SHA256" in resp_tampered.json()["detail"]

    # Step D1: Legitimate initial dispatch with valid signature -> 200 Created
    resp_valid = client.post(
        "/api/incidents/webhook",
        content=raw_payload_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Whyline-Signature": f"sha256={valid_sig}",
        },
    )
    assert resp_valid.status_code == 200, f"Expected 200 on initial valid webhook, got {resp_valid.status_code}: {resp_valid.text}"
    valid_data = resp_valid.json()
    assert "incident" in valid_data
    assert valid_data["incident"]["id"] == payload_dict["incident_id"]

    # Attack Vector (d): Replay duplicate dispatch with identical payload & signature
    resp_replay = client.post(
        "/api/incidents/webhook",
        content=raw_payload_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Whyline-Signature": f"sha256={valid_sig}",
        },
    )
    assert resp_replay.status_code == 200, f"Expected 200 on duplicate replay, got {resp_replay.status_code}"
    replay_data = resp_replay.json()
    assert replay_data.get("status") == "duplicate_ignored", (
        f"Expected status 'duplicate_ignored' on replay, got: {replay_data}"
    )
    assert replay_data.get("incident_id") == payload_dict["incident_id"]
    assert "incident" in replay_data
