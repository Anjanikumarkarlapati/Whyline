"""Generate production audio stems for WhyLine Studio product walkthrough video
using official Gnani Vachana AI Voice Agents (timbre-v2.5 & timbre-v3.0).
"""
import os
import sys
import wave
import requests
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services.gnani_client import _load_dotenv_once

_load_dotenv_once()

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "").strip()
if not GNANI_API_KEY:
    print("[ERROR] GNANI_API_KEY not found in environment or .env")
    sys.exit(1)

TTS_URL = "https://api.vachana.ai/api/v1/tts/inference"
HEADERS = {
    "X-API-Key-ID": GNANI_API_KEY,
    "Content-Type": "application/json",
    "User-Agent": "WhyLine/1.0",
}

OUT_DIR = ROOT / "outputs" / "video_voice_stems"
OUT_DIR.mkdir(parents=True, exist_ok=True)

AUDIO_STEMS = [
    {
        "filename": "stem_01_intro_pranav.wav",
        "model": "timbre-v2.5",
        "voice": "Pranav",
        "language": "english",
        "text": "It’s two o’clock in the morning. A critical payment settlement pipeline suddenly crashes with 504 timeout errors. Why? Because an autonomous AI coding assistant looked at a 5-retry loop in the gateway router, thought it was redundant, and silently deleted it. In engineering, we call this Chesterton's Fence: never tear down a fence until you know why it was built. Welcome to WhyLine Studio.",
        "speaker_role": "English Master Narrator (Pranav)"
    },
    {
        "filename": "stem_02_dashboard_pranav.wav",
        "model": "timbre-v2.5",
        "voice": "Pranav",
        "language": "english",
        "text": "First: the Codebase Guard Dashboard. Using Tree-sitter AST parsing, WhyLine inspects the structural logic of the entire repository. It flags four high-risk anomaly types: Magic Literal Control Flow, Explicit Thread Halts, Validation Bypasses, and Swallowed Exceptions. Our live telemetry scorecard tracks active fences, pending notes, and blocked AI refactors in real time.",
        "speaker_role": "English Master Narrator (Pranav)"
    },
    {
        "filename": "stem_03_spoken_fence_intro_pranav.wav",
        "model": "timbre-v2.5",
        "voice": "Pranav",
        "language": "english",
        "text": "Feature Two: Spoken Fences. Instead of wasting thirty minutes writing tickets, an engineer highlights the fragile code in Monaco Editor and speaks a ten-second voice note. Listen to this live payment protection recorded in Telugu by Nalini:",
        "speaker_role": "English Master Narrator (Pranav)"
    },
    {
        "filename": "stem_04_telugu_fence_nalini.wav",
        "model": "timbre-v2.5",
        "voice": "Nalini",
        "language": "telugu",
        "text": "ఈ గేట్‌వే రీట్రై కౌంట్ ఖచ్చితంగా 5గా ఉండాలి. అర్ధరాత్రి క్లియరింగ్ అప్పుడు నెట్‌వర్క్ ప్యాకెట్లు డ్రాప్ కాకుండా ఇది కాపాడుతుంది.",
        "speaker_role": "Telugu Codebase Guard Agent (Nalini)"
    },
    {
        "filename": "stem_05_ast_rescorer_pranav.wav",
        "model": "timbre-v2.5",
        "voice": "Pranav",
        "language": "english",
        "text": "Notice that? Our AST Vocabulary Rescorer intercepts the code-mixed speech and maps the spoken Telugu sound directly to exact variables: retryCount and GatewayRouter.java. Then, our Invariant Test Compiler automatically generates executable JUnit 5 and Pytest test suites that lock the constraint into CI.",
        "speaker_role": "English Master Narrator (Pranav)"
    },
    {
        "filename": "stem_06_ask_repo_intro_pranav.wav",
        "model": "timbre-v2.5",
        "voice": "Pranav",
        "language": "english",
        "text": "Feature Four: Ask-the-Repo Architectural Co-Pilot. When you take over a repository, you can ask questions using your voice in your native language. Watch an engineer ask in Hindi:",
        "speaker_role": "English Master Narrator (Pranav)"
    },
    {
        "filename": "stem_07_hindi_copilot_bhavna.wav",
        "model": "timbre-v2.5",
        "voice": "Bhavna",
        "language": "hindi",
        "text": "गेटवे रूटर को v2 में अपग्रेड करने का सबसे सुरक्षित तरीका क्या है?",
        "speaker_role": "Hindi Architectural Co-Pilot Agent (Bhavna)"
    },
    {
        "filename": "stem_08_rrf_gemini_pranav.wav",
        "model": "timbre-v2.5",
        "voice": "Pranav",
        "language": "english",
        "text": "Under the hood, WhyLine runs Reciprocal Rank Fusion inside Supabase pgvector, joining AST nodes and voice pins in a single SQL query. The Gemini 3.8 reasoning brain returns three ranked architectural strategies by risk, while Monaco Editor jumps directly to the cited line.",
        "speaker_role": "English Master Narrator (Pranav)"
    },
    {
        "filename": "stem_09_mcp_git_pranav.wav",
        "model": "timbre-v2.5",
        "voice": "Pranav",
        "language": "english",
        "text": "When an AI coding agent like Cursor or Claude Code attempts to commit a breaking change, our FastMCP server intercepts the diff before the commit can finish. It halts the commit in the terminal and plays the original author's voice warning right inside the IDE.",
        "speaker_role": "English Master Narrator (Pranav)"
    },
    {
        "filename": "stem_10_credits_outro_pranav.wav",
        "model": "timbre-v2.5",
        "voice": "Pranav",
        "language": "english",
        "text": "Enterprise security with zero secrets in code, and instant gateway cutover. And here is the most exciting part: this entire product walkthrough and all voice tracks were produced using the state-of-the-art Gnani AI Voice Agents: Pranav for English master narration, Nalini for Telugu codebase guardrails, Bhavna for Hindi architectural co-pilot reasoning, and Shivani on Timbre version 3.0. Powered by Gnani Vachana AI, Graphify AST knowledge graph, and Open Higgsfield AI Cinema Studio. Guard the unwritten why behind your code. Built for the Gnani AI Internship Program Showcase.",
        "speaker_role": "Voice Agent Credits & Outro (Pranav)"
    },
    {
        "filename": "stem_11_outro_executive_shivani.wav",
        "model": "timbre-v3.0",
        "voice": "Shivani",
        "language": "english",
        "text": "This video walkthrough was proudly powered by Gnani AI Voice Agents. Special thanks to Pranav, Nalini, Bhavna, and the Gnani Vachana Speech Stack.",
        "speaker_role": "Executive Closer (Shivani on Timbre v3.0)"
    }
]


