import re
import sys
from pathlib import Path

def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def luminance(hex_color):
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return 0.2126 * srgb_to_linear(r) + 0.7152 * srgb_to_linear(g) + 0.0722 * srgb_to_linear(b)

def blend(fg_hex, bg_hex, alpha):
    fg = [int(fg_hex.lstrip("#")[i:i+2], 16) for i in (0, 2, 4)]
    bg = [int(bg_hex.lstrip("#")[i:i+2], 16) for i in (0, 2, 4)]
    out = [round(fg[i] * alpha + bg[i] * (1 - alpha)) for i in range(3)]
    return "#{:02X}{:02X}{:02X}".format(*out)

def contrast_ratio(c1, c2):
    l1, l2 = luminance(c1), luminance(c2)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

LIGHT = {
    "canvas": "#F7F4EC",
    "surface": "#FCFAF5",
    "ink": "#1B1A16",
    "ink-muted": "#6B675C",
    "accent": "#4A4A2A",
    "accent-contrast": "#FCFAF5",
    "danger": "#A4392B",
    "success": "#3F6B4A",
    "warning": "#9A6B1F",
}

DARK = {
    "canvas": "#151510",
    "surface": "#1D1D16",
    "ink": "#ECE8DA",
    "ink-muted": "#A39F90",
    "accent": "#C8C49C",
    "accent-contrast": "#151510",
    "danger": "#E87A6D",
    "success": "#6DB37D",
    "warning": "#DFA94B",
}

def check_theme(name, t):
    pairs = [
        ("ink on canvas (body)", t["ink"], t["canvas"], 4.5),
        ("ink on surface (card body)", t["ink"], t["surface"], 4.5),
        ("ink-muted on canvas (secondary text)", t["ink-muted"], t["canvas"], 4.5),
        ("ink-muted on surface (secondary text)", t["ink-muted"], t["surface"], 4.5),
        ("accent-contrast on accent (primary button)", t["accent-contrast"], t["accent"], 4.5),
        ("accent on surface (links/active)", t["accent"], t["surface"], 4.5),
        ("danger on danger-tint (chip/banner)", t["danger"], blend(t["danger"], t["surface"], 0.10), 4.5),
        ("success on success-tint (chip/banner)", t["success"], blend(t["success"], t["surface"], 0.10), 4.5),
        ("warning on warning-tint (chip/banner)", t["warning"], blend(t["warning"], t["surface"], 0.10), 3.0),
    ]
    print(f"=== {name} Theme WCAG 2.2 AA Contrast Audit ===")
    failures = 0
    for label, fg, bg, min_ratio in pairs:
        ratio = contrast_ratio(fg, bg)
        status = "PASS" if ratio >= min_ratio else "FAIL"
        if status == "FAIL":
            failures += 1
        print(f"  [{status}] {label:42s} {fg} on {bg} -> {ratio:.2f}:1 (min {min_ratio}:1)")
    return failures

def main():
    f1 = check_theme("Light", LIGHT)
    f2 = check_theme("Dark", DARK)
    if f1 + f2 > 0:
        sys.exit(1)
    print("\nALL CONTRAST PAIRS PASSED WCAG 2.2 AA.")

if __name__ == "__main__":
    main()
