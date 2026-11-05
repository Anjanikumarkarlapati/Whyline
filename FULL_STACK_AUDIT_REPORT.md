# WhyLine Studio — Comprehensive System Audit & Full-Stack Language Synchronization Report

**Audit Date:** November 2, 2026  
**Auditor:** Independent Verification Auditor (Antigravity Agent)  
**Target Repository:** `Whyline` (`c:\Users\anjan\Downloads\Whyline`)  
**Scope:** Full-stack code quality, security vulnerabilities, automated test suite verification, and end-to-end multilingual synchronization across Frontend UI, Backend APIs, and Voice Agent pipelines.

---

## Executive Summary

WhyLine Studio implements an AST anomaly guardrail and spoken fence architecture designed to prevent AI coding agents from silently reverting undocumented workarounds. The system integrates Tree-sitter AST analysis, FastMCP pre-commit interception, Gnani Vachana Indic speech synthesis/recognition (Telugu, Hindi, English), and Supabase pgvector hybrid Reciprocal Rank Fusion (RRF).

Following an independent verification audit, this report corrects previous analysis gaps, reconciles test suite diagnostic claims, and documents **5 security vulnerabilities**, **7 code bugs & logic defects**, and a **systemic full-stack language desynchronization defect**.

### Key Findings & Corrections from Prior Attempt
1. **Test Suite Execution Status**: When executed properly via `python -m pytest`, **286 tests passed and only 1 test failed** (out of 287 items). The 2 latency-dependent RRF assertions (`< 50.0 ms`) that failed in the prior run passed in this run, confirming they are **intermittent timing-sensitive assertions** on CPU rather than persistent broken logic. The sole deterministic logic failure is a double-quote assumption in `test_adversarial_challenge_m2.py`.
2. **Prior Claim Correction on Gnani API**: The prior report erroneously claimed `GNANI_API_KEY` was unset/empty in `.env`. In reality, `.env` Line 23 contains a configured live key (`GNANI_API_KEY=vach_...`), and all 7 live integration tests in `test_live_api.py` passed against live Gnani and Gemini services. `SUPABASE_URL` is the only service that remains unconfigured (Line 10 is empty), explaining the fallback mode for pgvector.
3. **Full-Stack Language Desynchronization**: Changing the language in the UI is held strictly in volatile React state (`useState('en')`), completely resetting to English on page reload. Multiple core components (`GitFlowchartPage`, `MonacoCodeStudio`, `ScorecardWidget`, `StatusBadge`, `InteractiveFlowchartSvg`) lack i18n hooks entirely. Frontend API handlers contain a ternary logic inversion (`lang === 'hi' ? 'hi-IN' : 'te-IN'`) that forces English users into Telugu requests. In the backend, fallback strategy cards and Gemini prompt requirements only produce English strategies, and speech synthesis attempts to speak English responses using Telugu/Hindi phonemes.

---

## 1. Automated Test Suite Execution & Diagnostics

### 1.1 Test Suite Run Results

- **Direct `pytest` invocation**:
  ```text
  rootdir: C:\Users\anjan\Downloads\Whyline
  configfile: pytest.ini
  collected 194 items / 7 errors
  E ModuleNotFoundError: No module named 'backend'
  ```
  **Root Cause:** Bare `pytest` fails immediately during collection across all 7 test modules because `pythonpath = .` is omitted from `pytest.ini`.

- **Module `python -m pytest` invocation**:
  ```text
  collected 287 items
  FAILED backend/tests/test_adversarial_challenge_m2.py::test_execute_check_staged_allows_expired_fence_when_config_upgraded
  ============ 1 failed, 286 passed, 4 warnings in 249.27s (0:04:09) ============
  ```

### 1.2 Identified Test Failures & Root Cause Analysis

