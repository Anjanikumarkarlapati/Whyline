"""1080p Full-Screen HD Video Assembler for WhyLine Studio (Latest GitHub Frontend)
- 100% Full-Bleed 1080p (1920x1080, 24fps) with Lanczos resampling and zero letterboxing.
- Latest Frontend UI from GitHub (Workspace 1 Explorer, Workspace 2 Studio, AST Rescorer,
  Voice Language Dropdown, Live GitHub Agent, Monaco Protected Gutter).
- Interactive Button Clicks with animated cursor pointers, pulse rings, and floating
  'What does this button do?' glassmorphic HUD badges.
- Alternates Paper Light (#FDFBD4) and Khaki Dark (#1C1C12) with 14px backdrop blur.
- Unified single flagship voice: Gnani AI's Shivani on timbre-v3.0.
"""
import os
import sys
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
STEM_DIR = ROOT / "outputs" / "full_journey_stems"
LATEST_DIR = ROOT / "screenshots" / "latest_frontend"
SHOT_DIR = ROOT / "screenshots"
TMP_DIR = ROOT / "outputs" / "video_tmp_1080p"
TMP_DIR.mkdir(parents=True, exist_ok=True)
OUT_VIDEO = ROOT / "outputs" / "WhyLine_Product_Walkthrough.mp4"

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

WIDTH, HEIGHT = 1920, 1080

