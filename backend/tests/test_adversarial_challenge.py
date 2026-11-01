"""Adversarial Challenge & Stress Test Suite for WhyLine Speech & RAG Stack (challenger_1_r2_m1).

Adversarially stress-tests:
1. Gnani Timbre v2.5 synthesis with abnormal inputs (empty string, whitespace, massive string, special chars, emoji/unicode, rapid/concurrent calls).
2. WAV container integrity (wave.open parsing, exactly 16000Hz, 1 channel, 16-bit PCM, sample range).
3. Offline fallback & fault tolerance (dummy keys, network connection refused, timeout, empty fences).
"""
from __future__ import annotations

import concurrent.futures
import io
import os
import struct
import wave
from pathlib import Path
import pytest

from backend.services.gnani_client import GnaniSpeechClient, _load_dotenv_once
from backend.services.rag_service import HybridRagService

_load_dotenv_once()
LIVE_KEY_GNANI = os.getenv("GNANI_API_KEY", "").strip()
LIVE_KEY_GEMINI = os.getenv("GEMINI_API_KEY", "").strip()


def assert_valid_16k_wav(wav_path: Path) -> None:
    """Rigorous assertion of WAV container specification: 16000Hz, 1 channel, 16-bit PCM."""
    assert wav_path.exists(), f"File does not exist: {wav_path}"
    assert wav_path.stat().st_size > 44, f"File too small to be a WAV: {wav_path.stat().st_size} bytes"

    with wave.open(str(wav_path), "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()

        assert n_channels == 1, f"Expected 1 channel (mono), got {n_channels}"
        assert sampwidth == 2, f"Expected 2 bytes per sample (16-bit), got {sampwidth}"
        assert framerate == 16000, f"Expected 16000Hz framerate, got {framerate}"
        assert n_frames > 0, f"Expected > 0 frames, got {n_frames}"

        raw_frames = wf.readframes(n_frames)
        expected_bytes = n_frames * n_channels * sampwidth
        assert len(raw_frames) == expected_bytes, (
            f"Frame byte length mismatch: expected {expected_bytes}, read {len(raw_frames)}"
        )

        # Verify samples unpack cleanly without bounds violation [-32768, 32767]
        samples = struct.unpack(f"<{n_frames}h", raw_frames)
        assert len(samples) == n_frames
        max_s = max(samples)
        min_s = min(samples)
        assert -32768 <= min_s <= 32767
        assert -32768 <= max_s <= 32767


# ============================================================================
# Section 1 & 2: Abnormal Inputs and WAV Integrity
# ============================================================================

class TestGnaniTimbreSynthesisAdversarial:
    """Stress tests Gnani Timbre v2.5 synthesis with pathological inputs."""

    @pytest.fixture(autouse=True)
    def setup_env(self, tmp_path: Path):
        self.tmp_dir = tmp_path
        self.client = GnaniSpeechClient(api_key=LIVE_KEY_GNANI or "mock_key")

    @pytest.mark.parametrize(
        "case_name,abnormal_input",
        [
            ("empty_string", ""),
            ("whitespace_only", "   \t\r\n   "),
            ("null_byte_injection", "Hello\x00World\x00WhyLine"),
            ("special_characters_sql", "' OR '1'='1'; DROP TABLE voice_pins; --"),
            ("html_xss_tags", "<script>alert('xss')</script><audio src='bad.wav'>"),
            ("json_injection", '{"model": "timbre-v2.5", "admin": true, "eval": "__import__(\'os\')"}'),
            ("path_traversal_string", "../../etc/passwd..\\..\\windows\\system32\\cmd.exe"),
            ("unicode_emojis", "🚀✨🔥 నమస్కారం 👨‍👩‍👧‍👦 🏳️‍🌈 𑆃𑆁 𑌅 🤖🎉"),
            ("mixed_rtl_scripts", "نص تجريبي שלום עולם నమస్కారం Hello World"),
            ("massive_string_10k", "WhyLine AST Guard " * 600),
            ("zero_width_chars", "న\u200cమ\u200bస్కారం\u0300\u0301\ufeff"),
        ],
    )
    def test_synthesis_abnormal_inputs_integrity(self, case_name: str, abnormal_input: str) -> None:
        """Verify that abnormal inputs never crash synthesize() and always yield valid 16kHz mono WAV."""
        stem = f"adv_{case_name}"
        # Execute synthesis (local sandbox or live)
        res = self.client.synthesize(
            text=abnormal_input,
            output_dir=self.tmp_dir,
            file_stem=stem,
            voice="Nalini",
            language="telugu",
            force_live=bool(LIVE_KEY_GNANI),
        )

        assert isinstance(res, dict)
        assert res["model"] == "timbre-v2.5"
        assert res["sample_rate"] == 16000
        assert "wav_path" in res

        wav_path = Path(res["wav_path"])
        assert_valid_16k_wav(wav_path)

    def test_rapid_consecutive_synthesis_calls(self) -> None:
        """Rapidly invoke synthesize() 25 times sequentially to stress cache and file I/O."""
        for i in range(25):
            stem = f"rapid_seq_{i}"
            res = self.client.synthesize(
                text=f"Rapid consecutive call iteration {i} with payload tokens.",
                output_dir=self.tmp_dir,
                file_stem=stem,
                voice="Nalini",
                language="english",
            )
            wav_path = Path(res["wav_path"])
            assert_valid_16k_wav(wav_path)

    def test_concurrent_multithreaded_synthesis_stress(self) -> None:
        """Invoke synthesize() concurrently from 8 threads to verify thread-safety and no corrupted WAVs."""
        def worker(thread_idx: int) -> Path:
            stem = f"concurrent_th_{thread_idx}"
            res = self.client.synthesize(
                text=f"Thread safety test phrase {thread_idx} with distinct hash.",
                output_dir=self.tmp_dir,
                file_stem=stem,
                voice="Nalini",
                language="telugu" if thread_idx % 2 == 0 else "hindi",
            )
            return Path(res["wav_path"])

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(worker, i) for i in range(16)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        assert len(results) == 16
        for p in results:
            assert_valid_16k_wav(p)


# ============================================================================
# Section 3: Offline Fallback & Fault Tolerance Stress Testing
# ============================================================================

class TestOfflineFallbackFaultTolerance:
    """Stress tests behavior when keys are invalid/dummy or network is disconnected."""

    @pytest.fixture(autouse=True)
    def setup_env(self, tmp_path: Path):
        self.tmp_dir = tmp_path

    def test_gnani_tts_dummy_api_key_fallback(self) -> None:
        """When GNANI_API_KEY is invalid/dummy, synthesize() must fall back safely to 16kHz WAV."""
        dummy_client = GnaniSpeechClient(api_key="INVALID_DUMMY_KEY_XYZ_123")
        res = dummy_client.synthesize(
            text="Testing dummy API key fallback handling in Gnani speech client.",
            output_dir=self.tmp_dir,
            file_stem="dummy_key_tts",
            voice="Nalini",
            language="telugu",
            force_live=True,  # Forces network call that will get 401/403
        )
        assert res["provider_mode"] == "gnani-timbre-v2.5-fallback"
        wav_path = Path(res["wav_path"])
        assert_valid_16k_wav(wav_path)

    def test_gnani_stt_dummy_api_key_fallback(self) -> None:
        """When GNANI_API_KEY is dummy, transcribe() must fall back to sandbox rescoring without crashing."""
        dummy_client = GnaniSpeechClient(api_key="INVALID_DUMMY_KEY_XYZ_123")
        dummy_audio = b"RIFF....WAVEfmt ...." + (b"\x00" * 3200)

        res = dummy_client.transcribe(
            audio_bytes=dummy_audio,
            language="te-IN",
            repo_vocab=["GatewayRouter.java", "retryCount"],
        )
        assert res["provider_mode"] == "gnani-prisma-v2.5-fallback"
        assert res["rescored_transcript"] is not None
        assert len(res["rescored_transcript"]) > 0

    def test_gnani_tts_unreachable_network_fallback(self) -> None:
        """When Gnani endpoint is network-unreachable, synthesize() falls back cleanly without timeout crash."""
        dead_client = GnaniSpeechClient(
            api_key="any_key",
            tts_rest_url="http://127.0.0.1:59999/api/v1/tts/inference",  # Unused port, immediate ECONNREFUSED
        )
        res = dead_client.synthesize(
            text="Testing network connection refused fallback in Gnani speech client.",
            output_dir=self.tmp_dir,
            file_stem="dead_network_tts",
            force_live=True,
        )
        assert res["provider_mode"] == "gnani-timbre-v2.5-fallback"
        wav_path = Path(res["wav_path"])
        assert_valid_16k_wav(wav_path)

    def test_gemini_dummy_api_key_fallback(self) -> None:
        """When GEMINI_API_KEY is dummy, RAG service must fall back to grounded sandbox strategies."""
        rag_service = HybridRagService(
            gemini_api_key="AIzaSyDummyFakeKeyNotValidAtAll000000000000",
            repo_dir=self.tmp_dir,
        )
        mock_fences = [
            {
                "id": "FENCE-001",
                "file_path": "GatewayRouter.java",
                "symbol_name": "GatewayRouter.dispatchSettlement",
                "matched_token": "retryCount = 5",
                "anomaly_type": "MAGIC_LITERAL_CONTROL_FLOW",
                "ast_signature_hash": "hash_979595",
                "status": "VERIFIED_ACTIVE",
                "constraint_summary": "Tolerates Razorpay v1 midnight drop",
                "reconstructed_why": "PR #212 load balancer drop workaround",
                "danger_condition": "00:00 IST drop causing double charge",
                "expiry_condition": {"config_file": "application.yml", "key_path": "gateway.version", "expected_value": "v2"},
                "provenance": {"pr_number": "#212", "incident_id": "INC-9921"},
            }
        ]

        # 1. _call_gemini_strategies must return None on dummy key
        call_res = rag_service._call_gemini_strategies(
            question="How do we resolve the midnight timeout?",
            matched_fences=mock_fences,
            language="english",
            force_live=True,
        )
        assert call_res is None, "Expected None from dummy Gemini API key failure"

        # 2. ask_repo_copilot must succeed using grounded deterministic fallback
        copilot_res = rag_service.ask_repo_copilot(
            question="How do we resolve the midnight timeout?",
            fences=mock_fences,
            language="english",
            audio_dir=self.tmp_dir / "audio",
        )
        assert isinstance(copilot_res, dict)
        assert len(copilot_res["strategies"]) == 3
        assert copilot_res["strategies"][0]["rank"] == 1
        assert "spoken_reply" in copilot_res
        assert len(copilot_res["spoken_reply"]) > 20
        assert "audio_url" in copilot_res

    def test_empty_fences_list_vulnerability(self) -> None:
        """Adversarial edge case: if fences=[] is passed to rag_service, empirically proves IndexError."""
        rag_service = HybridRagService(gemini_api_key="dummy", repo_dir=self.tmp_dir)
        with pytest.raises(IndexError):
            rag_service.ask_repo_copilot("How do I fix the code?", fences=[])

    def test_embedding_boundary_conditions(self) -> None:
        """Verify vector embedding behavior on empty and massive input strings."""
        rag_service = HybridRagService(gemini_api_key="dummy", repo_dir=self.tmp_dir)
        emb_empty = rag_service.generate_embedding("")
        assert len(emb_empty) == 384
        assert emb_empty == [0.0] * 384

        emb_huge = rag_service.generate_embedding("keyword " * 2000)
        assert len(emb_huge) == 384
        norm = sum(x * x for x in emb_huge)
        assert 0.99 <= norm <= 1.01  # Normalized unit vector

        norm = sum(x * x for x in emb_huge)
        assert 0.99 <= norm <= 1.01  # Normalized unit vector
