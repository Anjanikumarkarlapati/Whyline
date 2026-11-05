"""Tests for Phase 0 - Safety Hardening.

Covers:
1. CORS explicit origins restriction (no wildcard with credentials).
2. /api/incidents/webhook HMAC-SHA256 verification (constant-time, 401 on failure).
3. POST /api/tts validation (<=600 chars, allowlists, rate limit) & GET /api/audio/{id} cached-only (404 on missing).
4. LRU + TTL cleanup of .whyline/audio.
5. Secret scanner verification.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app import app, cleanup_audio_cache, _TTS_RATE_LIMIT, _TTS_RATE_LOCK
from scripts.scan_secrets import scan_file_for_secrets

client = TestClient(app)


# ==============================================================================
# 1. CORS Enforcement
# ==============================================================================
def test_cors_allows_explicit_origins() -> None:
    for origin in ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]:
        resp = client.options(
            "/api/briefing",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.headers.get("access-control-allow-origin") == origin
        assert resp.headers.get("access-control-allow-credentials") == "true"


def test_cors_rejects_untrusted_origins() -> None:
    resp = client.options(
        "/api/briefing",
        headers={
            "Origin": "https://malicious-site.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Untrusted origin should NOT be reflected in allow-origin
    assert resp.headers.get("access-control-allow-origin") != "https://malicious-site.com"
    assert resp.headers.get("access-control-allow-origin") != "*"


# ==============================================================================
# 2. Webhook HMAC-SHA256 Verification
# ==============================================================================
def test_incident_webhook_rejects_missing_signature(monkeypatch) -> None:
    monkeypatch.setenv("WEBHOOK_SECRET", "test-secret-key-123")
    payload = {
        "incident_id": "INC-TEST-01",
        "source": "PagerDuty",
        "service": "Payment",
        "title": "Test Incident",
        "oncall_engineer": "@dev",
        "language": "en-IN",
        "voice_postmortem": "Test postmortem",
        "linked_fence_id": "FENCE-001",
    }
    resp = client.post("/api/incidents/webhook", json=payload)
    assert resp.status_code == 401
    assert "Missing" in resp.json()["detail"]


def test_incident_webhook_rejects_invalid_signature(monkeypatch) -> None:
    monkeypatch.setenv("WEBHOOK_SECRET", "test-secret-key-123")
    payload = {
        "incident_id": "INC-TEST-02",
        "source": "PagerDuty",
        "service": "Payment",
        "title": "Test Incident",
        "oncall_engineer": "@dev",
        "language": "en-IN",
        "voice_postmortem": "Test postmortem",
        "linked_fence_id": "FENCE-001",
    }
    raw_body = json.dumps(payload).encode("utf-8")
    resp = client.post(
        "/api/incidents/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-PagerDuty-Signature": "invalid_hex_signature",
        },
    )
    assert resp.status_code == 401
    assert "Invalid HMAC" in resp.json()["detail"]


def test_incident_webhook_accepts_valid_signature(monkeypatch) -> None:
    secret = "my-secure-webhook-secret-999"
    monkeypatch.setenv("WEBHOOK_SECRET", secret)
    payload = {
        "incident_id": "INC-TEST-03",
        "source": "PagerDuty",
        "service": "Payment",
        "title": "Test Midnight SYN Drop",
        "oncall_engineer": "@anjani",
        "language": "en-IN",
        "voice_postmortem": "Keep retry count = 5 per FENCE-001.",
        "linked_fence_id": "FENCE-001",
    }
    raw_body = json.dumps(payload).encode("utf-8")
    expected_hmac = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

    resp = client.post(
        "/api/incidents/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "X-PagerDuty-Signature": f"v1={expected_hmac}",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["incident"]["id"] == "INC-TEST-03"


# ==============================================================================
# 3. Audio & TTS Endpoints: Validation, Opaque IDs, Cache Only
# ==============================================================================
def test_tts_endpoint_rejects_excessive_length() -> None:
    huge_text = "A" * 601
    resp = client.post("/api/tts", json={"text": huge_text, "language": "en-IN", "voice": "Nalini"})
    assert resp.status_code == 400
    assert "between 1 and 600" in resp.json()["detail"]


def test_tts_endpoint_rejects_empty_text() -> None:
    resp = client.post("/api/tts", json={"text": "   ", "language": "en-IN", "voice": "Nalini"})
    assert resp.status_code == 400


def test_tts_endpoint_rejects_invalid_language() -> None:
    resp = client.post("/api/tts", json={"text": "Valid text", "language": "klingon", "voice": "Nalini"})
    assert resp.status_code == 400
    assert "Unsupported language" in resp.json()["detail"]


def test_tts_endpoint_rejects_invalid_voice() -> None:
    resp = client.post("/api/tts", json={"text": "Valid text", "language": "en-IN", "voice": "UnknownVoice"})
    assert resp.status_code == 400
    assert "Unsupported voice" in resp.json()["detail"]


def test_tts_endpoint_synthesizes_and_returns_opaque_id() -> None:
    resp = client.post(
        "/api/tts",
        json={"text": "Phase 0 safety test cue.", "language": "english", "voice": "Nalini"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert len(data["id"]) == 16
    assert data["audio_url"] == f"/api/audio/tts_{data['id']}.wav"

    # Verify GET /api/audio/{id} serves this synthesized file
    audio_resp = client.get(data["audio_url"])
    assert audio_resp.status_code == 200
    assert audio_resp.headers["content-type"] == "audio/wav"
    assert audio_resp.content[:4] == b"RIFF"


def test_audio_endpoint_serves_cache_only_and_returns_404_when_missing() -> None:
    # A non-existent file must NOT be synthesized on GET
    non_existent_id = "non_existent_audio_sample_9999"
    resp = client.get(f"/api/audio/{non_existent_id}")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_audio_endpoint_rejects_path_traversal() -> None:
    resp = client.get("/api/audio/../../etc/passwd")
    assert resp.status_code in (400, 404)


def test_tts_rate_limiter() -> None:
    with _TTS_RATE_LOCK:
        _TTS_RATE_LIMIT.clear()
    
    ip = "test-rate-limit-ip"
    # Execute 60 calls successfully
    for _ in range(60):
        with _TTS_RATE_LOCK:
            _TTS_RATE_LIMIT.setdefault(ip, []).append(time.time())
    
    # Next call should trigger 429
    from backend.app import _check_tts_rate_limit
    with pytest.raises(Exception) as excinfo:
        _check_tts_rate_limit(ip, limit=60, window_secs=60.0)
    assert excinfo.value.status_code == 429


# ==============================================================================
# 4. LRU + TTL Audio Cache Cleanup
# ==============================================================================
def test_lru_and_ttl_audio_cleanup(tmp_path: Path) -> None:
    now = time.time()
    # Create 5 files
    files = []
    for i in range(5):
        p = tmp_path / f"audio_{i}.wav"
        p.write_bytes(b"RIFF" + b"\x00" * 40)
        files.append(p)

    # Make file 0 expired (> 24 hours old)
    old_time = now - 90000
    os.utime(files[0], (old_time, old_time))

    # Test TTL: should delete file 0
    deleted = cleanup_audio_cache(tmp_path, max_files=10, ttl_seconds=86400)
    assert deleted >= 1
    assert not files[0].exists()

    # Test LRU: limit to 2 files when 4 remaining
    deleted_lru = cleanup_audio_cache(tmp_path, max_files=2, ttl_seconds=86400)
    assert deleted_lru >= 2
    remaining = list(tmp_path.glob("*.wav"))
    assert len(remaining) <= 2


# ==============================================================================
# 5. Secret Scanner Verification
# ==============================================================================
def test_secret_scanner_blocks_env_file(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("SOME_SECRET=123", encoding="utf-8")
    violations = scan_file_for_secrets(env_file)
    assert len(violations) > 0
    assert "Blocked environment file" in violations[0]


def test_secret_scanner_allows_env_example(tmp_path: Path) -> None:
    example_file = tmp_path / ".env.example"
    example_file.write_text("GNANI_API_KEY=your-api-key\n", encoding="utf-8")
    violations = scan_file_for_secrets(example_file)
    assert violations == []


def test_secret_scanner_flags_real_api_key(tmp_path: Path) -> None:
    code_file = tmp_path / "leaked.py"
    # Google AI key format constructed via parts to avoid scanner self-match
    test_key = "AIza" + "SyD-1234567890abcdefghijklmnopqrstuv"
    code_file.write_text(f'KEY = "{test_key}"', encoding="utf-8")
    violations = scan_file_for_secrets(code_file)
    assert len(violations) > 0
    assert "Google API Key detected" in violations[0]
