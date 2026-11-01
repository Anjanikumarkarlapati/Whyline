"""Empirical Challenger Verification Harness (challenger_2_r2_m1).
Adversarially probes:
1. STT language normalization & fallback behavior.
2. Gemini 3.8 Flash structured output schemas (markdown fences, missing keys, field variants).
3. Concurrency on simultaneous STT/TTS calls and audio temp files.
"""
from __future__ import annotations

import concurrent.futures
import io
import json
import os
import shutil
import tempfile
import threading
import time
import wave
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from backend.services.gnani_client import (
    GnaniSpeechClient,
    _TTS_WAV_CACHE,
    MAX_TTS_CACHE_ENTRIES,
    _cache_put,
    normalize_gnani_language,
    normalize_stt_language,
)
from backend.services.rag_service import HybridRagService


def test_stt_language_normalization_adversarial_matrix():
    """Requirement 1: Challenge STT language normalization with diverse inputs."""
    test_cases = [
        ("Telugu", "te-IN"),
        ("TE", "te-IN"),
        ("te-IN", "te-IN"),
        ("telugu", "te-IN"),
        ("hindi", "hi-IN"),
        ("HI", "hi-IN"),
        ("hi-IN", "hi-IN"),
        ("Hindi", "hi-IN"),
        ("english", "en-IN"),
        ("en-US", "en-IN"),
        ("en-IN", "en-IN"),
        ("EN", "en-IN"),
        ("English", "en-IN"),
    ]
    for raw_input, expected in test_cases:
        actual = normalize_stt_language(raw_input)
        assert actual == expected, f"Failed for {raw_input!r}: expected {expected!r}, got {actual!r}"


def test_stt_transcribe_fallback_language_sensitivity():
    """Challenge transcribe fallback behavior when raw language strings are passed.
    Tests whether 'Telugu', 'TE', 'hindi', 'HI' generate language-accurate fallback transcripts
    or inadvertently drop into English due to case sensitivity in startswith().
    """
    client = GnaniSpeechClient(api_key="")

    # Telugu inputs
    for te_input in ["Telugu", "TE", "te-IN", "telugu"]:
        res = client.transcribe(fallback_text=None, language=te_input)
        transcript = res["rescored_transcript"]
        # Expected: Should contain Telugu words if properly normalized
        is_telugu = "Avunu" in transcript or "gateway router lo retry count = 5" in transcript
        assert is_telugu, f"Expected Telugu fallback transcript for language={te_input!r}, but got: {transcript}"

    # Hindi inputs
    for hi_input in ["hindi", "HI", "hi-IN", "Hindi"]:
        res = client.transcribe(fallback_text=None, language=hi_input)
        transcript = res["rescored_transcript"]
        is_hindi = "Haan bilkul sahi" in transcript or "mein retry count = 5" in transcript
        assert is_hindi, f"Expected Hindi fallback transcript for language={hi_input!r}, but got: {transcript}"


