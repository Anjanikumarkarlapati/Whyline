"""WhyLine Studio - Senior UI/UX Motion Designer Glassmorphic HUD Showcase
Redesigns and re-renders ONLY the explanatory video overlay elements across all 8 scenes:
- Top-Left Chamfered Scene Status Pill with glowing status dot & 45-degree angled inner edge
- Top-Right Chamfered Action Badge with glowing action indicator & 45-degree angled inner edge
- Interactive Cursor Callout Card with custom notched corner, vector leader line, and left-accent glowing gradient bar (#F59E0B -> #10B981)
- Bottom Tapered Capsule Subtitle Dock with 7-bar mini audio-waveform equalizer & SHIVANI label
- High-contrast typography: Plus Jakarta Sans (semi-bold) & Inter
- Smooth cinematic fade transitions (fade-in / fade-out) at each scene cut
- Preserves underlying product UI and original Gnani AI voiceover exactly
"""
import os
import sys
import wave
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
STEM_DIR = ROOT / "outputs" / "2min_stems"
LATEST_DIR = ROOT / "screenshots" / "latest_frontend"
SHOT_DIR = ROOT / "screenshots"
TMP_DIR = ROOT / "outputs" / "video_tmp_glass"
TMP_DIR.mkdir(parents=True, exist_ok=True)

OUT_2MIN = ROOT / "outputs" / "WhyLine_2Min_Product_Showcase.mp4"
OUT_MASTER = ROOT / "outputs" / "WhyLine_Product_Walkthrough.mp4"

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

WIDTH, HEIGHT = 1920, 1080

# Typography: Plus Jakarta Sans for titles/badges, Inter for descriptions/captions
FONT_PJS_BOLD_22 = ImageFont.truetype(str(ROOT / "PlusJakartaSans.ttf"), 22)
FONT_PJS_BOLD_18 = ImageFont.truetype(str(ROOT / "PlusJakartaSans.ttf"), 18)
FONT_PJS_BOLD_15 = ImageFont.truetype(str(ROOT / "PlusJakartaSans.ttf"), 15)

FONT_INTER_REG_16 = ImageFont.truetype(str(ROOT / "Inter.ttf"), 16)
FONT_INTER_REG_14 = ImageFont.truetype(str(ROOT / "Inter.ttf"), 14)
FONT_INTER_MED_15 = ImageFont.truetype(str(ROOT / "Inter.ttf"), 15)

