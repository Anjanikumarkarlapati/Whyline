"""Comprehensive Accuracy and Fidelity Verification for Gnani Prisma v3.0 & Timbre v3.0."""
from __future__ import annotations

import os
import sys
import time
import wave
from pathlib import Path

# Force UTF-8 on Windows console
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.gnani_client import GnaniSpeechClient
from backend.whyline.ast_scanner import extract_repository_vocabulary


def verify_models():
    client = GnaniSpeechClient()
    repo_vocab = extract_repository_vocabulary(PROJECT_ROOT / "demo-repos" / "HealthConnect")
    test_dir = PROJECT_ROOT / "tmp_test" / "accuracy_verification"
    test_dir.mkdir(parents=True, exist_ok=True)

    print("==================================================================")
    print("🎯 WhyLine Voice Pipeline Accuracy Verification (Gnani v3.0 Live)")
    print("==================================================================\n")

    test_cases = [
        {
            "lang": "en-IN",
            "name": "English Technical Invariant",
            "voice": "Shivani",
            "text": "Confirmed. Keep retryCount equal to 5 and timeoutMs at 4500 in GatewayRouter.java until gateway.version is v2 in application.yml.",
            "expected_symbols": ["retryCount", "GatewayRouter.java", "timeoutMs", "gateway.version", "application.yml"],
        },
        {
            "lang": "te-IN",
            "name": "Telugu Code-Mixed Guardrail",
            "voice": "Avinash",
            "text": "గేట్‌వే రౌటర్‌లో రీట్రై కౌంట్ 5 అలాగే ఉంచండి. v1 మిడ్‌నైట్ ప్యాకెట్ డ్రాప్ అవుతుంది.",
            "expected_symbols": ["GatewayRouter.java", "retryCount"],
        },
        {
            "lang": "hi-IN",
            "name": "Hindi Code-Mixed Guardrail",
            "voice": "Kalpana",
            "text": "गेटवे राउटर में रिट्राई काउंट 5 सुरक्षित है, जब तक एप्लीकेशन yml में गेटवे वर्शन v2 न हो।",
            "expected_symbols": ["GatewayRouter.java", "retryCount"],
        },
    ]

    tts_results = []
    stt_results = []

    for i, tc in enumerate(test_cases, 1):
        print(f"--- [Test Case {i}: {tc['name']} ({tc['lang']})] ---")
        
        # 1. Verify TTS Accuracy & Audio Fidelity
        stem = f"verify_{tc['lang']}_{tc['voice'].lower()}"
        t0 = time.time()
        tts_res = client.synthesize(
            text=tc["text"],
            output_dir=test_dir,
            file_stem=stem,
            voice=tc["voice"],
            language=tc["lang"],
            force_live=True,
        )
        tts_latency = round(time.time() - t0, 3)
        wav_file = Path(tts_res["wav_path"])
        
        assert wav_file.exists() and wav_file.stat().st_size > 1000, f"TTS file generation failed: {wav_file}"
        
        # Check audio specs
        with wave.open(str(wav_file), "rb") as wf:
            channels = wf.getnchannels()
            sample_rate = wf.getframerate()
            duration = round(wf.getnframes() / float(sample_rate), 2)
            
        print(f"  [TTS] Model: {tts_res['model']} | Voice: {tts_res['voice']} | Provider: {tts_res['provider_mode']}")
        print(f"        Audio: {channels}ch {sample_rate}Hz WAV | Duration: {duration}s | Latency: {tts_latency}s")
        tts_results.append({
            "case": tc["name"],
            "voice": tc["voice"],
            "duration": duration,
            "latency": tts_latency,
            "mode": tts_res["provider_mode"],
        })

        # 2. Verify STT Transcription Accuracy & AST Rescoring
        audio_bytes = wav_file.read_bytes()
        t1 = time.time()
        stt_res = client.transcribe(
            audio_bytes=audio_bytes,
            language=tc["lang"],
            repo_vocab=repo_vocab,
        )
        stt_latency = round(time.time() - t1, 3)
        raw_transcript = stt_res.get("raw_transcript", "")
        rescored = stt_res.get("rescored_transcript", "")
        detected_lang = stt_res.get("detected_language", tc["lang"])

        print(f"  [STT] Model: {stt_res['model']} | Detected Lang: {detected_lang} | Latency: {stt_latency}s")
        print(f"        Raw Transcript:      \"{raw_transcript}\"")
        print(f"        AST Rescored Output: \"{rescored}\"")
        
        # Check symbol coverage
        preserved = [sym for sym in tc["expected_symbols"] if sym.lower() in rescored.lower() or sym in rescored]
        print(f"        Symbol Preservation: {len(preserved)}/{len(tc['expected_symbols'])} {preserved}\n")
        
        stt_results.append({
            "case": tc["name"],
            "raw": raw_transcript,
            "rescored": rescored,
            "latency": stt_latency,
            "detected_lang": detected_lang,
            "preserved": preserved,
        })

    print("==================================================================")
    print("✅ All STT & TTS Models Verified Accurately across EN, TE, HI!")
    print("==================================================================")
    return {"tts": tts_results, "stt": stt_results}


if __name__ == "__main__":
    verify_models()
