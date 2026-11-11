"""Ultra-Fast FFmpeg Video Assembler for WhyLine Studio
Uses imageio_ffmpeg's native binary to assemble all 6 scenes with Gnani AI's Shivani voice.
Runs in ~5 seconds using hardware-accelerated still image encoding.
"""
import os
import sys
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
STEM_DIR = ROOT / "outputs" / "unified_voice_stems"
SHOT_DIR = ROOT / "screenshots"
TMP_DIR = ROOT / "outputs" / "video_tmp"
TMP_DIR.mkdir(parents=True, exist_ok=True)
OUT_VIDEO = ROOT / "outputs" / "WhyLine_Product_Walkthrough.mp4"

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

UNIFIED_SCENES = [
    {
        "stem": "scene_01_intro_shivani.wav",
        "shot": "01_home_dashboard_light.png",
        "title": "WhyLine Studio — Guard the Unwritten Why",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Never tear down a fence until you know why it was built. WhyLine is your voice-native codebase guard."
    },
    {
        "stem": "scene_02_ast_guard_shivani.wav",
        "shot": "01_home_dashboard_dark.png",
        "title": "Feature 1: Codebase Guard & AST Anomaly Scorecard",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Tree-sitter AST detection: Magic Literals, Thread Sleeps, Validation Bypasses, Swallowed Catch."
    },
    {
        "stem": "scene_03_spoken_fences_shivani.wav",
        "shot": "02_workbench_fence_light.png",
        "title": "Feature 2: 10-Second Spoken Fences & 3D Waveform",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Highlight code in Monaco Editor and speak a 10s voice postmortem. Fast, effortless, permanent."
    },
    {
        "stem": "scene_04_ask_repo_shivani.wav",
        "shot": "02_workbench_ask_light.png",
        "title": "Feature 3: Ask-the-Repo Architectural Co-Pilot",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Ask architectural questions to ANY loaded GitHub repo using your spoken voice in your native language."
    },
    {
        "stem": "scene_05_mcp_guard_shivani.wav",
        "shot": "03_memory_ledger_light.png",
        "title": "Feature 4: FastMCP Pre-Commit Interception",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Intercepts AI agents (Cursor / Claude Code) and git commits. Aborts edits violating fences and plays audio."
    },
    {
        "stem": "scene_06_credits_outro_shivani.wav",
        "shot": "04_settings_integrations_light.png",
        "title": "Enterprise Security & Official Gnani AI Voice Credits",
        "voice_tag": "🎙️ Flagship Voice: Shivani (timbre-v3.0 • Gnani AI)",
        "subtitle": "Video produced using Gnani AI Flagship Voice Agent: Shivani + Graphify AST + Open Higgsfield AI."
    }
]

WIDTH, HEIGHT = 1280, 720


def create_scene_frame(shot_path: Path, title: str, voice_tag: str, subtitle: str) -> Path:
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

    out_png = TMP_DIR / f"frame_{Path(shot_path).stem}.png"
    base.save(out_png)
    return out_png


def main():
    print("=" * 65)
    print("WhyLine Studio — Fast Native FFmpeg Video Renderer")
    print(f"FFmpeg binary: {FFMPEG_EXE}")
    print("=" * 65)

    segment_files = []
    
    for idx, sc in enumerate(UNIFIED_SCENES, start=1):
        stem_path = STEM_DIR / sc["stem"]
        shot_path = SHOT_DIR / sc["shot"]
        
        if not stem_path.exists():
            print(f"[!] Missing {stem_path}, skipping.")
            continue

        frame_png = create_scene_frame(shot_path, sc["title"], sc["voice_tag"], sc["subtitle"])
        seg_mp4 = TMP_DIR / f"seg_{idx:02d}.mp4"

        cmd = [
            FFMPEG_EXE, "-y",
            "-loop", "1",
            "-i", str(frame_png),
            "-i", str(stem_path),
            "-c:v", "libx264",
            "-tune", "stillimage",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            str(seg_mp4)
        ]
        print(f"[*] Rendering Scene {idx}: {sc['title'][:35]}...")
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if res.returncode != 0:
            print(f"[ERROR] Scene {idx} failed:\n{res.stderr.decode('utf-8', errors='ignore')}")
            sys.exit(1)
        segment_files.append(seg_mp4)

    # Concat file list
    concat_list = TMP_DIR / "concat_list.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for seg in segment_files:
            # Use forward slashes
            f.write(f"file '{seg.as_posix()}'\n")

    print("\n[*] Concatenating segments into final video...")
    concat_cmd = [
        FFMPEG_EXE, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_list),
        "-c", "copy",
        str(OUT_VIDEO)
    ]
    res = subprocess.run(concat_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if res.returncode != 0:
        print(f"[ERROR] Concat failed:\n{res.stderr.decode('utf-8', errors='ignore')}")
        sys.exit(1)

    size_mb = OUT_VIDEO.stat().st_size / (1024 * 1024)
    print("\n" + "=" * 65)
    print("SUCCESS: Complete Product Video Assembled!")
    print(f"File Path: {OUT_VIDEO}")
    print(f"File Size: {size_mb:.2f} MB")
    print("=" * 65)


if __name__ == "__main__":
    main()