SCENES = [
    {
        "id": "scene_01",
        "stem": "scene_01_hook_login.wav",
        "shot": SHOT_DIR / "08_login_auth.png",
        "scene_title": "ENTRY GATE: LOGIN & REPO BINDING",
        "scene_mode": "• PAPER LIGHT",
        "action_short": "Enter Workspace",
        "action_full": "Enter Workspace",
        "cursor_pos": (1140, 615),
        "action_desc": "Validates engineer session (@anjani) and mounts HealthConnect repo.",
        "safety_inv": "Zero-Trust Boundary: Enforces credential auth before inspection",
        "caption": "Chesterton's Fence: Never delete code until you know why it was built. Welcome to WhyLine Studio."
    },
    {
        "id": "scene_02",
        "stem": "scene_02_dashboard_ast.wav",
        "shot": LATEST_DIR / "workspace1-explorer-verified.png",
        "scene_title": "WORKSPACE 1: EXPLORER DASHBOARD",
        "scene_mode": "• PAPER LIGHT",
        "action_short": "Scan Repo & Confirm",
        "action_full": "Scan Repo & Confirm FENCE-001",
        "cursor_pos": (1350, 185),
        "action_desc": "Tree-sitter AST scan flags fragile code; locks payment fix.",
        "safety_inv": "PR #212 / INC-9921: retryCount = 5 prevents midnight drops",
        "caption": "Explorer Dashboard detects fragile code via AST scanning. Telemetry tracks active fences and blocked AI breaks."
    },
    {
        "id": "scene_03",
        "stem": "scene_03_spoken_fences_usp.wav",
        "shot": LATEST_DIR / "workspace2-studio-verified.png",
        "scene_title": "WORKSPACE 2: UNIFIED STUDIO & FENCE",
        "scene_mode": "• PAPER LIGHT",
        "action_short": "Record 10s Voice",
        "action_full": "Record 10s Voice on Waveform",
        "cursor_pos": (1380, 395),
        "action_desc": "Captures 10s voice postmortem; auto-compiles JUnit/Pytest.",
        "safety_inv": "Chesterton's Voice Lock: Binds spoken intent to AST SHA-256",
        "caption": "Core Innovation: Spoken Fences. Highlight code, record a 10s voice note, and compile an executable test suite."
    },
    {
        "id": "scene_04",
        "stem": "scene_04_editor_guard_intercept.wav",
        "shot": SHOT_DIR / "02_workbench_fence_dark.png",
        "scene_title": "MONACO CODE STUDIO GUARD",
        "scene_mode": "• KHAKI DARK",
        "action_short": "Line 12 Gutter Pin",
        "action_full": "Line 12 Gutter Pin Badge",
        "cursor_pos": (420, 380),
        "action_desc": "Displays inline security badge; FastMCP hook aborts unsafe edits.",
        "safety_inv": "Line-Level Guardrail: Aborts unauthorized PRs, playing audio",
        "caption": "Monaco Editor highlights protected code. FastMCP pre-commit hook intercepts unsafe edits, playing the voice note."
    },
    {
        "id": "scene_05",
        "stem": "scene_05_ast_rescorer_indic.wav",
        "shot": LATEST_DIR / "r1-stt-executed.png",
        "scene_title": "AST RESCORER: INDIC SPEECH AI",
        "scene_mode": "• PAPER LIGHT",
        "action_short": "Rescore Tokens",
        "action_full": "Rescore Spoken Tokens",
        "cursor_pos": (1220, 340),
        "action_desc": "Translates Telugu/Hindi into exact camelCase variables (94.2%).",
        "safety_inv": "Indic Multilingual Mapping: Bridges spoken intent to AST syntax",
        "caption": "Gnani Vachana AI translates spoken Telugu and Hindi into exact camelCase variables with 94.2% accuracy."
    },
    {
        "id": "scene_06",
        "stem": "scene_06_ask_repo_copilot.wav",
        "shot": LATEST_DIR / "sample-repo-ky-voice-report.png",
        "scene_title": "ASK-THE-REPO ARCHITECTURAL CO-PILOT",
        "scene_mode": "• PAPER LIGHT",
        "action_short": "Push-to-Talk Mic",
        "action_full": "Push-to-Talk Mic Query",
        "cursor_pos": (1350, 240),
        "action_desc": "Queries pgvector HNSW index and Gemini 3.8 reasoning engine.",
        "safety_inv": "Reciprocal Rank Fusion: Blends vector search with AST graph",
        "caption": "Push-to-talk mic activates pgvector and Gemini 3.8 reasoning, returning three ranked risk strategies."
    },
    {
        "id": "scene_07",
        "stem": "scene_07_memory_cutover.wav",
        "shot": SHOT_DIR / "04_settings_integrations_light.png",
        "scene_title": "SETTINGS: ZERO-DOWNTIME CUTOVER",
        "scene_mode": "• PAPER LIGHT",
        "action_short": "Gateway v2 Cutover",
        "action_full": "Flip Gateway to v2 Cutover",
        "cursor_pos": (1240, 580),
        "action_desc": "Toggles gateway to v2; safely retires upstream workarounds.",
        "safety_inv": "Automatic Fence Expiry: Retires fences when root cause resolved",
        "caption": "Memory Ledger links outages to code blame. Toggling Gateway to v2 safely retires obsolete workarounds."
    },
    {
        "id": "scene_08",
        "stem": "scene_08_gnani_credits.wav",
        "shot": SHOT_DIR / "04_settings_integrations_dark.png",
        "scene_title": "OFFICIAL GNANI AI CREDITS & VERIFICATION",
        "scene_mode": "• KHAKI DARK",
        "action_short": "Re-Verify Boundary",
        "action_full": "Re-Verify Security Boundary",
        "cursor_pos": (1240, 410),
        "action_desc": "Audits air-gapped credentials, zero-leak boundary, and speech stack.",
        "safety_inv": "Air-Gap Certified: Zero data leakage across speech & AST pipelines",
        "caption": "Produced using Gnani AI's flagship voice model Shivani on Timbre v3.0, powered by Gnani Vachana AI & Graphify."
    }
]


