"""Render full HD (1280x720, 24fps) product walkthrough video for WhyLine Studio
stitching all 11 Gnani Vachana AI voice stems with high-res UI screenshots,
branded lower-third cards, and explicit Gnani Voice Agent credits.
"""
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
STEM_DIR = ROOT / "outputs" / "video_voice_stems"
SHOT_DIR = ROOT / "screenshots"
OUT_VIDEO = ROOT / "outputs" / "WhyLine_Product_Walkthrough.mp4"

# 11 Storyboard Scenes
SCENES = [
    {
        "stem": "stem_01_intro_pranav.wav",
        "shot": "01_briefing_dashboard_dark.png",
        "title": "WhyLine Studio — The Midnight Outage & Chesterton's Fence",
        "voice_tag": "🎙️ Voice Agent: Pranav (timbre-v2.5 • en-IN)",
        "subtitle": "Never tear down a fence until you know why it was built. Naive AI refactors strip critical workarounds."
    },
    {
        "stem": "stem_02_dashboard_pranav.wav",
        "shot": "01_home_dashboard_light.png",
        "title": "Feature 1: Codebase Guard & AST Anomaly Scorecard",
        "voice_tag": "🎙️ Voice Agent: Pranav (timbre-v2.5 • en-IN)",
        "subtitle": "Tree-sitter AST detection: Magic Literals, Thread Sleeps, Validation Bypasses, Swallowed Catch."
    },
    {
        "stem": "stem_03_spoken_fence_intro_pranav.wav",
        "shot": "02_workbench_fence_light.png",
        "title": "Feature 2: 10-Second Spoken Fences & 3D Waveform",
        "voice_tag": "🎙️ Voice Agent: Pranav (timbre-v2.5 • en-IN)",
        "subtitle": "Highlight code in Monaco Editor and speak a 10s voice postmortem. Fast, effortless, permanent."
    },
    {
        "stem": "stem_04_telugu_fence_nalini.wav",
        "shot": "usp_01_telugu_spoken_fence.png",
        "title": "Live Voice Lock: Nalini (te-IN Telugu) on GatewayRouter.java",
        "voice_tag": "🎙️ Voice Agent: Nalini (timbre-v2.5 • te-IN Telugu)",
        "subtitle": "ఈ గేట్‌వే రీట్రై కౌంట్ ఖచ్చితంగా 5గా ఉండాలి. అర్ధరాత్రి క్లియరింగ్ అప్పుడు నెట్‌వర్క్ ప్యాకెట్లు డ్రాప్ కాకుండా కాపాడుతుంది."
    },
    {
        "stem": "stem_05_ast_rescorer_pranav.wav",
        "shot": "03_monaco_code_studio.png",
        "title": "Feature 3: AST Vocabulary Rescorer & Invariant Test Compiler",
        "voice_tag": "🎙️ Voice Agent: Pranav (timbre-v2.5 • en-IN)",
        "subtitle": "Phonetically maps Indic code-mixed speech to exact CamelCase symbols and compiles runnable JUnit 5 suites."
    },
    {
        "stem": "stem_06_ask_repo_intro_pranav.wav",
        "shot": "02_workbench_ask_light.png",
        "title": "Feature 4: Ask-the-Repo Architectural Co-Pilot",
        "voice_tag": "🎙️ Voice Agent: Pranav (timbre-v2.5 • en-IN)",
        "subtitle": "Ask architectural questions to ANY loaded GitHub repo using your spoken voice in your native language."
    },
    {
        "stem": "stem_07_hindi_copilot_bhavna.wav",
        "shot": "usp_02_hindi_ask_copilot.png",
        "title": "Live Hindi Q&A: Bhavna (hi-IN Hindi) asking Refactor Strategy",
        "voice_tag": "🎙️ Voice Agent: Bhavna (timbre-v2.5 • hi-IN Hindi)",
        "subtitle": "गेटवे रूटर को v2 में अपग्रेड करने का सबसे सुरक्षित तरीका क्या है?"
    },
    {
        "stem": "stem_08_rrf_gemini_pranav.wav",
        "shot": "02_workbench_why_light.png",
        "title": "Supabase pgvector RRF Hybrid Search & Gemini 3.8 Reasoning",
        "voice_tag": "🎙️ Voice Agent: Pranav (timbre-v2.5 • en-IN)",
        "subtitle": "Reciprocal Rank Fusion joins AST nodes with historical voice pins. Returns 3 ranked risk strategies."
    },
    {
        "stem": "stem_09_mcp_git_pranav.wav",
        "shot": "03_memory_ledger_light.png",
        "title": "Feature 6: FastMCP Pre-Commit Interception",
        "voice_tag": "🎙️ Voice Agent: Pranav (timbre-v2.5 • en-IN)",
        "subtitle": "Intercepts AI agents (Cursor / Claude Code) and git commits. Aborts edits violating fences and plays audio."
    },
    {
        "stem": "stem_10_credits_outro_pranav.wav",
        "shot": "04_settings_integrations_light.png",
        "title": "Enterprise Zero-Secret Security & Official Gnani AI Voice Credits",
        "voice_tag": "🎙️ Master Credits: Pranav (timbre-v2.5 • en-IN)",
        "subtitle": "Video produced using Gnani Voice Agents: Pranav, Nalini, Bhavna, Shivani + Graphify AST + Open Higgsfield AI."
    },
    {
        "stem": "stem_11_outro_executive_shivani.wav",
        "shot": "09_typography_design_spec.png",
        "title": "Gnani AI Internship Program Showcase — WhyLine Studio",
        "voice_tag": "🎙️ Executive Closer: Shivani (timbre-v3.0 • en-IN)",
        "subtitle": "Proudly powered by Gnani Vachana AI Voice Agents: Pranav, Nalini, Bhavna & Shivani. Guard the unwritten why."
    }
]

