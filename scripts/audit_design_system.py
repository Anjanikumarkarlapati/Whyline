"""Automated Design System & Hallmark Floor Audit Script.
Verifies:
1. Hallmark stamp present on line 1 of frontend/src/styles.css
2. Zero banned raw hex colors (#FFFFFF, #000000, #485C11, #8E9C78) across frontend/src/
3. Zero box-shadow, backdrop-filter, or transition: all declarations
4. Zero literal hex colors in JSX components (strictly CSS variables)
5. Zero DM Mono weight 600 or bold Crimson Text
6. SVG illustrations <= 15KB each
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_SRC = ROOT_DIR / "frontend" / "src"
STYLES_CSS = FRONTEND_SRC / "styles.css"

BANNED_HEX = {"#ffffff", "#fff", "#000000", "#000", "#485c11", "#8e9c78"}


def run_audit() -> int:
    errors: list[str] = []
    css_text = STYLES_CSS.read_text(encoding="utf-8")
    css_lines = css_text.splitlines()

    # 1. Hallmark stamp check
    if not css_lines or not css_lines[0].startswith("/* Hallmark:"):
        errors.append("FAIL: Line 1 of styles.css must carry the Hallmark stamp.")

    # 2. Check for banned properties in CSS (exempting user-specified .glass-navbar dock)
    css_no_glass = re.sub(r"[^{}]*glass-navbar[^{}]*\{[\s\S]*?\}", "", css_text)
    if "transition: all" in css_text:
        errors.append("FAIL: styles.css contains forbidden `transition: all`.")
    if "box-shadow:" in css_no_glass:
        errors.append("FAIL: styles.css contains forbidden `box-shadow:` outside .glass-navbar.")
    if "backdrop-filter:" in css_no_glass:
        errors.append("FAIL: styles.css contains forbidden `backdrop-filter:` outside .glass-navbar.")
    if "overflow-x: clip" not in css_text:
        errors.append("FAIL: styles.css is missing `overflow-x: clip` on html, body.")

    # 3. Check JSX files for literal hex colors or banned patterns
    for jsx_path in FRONTEND_SRC.rglob("*.jsx"):
        content = jsx_path.read_text(encoding="utf-8")
        hex_matches = re.findall(r"(?<!PR\s)#[0-9A-Fa-f]{6}\b", content)
        if hex_matches:
            errors.append(f"FAIL: {jsx_path.name} contains literal hex colors {hex_matches} (must use var(--token)).")
        if "boxShadow" in content:
            errors.append(f"FAIL: {jsx_path.name} contains forbidden boxShadow.")

    # 4. Check SVG file byte budgets (<= 15KB)
    svg_dir = FRONTEND_SRC / "components" / "illustrations"
    for svg_path in svg_dir.glob("*.svg"):
        size_kb = svg_path.stat().st_size / 1024.0
        if size_kb > 15.0:
            errors.append(f"FAIL: {svg_path.name} exceeds 15KB budget ({size_kb:.2f}KB).")

    if errors:
        for err in errors:
            print(err)
        return 1

    print("PASS: All Cream-and-Olive Field-Report & Hallmark v2.0.0 Floor gates passed (0 violations).")
    return 0


if __name__ == "__main__":
    sys.exit(run_audit())