def make_full_bleed(img: Image.Image) -> Image.Image:
    """Lanczos aspect-fill cropping to 1920x1080 without distortion or letterboxing."""
    scale = max(WIDTH / img.width, HEIGHT / img.height)
    new_w, new_h = int(img.width * scale), int(img.height * scale)
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - WIDTH) // 2
    top = (new_h - HEIGHT) // 2
    return resized.crop((left, top, left + WIDTH, top + HEIGHT))


def draw_glass_polygon(base: Image.Image, pts: list, fill_rgba=(18, 20, 26, 173), border_rgba=(255, 255, 255, 56), shadow_blur=16):
    """Draws a true frosted glassmorphic polygon with backdrop blur, saturation, drop shadow, and inner highlight."""
    min_x = int(min(p[0] for p in pts))
    min_y = int(min(p[1] for p in pts))
    max_x = int(max(p[0] for p in pts))
    max_y = int(max(p[1] for p in pts))

    pad = shadow_blur + 24
    bx0 = max(0, min_x - pad)
    by0 = max(0, min_y - pad)
    bx1 = min(WIDTH, max_x + pad)
    by1 = min(HEIGHT, max_y + pad)
    w = bx1 - bx0
    h = by1 - by0

    local_pts = [(p[0] - bx0, p[1] - by0) for p in pts]

    # 1. Soft Ambient Drop Shadow (0 12px 32px rgba(0, 0, 0, 0.28))
    shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)
    shadow_pts = [(p[0], p[1] + 12) for p in local_pts]
    s_draw.polygon(shadow_pts, fill=(0, 0, 0, 72))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow_blur))

    # 2. Frosted Glass (backdrop-filter: blur(16px) saturate(180%))
    crop_bg = base.crop((bx0, by0, bx1, by1)).convert("RGB")
    crop_bg = ImageEnhance.Color(crop_bg).enhance(1.8)
    blurred_bg = crop_bg.filter(ImageFilter.GaussianBlur(16)).convert("RGBA")

    # 3. Tint layer: rgba(18, 20, 26, 0.68)
    tint = Image.new("RGBA", (w, h), fill_rgba)
    glass = Image.alpha_composite(blurred_bg, tint)

    # 4. Mask with polygon shape
    mask = Image.new("L", (w, h), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.polygon(local_pts, fill=255)

    # 5. Inner top-highlight (1px solid rgba(255, 255, 255, 0.22))
    g_draw = ImageDraw.Draw(glass)
    g_draw.polygon(local_pts, outline=border_rgba, width=1)
    # Highlight top edge
    g_draw.line([(min_x - bx0 + 6, min_y - by0 + 1), (max_x - bx0 - 6, min_y - by0 + 1)], fill=(255, 255, 255, 75), width=1)

    # 6. Composite shadow + glass onto base
    base_rgba = base.convert("RGBA")
    sub_crop = base_rgba.crop((bx0, by0, bx1, by1))
    sub_crop = Image.alpha_composite(sub_crop, shadow_layer)
    sub_crop.paste(glass, (0, 0), mask)
    base.paste(sub_crop.convert("RGB"), (bx0, by0))


def render_scene_frame(sc: dict) -> Path:
    """Assembles a pristine 1080p frame with bespoke asymmetric glass HUDs and high-contrast typography."""
    shot_path = sc["shot"]
    shot = Image.open(shot_path).convert("RGB")
    base = make_full_bleed(shot)

    # =========================================================================
    # 1. TOP-LEFT SCENE STATUS PILL (Chamfered Inner-Right Corner)
    # =========================================================================
    tl_w = 780
    tl_h = 58
    tl_x0, tl_y0 = 40, 28
    tl_x1 = tl_x0 + tl_w
    tl_y1 = tl_y0 + tl_h

    # Asymmetric silhouette: chamfered 45-degree angled edge on inner-right side (24px cut)
    tl_pts = [
        (tl_x0, tl_y0),
        (tl_x1 - 24, tl_y0),
        (tl_x1, tl_y0 + 24),
        (tl_x1, tl_y1),
        (tl_x0, tl_y1)
    ]
    draw_glass_polygon(base, tl_pts)
    draw = ImageDraw.Draw(base)

    # Glowing Status Dot (Cyan / Emerald with outer glow ring)
    dot_cx, dot_cy = tl_x0 + 26, tl_y0 + 29
    draw.ellipse([dot_cx - 10, dot_cy - 10, dot_cx + 10, dot_cy + 10], outline=(16, 185, 129), width=1)
    draw.ellipse([dot_cx - 6, dot_cy - 6, dot_cx + 6, dot_cy + 6], fill=(16, 185, 129))

    # Scene Title (Plus Jakarta Sans, crisp off-white #F8FAFC)
    draw.text((tl_x0 + 48, tl_y0 + 17), sc["scene_title"], fill=(248, 250, 252), font=FONT_PJS_BOLD_18)
    title_w = draw.textlength(sc["scene_title"], font=FONT_PJS_BOLD_18)
    draw.text((tl_x0 + 48 + title_w + 10, tl_y0 + 19), sc["scene_mode"], fill=(148, 163, 184), font=FONT_INTER_MED_15)

    # =========================================================================
    # 2. TOP-RIGHT ACTION BADGE (Chamfered Inner-Left Corner)
    # =========================================================================
    tr_w = 460
    tr_h = 58
    tr_x1 = WIDTH - 40
    tr_x0 = tr_x1 - tr_w
    tr_y0 = 28
    tr_y1 = tr_y0 + tr_h

    # Asymmetric silhouette: chamfered 45-degree angled edge on inner-left side (24px cut)
    tr_pts = [
        (tr_x0 + 24, tr_y0),
        (tr_x1, tr_y0),
        (tr_x1, tr_y1),
        (tr_x0, tr_y1),
        (tr_x0, tr_y0 + 24)
    ]
    draw_glass_polygon(base, tr_pts)
    draw = ImageDraw.Draw(base)

    # Glowing Action Indicator (Amber with glow ring)
    act_cx, act_cy = tr_x0 + 30, tr_y0 + 29
    draw.ellipse([act_cx - 9, act_cy - 9, act_cx + 9, act_cy + 9], outline=(245, 158, 11), width=1)
    draw.ellipse([act_cx - 5, act_cy - 5, act_cx + 5, act_cy + 5], fill=(245, 158, 11))

    # Action Label and Button Target
    draw.text((tr_x0 + 52, tr_y0 + 20), "ACTION:", fill=(148, 163, 184), font=FONT_PJS_BOLD_15)
    draw.text((tr_x0 + 124, tr_y0 + 17), sc["action_short"], fill=(248, 250, 252), font=FONT_PJS_BOLD_18)

    # =========================================================================
    # 3. INTERACTIVE CURSOR & CALLOUT CARD (Custom Notched Corner + Leader Line)
    # =========================================================================
    cx, cy = sc["cursor_pos"]
    card_w = 560
    card_h = 160

    # Dynamic positioning: place left or right of cursor to prevent collision
    if cx > WIDTH // 2:
        bx = cx - card_w - 45
        leader_start = (bx + card_w, cy)
        leader_end = (cx - 16, cy)
    else:
        bx = cx + 55
        leader_start = (bx, cy)
        leader_end = (cx + 24, cy + 10)

    # Clamp vertically inside viewport
    by = max(95, min(cy - 40, HEIGHT - 130 - card_h))

    # Notched polygon: top-right corner chamfered at 45 degrees (22px notch)
    notched_pts = [
        (bx, by),
        (bx + card_w - 22, by),
        (bx + card_w, by + 22),
        (bx + card_w, by + card_h),
        (bx, by + card_h)
    ]
    draw_glass_polygon(base, notched_pts)
    draw = ImageDraw.Draw(base)

    # Sleek Vector Leader Line connecting card to cursor
    anchor_y = max(by + 15, min(cy, by + card_h - 15))
    if cx > WIDTH // 2:
        draw.line([(bx + card_w, anchor_y), (cx - 15, cy - 6)], fill=(245, 158, 11), width=2)
        draw.ellipse([cx - 18, cy - 9, cx - 12, cy - 3], fill=(245, 158, 11))
    else:
        draw.line([(bx, anchor_y), (cx + 20, cy + 8)], fill=(245, 158, 11), width=2)
        draw.ellipse([cx + 17, cy + 5, cx + 23, cy + 11], fill=(245, 158, 11))

    # Distinct left-accent glowing gradient bar (#F59E0B -> #10B981)
    for i in range(card_h - 6):
        t = i / float(card_h - 6)
        r = int(245 * (1 - t) + 16 * t)
        g = int(158 * (1 - t) + 185 * t)
        b = int(11 * (1 - t) + 129 * t)
        draw.line([(bx + 3, by + 3 + i), (bx + 7, by + 3 + i)], fill=(r, g, b), width=1)

    # Row 1: Click Target Header Chip + Button Name
    draw.rectangle([bx + 20, by + 16, bx + 130, by + 40], fill=(245, 158, 11, 40), outline=(245, 158, 11))
    draw.text((bx + 28, by + 20), "CLICK TARGET", fill=(245, 158, 11), font=FONT_INTER_MED_15)
    draw.text((bx + 145, by + 18), sc["action_full"][:36], fill=(248, 250, 252), font=FONT_PJS_BOLD_18)

    # Row 2: Action Pill + Description
    draw.rectangle([bx + 20, by + 56, bx + 84, by + 78], fill=(16, 185, 129, 45), outline=(16, 185, 129))
    draw.text((bx + 28, by + 59), "Action", fill=(52, 211, 153), font=FONT_INTER_REG_14)
    draw.text((bx + 96, by + 58), sc["action_desc"][:58], fill=(226, 232, 240), font=FONT_INTER_REG_16)

    # Row 3: Safety Pill + Invariant Guard
    draw.rectangle([bx + 20, by + 98, bx + 84, by + 120], fill=(6, 182, 212, 45), outline=(6, 182, 212))
    draw.text((bx + 28, by + 101), "Safety", fill=(103, 232, 249), font=FONT_INTER_REG_14)
    draw.text((bx + 96, by + 100), sc["safety_inv"][:58], fill=(148, 163, 184), font=FONT_INTER_REG_14)

    # Cursor & Concentric Pulsing Ripple at (cx, cy)
    draw.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], outline=(245, 158, 11), width=2)
    draw.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], outline=(255, 255, 255), width=2)
    draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(245, 158, 11))

    # Sleek Modern Cursor Arrow
    cursor_pts = [(cx, cy), (cx, cy + 26), (cx + 7, cy + 20), (cx + 16, cy + 28), (cx + 21, cy + 24), (cx + 12, cy + 16), (cx + 21, cy + 15)]
    draw.polygon([(p[0] + 2, p[1] + 2) for p in cursor_pts], fill=(15, 15, 10))
    draw.polygon(cursor_pts, fill=(255, 255, 255), outline=(30, 30, 20), width=2)

    # =========================================================================
    # 4. BOTTOM TAPERED CAPSULE SUBTITLE DOCK (Softly Tapered Flanks)
    # =========================================================================
    bot_w = WIDTH - 260
    bot_x0 = 130
    bot_y0 = HEIGHT - 110
    bot_x1 = bot_x0 + bot_w
    bot_y1 = bot_y0 + 82

    # Asymmetric / Tapered capsule polygon with 20px chamfered corners
    taper_pts = [
        (bot_x0 + 20, bot_y0),
        (bot_x1 - 20, bot_y0),
        (bot_x1, bot_y0 + 20),
        (bot_x1, bot_y1 - 20),
        (bot_x1 - 20, bot_y1),
        (bot_x0 + 20, bot_y1),
        (bot_x0, bot_y1 - 20),
        (bot_x0, bot_y0 + 20)
    ]
    draw_glass_polygon(base, taper_pts)
    draw = ImageDraw.Draw(base)

    # Integrated Mini Equalizer Audio-Waveform (7 vertical bars with rounded caps)
    eq_bars = [10, 22, 32, 18, 36, 26, 14]
    eq_x = bot_x0 + 36
    mid_y = bot_y0 + 41
    for idx, b_h in enumerate(eq_bars):
        bx_pos = eq_x + idx * 8
        t = idx / 6.0
        r = int(16 * (1 - t) + 245 * t)
        g = int(185 * (1 - t) + 158 * t)
        b = int(129 * (1 - t) + 11 * t)
        draw.rounded_rectangle([bx_pos, mid_y - b_h // 2, bx_pos + 4, mid_y + b_h // 2], radius=2, fill=(r, g, b))

    # Speaker Label & Model
    draw.text((bot_x0 + 104, bot_y0 + 18), "SHIVANI", fill=(248, 250, 252), font=FONT_PJS_BOLD_18)
    draw.text((bot_x0 + 195, bot_y0 + 20), "• timbre-v3.0 (Gnani AI Flagship)", fill=(148, 163, 184), font=FONT_INTER_MED_15)

    # Subtitle Text (Crisp #F8FAFC in Inter)
    draw.text((bot_x0 + 104, bot_y0 + 46), sc["caption"], fill=(248, 250, 252), font=FONT_INTER_REG_16)

    out_png = TMP_DIR / f"glass_frame_{sc['id']}.png"
    base.save(out_png, "PNG")
    return out_png


def main():
    print("=" * 70)
    print("WhyLine Studio - Senior UI/UX Glassmorphic HUD Video Assembler")
    print(f"FFmpeg binary: {FFMPEG_EXE}")
    print(f"Output Video:  {OUT_2MIN}")
    print("=" * 70)

    segment_files = []

    for idx, sc in enumerate(SCENES, start=1):
        stem_path = STEM_DIR / sc["stem"]
        if not stem_path.exists():
            print(f"[!] Missing audio stem: {stem_path}")
            sys.exit(1)

        # Get exact audio duration
        with wave.open(str(stem_path), "rb") as w:
            dur = w.getnframes() / float(w.getframerate())

        print(f"[*] Rendering Scene {idx}/8: {sc['scene_title']} ({dur:.2f}s)...")
        frame_png = render_scene_frame(sc)
        seg_mp4 = TMP_DIR / f"glass_seg_{idx:02d}.mp4"

        # Smooth cinematic fade transition: 0.35s fade-in, 0.35s fade-out at scene cut
        fade_out_st = max(0.0, dur - 0.35)
        vf_filter = f"fade=t=in:st=0:d=0.35,fade=t=out:st={fade_out_st:.2f}:d=0.35"

        cmd = [
            FFMPEG_EXE, "-y",
            "-loop", "1",
            "-i", str(frame_png),
            "-i", str(stem_path),
            "-vf", vf_filter,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "17",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "44100",
            "-shortest",
            str(seg_mp4)
        ]

        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if res.returncode != 0:
            print(f"[ERROR] Scene {idx} failed:\n{res.stderr.decode('utf-8', errors='ignore')}")
            sys.exit(1)
        segment_files.append(seg_mp4)

    concat_list = TMP_DIR / "concat_list_glass.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for seg in segment_files:
            f.write(f"file '{seg.as_posix()}'\n")

    print("\n[*] Concatenating 8 glassmorphic segments into final master video...")
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

    # Mirror to Walkthrough destination
    shutil.copyfile(OUT_2MIN, OUT_MASTER)

    size_mb = OUT_2MIN.stat().st_size / (1024 * 1024)
    print("\n" + "=" * 70)
    print("SUCCESS: Glassmorphic HUD 2-Minute Product Showcase Complete!")
    print(f"Output Video:  {OUT_2MIN}")
    print(f"Master Mirror: {OUT_MASTER}")
    print(f"File Size:     {size_mb:.2f} MB")
    print("=" * 70)


if __name__ == "__main__":
    main()
