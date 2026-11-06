import { execFileSync } from 'child_process';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = resolve('screenshots');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || SCREENSHOT_DIR;

mkdirSync(SCREENSHOT_DIR, { recursive: true });
mkdirSync(ARTIFACT_DIR, { recursive: true });

const pages = [
  // 1. ALL CORE PAGES (Light & Dark)
  { url: 'http://localhost:5173/?theme=light', file: '01_briefing_dashboard.png', desc: 'Briefing Dashboard (Light)' },
  { url: 'http://localhost:5173/?theme=dark', file: '01_briefing_dashboard_dark.png', desc: 'Briefing Dashboard (Dark)' },
  { url: 'http://localhost:5173/fences?theme=light', file: '02_spoken_fences_studio.png', desc: 'Spoken Fences Studio (Light)' },
  { url: 'http://localhost:5173/fences?theme=dark', file: '02_spoken_fences_studio_dark.png', desc: 'Spoken Fences Studio (Dark)' },
  { url: 'http://localhost:5173/studio?theme=light', file: '03_monaco_code_studio.png', desc: 'Monaco Code Studio (Light)' },
  { url: 'http://localhost:5173/studio?theme=dark', file: '03_monaco_code_studio_dark.png', desc: 'Monaco Code Studio (Dark)' },
  { url: 'http://localhost:5173/incidents?theme=light', file: '04_incidents_and_memory.png', desc: 'Incidents & Memory (Light)' },
  { url: 'http://localhost:5173/incidents?theme=dark', file: '04_incidents_and_memory_dark.png', desc: 'Incidents & Memory (Dark)' },
  { url: 'http://localhost:5173/copilot?theme=light', file: '05_ask_the_repo_copilot.png', desc: 'Ask-the-Repo Co-Pilot (Light)' },
  { url: 'http://localhost:5173/copilot?theme=dark', file: '05_ask_the_repo_copilot_dark.png', desc: 'Ask-the-Repo Co-Pilot (Dark)' },
  { url: 'http://localhost:5173/git?theme=light', file: '06_git_flowchart_provenance.png', desc: 'Git Flowchart & Provenance Graph (Light)' },
  { url: 'http://localhost:5173/git?theme=dark', file: '06_git_flowchart_provenance_dark.png', desc: 'Git Flowchart & Provenance Graph (Dark)' },
  { url: 'http://localhost:5173/settings?theme=light', file: '07_studio_settings.png', desc: 'Studio Settings & Integrations (Light)' },
  { url: 'http://localhost:5173/settings?theme=dark', file: '07_studio_settings_dark.png', desc: 'Studio Settings & Integrations (Dark)' },
  { url: 'http://localhost:5173/login?theme=light', file: '08_login_auth.png', desc: 'Authentication & Field Report Login (Light)' },
  { url: 'http://localhost:5173/login?theme=dark', file: '08_login_auth_dark.png', desc: 'Authentication & Field Report Login (Dark)' },
  { url: 'http://localhost:5173/dev/typography?theme=light', file: '09_typography_design_spec.png', desc: 'Typography & Design Spec (Light)' },
  { url: 'http://localhost:5173/dev/typography?theme=dark', file: '09_typography_design_spec_dark.png', desc: 'Typography & Design Spec (Dark)' },

  // 2. USP: MULTILINGUAL SPOKEN FENCES (Telugu & Hindi)
  { url: 'http://localhost:5173/fences?lang=te&theme=light', file: 'usp_01_spoken_fence_telugu_voice.png', desc: 'USP 1: Telugu Spoken Fence & Gnani Nalini Voice' },
  { url: 'http://localhost:5173/fences?lang=hi&theme=light', file: 'usp_01_spoken_fence_hindi_voice.png', desc: 'USP 1: Hindi Spoken Fence & Gnani Bhavna Voice' },

  // 3. USP: AST ANOMALY DETECTION & GUARDRAIL SCORECARD
  { url: 'http://localhost:5173/?theme=light', file: 'usp_02_ast_anomaly_scorecard_ledger.png', desc: 'USP 2: AST Anomaly Guardrail Intercept Ledger' },

  // 4. USP: MONACO CODE STUDIO WITH PROTECTED FENCE ANNOTATIONS
  { url: 'http://localhost:5173/studio?theme=light', file: 'usp_03_monaco_protected_code_fence.png', desc: 'USP 3: Monaco Code Studio with Live Protected Fences' },

  // 5. USP: INTERACTIVE GIT PROVENANCE GRAPH
  { url: 'http://localhost:5173/git?theme=light', file: 'usp_04_git_interactive_flowchart.png', desc: 'USP 4: Git Provenance Interactive Flowchart' },

  // 6. USP: MULTILINGUAL ASK-THE-REPO CO-PILOT
  { url: 'http://localhost:5173/copilot?lang=te&theme=light', file: 'usp_05_copilot_telugu_rrf_query.png', desc: 'USP 5: Telugu Ask-the-Repo Architectural Co-Pilot' },
  { url: 'http://localhost:5173/copilot?lang=hi&theme=light', file: 'usp_05_copilot_hindi_rrf_query.png', desc: 'USP 5: Hindi Ask-the-Repo Architectural Co-Pilot' },

  // 7. USP: INCIDENTS POSTMORTEM & LONG-TERM MEMORY
  { url: 'http://localhost:5173/incidents?theme=light', file: 'usp_06_incidents_memory_ledger.png', desc: 'USP 6: Production Incidents & Long-Term Memory Ledger' },

  // 8. USP: MCP SERVER & ZERO-SECRET SETTINGS
  { url: 'http://localhost:5173/settings?theme=light', file: 'usp_07_mcp_git_hooks_settings.png', desc: 'USP 7: Zero-Secret MCP & Pre-Commit Hook Security' },

  // 9. USP: RESPONSIVE MOBILE VIEWPORT (375x812)
  { url: 'http://localhost:5173/?theme=light', file: 'usp_08_mobile_responsive_briefing.png', width: 375, height: 812, desc: 'USP 8: Mobile Field Report Briefing' },
  { url: 'http://localhost:5173/fences?theme=light', file: 'usp_08_mobile_responsive_fences.png', width: 375, height: 812, desc: 'USP 8: Mobile Spoken Fences' },
];

console.log(`Starting capture of ${pages.length} screenshots...`);

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
      '--virtual-time-budget=3000',
      `--screenshot=${outPath}`,
      p.url,
    ]);
    const brainPath = resolve(ARTIFACT_DIR, p.file);
    copyFileSync(outPath, brainPath);
    console.log(`  -> Saved & copied to brain artifact.`);
  } catch (err) {
    console.error(`  -> ERROR capturing ${p.file}:`, err.message);
  }
}

console.log(`\nCompleted! Captured ${count} screenshots in screenshots/ and ${ARTIFACT_DIR}`);
