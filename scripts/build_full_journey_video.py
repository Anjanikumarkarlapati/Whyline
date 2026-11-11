"""Full-Screen End-to-End Product Walkthrough Video for WhyLine Studio
Covers complete user journey: Login -> Dashboard -> Monaco/Fence -> Why Timeline ->
Ask-the-Repo Co-Pilot -> Git Flowchart & Glassmorphism Drawer -> Settings & Cutover.
Features Light & Dark mode, explains every button action, and is voiced by Gnani AI's flagship Shivani (timbre-v3.0).
"""
import os
import sys
import subprocess
from pathlib import Path
import requests
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services.gnani_client import _load_dotenv_once, GnaniSpeechClient

_load_dotenv_once()

GNANI_API_KEY = os.getenv("GNANI_API_KEY", "").strip()
TTS_URL = "https://api.vachana.ai/api/v1/tts/inference"
HEADERS = {
    "X-API-Key-ID": GNANI_API_KEY,
    "Content-Type": "application/json",
    "User-Agent": "WhyLine/1.0",
}

OUT_DIR = ROOT / "outputs" / "full_journey_stems"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR = ROOT / "outputs" / "video_tmp"
TMP_DIR.mkdir(parents=True, exist_ok=True)
OUT_VIDEO = ROOT / "outputs" / "WhyLine_Product_Walkthrough.mp4"
SHOT_DIR = ROOT / "screenshots"

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

