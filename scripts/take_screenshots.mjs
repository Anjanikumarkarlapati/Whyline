import { execFileSync } from 'child_process';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = resolve('screenshots');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:\\Users\\anjan\\.gemini\\antigravity\\brain\\246dd7d8-96dc-46ec-9c6e-e26dfa21d83d';

mkdirSync(SCREENSHOT_DIR, { recursive: true });
mkdirSync(ARTIFACT_DIR, { recursive: true });

const pages = [
  // ==========================================
  // 1. CONSOLIDATED 4-PAGE IA (Desktop 1440x1080)
  // ==========================================
  // Home (/)
  { url: 'http://localhost:5173/?theme=light', file: '01_home_dashboard_light.png', desc: 'Home Dashboard (Light)' },
  { url: 'http://localhost:5173/?theme=dark', file: '01_home_dashboard_dark.png', desc: 'Home Dashboard (Dark)' },

  // Workbench (/studio) - 60/40 Split & 3 Tabs
  { url: 'http://localhost:5173/studio?panel=fence&theme=light', file: '02_workbench_fence_light.png', desc: 'Workbench: Fence Tab & Monaco Editor (Light)' },
  { url: 'http://localhost:5173/studio?panel=fence&theme=dark', file: '02_workbench_fence_dark.png', desc: 'Workbench: Fence Tab & Monaco Editor (Dark)' },
  { url: 'http://localhost:5173/studio?panel=why&theme=light', file: '02_workbench_why_light.png', desc: 'Workbench: Why Provenance Timeline (Light)' },
  { url: 'http://localhost:5173/studio?panel=why&theme=dark', file: '02_workbench_why_dark.png', desc: 'Workbench: Why Provenance Timeline (Dark)' },
  { url: 'http://localhost:5173/studio?panel=ask&theme=light', file: '02_workbench_ask_light.png', desc: 'Workbench: Ask-the-Repo Co-Pilot (Light)' },
  { url: 'http://localhost:5173/studio?panel=ask&theme=dark', file: '02_workbench_ask_dark.png', desc: 'Workbench: Ask-the-Repo Co-Pilot (Dark)' },

  // Memory (/memory) - Incidents Ledger & Git Graph
  { url: 'http://localhost:5173/memory?view=ledger&theme=light', file: '03_memory_ledger_light.png', desc: 'Memory: Incidents Ledger View (Light)' },
  { url: 'http://localhost:5173/memory?view=ledger&theme=dark', file: '03_memory_ledger_dark.png', desc: 'Memory: Incidents Ledger View (Dark)' },
  { url: 'http://localhost:5173/memory?view=graph&theme=light', file: '03_memory_graph_light.png', desc: 'Memory: Git Provenance Graph (Light)' },
  { url: 'http://localhost:5173/memory?view=graph&theme=dark', file: '03_memory_graph_dark.png', desc: 'Memory: Git Provenance Graph (Dark)' },
  { url: 'http://localhost:5173/memory?view=ledger&incident=INC-9921&theme=light', file: '03_memory_detail_drawer_light.png', desc: 'Memory: Detail Drawer with Open in Workbench CTA' },

  // Settings (/settings) - Absorbed Settings & Session
  { url: 'http://localhost:5173/settings?theme=light', file: '04_settings_integrations_light.png', desc: 'Settings: Integrations, Gateway Cutover & Session (Light)' },
  { url: 'http://localhost:5173/settings?theme=dark', file: '04_settings_integrations_dark.png', desc: 'Settings: Integrations, Gateway Cutover & Session (Dark)' },

  // ==========================================
  // 2. LEGACY REDIRECTS (Verified)
  // ==========================================
  { url: 'http://localhost:5173/fences?theme=light', file: 'legacy_01_fences_redirect.png', desc: 'Legacy Redirect: /fences -> /studio?panel=fence' },
  { url: 'http://localhost:5173/copilot?theme=light', file: 'legacy_02_copilot_redirect.png', desc: 'Legacy Redirect: /copilot -> /studio?panel=ask' },
  { url: 'http://localhost:5173/git?theme=light', file: 'legacy_03_git_redirect.png', desc: 'Legacy Redirect: /git -> /memory?view=graph' },
  { url: 'http://localhost:5173/incidents?theme=light', file: 'legacy_04_incidents_redirect.png', desc: 'Legacy Redirect: /incidents -> /memory?view=ledger' },
  { url: 'http://localhost:5173/login?theme=light', file: 'legacy_05_login_redirect.png', desc: 'Legacy Redirect: /login -> /settings' },

  // ==========================================
  // 3. KEY USPs & MULTILINGUAL CAPABILITIES
  // ==========================================
  { url: 'http://localhost:5173/studio?panel=fence&lang=te&theme=light', file: 'usp_01_telugu_spoken_fence.png', desc: 'USP 1: Telugu Spoken Fence & Nalini Voice' },
  { url: 'http://localhost:5173/studio?panel=ask&lang=hi&theme=light', file: 'usp_02_hindi_ask_copilot.png', desc: 'USP 2: Hindi Ask-the-Repo Architectural Co-Pilot' },
  { url: 'http://localhost:5173/?theme=light', file: 'usp_03_ast_anomaly_filter_chips.png', desc: 'USP 3: AST Anomaly Ledger with Type Filter Chips' },
  { url: 'http://localhost:5173/studio?file=src%2Fmain%2Fjava%2Fcom%2Fhealthconnect%2Fpayments%2FGatewayRouter.java&line=23&panel=why&theme=light', file: 'usp_04_workbench_file_switcher_timeline.png', desc: 'USP 4: Workbench Breadcrumb File Switcher & Line Provenance' },
  { url: 'http://localhost:5173/memory?view=graph&focus=FENCE-001&theme=light', file: 'usp_05_interactive_git_flowchart.png', desc: 'USP 5: Interactive Git Provenance Flowchart & Narration' },
  { url: 'http://localhost:5173/settings?theme=light', file: 'usp_06_zero_secret_gateway_cutover.png', desc: 'USP 6: Zero-Secret Verification & Gateway Version Cutover' },

  // ==========================================
  // 4. RESPONSIVE MOBILE VIEWPORTS (375x812)
  // ==========================================
  { url: 'http://localhost:5173/?theme=light', file: 'mobile_01_home_375.png', width: 375, height: 812, desc: 'Mobile Home Dashboard (375px)' },
  { url: 'http://localhost:5173/studio?theme=light', file: 'mobile_02_workbench_375.png', width: 375, height: 812, desc: 'Mobile Workbench Editor & Tabs (375px)' },
  { url: 'http://localhost:5173/memory?theme=light', file: 'mobile_03_memory_375.png', width: 375, height: 812, desc: 'Mobile Memory Ledger (375px)' },
  { url: 'http://localhost:5173/settings?theme=light', file: 'mobile_04_settings_375.png', width: 375, height: 812, desc: 'Mobile Settings & Session (375px)' },
];

console.log(`Starting automated capture of ${pages.length} screenshots for WhyLine Studio 4-Page IA...`);

let count = 0;
for (const p of pages) {
  count++;
  const outPath = resolve(SCREENSHOT_DIR, p.file);
  const width = p.width || 1440;
  const height = p.height || 1080;
  console.log(`[${count}/${pages.length}] Capturing ${p.desc} (${p.url}) -> ${p.file}...`);
  try {
    execFileSync(CHROME_PATH, [
      '--headless=new',
      '--disable-gpu',
      `--window-size=${width},${height}`,
      '--virtual-time-budget=3500',
      `--screenshot=${outPath}`,
      p.url,
    ]);
    const brainPath = resolve(ARTIFACT_DIR, p.file);
    copyFileSync(outPath, brainPath);
    console.log(`  -> Saved & copied to artifact directory.`);
  } catch (err) {
    console.error(`  -> ERROR capturing ${p.file}:`, err.message);
  }
}

console.log(`\nCompleted! Successfully captured ${count} screenshots.`);
