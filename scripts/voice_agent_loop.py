"""WhyLine Conversational Voice Agent Loop (Gnani Prisma v3.0 + Timbre v3.0).
Simulates or runs real-time conversational cycles with virtual human voice fidelity.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.gnani_client import GnaniSpeechClient
from backend.services.rag_service import HybridRagService
from backend.whyline.ast_scanner import extract_repository_vocabulary
from backend.whyline.store import WhyLineStore


def run_conversational_voice_loop(
    turns: list[dict],
    language: str = "en-IN",
    voice: str = "Shivani",
    interactive: bool = False,
) -> list[dict]:
    """Runs a multi-turn conversational loop between developer and WhyLine voice agent."""
    client = GnaniSpeechClient()
    rag_service = HybridRagService()
    repo_vocab = extract_repository_vocabulary(PROJECT_ROOT)
    output_dir = PROJECT_ROOT / "tmp_test" / "conversation_audio"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n=======================================================")
    print(f"🎙️  WhyLine Conversational Voice Loop")
    print(f"    STT: Prisma v3.0 (codemix / indic-auto)")
    print(f"    TTS: Timbre v3.0 (Voice: {voice}, Locale: {language})")
    print(f"    LLM: Gemini 3.8 Flash + Hybrid RAG")
    print(f"=======================================================\n")

    history: list[dict] = []

    store = WhyLineStore(PROJECT_ROOT / "demo" / "HealthConnect")
    fences = store.get_fences()

    for i, turn in enumerate(turns, 1):
        user_prompt = turn.get("text", "")
        audio_path = turn.get("audio_path")
        audio_bytes = Path(audio_path).read_bytes() if audio_path and Path(audio_path).exists() else None

        print(f"\n[Turn {i}] Developer Spoke: '{user_prompt or 'Recorded Audio'}'")

        # 1. Speech-to-Text via Prisma v3.0
        stt = client.transcribe(
            audio_bytes=audio_bytes,
            fallback_text=user_prompt,
            language=language,
            repo_vocab=repo_vocab,
        )
        rescored_query = stt["rescored_transcript"]
        print(f"    ↳ Transcribed & AST Rescored: '{rescored_query}'")

        # 2. RAG & Gemini Co-Pilot Reasoning
        t0 = time.time()
        copilot_response = rag_service.ask_repo_copilot(
            question=rescored_query,
            fences=fences,
            repo_vocab=repo_vocab,
            language=language,
            audio_dir=output_dir,
        )
        rag_latency = round(time.time() - t0, 3)
        spoken_reply = copilot_response.get("spoken_reply", "Understood. The invariant is guarded.")
        print(f"    ↳ Agent Thought ({rag_latency}s): '{spoken_reply}'")

        # 3. Text-to-Speech via Timbre v3.0 (voice=Shivani)
        file_stem = f"turn_{i}_{int(time.time())}"
        tts = client.synthesize(
            text=spoken_reply,
            output_dir=output_dir,
            file_stem=file_stem,
            voice=voice,
            language=language,
            force_live=True,
        )
        print(f"    ↳ Synthesized Voice ({tts['provider_mode']}): {tts['wav_path']}")

        history.append({
            "turn": i,
            "user_query": rescored_query,
            "spoken_reply": spoken_reply,
            "strategies": copilot_response.get("ranked_strategies", []),
            "audio_file": tts["wav_path"],
            "stt_mode": stt["provider_mode"],
            "tts_mode": tts["provider_mode"],
        })

    print(f"\nConversation loop completed successfully ({len(history)} turns).")
    return history


if __name__ == "__main__":
    test_turns = [
        {
            "text": "Why do we have a retry count = 5 in GatewayRouter.java?",
        },
        {
            "text": "What happens if we remove the thread sleep delay?",
        },
    ]
    results = run_conversational_voice_loop(test_turns, language="en-IN", voice="Shivani")
