"""Automated Live Verification Suite for Gnani Vachana Speech Stack & Google Gemini LLM (Milestone M1_R2).

Verifies real API calls against production keys configured in .env:
- Gnani Timbre v2.5 TTS (Telugu, Hindi, English)
- Gnani Prisma v2.5 STT (te-IN, hi-IN, en-IN)
- Google Gemini 3.8 Flash structured JSON strategy generation
"""
from __future__ import annotations

import os
import wave
from pathlib import Path
import pytest

# Ensure live API mode is enabled for test execution
os.environ["WHYLINE_LIVE_TTS_IN_TESTS"] = "1"
os.environ["WHYLINE_LIVE_LLM_IN_TESTS"] = "1"

from backend.services.gnani_client import GnaniSpeechClient, _load_dotenv_once
from backend.services.rag_service import HybridRagService

_load_dotenv_once()
LIVE_KEY_GNANI = os.getenv("GNANI_API_KEY", "").strip()
LIVE_KEY_GEMINI = os.getenv("GEMINI_API_KEY", "").strip()


@pytest.mark.skipif(not LIVE_KEY_GNANI, reason="Requires live GNANI_API_KEY in .env")
class TestGnaniLiveSpeechStack:
    """Verifies live Gnani Timbre v2.5 TTS and Prisma v2.5 STT across Telugu, Hindi, English."""

    @pytest.fixture(autouse=True)
    def setup_client(self, tmp_path: Path):
        self.tmp_dir = tmp_path
        self.client = GnaniSpeechClient(api_key=LIVE_KEY_GNANI)
        import time
        time.sleep(2.0)
        yield
        time.sleep(2.0)

    @pytest.mark.parametrize(
        "language,voice,test_phrase",
        [
            ("telugu", "Nalini", "నమస్కారం, వైలైన్ గేట్‌వే రౌటర్ రీట్రై కౌంట్ 5 అట్లే ఉంచండి."),
            ("hindi", "Nalini", "नमस्ते, व्हाइलाइन गेटवे राउटर में रीట్రై కౌంట్ 5 मत हटाइए।"),
            ("english", "Nalini", "Confirmed: keep retry count 5 in GatewayRouter until v2 cutover."),
        ],
    )
    def test_live_tts_synthesis_multilingual(self, language: str, voice: str, test_phrase: str) -> None:
        """TC-LIVE-01, TC-LIVE-02, TC-LIVE-03: Verify Timbre v2.5 live synthesis across languages."""
        result = self.client.synthesize(
            text=test_phrase,
            output_dir=self.tmp_dir,
            file_stem=f"live_{language}",
            voice=voice,
            language=language,
            force_live=True,
        )
        assert result["provider_mode"] in ("gnani-timbre-v2.5-live", "gnani-timbre-v2.5-live-cached")
        assert result["model"] == "timbre-v2.5"

        wav_path = self.tmp_dir / f"live_{language}.wav"
        assert wav_path.exists(), f"WAV file not found at {wav_path}"
        assert wav_path.stat().st_size > 10000, f"WAV file too small ({wav_path.stat().st_size} bytes)"

        # Verify valid WAV container structure (16kHz, mono, 16-bit PCM)
        with wave.open(str(wav_path), "rb") as wf:
            assert wf.getnchannels() == 1, f"Expected 1 channel (mono), got {wf.getnchannels()}"
            assert wf.getsampwidth() == 2, f"Expected 2 bytes/sample (16-bit), got {wf.getsampwidth()}"
            assert wf.getframerate() == 16000, f"Expected 16000Hz, got {wf.getframerate()}"
            assert wf.getnframes() > 1000, f"Expected > 1000 frames, got {wf.getnframes()}"

    @pytest.mark.parametrize(
        "lang_code,sample_text",
        [
            ("te-IN", "నమస్కారం వైలైన్ గేట్‌వే రౌటర్ రీట్రై కౌంట్ 5"),
            ("hi-IN", "नमस्ते व्हाइलाइन गेटवे राउटर రీట్రై కౌంట్ 5"),
            ("en-IN", "Hello WhyLine GatewayRouter keep retry count 5"),
        ],
    )
    def test_live_stt_recognition_multilingual(self, lang_code: str, sample_text: str) -> None:
        """TC-LIVE-04, TC-LIVE-05, TC-LIVE-06: Verify Prisma v2.5 live STT recognition across languages."""
        # 1. Synthesize audio sample using live TTS
        tts_lang = "telugu" if lang_code.startswith("te") else ("hindi" if lang_code.startswith("hi") else "english")
        tts_res = self.client.synthesize(
            text=sample_text,
            output_dir=self.tmp_dir,
            file_stem=f"stt_input_{lang_code}",
            language=tts_lang,
            force_live=True,
        )
        wav_path = self.tmp_dir / f"stt_input_{lang_code}.wav"
        assert wav_path.exists()
        wav_bytes = wav_path.read_bytes()
        assert len(wav_bytes) > 1000

        # Pause to respect upstream single-active-request limit between TTS and STT calls
        import time
        time.sleep(2.5)

        # 2. Transcribe via live STT endpoint
        stt_res = self.client.transcribe(
            audio_bytes=wav_bytes,
            language=lang_code,
            repo_vocab=["GatewayRouter.java", "retryCount", "application.yml"],
        )
        assert stt_res["provider_mode"] == "gnani-prisma-v2.5-live"
        assert stt_res["rescored_transcript"] is not None
        assert isinstance(stt_res["rescored_transcript"], str)
        assert stt_res["model"] == "prisma-v2.5"


@pytest.mark.skipif(not LIVE_KEY_GEMINI, reason="Requires live GEMINI_API_KEY in .env")
class TestGeminiLiveInference:
    """Verifies live Google Gemini 3.8 Flash structured JSON strategy generation."""

    def test_live_gemini_copilot_strategy_generation(self) -> None:
        """TC-LIVE-07: Verify Gemini 3.8 Flash live call returns 3 valid ranked strategies."""
        service = HybridRagService(gemini_api_key=LIVE_KEY_GEMINI)
        mock_fences = [
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
        result = service._call_gemini_strategies(
            question="How do we resolve midnight timeout without breaking FENCE-001?",
            matched_fences=mock_fences,
            language="english",
            force_live=True,
        )
        assert result is not None, "Gemini 3.8 Flash returned None"
        spoken_reply, strategies = result

        assert isinstance(spoken_reply, str)
        assert len(spoken_reply) > 20, f"Spoken reply too short: {spoken_reply}"
        assert len(strategies) == 3, f"Expected 3 strategies, got {len(strategies)}"

        for i, strat in enumerate(strategies, start=1):
            assert strat["rank"] == i, f"Expected rank {i}, got {strat.get('rank')}"
            assert strat["title"], f"Missing title in strategy {i}"
            assert strat["status_tone"] in ("good", "info", "warning"), f"Invalid tone {strat.get('status_tone')}"
            assert strat["summary"], f"Missing summary in strategy {i}"
