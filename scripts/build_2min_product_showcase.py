"""WhyLine Studio - 2-Minute Executive Product Showcase Video Builder
Synthesizes 8 crisp scenes with Gnani AI Flagship Voice Agent Shivani on timbre-v3.0,
builds 1080p full-bleed frames with interactive button click pointers and glassmorphic HUDs,
and renders the completed 120-second master video.
"""
import os
import sys
import time
import wave
import shutil
import requests
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services.gnani_client import _load_dotenv_once, GnaniSpeechClient

_load_dotenv_once()

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "").strip()
if not GNANI_API_KEY:
    print("[ERROR] GNANI_API_KEY not found in environment.")
    sys.exit(1)

TTS_URL = "https://api.vachana.ai/api/v1/tts/inference"
HEADERS = {
    "X-API-Key-ID": GNANI_API_KEY,
    "Content-Type": "application/json",
    "User-Agent": "WhyLine/1.0",
}

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

OUT_DIR = ROOT / "outputs" / "2min_stems"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR = ROOT / "outputs" / "video_tmp_2min"
TMP_DIR.mkdir(parents=True, exist_ok=True)

OUT_2MIN = ROOT / "outputs" / "WhyLine_2Min_Product_Showcase.mp4"
OUT_MASTER = ROOT / "outputs" / "WhyLine_Product_Walkthrough.mp4"

LATEST_DIR = ROOT / "screenshots" / "latest_frontend"
SHOT_DIR = ROOT / "screenshots"

WIDTH, HEIGHT = 1920, 1080

# Typography
try:
    FONT_TITLE = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 26)
    FONT_BOLD_20 = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)
    FONT_REG_18 = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 18)
    FONT_REG_16 = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 16)
    FONT_MONO_14 = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 14)
except Exception:
    FONT_TITLE = ImageFont.load_default()
    FONT_BOLD_20 = ImageFont.load_default()
    FONT_REG_18 = ImageFont.load_default()
    FONT_REG_16 = ImageFont.load_default()
    FONT_MONO_14 = ImageFont.load_default()