# Load Windows native TTF fonts for crystal-clear 1080p typography
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
        "stem": "step_01_login_light.wav",
        "shot": SHOT_DIR / "08_login_auth.png",
        "page_tag": "ENTRY GATE: LOGIN & AUTHENTICATION • LIGHT MODE",
        "btn_name": "Enter Workspace",
        "btn_coord": (1140, 615),
        "btn_action": "Validates engineer identity (@anjani), connects target repo, and mounts guarded workspace.",
        "invariant": "Zero-Trust Identity • Enforces credential boundaries before code inspection",
        "subtitle": "Welcome to WhyLine Studio: your voice-native codebase guard. Sign in at the security gate, enter your engineer email, and click Enter Workspace."
    },
    {
        "stem": "step_02_login_dark.wav",
        "shot": SHOT_DIR / "08_login_auth_dark.png",
        "page_tag": "ENTRY GATE: LOGIN PAGE • KHAKI DARK GLASSMORPHISM",
        "btn_name": "Theme Toggle (Light / Dark)",
        "btn_coord": (1380, 50),
        "btn_action": "Transitions UI tokens between Paper Light (#FDFBD4) and Khaki Dark (#1C1C12) with 14px backdrop blur.",
        "invariant": "WCAG AA Contrast • Low-chroma aesthetic prevents eye strain during emergency midnight debugging",
        "subtitle": "Clicking the Theme Toggle switches to Khaki Dark with L2 floating glass and 14px backdrop blur, preserving nighttime focus."
    },
    {
        "stem": "step_03_dashboard_light.wav",
        "shot": LATEST_DIR / "workspace1-explorer-verified.png",
        "page_tag": "WORKSPACE 1: EXPLORER DASHBOARD • LIGHT MODE",
        "btn_name": "Scan Repo & Confirm FENCE-001",
        "btn_coord": (1350, 185),
        "btn_action": "Triggers Tree-sitter AST parser across Java/Python files and locks critical payment workaround.",
        "invariant": "PR #212 / INC-9921 Invariant • retryCount = 5 prevents 14% packet drops at midnight",
        "subtitle": "Clicking Scan Repo re-parses the AST. Confirm FENCE-001 locks the payment workaround. Filter chips isolate anomalies."
    },
    {
        "stem": "step_04_dashboard_dark.wav",
        "shot": SHOT_DIR / "01_home_dashboard_dark.png",
        "page_tag": "DASHBOARD: GUARD TELEMETRY • DARK MODE",
        "btn_name": "Active Fences Telemetry Card",
        "btn_coord": (450, 310),
        "btn_action": "Displays real-time health metrics: 6 active protected fences and 10/10 blocked AI refactors.",
        "invariant": "100% Intercept Rate • Blocks destructive LLM refactors without raising false alarms on CRUD code",
        "subtitle": "Dark mode telemetry tracks active fences, pending voice notes, and blocked AI refactors with WCAG AA contrast."
    },
    {
        "stem": "step_05_workbench_fence_light.wav",
        "shot": LATEST_DIR / "workspace2-studio-verified.png",
        "page_tag": "WORKSPACE 2: UNIFIED STUDIO & FENCE • LIGHT MODE",
        "btn_name": "Record 10s Voice on 36-Bar Waveform",
        "btn_coord": (1380, 395),
        "btn_action": "Activates 36-bar acoustic waveform scrubber to capture 10s voice postmortem and compiles test suite.",
        "invariant": "Chesterton's Voice Lock • Spoken explanation is permanently bound to SHA-256 AST node hash",
        "subtitle": "Highlight fragile code in Monaco Editor and click Record. Compiles executable JUnit 5 and Pytest test suites."
    },
    {
        "stem": "step_06_workbench_fence_dark.wav",
        "shot": SHOT_DIR / "02_workbench_fence_dark.png",
        "page_tag": "WORKBENCH: MONACO PROTECTED FENCE • DARK MODE",
        "btn_name": "Line 12 Gutter Pin Badge",
        "btn_coord": (420, 380),
        "btn_action": "Pins line 12 (retryCount = 5) with an olive security badge, displaying the emergency postmortem.",
        "invariant": "Line-Level Guardrail • FastMCP pre-commit hook aborts any unauthorized edits to protected ranges",
        "subtitle": "Dark mode Monaco Editor highlights line 12 with an olive gutter pin badge, protecting the 5-retry loop."
    },
    {
        "stem": "step_07_workbench_why_light.wav",
        "shot": LATEST_DIR / "r1-stt-executed.png",
        "page_tag": "AST RESCORER: CODE-MIXED SPEECH • LIGHT MODE",
        "btn_name": "Rescore Spoken Tokens",
        "btn_coord": (1220, 340),
        "btn_action": "Maps spoken Telugu/Hindi phonetic terms to exact camelCase variables (e.g. 'ఐదు సార్లు' -> 'retryCount = 5').",
        "invariant": "Indic Multilingual Mapping • 94.2% token extraction accuracy across English, Telugu, and Hindi",
        "subtitle": "Standard git blame only shows who committed. Why Timeline links the code line directly to PR #212 and INC-9921."
    },
    {
        "stem": "step_08_workbench_ask_light.wav",
        "shot": LATEST_DIR / "sample-repo-ky-voice-report.png",
        "page_tag": "CO-PILOT: ASK-THE-REPO ASSISTANT • LIGHT MODE",
        "btn_name": "Push-to-Talk Mic Query",
        "btn_coord": (1350, 240),
        "btn_action": "Sends spoken architectural query to Supabase pgvector HNSW index and Gemini 3.8 reasoning engine.",
        "invariant": "Reciprocal Rank Fusion • Blends vector similarity with AST symbol graph to prevent hallucinations",
        "subtitle": "Click mic to ask architectural questions. pgvector RRF + Gemini 3.8 returns 3 ranked risk strategies."
    },
    {
        "stem": "step_09_workbench_ask_dark.wav",
        "shot": SHOT_DIR / "02_workbench_ask_dark.png",
        "page_tag": "CO-PILOT: STRATEGY RANKING • DARK MODE",
        "btn_name": "Open in Editor (Strategy 01)",
        "btn_coord": (1360, 520),
        "btn_action": "Navigates editor to protected file and lines, staging the low-risk architectural fix with diff preview.",
        "invariant": "Safe Fix Sequencing • Ranks fixes by blast radius: Feature Flag (Low) vs Architecture Replace (High)",
        "subtitle": "Dark mode gives maximum readability during debugging, highlighting architectural trade-offs with color badges."
    },
    {
        "stem": "step_10_memory_graph_light.wav",
        "shot": LATEST_DIR / "github-voice-agent-verified.png",
        "page_tag": "FLOWCHART EXPLORER: LIVE GITHUB AGENT • LIGHT MODE",
        "btn_name": "Trace Flowchart Station 1 -> 5",
        "btn_coord": (820, 260),
        "btn_action": "Interactively navigates the 5-step repository architecture and plays spoken voice walkthrough.",
        "invariant": "End-to-End Traceability • Maps raw GitHub commits to AST scanner, fence compiler, and pre-commit gate",
        "subtitle": "Interactive flowchart turns Git commits into a 5-step visual map, explaining each stage aloud in simple terms."
    },
    {
        "stem": "step_11_memory_drawer_light.wav",
        "shot": SHOT_DIR / "03_memory_detail_drawer_light.png",
        "page_tag": "MEMORY: SLIDE-OVER DETAIL DRAWER • LIGHT MODE",
        "btn_name": "Open in Workbench Deep-Link",
        "btn_coord": (1360, 890),
        "btn_action": "Deep-links directly from historical incident INC-9921 back into the exact Monaco Editor line in /studio.",
        "invariant": "Institutional Memory Loop • Connects past postmortems directly to active code editor sessions",
        "subtitle": "Clicking any incident opens a slide-over drawer with one-click deep links back into the Monaco editor."
    },
    {
        "stem": "step_12_settings_light.wav",
        "shot": SHOT_DIR / "04_settings_integrations_light.png",
        "page_tag": "SETTINGS: GATEWAY CUTOVER • LIGHT MODE",
        "btn_name": "Flip Gateway to v2 Cutover",
        "btn_coord": (1240, 580),
        "btn_action": "Toggles active gateway from v1 to v2, triggering automatic zero-downtime fence retirement for obsolete rules.",
        "invariant": "Automatic Fence Expiry • Decommissions temporary fences safely once upstream fixes eliminate root cause",
        "subtitle": "Settings verifies Gnani AI and Supabase credentials. Gateway Version toggle performs instant zero-downtime cutover."
    },
    {
        "stem": "step_13_settings_dark.wav",
        "shot": SHOT_DIR / "04_settings_integrations_dark.png",
        "page_tag": "OFFICIAL GNANI AI CREDITS & VERIFICATION • DARK MODE",
        "btn_name": "Re-Verify Security Boundary",
        "btn_coord": (1240, 410),
        "btn_action": "Audits air-gapped credentials, zero-leak boundary, and certifies 6/6 security protections are enforced.",
        "invariant": "Enterprise Air-Gap Certified • All voice, AST, and token processing runs with zero data leakage",
        "subtitle": "Produced using Gnani AI Flagship Voice Agent Shivani on Timbre v3.0, Graphify AST, and Open Higgsfield AI Cinema Studio."
    }
]


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
    card_w = 520
    card_h = 135

    if bx + card_w > WIDTH - 40:
        bx = x - card_w - 20
    if by + card_h > HEIGHT - 130:
        by = y - card_h - 15
    if by < 90:
        by = 95

    # Glass Card Background (Dark Olive Khaki Surface #1F1F15 with hairline border)
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
    draw.rounded_rectangle([32, 22, 740, 74], radius=14, fill=(28, 28, 18), outline=(84, 83, 51), width=2)
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

    out_png = TMP_DIR / f"frame1080_{idx:02d}_{sc['shot'].stem}.png"
    base.save(out_png, "PNG")
    return out_png