SCENES = [
    {
        "filename": "step_01_login_light.wav",
        "shot": "08_login_auth.png",
        "page_tag": "ENTRY GATE: LOGIN PAGE • LIGHT MODE",
        "btn_tag": "🔘 Button: 'Enter Workspace' & Repo Selector",
        "subtitle": "Welcome to WhyLine Studio. Enter your engineer email, select HealthConnect repo, and click Enter Workspace.",
        "text": "Welcome to WhyLine Studio. We begin at the Entry Gate: the Sign-In page. Here, developers select their email, choose the target repository, and click Enter Workspace. Notice the top navigation bar with the one-click Theme Switcher and Indic Language selector."
    },
    {
        "filename": "step_02_login_dark.wav",
        "shot": "08_login_auth_dark.png",
        "page_tag": "ENTRY GATE: LOGIN PAGE • KHAKI DARK MODE",
        "btn_tag": "🔘 Button: Theme Switcher (Paper Light ⇄ Khaki Dark)",
        "subtitle": "Clicking the Theme Toggle switches to Khaki Dark with L2 floating glass and 14px backdrop blur.",
        "text": "Clicking the Theme Toggle switches into Khaki Dark mode, showing off our L2 floating glass aesthetic with fourteen-pixel backdrop blur. Once signed in, you enter the central workspace."
    },
    {
        "filename": "step_03_dashboard_light.wav",
        "shot": "01_home_dashboard_light.png",
        "page_tag": "DASHBOARD: CODEBASE GUARD • LIGHT MODE",
        "btn_tag": "🔘 Buttons: 'Scan Repo' • 'Confirm FENCE-001' • Anomaly Chips",
        "subtitle": "Clicking Scan Repo re-parses AST. Confirm FENCE-001 locks payment workaround. Filter chips isolate anomalies.",
        "text": "This is the Codebase Guard Dashboard in full-screen mode. Look at the top buttons: clicking Scan Repo re-parses the AST in real time. The Confirm FENCE-001 button lets you instantly lock the midnight payment workaround. And these filter chips isolate Magic Numbers, Thread Sleeps, and Validation Bypasses with zero false positives."
    },
    {
        "filename": "step_04_dashboard_dark.wav",
        "shot": "01_home_dashboard_dark.png",
        "page_tag": "DASHBOARD: GUARD TELEMETRY • DARK MODE",
        "btn_tag": "🔘 Cards: Active Fences (6/10) • Blocked Breaks (10/10)",
        "subtitle": "Dark mode telemetry tracks active fences, pending voice notes, and blocked AI refactors with WCAG AA contrast.",
        "text": "In dark mode, our live telemetry scorecard monitors active fences, pending voice notes, and blocked AI refactors with crisp WCAG Double-A contrast."
    },
    {
        "filename": "step_05_workbench_fence_light.wav",
        "shot": "02_workbench_fence_light.png",
        "page_tag": "WORKBENCH: MONACO & SPOKEN FENCES • LIGHT MODE",
        "btn_tag": "🔘 Button: 'Record 10s Voice' on 36-Bar Acoustic Waveform",
        "subtitle": "Highlight fragile code in Monaco Editor and click Record. Compiles executable JUnit 5 and Pytest test suites.",
        "text": "Now in the Workbench Studio. What does this button do? Clicking Record 10-Second Voice activates the thirty-six bar acoustic waveform. Developers speak their postmortem in Telugu, Hindi, or English. Our AST vocabulary rescorer maps speech to exact code symbols, and compiles executable invariant test suites."
    },
    {
        "filename": "step_06_workbench_fence_dark.wav",
        "shot": "02_workbench_fence_dark.png",
        "page_tag": "WORKBENCH: MONACO PROTECTED FENCE • DARK MODE",
        "btn_tag": "🔘 Gutter Pin: Line 12 retryCount = 5 Protected Invariant",
        "subtitle": "Dark mode Monaco Editor highlights line 12 with an olive gutter pin badge, protecting the 5-retry loop.",
        "text": "In dark mode, the Monaco Editor highlights line twelve with an olive gutter pin badge, ensuring the five-retry loop is protected from naive deletion."
    },
    {
        "filename": "step_07_workbench_why_light.wav",
        "shot": "02_workbench_why_light.png",
        "page_tag": "WORKBENCH: WHY TIMELINE PROVENANCE • LIGHT MODE",
        "btn_tag": "🔘 Tab: 'Why Timeline' correlating Git Blame + PR #212 + INC-9921",
        "subtitle": "Standard git blame only shows who committed. Why Timeline links the code line directly to PR #212 and INC-9921.",
        "text": "Clicking the Why Timeline tab uncovers the hidden backstory. Standard git blame only shows who committed code. WhyLine links the line directly to Pull Request two-twelve and Incident INC-9921."
    },
    {
        "filename": "step_08_workbench_ask_light.wav",
        "shot": "02_workbench_ask_light.png",
        "page_tag": "CO-PILOT: ASK-THE-REPO ARCHITECTURAL ASSISTANT",
        "btn_tag": "🔘 Buttons: Push-to-Talk Mic • 'Open in Editor' on Strategy Cards",
        "subtitle": "Click mic to ask architectural questions. pgvector RRF + Gemini 3.8 returns 3 ranked risk strategies.",
        "text": "Here is Feature Three: Ask-the-Repo Architectural Co-Pilot. Click the push-to-talk microphone button and ask any refactoring question aloud. Supabase pgvector Reciprocal Rank Fusion joins AST nodes with voice pins, and Gemini 3.8 returns three ranked risk strategies. Clicking Open in Editor auto-jumps to the cited lines."
    },
    {
        "filename": "step_09_workbench_ask_dark.wav",
        "shot": "02_workbench_ask_dark.png",
        "page_tag": "CO-PILOT: STRATEGY RANKING • DARK MODE",
        "btn_tag": "🔘 Strategies: Feature Flag (Low) • Shadow Canary (Mod) • Replace (High)",
        "subtitle": "Dark mode gives maximum readability during debugging, highlighting architectural trade-offs with color badges.",
        "text": "Dark mode gives engineers maximum readability during late-night debugging sessions, highlighting strategy trade-offs with clear color badges."
    },
    {
        "filename": "step_10_memory_graph_light.wav",
        "shot": "03_memory_graph_light.png",
        "page_tag": "PROVENANCE: INTERACTIVE GIT FLOWCHART GRAPH",
        "btn_tag": "🔘 Nodes: Initial Scaffold ➔ PR #212 ➔ INC-9921 ➔ FENCE-001 ➔ v2",
        "subtitle": "Interactive SVG flowchart maps history from commit to incident. Clicking nodes plays spoken audio walkthroughs.",
        "text": "Feature Four: The Git Provenance Graph. This interactive SVG flowchart maps the lineage from commit to incident to spoken fence. Clicking any node triggers spoken audio walkthroughs in your native language."
    },
    {
        "filename": "step_11_memory_drawer_light.wav",
        "shot": "03_memory_detail_drawer_light.png",
        "page_tag": "MEMORY: GLASSMORPHIC DETAIL DRAWER",
        "btn_tag": "🔘 Button: 'Open in Workbench' with L2 Floating Glass Backdrop",
        "subtitle": "Clicking an incident slides open the glassmorphic detail drawer with top highlights and Open in Workbench action.",
        "text": "Clicking an incident slides open the glassmorphic Detail Drawer, showcasing our frosted glass surface, top highlight hairlines, and a primary Open in Workbench action button."
    },
    {
        "filename": "step_12_settings_light.wav",
        "shot": "04_settings_integrations_light.png",
        "page_tag": "SETTINGS & CUTOVER: ZERO-SECRET SECURITY • LIGHT MODE",
        "btn_tag": "🔘 Buttons: 'Re-verify Secrets' • 'Gateway Version Cutover' (v1 ➔ v2)",
        "subtitle": "Re-verify Secrets audits credentials. Gateway Version toggle performs instant zero-downtime cutover.",
        "text": "Finally, the Settings page. Clicking Re-verify Secrets confirms our Zero-Secret guarantee. And when you are ready to modernize your code, flipping the Gateway Version switch cuts traffic over from version one to version two with zero downtime."
    },
    {
        "filename": "step_13_settings_dark.wav",
        "shot": "04_settings_integrations_dark.png",
        "page_tag": "SETTINGS & OUTRO • OFFICIAL GNANI AI CREDITS",
        "btn_tag": "🎙️ Official Voice Agent: Shivani (Gnani Timbre v3.0)",
        "subtitle": "Produced using Gnani AI Flagship Voice Agent Shivani + Graphify AST + Open Higgsfield AI Cinema Studio.",
        "text": "This complete product walkthrough was proudly voiced by Gnani AI's flagship voice agent, Shivani on Timbre version 3.0. Powered by Gnani Vachana AI, Graphify AST knowledge graph, and Open Higgsfield AI Cinema Studio. Guard the unwritten why behind your code."
    }
]