SCENES = [
    {
        "id": "scene_01",
        "stem": "scene_01_hook_login.wav",
        "shot": SHOT_DIR / "08_login_auth.png",
        "page_tag": "ENTRY GATE: LOGIN & REPO BINDING • PAPER LIGHT",
        "btn_name": "Enter Workspace",
        "btn_coord": (1140, 615),
        "btn_action": "Validates engineer session (@anjani) and mounts HealthConnect repository.",
        "invariant": "Zero-Trust Boundary • Restricts code access to verified engineers",
        "text": "At two AM, an autonomous AI refactors a five-retry loop in your payment router, thinking it is redundant. Next morning, payments crash. In engineering, Chesterton's Fence says: never delete code until you know why it was built. Welcome to WhyLine Studio.",
        "subtitle": "Chesterton's Fence: Never delete code until you know why it was built. Welcome to WhyLine Studio."
    },
    {
        "id": "scene_02",
        "stem": "scene_02_dashboard_ast.wav",
        "shot": LATEST_DIR / "workspace1-explorer-verified.png",
        "page_tag": "WORKSPACE 1: EXPLORER DASHBOARD • PAPER LIGHT",
        "btn_name": "Scan Repo & Confirm FENCE-001",
        "btn_coord": (1350, 185),
        "btn_action": "Tree-sitter AST scan flags fragile code; locks critical payment settlement workaround.",
        "invariant": "PR #212 / INC-9921 Invariant • retryCount = 5 prevents midnight packet drops",
        "text": "Our Explorer Dashboard detects fragile code using Tree-sitter AST scanning, catching magic literals, thread sleeps, and bypasses. The telemetry ribbon tracks six active fences and confirms ten out of ten dangerous AI edits are blocked in real time.",
        "subtitle": "Explorer Dashboard detects fragile code via AST scanning. Telemetry tracks active fences and blocked AI breaks."
    },
    {
        "id": "scene_03",
        "stem": "scene_03_spoken_fences_usp.wav",
        "shot": LATEST_DIR / "workspace2-studio-verified.png",
        "page_tag": "WORKSPACE 2: UNIFIED STUDIO & FENCE • PAPER LIGHT",
        "btn_name": "Record 10s Voice on 36-Bar Waveform",
        "btn_coord": (1380, 395),
        "btn_action": "Captures 10-second voice explanation and auto-compiles JUnit 5 / Pytest guard suites.",
        "invariant": "Chesterton's Voice Lock • Spoken explanation is permanently bound to SHA-256 AST hash",
        "text": "Writing documentation takes too long, so engineers skip it. WhyLine's core innovation is the Spoken Fence. Highlight code in Monaco Editor, click record, and speak a ten-second postmortem. WhyLine binds your voice directly to the AST node and compiles an executable test suite.",
        "subtitle": "Core Innovation: Spoken Fences. Highlight code, record a 10s voice note, and compile an executable test suite."
    },
    {
        "id": "scene_04",
        "stem": "scene_04_editor_guard_intercept.wav",
        "shot": SHOT_DIR / "02_workbench_fence_dark.png",
        "page_tag": "MONACO CODE STUDIO • KHAKI DARK GLASSMORPHISM",
        "btn_name": "Line 12 Gutter Pin Badge",
        "btn_coord": (420, 380),
        "btn_action": "Displays inline security badge; FastMCP pre-commit hook aborts unauthorized AI refactors.",
        "invariant": "Line-Level Guardrail • Pre-commit hook aborts destructive edits, playing audio explanation",
        "text": "Inside the editor, protected code displays an inline security gutter badge. If a junior developer or AI agent attempts to remove that five-retry loop, WhyLine's FastMCP pre-commit hook intercepts the commit, playing the engineer's voice explanation.",
        "subtitle": "Monaco Editor highlights protected code. FastMCP pre-commit hook intercepts unsafe edits, playing the voice note."
    },
    {
        "id": "scene_05",
        "stem": "scene_05_ast_rescorer_indic.wav",
        "shot": LATEST_DIR / "r1-stt-executed.png",
        "page_tag": "AST RESCORER: INDIC CODE-MIXED SPEECH • PAPER LIGHT",
        "btn_name": "Rescore Spoken Tokens",
        "btn_coord": (1220, 340),
        "btn_action": "Translates spoken Telugu and Hindi into exact camelCase code variables with 94.2% accuracy.",
        "invariant": "Indic Multilingual Mapping • Bridges natural regional speech with compiler ASTs",
        "text": "Engineers communicate naturally in code-mixed languages. Powered by Gnani Vachana AI, our AST phonetic rescorer translates spoken Telugu and Hindi into exact camelCase code variables with ninety-four point two percent accuracy, bridging natural speech with compiler ASTs.",
        "subtitle": "Gnani Vachana AI translates spoken Telugu and Hindi into exact camelCase variables with 94.2% accuracy."
    },
    {
        "id": "scene_06",
        "stem": "scene_06_ask_repo_copilot.wav",
        "shot": LATEST_DIR / "sample-repo-ky-voice-report.png",
        "page_tag": "ASK-THE-REPO ARCHITECTURAL CO-PILOT • PAPER LIGHT",
        "btn_name": "Push-to-Talk Mic Query",
        "btn_coord": (1350, 240),
        "btn_action": "Queries pgvector HNSW index and Gemini 3.8 to return 3 ranked architectural risk strategies.",
        "invariant": "Reciprocal Rank Fusion • Blends vector similarity with AST symbol graph to prevent hallucinations",
        "text": "Need to refactor? Press the mic. WhyLine combines Supabase pgvector hybrid search with Gemini three point eight reasoning to deliver three ranked risk strategies with full architectural trade-offs, helping developers safely modernize fragile legacy systems.",
        "subtitle": "Push-to-talk mic activates pgvector and Gemini 3.8 reasoning, returning three ranked risk strategies."
    },
    {
        "id": "scene_07",
        "stem": "scene_07_memory_cutover.wav",
        "shot": SHOT_DIR / "04_settings_integrations_light.png",
        "page_tag": "SETTINGS: ZERO-DOWNTIME GATEWAY CUTOVER • PAPER LIGHT",
        "btn_name": "Flip Gateway to v2 Cutover",
        "btn_coord": (1240, 580),
        "btn_action": "Toggles active gateway from v1 to v2, triggering automatic zero-downtime fence retirement.",
        "invariant": "Automatic Fence Expiry • Decommissions workarounds once upstream fixes eliminate root cause",
        "text": "The Memory Ledger connects past outages like INC-9921 to line-level code blame. When upstream services upgrade, toggling Gateway Version to v2 safely retires temporary workarounds, maintaining continuous zero-downtime reliability.",
        "subtitle": "Memory Ledger links outages to code blame. Toggling Gateway to v2 safely retires obsolete workarounds."
    },
    {
        "id": "scene_08",
        "stem": "scene_08_gnani_credits.wav",
        "shot": SHOT_DIR / "04_settings_integrations_dark.png",
        "page_tag": "OFFICIAL GNANI AI CREDITS & VERIFICATION • KHAKI DARK",
        "btn_name": "Re-Verify Security Boundary",
        "btn_coord": (1240, 410),
        "btn_action": "Audits air-gapped credentials, zero-leak boundary, and certifies 6/6 security protections.",
        "invariant": "Enterprise Air-Gap Certified • All voice, AST, and token processing runs with zero data leakage",
        "text": "This video was produced using Gnani AI's flagship voice model, Shivani on Timbre version three point zero, powered by Gnani Vachana AI and Graphify AST. Special thanks to the Gnani AI engineering team.",
        "subtitle": "Produced using Gnani AI's flagship voice model Shivani on Timbre v3.0, powered by Gnani Vachana AI & Graphify."
    }
]


