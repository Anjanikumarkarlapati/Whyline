# WhyLine Studio — 9-to-4 Page Information Architecture Migration Notes

## 1. Executive Summary
WhyLine Studio has been refactored from a 9-route layout into **4 core user-facing pages** structured around one continuous developer workflow:
**Notice anomaly → Open the code → Hear/record the why → See the history → Ask a question.**

All existing "Field Report" aesthetic specifications (warm parchment `#FDFBD4`, olive accents `#545333`, Crimson Text serif display, DM Sans UI, DM Mono identifiers) remain strictly intact. Both Light and Dark themes are preserved with WCAG AA compliance.

---

## 2. Target Information Architecture & Route Mapping

| Old Route | New Canonical Route | Query Parameters / View | Absorbed Capabilities |
| :--- | :--- | :--- | :--- |
| `/` | `/` | — | **Home**: KPI metric ribbons, AST anomaly guardrail summary, type filter chips, pending voice confirmations feed. |
| `/studio` | `/studio` | `panel=fence` (default) | **Workbench**: Monaco Editor + Spoken Fence recorder + 36-bar waveform scrubber + line anchor. |
| `/fences` | `/studio` | `panel=fence` | **Workbench (Fence Tab)**: Redirected with `<LegacyRedirect>`. |
| `/copilot` | `/studio` | `panel=ask` | **Workbench (Ask Tab)**: Ask-the-Repo Co-Pilot with hybrid pgvector RRF and "Open in editor" action. |
| — | `/studio` | `panel=why` | **Workbench (Why Tab)**: Vertical provenance timeline (Git commit blame, PR #212, INC-9921, AST flag). |
| `/incidents` | `/memory` | `view=ledger` | **Memory (Ledger View)**: Incidents & Dead-End Memory, postmortems, branch checkpoints. |
| `/git` | `/memory` | `view=graph` | **Memory (Graph View)**: Interactive SVG flowchart and step-by-step Indic voice narration. |
| `/settings` | `/settings` | — | **Settings**: Service Integrations, Gateway version cutover, Zero-secret audit, and Preferences. |
| `/login` | `/settings` | — | **Settings (Section 5)**: User session chip `@anjani`, repository selector, and session modal. |
| `/dev/typography` | `/dev/typography` | — | **Dev-Only Route**: Guarded behind `import.meta.env.DEV`, excluded from primary navigation. |

### Legacy Redirects
All legacy URLs (`/fences`, `/copilot`, `/git`, `/incidents`, `/login`) are retained as redirects via `<LegacyRedirect to="..." defaultParams={...} />`. Incoming query parameters (such as `?id=...`, `?theme=...`, `?lang=...`) are preserved without loss.

---

## 3. Workbench (`/studio`) Implementation Details

### 60/40 Split & Draggable Handle
- On desktop viewports (≥1024px), the layout utilizes a resizable container: **60% editor / 40% context panel**.
- A custom drag handle between columns allows resizing between 45% (min editor) and 70% (max editor, min 30% panel).
- Ratio is persisted in browser storage under `localStorage.getItem('whyline-split-ratio')`.
- On mobile viewports (<1024px), the layout stacks vertically: editor top (~45vh) and context panel tabs below with a sticky segmented control.

### Single Source of Truth (`useWorkbenchSelection`)
The `WorkbenchContext` synchronizes selection state bidirectionally with the URL query parameters:
```
/studio?file=<path>&line=<number>&panel=fence|why|ask&fence=<id>
```
- Clicking any line or gutter pin in Monaco updates `file`, `line`, and `fenceId`.
- Selecting "Open in editor" inside Co-Pilot or Memory drawer scrolls and centers Monaco on that exact line without a page reload.

### File Switcher
A breadcrumb + dropdown switcher above Monaco allows switching between demo repository boundaries:
1. `src/main/java/com/healthconnect/payments/GatewayRouter.java` (Java 21 • FENCE-001)
2. `src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java` (Java 21 • FENCE-003)
3. `src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java` (Java 21 • FENCE-004)
4. `config/application.yml` (YAML)

---

## 4. Memory (`/memory`) Implementation Details

- Consolidated view switcher toggles between `view=ledger` and `view=graph`.
- Deep links via `?incident=<id>` or `?focus=<id>` automatically highlight the target row/node and slide open the right-side `MemoryDetailDrawer`.
- The detail drawer features a prominent "Open in Workbench" call-to-action that deep-links directly to `/studio?file=...&line=...&panel=why&fence=...`.

---

## 5. Settings (`/settings`) Implementation Details

Absorbs all former settings and standalone login authentication:
1. **Service Integrations**: Live telemetry for Gnani AI speech stack, Supabase pgvector 768-dim HNSW, and `whyline-mcp` pre-commit hooks.
2. **Gateway Version Cutover**: Centralized toggle for `gateway.version` (`v1` vs `v2`), showing live auto-expiry status for FENCE-001.
3. **Zero-Secret Verification**: Explicit verification that client bundles carry zero credentials.
4. **Preferences**: Theme switcher (Paper Light vs Khaki Dark), language selector (`en`, `te`, `hi`), and visual effects mode.
5. **Account & Session**: Displays active user `@anjani` (`Lead SRE / Codebase Author`) with a modal dialog (`SessionModal`) to switch identity or repository scope.

---

## 6. Global Shortcuts & Mobile UX
- **Global Shortcut**: Pressing `Ctrl+K` or `Cmd+K` anywhere in the application routes to `/studio?panel=ask` and focuses the Co-Pilot query textarea.
- **Mobile Strictness**: Zero horizontal overflow at 375px (`overflow-x: clip`), minimum touch targets ≥ 44×44px, and full accessibility tree coverage.

---

## 7. Verification & Backend Contracts
- **Backend Tests**: 119/119 unit and integration tests passed via `python -m pytest backend/tests` (0 failures, 0 regressions).
- **Zero API Breakage**: No backend endpoints were modified or broken; all existing contracts (`/api/briefing`, `/api/fences`, `/api/copilot/ask`, `/api/git/scan-narrated`, `/api/incidents`) remain identical.
- **Knowledge Graph**: AST knowledge graph fully synchronized via `graphify update .` (1,635 nodes, 3,392 edges across 112 communities).