#### Failure 1 (Deterministic): `backend/tests/test_adversarial_challenge_m2.py::test_execute_check_staged_allows_expired_fence_when_config_upgraded`
- **Location:** [`backend/tests/test_adversarial_challenge_m2.py#L292`](file:///c:/Users/anjan/Downloads/Whyline/backend/tests/test_adversarial_challenge_m2.py#L292) and [`#L299`](file:///c:/Users/anjan/Downloads/Whyline/backend/tests/test_adversarial_challenge_m2.py#L299)
  *(Note: Prior report cited Line 36, which is actually `HEALTHCONNECT_DIR` definition; the defect is on Line 292)*
- **Assertion Failure:** `AssertionError: Expected EXPIRED_SAFE_TO_REMOVE, got PENDING_CONFIRMATION`
- **Root Cause:** Line 292 executes:
  ```python
  upgraded_cfg = original_cfg.replace('version: "v1"', 'version: "v2"')
  ```
  However, [`demo-repos/HealthConnect/config/application.yml#L6`](file:///c:/Users/anjan/Downloads/Whyline/demo-repos/HealthConnect/config/application.yml#L6) specifies:
  ```yaml
        version: v1
  ```
  Because `version: v1` is unquoted, `.replace()` performs 0 substitutions. The file remains `v1`, so `store.get_fences()` never triggers the expiry condition (`gateway.version == 'v2'`), keeping `FENCE-001` in `PENDING_CONFIRMATION`.
- **Remediation:** Support both quoted and unquoted YAML entries using regex:
  ```python
  upgraded_cfg = re.sub(r'version:\s*"?v1"?', 'version: "v2"', original_cfg)
  ```

#### Intermittent Timing Assertions (Passed in this run, but CPU-Flaky):
1. **`backend/tests/test_whyline_engine.py::test_end_to_end_90s_demo_lifecycle_via_api`** ([Line 103](file:///c:/Users/anjan/Downloads/Whyline/backend/tests/test_whyline_engine.py#L103))
2. **`tests/e2e/test_tier3_combinations.py::test_tier3_rag_query_to_rrf_to_gemini_strategies`** ([Line 105](file:///c:/Users/anjan/Downloads/Whyline/tests/e2e/test_tier3_combinations.py#L105))
- **Assertion:** `assert copilot_resp["rrf_telemetry"]["latency_ms"] < 50.0`
- **Analysis:** These tests enforce a strict 50.0ms ceiling on MiniLM sentence embeddings and RRF fusion. On warm caches or unloaded CPUs, latency is ~20–45ms (passing). On cold CPU starts, latency peaks between 100–195ms, triggering intermittent failures.
- **Remediation:** Increase test assertion threshold to `< 250.0` ms for non-GPU developer environments, or warm up the embedding model in a session fixture.

---

## 2. Security Vulnerabilities Assessment

| ID | Title | Severity | CWE | File & Line References | Impact Assessment |
|---|---|---|---|---|---|
| **VULN-01** | CORS Wildcard with Credentials Allowed | **High** | CWE-942 | [`backend/app.py#L43-L49`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L43-L49) | `allow_origins=["*"]` combined with `allow_credentials=True` violates W3C Fetch specifications and allows arbitrary web origins to execute cross-origin requests against session endpoints. |
| **VULN-02** | Arbitrary Directory Traversal in Git Scanner | **High** | CWE-22, CWE-200 | [`backend/app.py#L363-L375`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L363-L375), [`backend/whyline/git_scanner.py#L641-L648`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/git_scanner.py#L641-L648) | `target_path_or_url` is resolved with `Path(target_input).resolve()` without boundary containment. Any directory on the filesystem (e.g. `C:\Users\username\.ssh`, `C:\Windows`) is scanned, exposing file trees, SLOC metrics, and file names. |
| **VULN-03** | Command Argument Injection in `git clone` via Branch | **High** | CWE-88 | [`backend/whyline/git_scanner.py#L619-L629`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/git_scanner.py#L619-L629) | `branch` from `GitScanRequest` is passed directly into `subprocess.run(["git", "clone", "--branch", branch, ...])`. A branch argument starting with `--upload-pack=` or `--config=core.sshCommand=` causes command execution. |
| **VULN-04** | Remote Protocol Smuggling & SSRF via Git `ext::` Transport | **High** | CWE-918, CWE-78 | [`backend/whyline/git_scanner.py#L63-L75`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/git_scanner.py#L63-L75), [`#L611`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/git_scanner.py#L611) | `_is_remote_url` accepts any string matching `"github.com/"` anywhere in the URL. URLs using `ext::` protocol bypass the character blacklist (which checks only `;`, `\|`, `&`, `$`, `` ` ``, `\n`, `\r`), allowing Git remote helper execution. |
| **VULN-05** | Unauthenticated Arbitrary Audio Synthesis & Disk Fill (DoS) | **Medium** | CWE-400 | [`backend/app.py#L396-L406`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L396-L406), [`#L390-L394`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L390-L394) | `GET /api/audio/{filename}` automatically synthesizes a new WAV audio file and saves it to disk whenever `not wav_path.exists()`. An unauthenticated attacker requesting random filenames can flood CPU and exhaust disk storage. |

---

## 3. Code Bugs & Logic Defects

### 3.1 Systematic Language Inversion Bug in Frontend Handlers
- **Files & Lines:**
  - [`frontend/src/pages/BriefingDashboard.jsx#L66`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/BriefingDashboard.jsx#L66)
  - [`frontend/src/pages/SpokenFencesPage.jsx#L83`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/SpokenFencesPage.jsx#L83)
  - [`frontend/src/pages/IncidentsAndMemoryPage.jsx#L70`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/IncidentsAndMemoryPage.jsx#L70)
- **Defective Pattern:**
  ```javascript
  language: lang === 'hi' ? 'hi-IN' : 'te-IN'
  ```
- **Impact:** For English users (`lang === 'en'`), `lang === 'hi'` evaluates to `false`, defaulting to `'te-IN'`. All English user confirmations, incident postmortems, and demo actions are transmitted to backend services as Telugu.
- **Remediation:** Centralize BCP-47 conversion in `i18n.js`:
  ```javascript
  export const toBcp47 = (lang) => (lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN');
  ```

### 3.2 FastMCP Server `check_fences` Ignores `proposed_diff`
- **Location:** [`backend/whyline/mcp_server.py#L23-L90`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/mcp_server.py#L23-L90)
- **Defect:** `check_fences(file_path: str, proposed_diff: str = "")` accepts `proposed_diff` but never inspects its hunks or line numbers. An AI agent modifying line 150 of `GatewayRouter.java` (completely outside the guarded lines 5–15 fence) is unconditionally blocked with a hard intercept.
- **Remediation:** Parse hunk headers in `proposed_diff` (e.g. `@@ -s,l +s,l @@`) to verify whether modified lines intersect `[fence.start_line, fence.end_line]`.

### 3.3 FastMCP False Positive File Matching on Basename
- **Locations:** [`backend/whyline/mcp_server.py#L36`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/mcp_server.py#L36), [`backend/whyline/cli_and_hooks.py#L142`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/cli_and_hooks.py#L142)
- **Defect:** The matching logic contains: `Path(norm_target).name == Path(f_norm).name`. Editing an unmonitored file named `GatewayRouter.java` in an unrelated test or scratch directory triggers an immediate false-positive `REJECT_EDIT`.
- **Remediation:** Match path suffixes relative to the repository root instead of comparing bare filenames.

### 3.4 AST Scanner Deduplication Silently Drops Secondary Anomalies
- **Location:** [`backend/whyline/ast_scanner.py#L178-L180`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/ast_scanner.py#L178-L180)
- **Defect:**
  ```python
  ast_hash = compute_ast_signature_hash(rel_path, cls_name, fn_name, params)
  if any(a.ast_signature_hash == ast_hash for a in found):
      return
  ```
  Because `ast_hash` is computed exclusively from `(rel_path, cls_name, fn_name, params)`, if a single method contains both `Thread.sleep` and a magic retry count or swallowed exception, only the first anomaly is recorded; all subsequent anomalies in the same function are silently ignored.
- **Remediation:** Include `anomaly_type` and line number in the anomaly deduplication signature.

### 3.5 Hardcoded Navigation Label in Layout
- **Location:** [`frontend/src/components/Layout.jsx#L74`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/Layout.jsx#L74)
- **Defect:** `{ to: '/git', label: 'Git Flowchart', icon: Code }` hardcodes English text, while all other navigation links consume `t(...)`.
- **Remediation:** Use `t('navGitFlowchart')` and define it in `TRANSLATIONS`.

### 3.6 Dual Function Name Shadowing Collision
- **Locations:** [`backend/whyline/ast_scanner.py#L368`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/ast_scanner.py#L368) vs [`backend/whyline/git_scanner.py#L600`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/git_scanner.py#L600)
- **Defect:** Both modules export `scan_repository` with conflicting signatures (`(repo_dir: Path) -> list[AstAnomaly]` vs `(target_path_or_url: str, ...) -> dict`). Importing one shadows the other in caller modules.
- **Remediation:** Rename the AST scanner function to `scan_repo_ast_anomalies`.

### 3.7 Deprecated FastAPI Startup Event Handler
- **Location:** [`backend/app.py#L113-L117`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L113-L117)
- **Defect:** Uses deprecated `@app.on_event("startup")` which triggers Starlette deprecation warnings.
- **Remediation:** Migrate to modern `@asynccontextmanager async def lifespan(app: FastAPI)` lifecycle management.

---

## 4. Full-Stack Language Synchronization Analysis

### 4.1 Architecture & Propagation Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             FULL-STACK LANGUAGE DESYNC                           │
└──────────────────────────────────────────────────────────────────────────────────┘
  [User Changes Language in Top Navbar] -> setLang('te' / 'hi')
    │
    ├──> ❌ Volatile React State: No localStorage persistence; resets to 'en' on refresh
    │
    ├──> ❌ Layout Navigation: '/git' tab label hardcoded as 'Git Flowchart'
    │
    ├──> ❌ GitFlowchartPage: Has its own isolated `lang` state ('en-IN'); ignores I18nContext!
    │
    ├──> ❌ MonacoCodeStudio: Zero i18n hooks; gutter hover message & all 10+ panel strings remain English
    │
    ├──> ❌ ScorecardWidget & SVG: Zero i18n hooks; 5 metric labels and SVG states remain English
    │
    ├──> ❌ Preset & Transliteration Defaults:
    │    - VoiceCoPilot preset buttons inject hardcoded English strings into question input
    │    - SpokenFences & Incidents default textarea value remains hardcoded Telugu transliteration
    │
    ├──> ❌ Frontend API Handlers (Briefing, Fences, Incidents):
    │    - English users trigger `lang === 'hi' ? 'hi-IN' : 'te-IN'` -> sent to backend as te-IN!
    │
    ├──> ❌ Backend /api/copilot/ask RAG Service:
    │    - Spoken reply translated to Telugu/Hindi, BUT strategy array returned by fallback
    │      and Gemini is 100% hardcoded in English
    │
    └──> ❌ Voice Agent & Speech Synthesis:
         - Browser TTS speaks English response using `te-IN` / `hi-IN` phonemes -> corrupted audio
```

### 4.2 Comprehensive Component-by-Component Desynchronization Matrix

| Layer / Component | File & Lines | Current Behavior on Language Change | Desynchronized State / Content |
|---|---|---|---|
| **I18n Provider** | [`frontend/src/i18n.js#L398`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/i18n.js#L398) | Stores `lang` in `useState('en')`. No `localStorage` read/write. | Selection is wiped on page reload or opening a new tab, reverting to English. |
| **Top Navigation** | [`frontend/src/components/Layout.jsx#L74`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/Layout.jsx#L74) | All tabs use `t(...)` except `/git`, which hardcodes `'Git Flowchart'`. | Git Flowchart nav item never localizes to Telugu or Hindi. |
| **Git Flowchart Page** | [`frontend/src/pages/GitFlowchartPage.jsx#L10-L12`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/GitFlowchartPage.jsx#L10-L12) | Does not import `useI18n()`. Maintains isolated `useState('en-IN')` with BCP-47 codes. | Changing language in the navbar does not affect flowchart narration, and changing language here does not affect the app. All UI labels are hardcoded in English. |
| **Code Studio** | [`frontend/src/components/MonacoCodeStudio.jsx#L89-L93`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/MonacoCodeStudio.jsx#L89-L93), [`#L156-L245`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/MonacoCodeStudio.jsx#L156-L245) | Zero i18n hooks. | Monaco gutter hover tooltips, "Recorded Reason", "Spoken ADR Audio", "Provenance & Expiry Rule", "Ask Co-Pilot About FENCE-001" remain in English. |
| **Co-Pilot Ask Drawer** | [`frontend/src/components/AskRepoDrawer.jsx#L34-L100`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/AskRepoDrawer.jsx#L34-L100), [`#L168-L182`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/AskRepoDrawer.jsx#L168-L182) | Imports `{ lang }` but does not use `t`. Initial query and mock response hardcoded in English. | If `lang` is `te` or `hi`, `utter.lang` is set to `te-IN`/`hi-IN` but speaks English words, producing garbled synthesizer audio. All drawer labels remain in English. |
| **Voice Co-Pilot Page** | [`frontend/src/pages/VoiceCoPilotPage.jsx#L44-L46`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/VoiceCoPilotPage.jsx#L44-L46), [`#L282-L312`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/VoiceCoPilotPage.jsx#L282-L312) | Presets show translated button labels, but click handlers overwrite `question` with hardcoded English strings. | Output mode segmented control (`Voice + Text`) and listening status text are hardcoded in English. Presets revert question to English. |
| **Spoken Fences Page** | [`frontend/src/pages/SpokenFencesPage.jsx#L22-L24`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/SpokenFencesPage.jsx#L22-L24), [`#L83`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/SpokenFencesPage.jsx#L83), [`#L168-L174`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/SpokenFencesPage.jsx#L168-L174) | `voiceInput` textarea defaults to Telugu transliteration in English/Hindi modes. Status filter buttons hardcode English labels (`Pending`, `Unverified`, `Verified`, `Expired`). | Filter buttons do not translate; default voice input is Telugu; confirmation handler sends `te-IN` for English users. |
| **Incidents & Memory** | [`frontend/src/pages/IncidentsAndMemoryPage.jsx#L24-L26`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/IncidentsAndMemoryPage.jsx#L24-L26), [`#L70`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/IncidentsAndMemoryPage.jsx#L70) | `voicePostmortem` textarea defaults to Telugu transliteration. Incident title is hardcoded English. | Form input defaults to Telugu even in English/Hindi mode; webhook transmits `te-IN` for English users; toast notifications remain English. |
| **Scorecard Widget** | [`frontend/src/components/ScorecardWidget.jsx#L91-L127`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/ScorecardWidget.jsx#L91-L127) | Zero i18n hooks. | All 5 KPI titles and helper texts ("Seeded AST Anomalies", "Hard-Blocked Edits", "Historical Cautions", etc.) remain in English. |
| **Status Badge** | [`frontend/src/components/StatusBadge.jsx#L29`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/StatusBadge.jsx#L29), [`#L76`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/StatusBadge.jsx#L76) | Hardcodes `'Active'` and `'Blocked'`. | Semantic badges show English words in Telugu and Hindi interfaces. |
| **Flowchart SVG** | [`frontend/src/components/InteractiveFlowchartSvg.jsx#L44`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/InteractiveFlowchartSvg.jsx#L44), [`#L64`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/components/InteractiveFlowchartSvg.jsx#L64) | State badges hardcode `'● speaking'` and `'✓ explained'`. | SVG text does not adapt to selected language. |
| **Settings Page** | [`frontend/src/pages/SettingsPage.jsx#L53-L180`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/SettingsPage.jsx#L53-L180) | Only page title and rescan button use `t()`. | 85% of settings page (section titles, metadata labels, provider summaries, benchmark table columns) remains in English. |
| **Login Page** | [`frontend/src/pages/LoginPage.jsx#L19-L26`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/LoginPage.jsx#L19-L26) | Validation error strings hardcoded in English. | `emailError` and `repoError` do not localize. |
| **Backend RAG Service** | [`backend/services/rag_service.py#L320-L330`](file:///c:/Users/anjan/Downloads/Whyline/backend/services/rag_service.py#L320-L330), [`#L489-L537`](file:///c:/Users/anjan/Downloads/Whyline/backend/services/rag_service.py#L489-L537) | Fallback `strategies` array has hardcoded English `title`, `summary`, `why_safe`. Gemini prompt only requests `spoken_reply` in `{language}`. | Strategy recommendation cards returned by `/api/copilot/ask` remain 100% in English even when `te-IN` or `hi-IN` is requested. |
| **Backend Git Narration** | [`backend/whyline/git_narration.py#L10-L14`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/git_narration.py#L10-L14), [`#L43-L45`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/git_narration.py#L43-L45) | Templates inject English node labels and summaries into Hindi/Telugu frames (`चरण {n}। {label}। {summary}। यह {file} में है।`). | Generates mixed sentences where English phrases are fed to Hindi/Telugu TTS engines, creating pronunciation distortion. |
| **Backend Endpoint Defaults** | [`backend/app.py#L54`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L54), [`#L353`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L353), [`#L379`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L379), [`#L391`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L391) | Conflicting default languages across endpoints (`te-IN` vs `en-IN`). | Inconsistent API behavior depending on whether an endpoint is called via GET or POST. |

---

## 5. Prioritized Actionable Implementation Guidance

### Step 1: Security & Test Suite Hardening (Priority: High)
1. **Fix Pytest Configuration** ([`pytest.ini#L1-L7`](file:///c:/Users/anjan/Downloads/Whyline/pytest.ini#L1-L7)):
   - Add `pythonpath = .` to allow immediate test discovery with bare `pytest`.
2. **Fix YAML Quote Substitution in Test** ([`backend/tests/test_adversarial_challenge_m2.py#L292`](file:///c:/Users/anjan/Downloads/Whyline/backend/tests/test_adversarial_challenge_m2.py#L292)):
   - Replace `original_cfg.replace('version: "v1"', 'version: "v2"')` with `re.sub(r'version:\s*"?v1"?', 'version: "v2"', original_cfg)`.
3. **Adjust Flaky CPU RRF Latency Thresholds** ([`backend/tests/test_whyline_engine.py#L103`](file:///c:/Users/anjan/Downloads/Whyline/backend/tests/test_whyline_engine.py#L103), [`tests/e2e/test_tier3_combinations.py#L105`](file:///c:/Users/anjan/Downloads/Whyline/tests/e2e/test_tier3_combinations.py#L105)):
   - Relax static `50.0` ms assertion to `< 250.0` ms for cold CPU environments.
4. **Harden CORS Configuration** ([`backend/app.py#L43-L49`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L43-L49)):
   - Specify explicit allowed origins (`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`) instead of `["*"]` when `allow_credentials=True`.
5. **Sanitize Git Scanner Branch & Remote URLs** ([`backend/whyline/git_scanner.py#L63-L75`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/git_scanner.py#L63-L75), [`#L619-L648`](file:///c:/Users/anjan/Downloads/Whyline/backend/whyline/git_scanner.py#L619-L648)):
   - Validate `branch` against `^[A-Za-z0-9_./-]+$` and reject any leading `-`.
   - Restrict remote URLs to explicit `https://` or `git@` prefixes and reject `ext::` protocols.
   - Constrain local filesystem scans to approved workspace roots.
6. **Protect Audio Generation Endpoint** ([`backend/app.py#L396-L406`](file:///c:/Users/anjan/Downloads/Whyline/backend/app.py#L396-L406)):
   - Validate `filename` against known fence audio stems before synthesizing; return 404 for unknown files.

### Step 2: Full-Stack Language Synchronization Engine (Priority: High)
1. **Language Persistence & Standardized Conversion** ([`frontend/src/i18n.js`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/i18n.js)):
   - Initialize `lang` from `localStorage.getItem('whyline-lang') || 'en'`.
   - In `setLang`, update `localStorage.setItem('whyline-lang', newLang)`.
   - Export standard mapping helpers:
     ```javascript
     export const toBcp47 = (lang) => (lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN');
     export const fromBcp47 = (bcp) => (bcp?.startsWith('hi') ? 'hi' : bcp?.startsWith('te') ? 'te' : 'en');
     ```
2. **Fix Frontend Handler Language Inversion**:
   - In [`BriefingDashboard.jsx#L66`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/BriefingDashboard.jsx#L66), [`SpokenFencesPage.jsx#L83`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/SpokenFencesPage.jsx#L83), [`IncidentsAndMemoryPage.jsx#L70`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/IncidentsAndMemoryPage.jsx#L70):
     Replace `lang === 'hi' ? 'hi-IN' : 'te-IN'` with `toBcp47(lang)`.
3. **Connect GitFlowchartPage to Global I18n Context** ([`frontend/src/pages/GitFlowchartPage.jsx`](file:///c:/Users/anjan/Downloads/Whyline/frontend/src/pages/GitFlowchartPage.jsx)):
   - Remove isolated `useState('en-IN')`. Consume `{ lang, setLang, t } = useI18n()`.
   - Localize all static buttons, inputs, step status indicators, and headers.
   - In `Layout.jsx#L74`, localize nav item with `t('navGitFlowchart')`.
4. **Localize Missing Components**:
   - **`MonacoCodeStudio.jsx`**: Consume `useI18n()`. Localize side panel titles, recorded reason, audio player label, and gutter tooltip.
   - **`ScorecardWidget.jsx`**: Consume `useI18n()`. Localize all 5 KPI titles and helper texts.
   - **`StatusBadge.jsx`**: Replace hardcoded `'Active'` and `'Blocked'` with `t('statusVerifiedActive')` and `t('statusBlocked')`.
   - **`InteractiveFlowchartSvg.jsx`**: Replace `'● speaking'` and `'✓ explained'` with localized labels.
   - **`AskRepoDrawer.jsx`**: Bind drawer headings, solution risk labels, and buttons to `t()`.
5. **Synchronize Presets & Default Inputs**:
   - In `VoiceCoPilotPage.jsx`, load preset questions in the active language (`t('presetQuestionDoubleCharge')`, etc.).
   - In `SpokenFencesPage.jsx` and `IncidentsAndMemoryPage.jsx`, initialize sample textareas based on the active language rather than defaulting unconditionally to Telugu.

### Step 3: Backend Multilingual Alignment & Speech Coherence (Priority: Medium)
1. **Multilingual Strategies in RAG Service** ([`backend/services/rag_service.py`](file:///c:/Users/anjan/Downloads/Whyline/backend/services/rag_service.py)):
   - Update `_call_gemini_strategies` prompt to require strategy `title`, `summary`, `why_safe`, and `uncertainty_note` in `{language}`.
   - Provide localized fallback strategy records for Telugu and Hindi.
2. **Unified Backend Default Language**:
   - Standardize default language across all endpoints in `backend/app.py` to `"en-IN"`.
3. **Prevent Speech Synthesis Distortion**:
   - In `AskRepoDrawer.jsx` and `VoiceCoPilotPage.jsx`, inspect response language before synthesizing. If response text is English, set `utter.lang = 'en-IN'` regardless of UI language to prevent Indic phoneme distortion.

---

## 6. Remaining Questions & Gaps

1. **Supabase pgvector Remote RPC Verification**:
   - `SUPABASE_URL` is empty in `.env`. Supabase vector search operated in local fallback mode. Once a live Supabase project URL is provisioned, remote CTE RRF latency and embedding indexing should be verified.
2. **Gnani Live Acoustic Streaming (WebSocket) under Network Packet Loss**:
   - REST TTS/STT tests passed against live keys. Real microphone audio streams with code-mixed Tenglish/Hinglish speech should be evaluated on live WebSockets under real packet drop conditions.
3. **What Follow-up Investigation Should Focus On**:
   - Implement the `pythonpath = .` and regex YAML quote replacement in test suite.
   - Implement `whyline-lang` in `localStorage` and replace the broken ternary expressions in frontend pages.
   - Wire `useI18n()` into `GitFlowchartPage.jsx`, `MonacoCodeStudio.jsx`, and `ScorecardWidget.jsx`.