def synthesize_audio_stems():
    """Synthesizes high-fidelity voice stems with Gnani AI Shivani on Timbre v3.0."""
    print("\n[*] Synthesizing 2-minute voice stems using Gnani AI (Shivani • timbre-v3.0)...")
    total_sec = 0.0

    for idx, sc in enumerate(SCENES, start=1):
        wav_path = OUT_DIR / sc["stem"]
        if wav_path.exists() and wav_path.stat().st_size > 10000:
            print(f"  [+] Stem {idx}/8 already cached: {sc['stem']}")
        else:
            print(f"  [~] Calling Gnani TTS for Scene {idx}/8: {sc['id']}...")
            payload = {
                "model": "timbre-v3.0",
                "voice": "Shivani",
                "language": "english",
                "text": sc["text"],
                "speed": 1.05
            }
            res = requests.post(TTS_URL, json=payload, headers=HEADERS, timeout=20)
            if res.status_code != 200:
                print(f"  [!] TTS failed for {sc['id']}: status {res.status_code} {res.text}")
                sys.exit(1)

            wav_bytes = GnaniSpeechClient._wrap_pcm_as_wav(res.content, sample_rate=16000, enhance=True)
            with open(wav_path, "wb") as f:
                f.write(wav_bytes)
            print(f"  [+] Saved {sc['stem']} ({len(wav_bytes)} bytes)")
            time.sleep(0.3)

        with wave.open(str(wav_path), "rb") as w:
            dur = w.getnframes() / float(w.getframerate())
            total_sec += dur
            print(f"      Duration: {dur:.2f}s")

    print(f"\n[+] Total Audio Duration: {total_sec:.2f}s (~{total_sec/60:.2f} mins) [Target: ~120s]")
    return total_sec


def make_full_bleed_1080p(img: Image.Image) -> Image.Image:
    """Lanczos aspect-fill cropping to 1920x1080 without distortion or letterboxing."""
    orig_w, orig_h = img.size
    scale = max(WIDTH / orig_w, HEIGHT / orig_h)
    new_w = int(orig_w * scale)
    new_h = int(orig_h * scale)
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - WIDTH) // 2
    top = (new_h - HEIGHT) // 2
    return resized.crop((left, top, left + WIDTH, top + HEIGHT))


