from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont
from pathlib import Path
import math

ROOT = Path(".")
shot_path = ROOT / "screenshots" / "latest_frontend" / "workspace1-explorer-verified.png"
out_test = ROOT / "outputs" / "test_glass_hud.png"

WIDTH, HEIGHT = 1920, 1080

# Load Fonts
FONT_PJS_BOLD_22 = ImageFont.truetype("PlusJakartaSans.ttf", 22)
FONT_PJS_BOLD_18 = ImageFont.truetype("PlusJakartaSans.ttf", 18)
FONT_PJS_BOLD_15 = ImageFont.truetype("PlusJakartaSans.ttf", 15)
FONT_INTER_REG_16 = ImageFont.truetype("Inter.ttf", 16)
FONT_INTER_REG_14 = ImageFont.truetype("Inter.ttf", 14)
FONT_INTER_MED_15 = ImageFont.truetype("Inter.ttf", 15)

def make_full_bleed(img):
    scale = max(WIDTH / img.width, HEIGHT / img.height)
    new_w, new_h = int(img.width * scale), int(img.height * scale)
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - WIDTH) // 2
    top = (new_h - HEIGHT) // 2
    return resized.crop((left, top, left + WIDTH, top + HEIGHT))

def draw_glass_polygon(base, pts, fill_rgba=(18, 20, 26, 175), border_rgba=(255, 255, 255, 56), shadow_blur=16):
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

    # 1. Ambient Drop Shadow (0 12px 32px rgba(0,0,0,0.28))
    shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)
    shadow_pts = [(p[0], p[1] + 12) for p in local_pts]
    s_draw.polygon(shadow_pts, fill=(0, 0, 0, 72))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow_blur))

    # 2. Frosted Glass (blur 16px, saturate 180%)
    crop_bg = base.crop((bx0, by0, bx1, by1)).convert("RGB")
    crop_bg = ImageEnhance.Color(crop_bg).enhance(1.8)
    blurred_bg = crop_bg.filter(ImageFilter.GaussianBlur(16)).convert("RGBA")

    tint = Image.new("RGBA", (w, h), fill_rgba)
    glass = Image.alpha_composite(blurred_bg, tint)

    # 3. Mask
    mask = Image.new("L", (w, h), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.polygon(local_pts, fill=255)

    # 4. Subtle inner highlight and borders
    g_draw = ImageDraw.Draw(glass)
    g_draw.polygon(local_pts, outline=border_rgba, width=1)
    
    # 1px top highlight
    g_draw.line([(min_x - bx0 + 6, min_y - by0 + 1), (max_x - bx0 - 6, min_y - by0 + 1)], fill=(255, 255, 255, 75), width=1)

    # 5. Paste onto base
    base_rgba = base.convert("RGBA")
    sub_crop = base_rgba.crop((bx0, by0, bx1, by1))
    sub_crop = Image.alpha_composite(sub_crop, shadow_layer)
    sub_crop.paste(glass, (0, 0), mask)
    base.paste(sub_crop.convert("RGB"), (bx0, by0))

shot = Image.open(shot_path).convert("RGB")
base = make_full_bleed(shot)

# 1. Top-Left Chamfered Badge
tl_pts = [(40, 28), (760, 28), (786, 54), (786, 84), (40, 84)]
draw_glass_polygon(base, tl_pts)
draw = ImageDraw.Draw(base)
# Glowing Status Dot (Cyan / Emerald)
draw.ellipse([64, 48, 76, 60], fill=(16, 185, 129))
draw.ellipse([60, 44, 80, 64], outline=(16, 185, 129), width=1)
draw.text((94, 44), "WORKSPACE 1: EXPLORER DASHBOARD", fill=(248, 250, 252), font=FONT_PJS_BOLD_18)
draw.text((540, 47), "• PAPER LIGHT", fill=(148, 163, 184), font=FONT_INTER_MED_15)

# 2. Top-Right Chamfered Action Badge
tr_pts = [(WIDTH - 500, 54), (WIDTH - 476, 28), (WIDTH - 40, 28), (WIDTH - 40, 84), (WIDTH - 500, 84)]
draw_glass_polygon(base, tr_pts)
draw = ImageDraw.Draw(base)
draw.ellipse([WIDTH - 468, 48, WIDTH - 456, 60], fill=(245, 158, 11))
draw.ellipse([WIDTH - 472, 44, WIDTH - 452, 64], outline=(245, 158, 11), width=1)
draw.text((WIDTH - 440, 47), "ACTION:", fill=(148, 163, 184), font=FONT_PJS_BOLD_15)
draw.text((WIDTH - 365, 45), "Scan Repo & Confirm", fill=(248, 250, 252), font=FONT_PJS_BOLD_18)

# 3. Interactive Cursor & Callout Card
cx, cy = 1350, 185
card_w, card_h = 560, 160
bx, by = cx - card_w - 40, cy - 20
notched_pts = [
    (bx, by),
    (bx + card_w - 22, by),
    (bx + card_w, by + 22),
    (bx + card_w, by + card_h),
    (bx, by + card_h)
]
draw_glass_polygon(base, notched_pts)
draw = ImageDraw.Draw(base)

# Vector leader line connecting card to cursor
draw.line([(bx + card_w, by + 35), (cx - 15, cy - 8)], fill=(245, 158, 11), width=2)
draw.ellipse([cx - 18, cy - 11, cx - 12, cy - 5], fill=(245, 158, 11))

# Gradient accent bar on left edge
for i in range(card_h - 6):
    t = i / float(card_h - 6)
    r = int(245 * (1 - t) + 16 * t)
    g = int(158 * (1 - t) + 185 * t)
    b = int(11 * (1 - t) + 129 * t)
    draw.line([(bx + 3, by + 3 + i), (bx + 7, by + 3 + i)], fill=(r, g, b), width=1)

# Card text hierarchy
draw.rectangle([bx + 20, by + 16, bx + 130, by + 40], fill=(245, 158, 11, 40), outline=(245, 158, 11))
draw.text((bx + 28, by + 20), "CLICK TARGET", fill=(245, 158, 11), font=FONT_INTER_MED_15)
draw.text((bx + 145, by + 18), "Scan Repo & Confirm FENCE-001", fill=(248, 250, 252), font=FONT_PJS_BOLD_18)

# Action pill + text
draw.rectangle([bx + 20, by + 56, bx + 84, by + 78], fill=(16, 185, 129, 45), outline=(16, 185, 129))
draw.text((bx + 28, by + 59), "Action", fill=(52, 211, 153), font=FONT_INTER_REG_14)
draw.text((bx + 96, by + 58), "Tree-sitter AST scan flags fragile code; locks payment fix.", fill=(226, 232, 240), font=FONT_INTER_REG_16)

# Safety pill + text
draw.rectangle([bx + 20, by + 98, bx + 84, by + 120], fill=(6, 182, 212, 45), outline=(6, 182, 212))
draw.text((bx + 28, by + 101), "Safety", fill=(103, 232, 249), font=FONT_INTER_REG_14)
draw.text((bx + 96, by + 100), "PR #212 / INC-9921: retryCount = 5 prevents packet drops", fill=(148, 163, 184), font=FONT_INTER_REG_14)

# Cursor & Pulsing Ripple at (cx, cy)
draw.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], outline=(245, 158, 11), width=2)
draw.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], outline=(255, 255, 255), width=2)
draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(245, 158, 11))