WIDTH, HEIGHT = 1280, 720
FPS = 24


def create_scene_frame(shot_path: Path, title: str, voice_tag: str, subtitle: str) -> np.ndarray:
    """Composites a screenshot inside 1280x720 canvas with field-report lower-third banner."""
    # Base canvas: Warm cream #FDFBD4
    base = Image.new("RGB", (WIDTH, HEIGHT), color=(253, 251, 212))

    # Load screenshot
    if shot_path.exists():
        shot = Image.open(shot_path).convert("RGB")
        # Resize preserving aspect ratio to fit inside top area (1220 x 530)
        max_w, max_h = 1220, 525
        shot.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
        # Center horizontally, place at top: y = 20
        pos_x = (WIDTH - shot.width) // 2
        pos_y = 20
        base.paste(shot, (pos_x, pos_y))
        
        # 1px border around screenshot: Olive #878672
        draw = ImageDraw.Draw(base)
        draw.rectangle([pos_x - 1, pos_y - 1, pos_x + shot.width, pos_y + shot.height], outline=(135, 134, 114), width=1)
    else:
        draw = ImageDraw.Draw(base)

    # Draw Bottom Lower-Third Card: Solid surface #FFFEF0 with #545333 border
    card_x1, card_y1, card_x2, card_y2 = 30, 560, WIDTH - 30, HEIGHT - 20
    draw.rounded_rectangle([card_x1, card_y1, card_x2, card_y2], radius=12, fill=(255, 254, 240), outline=(84, 83, 51), width=2)

    # Accent Voice Pill (Top right inside card): #545333 fill, #FDFBD4 text
    draw.rounded_rectangle([card_x2 - 340, card_y1 + 10, card_x2 - 15, card_y1 + 38], radius=8, fill=(84, 83, 51))
    draw.text((card_x2 - 330, card_y1 + 14), voice_tag, fill=(253, 251, 212))

    # Title & Subtitle text
    draw.text((card_x1 + 20, card_y1 + 14), title, fill=(42, 41, 25))
    draw.text((card_x1 + 20, card_y1 + 52), subtitle[:110], fill=(84, 83, 51))
    if len(subtitle) > 110:
        draw.text((card_x1 + 20, card_y1 + 76), subtitle[110:], fill=(84, 83, 51))

    # Top brand watermark
    draw.text((40, 6), "WHYLINE STUDIO • FIELD REPORT ARCHITECTURE", fill=(135, 134, 114))

    return np.array(base)


def render_video():
    from moviepy import ImageClip, AudioFileClip, concatenate_videoclips
    
    print("=" * 65)
    print("WhyLine Studio — Programmatic MP4 Video Renderer (MoviePy 2.x)")
    print("=" * 65)
    print(f"Target Output: {OUT_VIDEO}")
    print(f"Total Scenes: {len(SCENES)}\n")

    clips = []
    total_duration = 0.0

    for idx, sc in enumerate(SCENES, start=1):
        stem_path = STEM_DIR / sc["stem"]
        shot_path = SHOT_DIR / sc["shot"]

        if not stem_path.exists():
            print(f"[!] Warning: Audio stem missing {stem_path.name}, skipping.")
            continue

        audio = AudioFileClip(str(stem_path))
        duration = audio.duration
        total_duration += duration

        print(f"[*] Processing Scene {idx:02d}: {sc['title'][:45]}... ({duration:.2f}s)")
        frame_rgb = create_scene_frame(shot_path, sc["title"], sc["voice_tag"], sc["subtitle"])
        
        # Build ImageClip matching exact audio duration
        clip = ImageClip(frame_rgb).with_duration(duration).with_audio(audio)
        clips.append(clip)

    print(f"\n[*] Concatenating {len(clips)} scenes. Total Video Duration: {total_duration:.2f}s (~{total_duration/60:.1f} mins)...")
    final_video = concatenate_videoclips(clips, method="compose")

    print(f"[*] Encoding video to {OUT_VIDEO.name} (H.264 / AAC, 24fps)...")
    final_video.write_videofile(
        str(OUT_VIDEO),
        fps=FPS,
        codec="libx264",
        audio_codec="aac",
        logger="bar",
        threads=4
    )

    size_mb = OUT_VIDEO.stat().st_size / (1024 * 1024)
    print("\n" + "=" * 65)
    print(f"[SUCCESS] Video rendered successfully!")
    print(f"Location: {OUT_VIDEO}")
    print(f"File Size: {size_mb:.2f} MB")
    print(f"Duration: {total_duration:.2f} seconds")
    print("=" * 65)


if __name__ == "__main__":
    render_video()