# True Full Screen Resolution (1280x720 16:9 full-bleed)
WIDTH, HEIGHT = 1280, 720


def synthesize_all():
    print("[*] Synthesizing 13 full-journey audio stems with Shivani (timbre-v3.0)...")
    for sc in SCENES:
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


def create_fullscreen_frame(shot_path: Path, page_tag: str, btn_tag: str, subtitle: str) -> Path:
    """Creates a 100% FULL-SCREEN edge-to-edge frame with floating glassmorphic HUD cards."""
    # 1. Load screenshot and stretch/fit to 100% full-screen 1280x720 (full bleed)
    if shot_path.exists():
        shot = Image.open(shot_path).convert("RGB")
        # Resize to exactly 1280x720 full bleed
        base = shot.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    else:
        base = Image.new("RGB", (WIDTH, HEIGHT), color=(253, 251, 212))

    draw = ImageDraw.Draw(base)

    # 2. Top-Left Floating Glass Pill (Page Name & Mode)
    draw.rounded_rectangle([20, 16, 480, 50], radius=8, fill=(28, 28, 18), outline=(84, 83, 51), width=1)
    draw.text((32, 24), page_tag, fill=(253, 251, 212))

    # 3. Top-Right Floating Button Action Pill ("What does this button do?")
    draw.rounded_rectangle([WIDTH - 530, 16, WIDTH - 20, 50], radius=8, fill=(84, 83, 51), outline=(217, 215, 182), width=1)
    draw.text((WIDTH - 518, 24), btn_tag[:60], fill=(253, 251, 212))

    # 4. Bottom Glassmorphic Subtitle Strip (Floating above taskbar)
    draw.rounded_rectangle([30, HEIGHT - 78, WIDTH - 30, HEIGHT - 16], radius=10, fill=(24, 24, 16), outline=(84, 83, 51), width=1)
    # Accent indicator bar on left of subtitle
    draw.rectangle([34, HEIGHT - 74, 38, HEIGHT - 20], fill=(217, 215, 182))
    
    # Subtitle text
    draw.text((50, HEIGHT - 70), "🎙️ SHIVANI: " + subtitle[:115], fill=(253, 251, 212))
    if len(subtitle) > 115:
        draw.text((50, HEIGHT - 46), subtitle[115:230], fill=(217, 215, 182))

    out_png = TMP_DIR / f"full_{Path(shot_path).stem}_{page_tag[:8].strip().replace(' ', '_')}.png"
    base.save(out_png)
    return out_png


def main():
    print("=" * 65)
    print("WhyLine Studio — Complete Full-Screen Product Video Assembler")
    print(f"FFmpeg binary: {FFMPEG_EXE}")
    print("=" * 65)

    synthesize_all()

    segment_files = []
    total_sec = 0.0

    for idx, sc in enumerate(SCENES, start=1):
        stem_path = OUT_DIR / sc["filename"]
        shot_path = SHOT_DIR / sc["shot"]

        if not stem_path.exists():
            print(f"[!] Missing {stem_path}, skipping.")
            continue

        frame_png = create_fullscreen_frame(shot_path, sc["page_tag"], sc["btn_tag"], sc["subtitle"])
        seg_mp4 = TMP_DIR / f"full_seg_{idx:02d}.mp4"

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
        print(f"[*] Rendering Scene {idx:02d}/{len(SCENES):02d}: {sc['page_tag'][:38]}...")
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if res.returncode != 0:
            print(f"[ERROR] Scene {idx} failed:\n{res.stderr.decode('utf-8', errors='ignore')}")
            sys.exit(1)
        segment_files.append(seg_mp4)

    # Concat list
    concat_list = TMP_DIR / "full_concat_list.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for seg in segment_files:
            f.write(f"file '{seg.as_posix()}'\n")

    print("\n[*] Concatenating 13 full-screen segments into final master video...")
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
    print("SUCCESS: 100% Full-Screen Product Video Complete!")
    print(f"Output Video: {OUT_VIDEO}")
    print(f"File Size: {size_mb:.2f} MB")
    print("=" * 65)


if __name__ == "__main__":
    main()