def main():
    print("=" * 70)
    print("WhyLine Studio - 1080p Full-HD Video Assembler (Latest Frontend)")
    print(f"FFmpeg binary: {FFMPEG_EXE}")
    print(f"Target Video:  {OUT_VIDEO}")
    print("=" * 70)

    segment_files = []

    for idx, sc in enumerate(SCENES, start=1):
        stem_path = STEM_DIR / sc["stem"]
        shot_path = sc["shot"]

        if not stem_path.exists():
            print(f"[!] Missing audio stem: {stem_path}")
            continue
        if not shot_path.exists():
            print(f"[!] Missing screenshot: {shot_path}")
            continue

        frame_png = create_1080p_frame(sc, idx)
        seg_mp4 = TMP_DIR / f"seg1080_{idx:02d}.mp4"

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

    concat_list = TMP_DIR / "concat_list_1080p.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for seg in segment_files:
            f.write(f"file '{seg.as_posix()}'\n")

    print("\n[*] Concatenating 13 1080p Full-HD segments into final master video...")
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
    print("\n" + "=" * 70)
    print("SUCCESS: 1080p Full-HD Walkthrough Video Complete!")
    print(f"Output Video: {OUT_VIDEO}")
    print(f"File Size:    {size_mb:.2f} MB")
    print(f"Scenes:       {len(segment_files)} segments concatenated")
    print("=" * 70)


if __name__ == "__main__":
    main()