def test_gemini_strategies_handles_markdown_fences():
    """Requirement 2: Test that _call_gemini_strategies handles markdown code fences
    (e.g. ```json ... ```) gracefully instead of crashing on json.loads.
    """
    service = HybridRagService(gemini_api_key="test_dummy_key")
    fences = [
        {
            "id": "FENCE-001",
            "file_path": "GatewayRouter.java",
            "symbol_name": "GatewayRouter.dispatchSettlement",
            "matched_token": "retryCount = 5",
            "constraint_summary": "Tolerates Razorpay v1 midnight drop",
            "reconstructed_why": "PR #212 load balancer drop workaround",
            "provenance": {"pr_number": "#212"},
        }
    ]

    valid_payload = {
        "spoken_reply": "Preserve retryCount = 5 in GatewayRouter.java according to PR #212.",
        "strategies": [
            {
                "rank": 1,
                "title": "Idempotent Outbox Key",
                "approach": "Attach deterministic idempotency key",
                "confidence": 0.95,
                "status_tone": "good",
                "status_label": "Verified Active",
                "summary": "Summary of strategy 1",
                "why_safe": "Safe because of X",
                "provenance_badge": "Badge 1",
                "uncertainty_note": "Note 1",
            },
            {
                "rank": 2,
                "title": "Config-Gated Cutover",
                "approach": "Upgrade application.yml to v2",
                "confidence": 0.85,
                "status_tone": "info",
                "status_label": "Pending Confirmation",
                "summary": "Summary of strategy 2",
                "why_safe": "Safe because of Y",
                "provenance_badge": "Badge 2",
                "uncertainty_note": "Note 2",
            },
            {
                "rank": 3,
                "title": "Async Dead-Letter Queue",
                "approach": "Route to dlq",
                "confidence": 0.75,
                "status_tone": "warning",
                "status_label": "Unverified Historical",
                "summary": "Summary of strategy 3",
                "why_safe": "Safe because of Z",
                "provenance_badge": "Badge 3",
                "uncertainty_note": "Note 3",
            },
        ],
    }

    # Simulate Gemini returning text wrapped in markdown code fence
    markdown_fenced_response = f"```json\n{json.dumps(valid_payload, indent=2)}\n```"

    mock_resp = MagicMock()
    mock_resp.text = markdown_fenced_response

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_resp

    with patch("google.genai.Client", return_value=mock_client):
        res = service._call_gemini_strategies(
            question="How do we resolve midnight timeout?",
            matched_fences=fences,
            language="english",
            force_live=True,
        )
        assert res is not None, "Failed to parse JSON when wrapped in markdown code fence (```json ... ```)"
        spoken_reply, strategies = res
        assert spoken_reply == valid_payload["spoken_reply"]
        assert len(strategies) == 3


def test_gemini_strategies_handles_ranked_strategies_key():
    """Requirement 2: Test that _call_gemini_strategies accepts 'ranked_strategies'
    as an alternate key to 'strategies'.
    """
    service = HybridRagService(gemini_api_key="test_dummy_key")
    fences = [
        {
            "id": "FENCE-001",
            "file_path": "GatewayRouter.java",
            "symbol_name": "GatewayRouter.dispatchSettlement",
            "matched_token": "retryCount = 5",
            "constraint_summary": "Tolerates Razorpay v1 midnight drop",
            "reconstructed_why": "PR #212 load balancer drop workaround",
            "provenance": {"pr_number": "#212"},
        }
    ]

    payload_with_ranked_strategies = {
        "spoken_reply": "Preserve retryCount = 5 in GatewayRouter.java according to PR #212.",
        "ranked_strategies": [
            {"rank": 1, "title": "Strat 1", "approach": "Approach 1", "confidence": 0.95},
            {"rank": 2, "title": "Strat 2", "approach": "Approach 2", "confidence": 0.85},
            {"rank": 3, "title": "Strat 3", "approach": "Approach 3", "confidence": 0.75},
        ],
    }

    mock_resp = MagicMock()
    mock_resp.text = json.dumps(payload_with_ranked_strategies)

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_resp

    with patch("google.genai.Client", return_value=mock_client):
        res = service._call_gemini_strategies(
            question="How do we resolve midnight timeout?",
            matched_fences=fences,
            language="english",
            force_live=True,
        )
        assert res is not None, "Failed to accept 'ranked_strategies' key in Gemini JSON response"
        spoken_reply, strategies = res
        assert len(strategies) == 3


