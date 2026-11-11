"""Unified Video Production Script for WhyLine Studio
Uses Gnani AI's #1 Flagship Expressive Voice Agent: Shivani (timbre-v3.0).
Synthesizes speech, composites UI frames, and renders the complete WhyLine_Product_Walkthrough.mp4.
"""
import os
import sys
from pathlib import Path
import requests
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services.gnani_client import _load_dotenv_once, GnaniSpeechClient

_load_dotenv_once()

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "").strip()
if not GNANI_API_KEY:
    print("[ERROR] GNANI_API_KEY not found.")
    sys.exit(1)

TTS_URL = "https://api.vachana.ai/api/v1/tts/inference"
HEADERS = {
    "X-API-Key-ID": GNANI_API_KEY,
    "Content-Type": "application/json",
    "User-Agent": "WhyLine/1.0",
}

OUT_DIR = ROOT / "outputs" / "unified_voice_stems"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_VIDEO = ROOT / "outputs" / "WhyLine_Product_Walkthrough.mp4"
SHOT_DIR = ROOT / "screenshots"

UNIFIED_SCENES = [
    {
        "filename": "scene_01_intro_shivani.wav",
        "shot": "01_home_dashboard_light.png",
        "title": "WhyLine Studio — Guard the Unwritten Why",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Never tear down a fence until you know why it was built. WhyLine is your voice-native codebase guard.",
        "text": "Welcome to WhyLine Studio. In software engineering, Chesterton's Fence teaches us never to remove code until we understand why it was built. Autonomous AI assistants often strip undocumented workarounds, causing catastrophic midnight outages. WhyLine is your voice-native codebase guard, preserving human intent through Indic speech."
    },
    {
        "filename": "scene_02_ast_guard_shivani.wav",
        "shot": "01_home_dashboard_dark.png",
        "title": "Feature 1: Codebase Guard & AST Anomaly Scorecard",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Tree-sitter AST detection: Magic Literals, Thread Sleeps, Validation Bypasses, Swallowed Catch.",
        "text": "First: the Codebase Guard Dashboard. WhyLine scans your repository using Tree-sitter AST parsing. It detects dangerous magic numbers, arbitrary thread sleeps, and bypassed security guards with zero false positives on standard CRUD APIs, keeping your critical systems resilient."
    },
    {
        "filename": "scene_03_spoken_fences_shivani.wav",
        "shot": "02_workbench_fence_light.png",
        "title": "Feature 2: 10-Second Spoken Fences & 3D Waveform",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Highlight code in Monaco Editor and speak a 10s voice postmortem. Fast, effortless, permanent.",
        "text": "Feature Two: Spoken Fences. Instead of writing lengthy Jira tickets, engineers highlight fragile code in Monaco Editor and record a ten-second voice note. Our AST vocabulary rescorer maps code-mixed speech directly into exact code symbols, and automatically compiles executable invariant test suites."
    },
    {
        "filename": "scene_04_ask_repo_shivani.wav",
        "shot": "02_workbench_ask_light.png",
        "title": "Feature 3: Ask-the-Repo Architectural Co-Pilot",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Ask architectural questions to ANY loaded GitHub repo using your spoken voice in your native language.",
        "text": "Feature Three: Ask-the-Repo Architectural Co-Pilot. When investigating complex code, developers ask architectural questions in natural language. Powered by Supabase pgvector Reciprocal Rank Fusion and Gemini 3.8 reasoning, WhyLine returns ranked risk strategies and auto-focuses the exact lines of code."
    },
    {
        "filename": "scene_05_mcp_guard_shivani.wav",
        "shot": "03_memory_ledger_light.png",
        "title": "Feature 4: FastMCP Pre-Commit Interception",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Intercepts AI agents (Cursor / Claude Code) and git commits. Aborts edits violating fences and plays audio.",
        "text": "Feature Four: FastMCP Pre-Commit Interception. When an AI coding agent like Cursor or Claude Code attempts to commit a breaking change, our FastMCP server intercepts the diff in the terminal, aborts the commit, and plays back the original engineer's voice postmortem right inside the editor."
    },
    {
        "filename": "scene_06_credits_outro_shivani.wav",
        "shot": "04_settings_integrations_light.png",
        "title": "Enterprise Security & Official Gnani AI Voice Credits",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Video produced using Gnani AI Flagship Voice Agent: Shivani + Graphify AST + Open Higgsfield AI.",
        "text": "WhyLine delivers enterprise security with automated secret scanning and zero-downtime cutover. This entire video walkthrough was produced using Gnani AI's flagship voice agent, Shivani on Timbre version 3.0. Powered by Gnani Vachana AI, Graphify AST knowledge graph, and Open Higgsfield AI Cinema Studio. Guard the unwritten why behind your code."
    }
]

WIDTH, HEIGHT = 1280, 720
FPS = 24