def draw_cursor_and_badge(draw: ImageDraw.ImageDraw, x: int, y: int, btn_name: str, btn_action: str, invariant: str):
    """Draws an interactive mouse cursor, click ripple, and floating glassmorphic 'What Does This Button Do?' card."""
    # 1. Pulsing Click Ripple Rings
    draw.ellipse([x - 28, y - 28, x + 28, y + 28], outline=(230, 180, 50), width=3)
    draw.ellipse([x - 16, y - 16, x + 16, y + 16], outline=(255, 255, 255), width=2)
    draw.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(230, 180, 50))

    # 2. Sleek Mouse Pointer Cursor
    cursor_pts = [
        (x, y),
        (x, y + 26),
        (x + 7, y + 20),
        (x + 16, y + 28),
        (x + 21, y + 24),
        (x + 12, y + 16),
        (x + 21, y + 15)
    ]
    shadow_pts = [(px + 3, py + 3) for px, py in cursor_pts]
    draw.polygon(shadow_pts, fill=(15, 15, 10))
    draw.polygon(cursor_pts, fill=(255, 255, 255), outline=(30, 30, 20), width=2)

    # 3. Position Floating Glassmorphic Card
    bx = x + 35
    by = y - 35
    card_w = 540
    card_h = 135

    if bx + card_w > WIDTH - 40:
        bx = x - card_w - 20
    if by + card_h > HEIGHT - 130:
        by = y - card_h - 15
    if by < 90:
        by = 95

    # Glass Card Background (Dark Olive Khaki Surface with hairline border)
    draw.rounded_rectangle([bx, by, bx + card_w, by + card_h], radius=14, fill=(28, 28, 18), outline=(217, 215, 182), width=2)
    # Gold accent left indicator bar
    draw.rectangle([bx + 4, by + 4, bx + 10, by + card_h - 4], fill=(230, 180, 50))

    # Badge Content
    draw.text((bx + 20, by + 12), f"BUTTON CLICKED: {btn_name}", fill=(253, 251, 212), font=FONT_BOLD_20)
    
    # Action description (wrapped)
    action_line1 = btn_action[:58]
    action_line2 = btn_action[58:116] if len(btn_action) > 58 else ""
    draw.text((bx + 20, by + 42), f"Action: {action_line1}", fill=(217, 215, 182), font=FONT_REG_16)
    if action_line2:
        draw.text((bx + 76, by + 66), action_line2, fill=(217, 215, 182), font=FONT_REG_16)
        inv_y = by + 96
    else:
        inv_y = by + 74

    draw.text((bx + 20, inv_y), f"Safety: {invariant[:58]}", fill=(190, 225, 140), font=FONT_MONO_14)


def create_1080p_frame(sc: dict, idx: int) -> Path:
    """Builds a 1920x1080 full-bleed frame with HUD overlays, button pointer, and subtitles."""
    shot_path = sc["shot"]
    if shot_path.exists():
        shot = Image.open(shot_path).convert("RGB")
        base = make_full_bleed_1080p(shot)
    else:
        base = Image.new("RGB", (WIDTH, HEIGHT), color=(253, 251, 212))

    draw = ImageDraw.Draw(base)

    # 1. Top-Left Floating Glass Pill (Page Name & Mode)
    draw.rounded_rectangle([32, 22, 780, 74], radius=14, fill=(28, 28, 18), outline=(84, 83, 51), width=2)
    # Accent indicator bar
    draw.rectangle([36, 26, 42, 70], fill=(217, 215, 182))
    draw.text((54, 34), sc["page_tag"], fill=(253, 251, 212), font=FONT_TITLE)

    # 2. Top-Right Floating Button Action Pill ("What is being clicked?")
    draw.rounded_rectangle([WIDTH - 820, 22, WIDTH - 32, 74], radius=14, fill=(84, 83, 51), outline=(217, 215, 182), width=2)
    draw.text((WIDTH - 802, 36), f"ACTION: {sc['btn_name']}", fill=(253, 251, 212), font=FONT_BOLD_20)

    # 3. Interactive Cursor & Floating "What Does This Button Do?" Callout
    bx, by = sc["btn_coord"]
    draw_cursor_and_badge(draw, bx, by, sc["btn_name"], sc["btn_action"], sc["invariant"])

    # 4. Bottom Glassmorphic Narration Subtitle HUD
    draw.rounded_rectangle([32, HEIGHT - 116, WIDTH - 32, HEIGHT - 24], radius=16, fill=(22, 22, 14), outline=(84, 83, 51), width=2)
    # Gold accent bar on left
    draw.rectangle([38, HEIGHT - 110, 46, HEIGHT - 30], fill=(230, 180, 50))
    
    # Subtitle texts
    voice_prefix = "SHIVANI (timbre-v3.0 - Gnani AI Flagship): "
    draw.text((60, HEIGHT - 104), voice_prefix + sc["subtitle"][:115], fill=(253, 251, 212), font=FONT_REG_18)
    if len(sc["subtitle"]) > 115:
        draw.text((60, HEIGHT - 68), sc["subtitle"][115:230], fill=(217, 215, 182), font=FONT_REG_18)

    out_png = TMP_DIR / f"frame_2min_{idx:02d}_{sc['id']}.png"
    base.save(out_png, "PNG")
    return out_png


