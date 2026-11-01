# Git Flowchart Page — QA Test Report

**Date:** 2026-11-01 · **Page:** `http://127.0.0.1:5173/git` · **Tested via:** live browser session (network + DOM inspection)

## 1. What was tested

| Check | Result |
|---|---|
| Scan & Explain with path `.` | ✅ Works — 7 nodes rendered, `POST /api/git/scan-narrated` → 200 |
| Play walkthrough (English) | ✅ Works — 7 steps streamed via `/api/git/speak`, all HTTP 206, no console errors |
| Play walkthrough (हिंदी, after scan) | ❌ **FAILS — still speaks the language from scan time** |
| Play walkthrough (తెలుగు) | ✅ Works — but only because it was the language at (re)scan time |
| Click a node to jump | ✅ Works — clicking "Gnani Speech Bridge" spoke its step audio (with caveats, see §3) |
| Bad path `C:/nope` | ✅ Works — `POST` → 400, clear error banner: "Error: Target repository path not found: C:/nope" |

## 2. The problem

**Changing the "Voice language" dropdown after a scan has no effect on the walkthrough.**

Reproduced live: with the repo already scanned, I selected **हिंदी** in the dropdown and pressed **Play walkthrough** — the browser requested audio with `language=te-IN` (the previous scan's language). Hindi audio was never requested. Re-selecting the language and replaying never produced Hindi until a *fresh scan* was run with Hindi already selected (that scan correctly produced `चरण 1… &language=hi-IN`).

### Root cause

The language is a **scan-time parameter, not a playback-time setting**:

- `GitFlowchartPage.scan()` (frontend/src/pages/GitFlowchartPage.jsx:33) sends `{repo_path_or_url, language: lang}` once.
- The backend `narrate_flowchart()` (backend/whyline/git_narration.py:51) bakes the language into every step: `"audio_url": f"/api/git/speak?{urlencode({'text': text, 'language': lang})}"`.
- `playFrom()` (GitFlowchartPage.jsx:49) only replays those cached `audio_url`s — it never reads the current `lang` state.

The UI contradicts this: the language selector sits right next to "Play walkthrough", inviting the user to change language and press Play. That action is silently ignored — no re-scan, no error, no hint. Worse, the user hears the *old* language and may conclude the TTS pipeline is broken (it isn't — all three languages synthesize correctly when selected before scanning).

## 3. How deep is it?

**Layer 1 — Symptom (shallow):** wrong language on Play. One-line-ish fix, purely frontend.

**Layer 2 — State-design flaw (the real bug):** "language" has two owners. The backend `/api/git/speak` endpoint already accepts `language` per request, so the backend *supports* playback-time language — but the frontend chose to freeze it into `audio_url` at scan time and the narration *text* ("Step 4." / "चरण 4।" / "దశ 4.") is also language-dependent, so neither URL nor text can be fixed at play time without regenerating narration. The scan response mixes language-neutral data (graph) with language-specific data (narration) in one payload.

**Layer 3 — Latent defects surfaced while testing (worth fixing in the same pass):**

1. **Zombie playback loops on Stop.** `stop()` pauses the audio (GitFlowchartPage.jsx:72), but the `await` in `playFrom` resolves only on `ended`/`error` — `pause` never fires either. Each Stop-then-Play leaves a stale loop parked on a promise that never resolves, and the old loop's `stopRef` flag is reset by the new playback. Observed duplicate step fetches in the network log. Today it's a leak; tomorrow it's a race if that audio is ever resumed.
2. **Node numbering ≠ step numbering.** The SVG labels nodes in graph order ("4. Gnani Speech Bridge"), but narration follows BFS order, so clicking node "4" speaks **Step 7**. The jump works, but the numbering mismatch makes the feature feel broken.
3. **No regression coverage.** `backend/tests/test_git_narration.py` covers scan-time language (`te-IN`), ordering, speed, and missing path — nothing tests switching language *after* scan, and there is no e2e test of the Play button at all. This is exactly how the bug shipped.

**Verdict:** the TTS/Gnani pipeline, lazy per-step synthesis, SHA-1 audio caching, and error handling are all solid. The defect is a frontend state-lifecycle gap plus small concurrency hygiene issues — **medium depth, low blast radius, well-understood fix**.

## 4. Fix strategy

### Phase 1 — Correct behavior (frontend, small)

Make Play honor the current language. Cleanest option that reuses everything:

- In `GitFlowchartPage`, track the language used for the current `data` (e.g. store `scannedLang` when the scan resolves).
- On **Play walkthrough** (and on node click), if `lang !== scannedLang`, re-POST `/api/git/scan-narrated` with the current language before playing (scan is fast — the whole endpoint is designed to return immediately since audio is lazy). Otherwise play the cached narration.
- Minimal alternative: pass `lang` into `playFrom` and build each URL at play time — but narration *text* is also language-specific, so the rescan route is the honest fix.

### Phase 2 — Hygiene (frontend, small)

- In `playFrom`'s await, also resolve on `audio.onpause` (or have `stop()` call `audio.currentTime = 0` + dispatch a synthetic end) so old loops terminate instead of leaking.
- Align numbering: either render SVG nodes in narration order, or label nodes with their narration step number, or reorder `_order()` to match the displayed graph order — pick one source of truth.

### Phase 3 — Lock it in (tests)

- Backend: parametrized test that `narrate_flowchart` produces distinct text/audio_url per language (probably passes already — guards regressions).
- E2E (Playwright, matching this manual session): scan `.` → switch to हिंदी → Play → **assert a `/api/git/speak?...language=hi-IN` request occurs**; click a node; submit `C:/nope` and assert the 400 banner.

### Out of scope / notes

- `/api/git/speak` hashes cache on `lang:text`, so per-language audio caching already works — no backend changes needed for Phase 1.
- Consider a tiny UX affordance: disable or annotate the language selector while playing, or auto-restart narration in the new language on change (product decision).