def synthesize_stem(stem: dict) -> bool:
    payload = {
        "model": stem["model"],
        "voice": stem["voice"],
        "text": stem["text"],
        "language": stem["language"],
        "sample_rate": 16000,
        "format": "wav",
    }
    target_path = OUT_DIR / stem["filename"]
    print(f"[*] Synthesizing {stem['filename']} ({stem['speaker_role']})...")
    try:
        resp = requests.post(TTS_URL, headers=HEADERS, json=payload, timeout=20)
        if resp.status_code == 200 and len(resp.content) > 1000:
            with open(target_path, "wb") as f:
                f.write(resp.content)
            size_kb = len(resp.content) / 1024
            print(f"    [SUCCESS] Saved {target_path.name} ({size_kb:.1f} KB)")
            return True
        else:
            print(f"    [FAILED] HTTP {resp.status_code}: {resp.text[:200]}")
            return False
    except Exception as err:
        print(f"    [ERROR] {err}")
        return False


def main():
    print("=" * 65)
    print("WhyLine Studio — Video Voice Stems Generator via Gnani Vachana AI")
    print("=" * 65)
    print(f"Output directory: {OUT_DIR}")
    print(f"Total stems to generate: {len(AUDIO_STEMS)}\n")
    
    passed = 0
    for s in AUDIO_STEMS:
        ok = synthesize_stem(s)
        if ok:
            passed += 1

    print("\n" + "=" * 65)
    print(f"Synthesis Complete: {passed}/{len(AUDIO_STEMS)} stems generated successfully.")
    print("=" * 65)


if __name__ == "__main__":
    main()
