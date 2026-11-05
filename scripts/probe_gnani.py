"""Probe Gnani Vachana AI endpoints to verify empirical model/voice/language support.

Tests verified contract vs unverified hypotheses (v3 models, extra voices, indic-auto, etc.)
and outputs a definitive empirical report.
"""
from __future__ import annotations

import io
import json
import os
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import requests

from backend.services.gnani_client import _load_dotenv_once

_load_dotenv_once()

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "").strip()
TTS_URL = "https://api.vachana.ai/api/v1/tts/inference"
STT_URL = "https://api.vachana.ai/stt/v3"

HEADERS = {
    "X-API-Key-ID": GNANI_API_KEY,
    "User-Agent": "WhyLine/1.0",
}


def make_dummy_16k_wav() -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(b"\x00\x00" * 8000)  # 0.5s silence
    return buf.getvalue()


def probe_tts(model: str, voice: str, language: str, text: str) -> dict:
    payload = {
        "model": model,
        "voice": voice,
        "text": text,
        "language": language,
        "sample_rate": 16000,
        "format": "wav",
    }
    try:
        resp = requests.post(
            TTS_URL,
            headers={**HEADERS, "Content-Type": "application/json"},
            json=payload,
            timeout=10,
        )
        content_preview = resp.text[:200] if "json" in resp.headers.get("content-type", "") else f"Binary ({len(resp.content)} bytes)"
        return {
            "status": resp.status_code,
            "content_type": resp.headers.get("content-type", ""),
            "result": content_preview,
            "success": resp.status_code == 200,
        }
    except Exception as err:
        return {"status": "ERROR", "error": str(err), "success": False}


def probe_stt(model: str, language_code: str, wav_bytes: bytes) -> dict:
    form_data = {
        "model": model,
        "language_code": language_code,
    }
    files = {
        "audio_file": ("probe.wav", wav_bytes, "audio/wav"),
    }
    try:
        resp = requests.post(
            STT_URL,
            headers=HEADERS,
            data=form_data,
            files=files,
            timeout=10,
        )
        return {
            "status": resp.status_code,
            "content_type": resp.headers.get("content-type", ""),
            "result": resp.text[:200],
            "success": resp.status_code == 200,
        }
    except Exception as err:
        return {"status": "ERROR", "error": str(err), "success": False}


def main() -> None:
    print("=" * 60)
    print("WhyLine Gnani Live API Probe")
    print("=" * 60)
    if not GNANI_API_KEY:
        print("[!] GNANI_API_KEY is not set in environment or .env.")
        print("[!] Cannot perform live network probe. Exiting.")
        sys.exit(0)

    print(f"[*] API Key present: {GNANI_API_KEY[:6]}...{GNANI_API_KEY[-4:]}")
    print()

    print("[*] Probing TTS configurations...")
    tts_tests = [
        # Verified Ground Truth
        ("timbre-v2.5", "Nalini", "telugu", "నమస్కారం, ఇది వైలైన్ పరీక్ష.", "VERIFIED"),
        ("timbre-v2.5", "Bhavna", "hindi", "नमस्ते, यह व्हाइलाइन टेस्ट है।", "VERIFIED"),
        ("timbre-v2.5", "Pranav", "english", "WhyLine guard testing voice synthesis.", "VERIFIED"),
        # Unverified Hypotheses
        ("timbre-v3.0", "Nalini", "telugu", "నమస్కారం", "UNVERIFIED (v3.0 model)"),
        ("timbre-v3.0", "Shivani", "english", "Testing Shivani voice", "UNVERIFIED (Shivani voice)"),
        ("timbre-v2.5", "Shivani", "english", "Testing Shivani voice on v2.5", "UNVERIFIED (Shivani voice v2.5)"),
        ("timbre-v2.5", "Nalini", "te-IN", "నమస్కారం", "UNVERIFIED (BCP-47 language code)"),
        ("timbre-v2.5", "Nalini", "indic-auto", "Testing auto language", "UNVERIFIED (indic-auto language)"),
    ]

    for model, voice, lang, text, note in tts_tests:
        res = probe_tts(model, voice, lang, text)
        status = res.get("status")
        success_marker = "PASS [200]" if res.get("success") else f"FAIL [{status}]"
        print(f"  TTS {model:<12} | {voice:<8} | {lang:<10} => {success_marker:<12} ({note})")
        if not res.get("success"):
            print(f"       Detail: {res.get('result') or res.get('error')}")

    print()
    print("[*] Probing STT configurations...")
    dummy_wav = make_dummy_16k_wav()
    stt_tests = [
        # Verified Ground Truth
        ("prisma-v2.5", "te-IN", "VERIFIED"),
        ("prisma-v2.5", "hi-IN", "VERIFIED"),
        ("prisma-v2.5", "en-IN", "VERIFIED"),
        # Unverified Hypotheses
        ("prisma-v3.0", "te-IN", "UNVERIFIED (v3.0 model)"),
        ("prisma-v2.5", "indic-auto", "UNVERIFIED (indic-auto language code)"),
    ]

    for model, lang_code, note in stt_tests:
        res = probe_stt(model, lang_code, dummy_wav)
        status = res.get("status")
        success_marker = "PASS [200]" if res.get("success") else f"FAIL [{status}]"
        print(f"  STT {model:<12} | {lang_code:<10} => {success_marker:<12} ({note})")
        if not res.get("success"):
            print(f"       Detail: {res.get('result') or res.get('error')}")

    print()
    print("=" * 60)
    print("Probe complete. Keep only PASS configurations in production code.")
    print("=" * 60)


if __name__ == "__main__":
    main()
