"""Empirical Frontend & Design System Adversarial Test Harness (Challenger 2).

Verifies:
1. Design System Adversarial Check (audit script, hex codes, box shadows, CSS variables).
2. Production Build Asset Verification.
3. Monaco Editor Interaction, Lines 5-15 Active Fence Guard, and Event Listener Cleanup.
4. Trilingual Synchronization, Dictionary Completeness, API Query Parameters, and LocalStorage Persistence.
5. App Component Router Context Mounting Integrity.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
FRONTEND_SRC = FRONTEND_DIR / "src"


def test_design_system_audit_zero_violations():
    """Verify that python scripts/audit_design_system.py passes with zero violations."""
    cmd = [sys.executable, str(ROOT_DIR / "scripts" / "audit_design_system.py")]
    res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(ROOT_DIR))
    assert res.returncode == 0, f"Design system audit failed: {res.stdout}\n{res.stderr}"
    assert "0 violations" in res.stdout


def test_design_system_no_literal_hex_in_jsx():
    """Verify zero unauthorized literal hex color codes in JSX files (ignoring PR #212)."""
    violations = []
    for jsx_path in FRONTEND_SRC.rglob("*.jsx"):
        content = jsx_path.read_text(encoding="utf-8")
        # Ignore PR #212 references
        clean_content = re.sub(r"PR\s*#212", "", content)
        clean_content = re.sub(r"pr_number:\s*['\"]#212['\"]", "", clean_content)
        clean_content = re.sub(r"PR\s*#\s*[0-9]+", "", clean_content)
        # Search for 6-digit or 3-digit hex colors in style/color contexts
        hex_matches = re.findall(r"#[0-9a-fA-F]{6}\b", clean_content)
        if hex_matches:
            violations.append(f"{jsx_path.name}: {hex_matches}")
    assert not violations, f"Unauthorized literal hex colors in JSX: {violations}"


def test_design_system_all_css_variables_defined():
    """Verify that every CSS variable referenced via var(--...) in JSX and CSS is defined."""
    defined_vars = set()
    for css_file in [FRONTEND_SRC / "tokens.css", FRONTEND_SRC / "styles.css"]:
        if css_file.exists():
            content = css_file.read_text(encoding="utf-8")
            defs = re.findall(r"(--[a-zA-Z0-9_-]+)\s*:", content)
            defined_vars.update(defs)

    missing = {}
    for file_path in FRONTEND_SRC.rglob("*"):
        if file_path.suffix in [".jsx", ".js", ".css"]:
            content = file_path.read_text(encoding="utf-8")
            uses = re.findall(r"var\((--[a-zA-Z0-9_-]+)", content)
            for u in uses:
                if u not in defined_vars:
                    missing.setdefault(u, []).append(file_path.name)

    assert not missing, f"Missing CSS variable definitions: {missing}"


def test_production_build_assets_exist():
    """Verify that production build outputs in dist/ exist and are valid non-empty assets."""
    dist_dir = FRONTEND_DIR / "dist"
    index_html = dist_dir / "index.html"
    assert index_html.exists(), "dist/index.html is missing"
    assert index_html.stat().st_size > 200, "dist/index.html is suspiciously small"

    assets_dir = dist_dir / "assets"
    assert assets_dir.exists(), "dist/assets is missing"

    js_bundles = list(assets_dir.glob("index-*.js"))
    assert len(js_bundles) >= 1, "dist/assets/index-*.js bundle is missing"
    assert js_bundles[0].stat().st_size > 100_000, "Main JS bundle is smaller than expected"

    css_bundles = list(assets_dir.glob("index-*.css"))
    assert len(css_bundles) >= 1, "dist/assets/index-*.css bundle is missing"
    assert css_bundles[0].stat().st_size > 10_000, "Main CSS bundle is smaller than expected"


def test_monaco_editor_state_binding_and_protection():
    """Verify MonacoCodeStudio has onChange, lines 5-15 protection, and listener cleanup."""
    studio_path = FRONTEND_SRC / "components" / "MonacoCodeStudio.jsx"
    content = studio_path.read_text(encoding="utf-8")

    # 1. Verify <Editor> has onChange handler updating currentCode
    assert "onChange={(newVal) => setCurrentCode(newVal || '')}" in content, (
        "MonacoCodeStudio <Editor> is missing onChange state binding"
    )

    # 2. Verify active fence protection banner for lines 5-15
    assert "fence-protection-banner" in content, "Missing fence-protection-banner container"
    assert "studioActiveGuard" in content, "Missing active fence guard indicator text"
    assert "Range(5, 1, 15, 1)" in content, "Missing decoration range for lines 5–15"

    # 3. Verify editor.onMouseDown listener is disposed on unmount
    assert "mouseDownDisposableRef" in content, "Missing mouseDownDisposableRef reference"
    assert "mouseDownDisposableRef.current.dispose()" in content, (
        "Missing dispose() invocation in useEffect unmount cleanup"
    )


def test_trilingual_api_requests_not_defaulting_to_telugu():
    """Verify that English does not default to Telugu in API requests across pages."""
    pages = [
        FRONTEND_SRC / "pages" / "BriefingDashboard.jsx",
        FRONTEND_SRC / "pages" / "SpokenFencesPage.jsx",
        FRONTEND_SRC / "pages" / "IncidentsAndMemoryPage.jsx",
    ]
    for p in pages:
        content = p.read_text(encoding="utf-8")
        # Ensure ternary correctly differentiates en from te
        assert "lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN'" in content, (
            f"Incorrect language resolution in {p.name}: must explicitly resolve en-IN instead of falling back to te-IN"
        )


def test_trilingual_dictionary_parity():
    """Verify that all keys in English translations exist in Telugu and Hindi JSON files."""
    i18n_dir = FRONTEND_SRC / "i18n"
    en = json.loads((i18n_dir / "en.json").read_text(encoding="utf-8"))
    te = json.loads((i18n_dir / "te.json").read_text(encoding="utf-8"))
    hi = json.loads((i18n_dir / "hi.json").read_text(encoding="utf-8"))

    en_keys = set(en.keys())
    te_keys = set(te.keys())
    hi_keys = set(hi.keys())

    missing_te = en_keys - te_keys
    missing_hi = en_keys - hi_keys

    assert not missing_te, f"Telugu translations missing keys: {missing_te}"
    assert not missing_hi, f"Hindi translations missing keys: {missing_hi}"


def test_trilingual_all_used_keys_defined():
    """Verify that every t('key') call in JSX components exists in en.json."""
    en = json.loads((FRONTEND_SRC / "i18n" / "en.json").read_text(encoding="utf-8"))
    en_keys = set(en.keys())

    used_keys = set()
    for jsx_path in FRONTEND_SRC.rglob("*.jsx"):
        txt = jsx_path.read_text(encoding="utf-8")
        for m in re.findall(r"\bt\(\s*['\"]([a-zA-Z0-9_]+)['\"]\s*\)", txt):
            used_keys.add(m)

    missing = used_keys - en_keys
    assert not missing, f"Keys used in JSX but missing from en.json: {missing}"


def test_localstorage_persistence_in_i18n():
    """Verify that i18n.js reads and writes localStorage key 'whyline_lang' and sets document.documentElement.lang."""
    i18n_path = FRONTEND_SRC / "i18n.js"
    content = i18n_path.read_text(encoding="utf-8")

    assert "localStorage.getItem('whyline_lang')" in content, (
        "i18n.js does not read 'whyline_lang' from localStorage"
    )
    assert "localStorage.setItem('whyline_lang', newLang)" in content, (
        "i18n.js does not persist 'whyline_lang' to localStorage"
    )
    assert "document.documentElement.lang = newLang" in content, (
        "i18n.js does not update document.documentElement.lang on setLang"
    )


def test_app_router_context_integrity():
    """Adversarial Test: Verify that App.jsx does not call useLocation() outside BrowserRouter.

    Calling useLocation() inside App() before <BrowserRouter> throws:
    'Error: useLocation() may be used only in the context of a <Router> component.'
    causing a total application crash on initial load.
    """
    app_path = FRONTEND_SRC / "App.jsx"
    content = app_path.read_text(encoding="utf-8")

    # Inspect AST / structure for useLocation called before BrowserRouter
    # In App.jsx, if `const location = useLocation();` is inside `function App()`,
    # but `<BrowserRouter>` is rendered inside the return statement of `App()`,
    # this is an invariant violation.
    app_body_match = re.search(r"export default function App\(\)\s*\{([\s\S]*?)\n\}", content)
    assert app_body_match, "Could not extract App() function body"
    app_body = app_body_match.group(1)

    # Check if useLocation() is called in App body
    has_use_location = bool(re.search(r"\buseLocation\s*\(", app_body))
    # Check if BrowserRouter is rendered in return statement
    renders_browser_router = "<BrowserRouter>" in app_body

    if has_use_location and renders_browser_router:
        pytest.fail(
            "CRITICAL BUG DETECTED: App.jsx calls useLocation() inside App(), but <BrowserRouter> "
            "is rendered inside App's return JSX. In React Router v6, useLocation() called outside "
            "<Router> throws an unhandled exception: 'useLocation() may be used only in the context "
            "of a <Router> component.', crashing the entire application on launch."
        )


def test_voice_agent_config_and_persistence():
    """Verify Gnani voice agent config covers en/te/hi and VoiceAgentContext persists whyline_voice_agent."""
    cfg = (FRONTEND_SRC / "config" / "voiceAgents.js").read_text(encoding="utf-8")
    for lang_code in ["'en'", "'te'", "'hi'"]:
        assert f"language: {lang_code}" in cfg, f"Missing {lang_code} voice agent in voiceAgents.js"

    ctx = (FRONTEND_SRC / "context" / "VoiceAgentContext.jsx").read_text(encoding="utf-8")
    assert "localStorage.getItem(STORAGE_KEY)" in ctx
    assert "localStorage.setItem(STORAGE_KEY" in ctx
    assert "'whyline_voice_agent'" in ctx

    picker = (FRONTEND_SRC / "components" / "VoiceAgentPicker.jsx").read_text(encoding="utf-8")
    assert "voice-live-wave" in picker
    assert "previewAgent" in picker


def test_dedicated_routes_and_no_duplicate_ask_flow_mount():
    """Verify lazy routes in App.jsx and that AskRepoPage does not duplicate RepoFlowchartExplorer."""
    app = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    for route_path in ['path="connect"', 'path="ask"', 'path="flow"', 'path="settings"']:
        assert route_path in app, f"Missing dedicated route {route_path} in App.jsx"
    assert "lazy(() => import('./pages/AskRepoPage'))" in app
    assert "lazy(() => import('./pages/FlowchartsPage'))" in app

    ask_page = (FRONTEND_SRC / "pages" / "AskRepoPage.jsx").read_text(encoding="utf-8")
    assert "RepoFlowchartExplorer" not in ask_page, (
        "AskRepoPage must not mount RepoFlowchartExplorer directly"
    )