def synthesize_all_stems():
    print("[*] Synthesizing unified voice stems using Shivani (timbre-v3.0)...")
    for sc in UNIFIED_SCENES:
        target = OUT_DIR / sc["filename"]
        if target.exists() and target.stat().st_size > 1000:
            print(f"    [CACHED] {sc['filename']} ({target.stat().st_size / 1024:.1f} KB)")
            continue
        
        payload = {
            "model": "timbre-v3.0",
            "voice": "Shivani",
            "text": sc["text"],
            "language": "english",
            "sample_rate": 16000,
            "format": "wav",
        }
        print(f"    [SYNTHESIZING] {sc['filename']}...")
        resp = requests.post(TTS_URL, headers=HEADERS, json=payload, timeout=25)
        if resp.status_code == 200 and len(resp.content) > 1000:
            wrapped = GnaniSpeechClient._wrap_pcm_as_wav(resp.content, sample_rate=16000, enhance=True)
            with open(target, "wb") as f:
                f.write(wrapped)
            print(f"    [SUCCESS] Saved {sc['filename']} ({len(wrapped) / 1024:.1f} KB)")
        else:
            print(f"    [FAILED] {resp.status_code}: {resp.text[:200]}")
            sys.exit(1)


def create_scene_frame(shot_path: Path, title: str, voice_tag: str, subtitle: str) -> np.ndarray:
    base = Image.new("RGB", (WIDTH, HEIGHT), color=(253, 251, 212))

    if shot_path.exists():
        shot = Image.open(shot_path).convert("RGB")
        max_w, max_h = 1220, 525
        shot.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
        pos_x = (WIDTH - shot.width) // 2
        pos_y = 20
        base.paste(shot, (pos_x, pos_y))
        
        draw = ImageDraw.Draw(base)
        draw.rectangle([pos_x - 1, pos_y - 1, pos_x + shot.width, pos_y + shot.height], outline=(135, 134, 114), width=1)
    else:
        draw = ImageDraw.Draw(base)

    card_x1, card_y1, card_x2, card_y2 = 30, 560, WIDTH - 30, HEIGHT - 20
    draw.rounded_rectangle([card_x1, card_y1, card_x2, card_y2], radius=12, fill=(255, 254, 240), outline=(84, 83, 51), width=2)

    draw.rounded_rectangle([card_x2 - 380, card_y1 + 10, card_x2 - 15, card_y1 + 38], radius=8, fill=(84, 83, 51))
    draw.text((card_x2 - 370, card_y1 + 14), voice_tag, fill=(253, 251, 212))

    draw.text((card_x1 + 20, card_y1 + 14), title, fill=(42, 41, 25))
    draw.text((card_x1 + 20, card_y1 + 52), subtitle[:110], fill=(84, 83, 51))
    if len(subtitle) > 110:
        draw.text((card_x1 + 20, card_y1 + 76), subtitle[110:], fill=(84, 83, 51))

    draw.text((40, 6), "WHYLINE STUDIO • FIELD REPORT ARCHITECTURE • GNANI VACHANA AI", fill=(135, 134, 114))

    return np.array(base)


def render_unified_video():
    from moviepy import ImageClip, AudioFileClip, concatenate_videoclips
    
    synthesize_all_stems()

    print("\n" + "=" * 65)
    print("WhyLine Studio — Rendering Unified Walkthrough Video (Shivani / timbre-v3.0)")
    print("=" * 65)
    
    clips = []
    total_sec = 0.0

    for idx, sc in enumerate(UNIFIED_SCENES, start=1):
        stem_path = OUT_DIR / sc["filename"]
        shot_path = SHOT_DIR / sc["shot"]

        audio = AudioFileClip(str(stem_path))
        duration = audio.duration
        total_sec += duration

        print(f"[*] Scene {idx:02d}: {sc['title'][:40]}... ({duration:.2f}s)")
        frame_rgb = create_scene_frame(shot_path, sc["title"], sc["voice_tag"], sc["subtitle"])
        clip = ImageClip(frame_rgb).with_duration(duration).with_audio(audio)
        clips.append(clip)

    print(f"\n[*] Total Video Duration: {total_sec:.2f}s (~{total_sec/60:.1f} minutes)")
    final_video = concatenate_videoclips(clips, method="compose")

    print(f"[*] Writing MP4 to: {OUT_VIDEO}...")
    final_video.write_videofile(
        str(OUT_VIDEO),
        fps=FPS,
        codec="libx264",
        audio_codec="aac",
        threads=4,
        logger="bar"
    )

    size_mb = OUT_VIDEO.stat().st_size / (1024 * 1024)
    print("\n" + "=" * 65)
    print(f"[COMPLETE] Unified Product Video Ready!")
    print(f"Video File: {OUT_VIDEO}")
    print(f"Duration: {total_sec:.2f} seconds")
    print(f"Size: {size_mb:.2f} MB")
    print("=" * 65)


if __name__ == "__main__":
    render_unified_video()