def test_concurrency_simultaneous_synthesize_calls():
    """Requirement 3: Probe simultaneous calls to TTS/STT and ensure no race conditions on audio temp files."""
    tmp_dir = Path(tempfile.mkdtemp(prefix="whyline_concurrency_test_"))
    try:
        client = GnaniSpeechClient(api_key="")
        errors = []

        def worker(worker_id: int):
            try:
                # 10 workers simultaneously synthesizing with overlapping stems and paths
                file_stem = f"concurrent_audio_{worker_id % 3}"
                res = client.synthesize(
                    text=f"Concurrent speech synthesis test phrase {worker_id}",
                    output_dir=tmp_dir,
                    file_stem=file_stem,
                    voice="Nalini",
                    language="te-IN" if worker_id % 2 == 0 else "hi-IN",
                )
                wav_path = Path(res["wav_path"])
                assert wav_path.exists()
                # Verify can read valid wav
                with wave.open(str(wav_path), "rb") as wf:
                    assert wf.getnchannels() == 1
                    assert wf.getframerate() == 16000
            except Exception as e:
                errors.append((worker_id, e))

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(worker, i) for i in range(20)]
            concurrent.futures.wait(futures)

        assert len(errors) == 0, f"Encountered concurrency errors during simultaneous TTS calls: {errors}"
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def test_pathological_synthesis_inputs_and_wav_container_integrity():
    """Empirical Stress Test: Validate that pathological inputs safely generate 16kHz, mono, 16-bit PCM audio."""
    tmp_dir = Path(tempfile.mkdtemp(prefix="whyline_patho_test_"))
    try:
        client = GnaniSpeechClient(api_key="")

        pathological_inputs = [
            "",  # empty string
            "   \t\r\n   ",  # whitespace only
            "A" * 6000,  # massive string exceeding buffer limits (should truncate to 420)
            "!@#$%^&*()_+{}[]:;\"'<>,.?/~`|\\",  # punctuation & special symbols
            "⚠️🚀🔥💡❤️🤖👩‍💻🧑‍🌾🌾🌱🚜",  # full emojis & multi-byte ZWJ sequences
            "GatewayRouter గేట్‌వే రౌటర్ retryCount రీట్రై కౌంట్ timeoutMs 4500ms",  # Telugu code-mixed
            "गेटवे राउटर रीट्राई काउंट 5 मिलीसेकंड",  # Hindi Devanagari
            "SELECT * FROM ast_nodes WHERE symbol_name = 'test'; DROP TABLE ast_nodes; --",  # SQL injection syntax
            '{"action": "exploit", "nested": {"array": [null, true, false, 123.456]}}',  # JSON syntax
            '<speech><voice name="bad"><break time="10s"/></voice></speech>',  # XML / SSML syntax
            "text\x00with\x01control\x02chars\nand\ttabs",  # Null bytes & control characters
        ]

        for idx, text_input in enumerate(pathological_inputs):
            res = client.synthesize(
                text=text_input,
                output_dir=tmp_dir,
                file_stem=f"patho_stem_{idx}",
                voice="Nalini" if idx % 2 == 0 else "Pranav",
                language="telugu" if idx % 3 == 0 else ("hindi" if idx % 3 == 1 else "english"),
            )
            wav_path = Path(res["wav_path"])
            assert wav_path.exists(), f"WAV file missing for input idx {idx}"
            assert wav_path.stat().st_size >= 44, f"WAV file smaller than 44-byte header: {wav_path.stat().st_size}"

            # Strict container verification: 16kHz, 1 channel, 16-bit PCM
            with wave.open(str(wav_path), "rb") as wf:
                assert wf.getnchannels() == 1, f"Expected 1 channel, got {wf.getnchannels()}"
                assert wf.getsampwidth() == 2, f"Expected 2 bytes/sample (16-bit), got {wf.getsampwidth()}"
                assert wf.getframerate() == 16000, f"Expected 16000Hz, got {wf.getframerate()}"
                nframes = wf.getnframes()
                assert nframes > 0, "Audio contained 0 frames"
                data = wf.readframes(nframes)
                assert len(data) == nframes * 2, f"Data size mismatch: got {len(data)}, expected {nframes * 2}"
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def test_high_concurrency_file_write_contention_and_zero_corruption():
    """Empirical Stress Test: Thread safety and NTFS file locking under heavy concurrency with readers."""
    tmp_dir = Path(tempfile.mkdtemp(prefix="whyline_concurrency_stress_"))
    try:
        client = GnaniSpeechClient(api_key="")
        errors: list[tuple[int, str, str]] = []
        stop_readers = threading.Event()

        stems = ["contended_alpha", "contended_beta", "contended_gamma", "contended_delta"]

        def reader_task():
            while not stop_readers.is_set():
                for stem in stems:
                    target = tmp_dir / f"{stem}.wav"
                    if target.exists() and target.stat().st_size >= 44:
                        try:
                            with wave.open(str(target), "rb") as wf:
                                _ = wf.getnframes()
                        except (wave.Error, EOFError) as e:
                            errors.append((-1, "ReaderCorruptionError", str(e)))
                        except (PermissionError, OSError):
                            pass
                time.sleep(0.005)

        reader_thread = threading.Thread(target=reader_task, daemon=True)
        reader_thread.start()

        def writer_task(worker_id: int):
            try:
                stem = stems[worker_id % len(stems)]
                text = f"Worker {worker_id} writing to stem {stem} with timestamp {time.perf_counter()}"
                res = client.synthesize(
                    text=text,
                    output_dir=tmp_dir,
                    file_stem=stem,
                    voice="Nalini" if worker_id % 2 == 0 else "Pranav",
                    language="telugu" if worker_id % 3 == 0 else ("hindi" if worker_id % 3 == 1 else "english"),
                )
                wav_path = Path(res["wav_path"])
                assert wav_path.exists(), f"Writer {worker_id}: output path does not exist"
                assert wav_path.stat().st_size >= 44, f"Writer {worker_id}: incomplete WAV file"
                with wave.open(str(wav_path), "rb") as wf:
                    assert wf.getnchannels() == 1
                    assert wf.getsampwidth() == 2
                    assert wf.getframerate() == 16000
                    assert wf.getnframes() > 0
            except Exception as e:
                errors.append((worker_id, type(e).__name__, str(e)))

        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(writer_task, i) for i in range(40)]
            concurrent.futures.wait(futures)

        stop_readers.set()
        reader_thread.join(timeout=2.0)

        assert len(errors) == 0, f"Encountered concurrency / file corruption errors: {errors}"

        for stem in stems:
            wav_file = tmp_dir / f"{stem}.wav"
            assert wav_file.exists()
            with wave.open(str(wav_file), "rb") as wf:
                assert wf.getnchannels() == 1
                assert wf.getsampwidth() == 2
                assert wf.getframerate() == 16000
                assert wf.getnframes() > 0
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def test_bounded_memory_cache_max_64_entries_after_100_plus_requests():
    """Empirical Stress Test: Confirm that _TTS_WAV_CACHE never exceeds 64 entries and enforces LRU eviction."""
    tmp_dir = Path(tempfile.mkdtemp(prefix="whyline_cache_test_"))
    try:
        with threading.Lock():
            _TTS_WAV_CACHE.clear()

        assert MAX_TTS_CACHE_ENTRIES == 64
        assert len(_TTS_WAV_CACHE) == 0

        # 1. Direct cache puts across 120 items
        for i in range(120):
            _cache_put(f"test_key_{i}", f"test_data_{i}".encode("utf-8"))
            assert len(_TTS_WAV_CACHE) <= 64, f"Cache exceeded 64 entries at put {i}: len={len(_TTS_WAV_CACHE)}"

        assert len(_TTS_WAV_CACHE) == 64

        # Verify LRU eviction: oldest 56 items evicted, newest 64 remain
        for i in range(56):
            assert f"test_key_{i}" not in _TTS_WAV_CACHE, f"Key {i} was not evicted"
        for i in range(56, 120):
            assert f"test_key_{i}" in _TTS_WAV_CACHE, f"Key {i} should be present"

        # 2. Test synthesize with mocked live responses across 120 unique text prompts
        client = GnaniSpeechClient(api_key="mock_empirical_key")
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {"Content-Type": "audio/wav"}
        mock_resp.content = (
            b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
        )

        with patch("requests.post", return_value=mock_resp):
            for i in range(120):
                res = client.synthesize(
                    text=f"Live synthesis test phrase number {i}",
                    output_dir=tmp_dir,
                    file_stem=f"live_test_{i}",
                    voice="Nalini",
                    language="telugu" if i % 2 == 0 else "hindi",
                    force_live=True,
                )
                assert len(_TTS_WAV_CACHE) <= 64, f"Cache exceeded 64 in synthesize at {i}: len={len(_TTS_WAV_CACHE)}"

        assert len(_TTS_WAV_CACHE) == 64
    finally:
        with threading.Lock():
            _TTS_WAV_CACHE.clear()
        shutil.rmtree(tmp_dir, ignore_errors=True)