# Mouse cursor arrow
cursor_pts = [(cx, cy), (cx, cy + 26), (cx + 7, cy + 20), (cx + 16, cy + 28), (cx + 21, cy + 24), (cx + 12, cy + 16), (cx + 21, cy + 15)]
draw.polygon([(p[0] + 2, p[1] + 2) for p in cursor_pts], fill=(15, 15, 10))
draw.polygon(cursor_pts, fill=(255, 255, 255), outline=(30, 30, 20), width=2)

# 4. Bottom Tapered Capsule Subtitle Dock
bot_w = WIDTH - 260
bot_x0 = 130
bot_y0 = HEIGHT - 110
bot_x1 = bot_x0 + bot_w
bot_y1 = bot_y0 + 82
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

# Mini Equalizer Audio Waveform (7 bars)
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

draw.text((bot_x0 + 104, bot_y0 + 18), "SHIVANI", fill=(248, 250, 252), font=FONT_PJS_BOLD_18)
draw.text((bot_x0 + 195, bot_y0 + 20), "• timbre-v3.0 (Gnani AI Flagship)", fill=(148, 163, 184), font=FONT_INTER_MED_15)

subtitle_text = "Explorer Dashboard detects fragile code via AST scanning. Telemetry tracks active fences and blocked AI breaks."
draw.text((bot_x0 + 104, bot_y0 + 46), subtitle_text, fill=(248, 250, 252), font=FONT_INTER_REG_16)

base.save(out_test)
print("Saved test frame to:", out_test)