def main():
    print("=" * 70)
    print("WhyLine Studio - 2-Minute Executive Product Showcase Video Builder")
    print(f"FFmpeg binary: {FFMPEG_EXE}")
    print(f"Output Video:  {OUT_2MIN}")
    print("=" * 70)

    # Step 1: Synthesize Audio
    total_audio_sec = synthesize_audio_stems()

    # Step 2: Render Segments
    segment_files = []
    for idx, sc in enumerate(SCENES, start=1):
        stem_path = OUT_DIR / sc["stem"]
        shot_path = sc["shot"]

        if not stem_path.exists() or not shot_path.exists():
            print(f"[!] Missing file for Scene {idx}: stem={stem_path.exists()}, shot={shot_path.exists()}")
            continue

        frame_png = create_1080p_frame(sc, idx)
        seg_mp4 = TMP_DIR / f"seg_2min_{idx:02d}.mp4"

        cmd = [
            FFMPEG_EXE, "-y",
            "-loop", "1",
            "-i", str(frame_png),
            "-i", str(stem_path),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "17",
            "-tune", "stillimage",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "44100",
            "-shortest",
            str(seg_mp4)
        ]
        print(f"[*] Rendering Scene {idx:02d}/{len(SCENES):02d}: {sc['page_tag'][:38]}...")
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if res.returncode != 0:
            print(f"[ERROR] Scene {idx} failed:\n{res.stderr.decode('utf-8', errors='ignore')}")
            sys.exit(1)
        segment_files.append(seg_mp4)

    # Step 3: Concat
    concat_list = TMP_DIR / "concat_list_2min.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for seg in segment_files:
            f.write(f"file '{seg.as_posix()}'\n")

    print("\n[*] Concatenating 8 segments into final 2-minute master video...")
    concat_cmd = [
        FFMPEG_EXE, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_list),
        "-c", "copy",
        str(OUT_2MIN)
    ]
    res = subprocess.run(concat_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if res.returncode != 0:
        print(f"[ERROR] Concat failed:\n{res.stderr.decode('utf-8', errors='ignore')}")
        sys.exit(1)

    # Copy to Walkthrough destination as well
    shutil.copyfile(OUT_2MIN, OUT_MASTER)

    size_mb = OUT_2MIN.stat().st_size / (1024 * 1024)
    print("\n" + "=" * 70)
    print("SUCCESS: 2-Minute Executive Product Showcase Video Complete!")
    print(f"Output Video:   {OUT_2MIN}")
    print(f"Master Mirror:  {OUT_MASTER}")
    print(f"File Size:      {size_mb:.2f} MB")
    print(f"Total Duration: {total_audio_sec:.1f}s (~{total_audio_sec/60:.2f} mins)")
    print("=" * 70)


if __name__ == "__main__":
    main()
