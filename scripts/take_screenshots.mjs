import { execFileSync } from 'child_process';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\anjan\\.gemini\\antigravity\\brain\\09e33a3c-f18d-4e0e-aeb7-53b6248cb67f';
const SCREENSHOT_DIR = resolve('screenshots');

mkdirSync(SCREENSHOT_DIR, { recursive: true });

const pages = [
  { url: 'http://localhost:5173/?theme=light', file: '01_briefing_dashboard.png' },
  { url: 'http://localhost:5173/?theme=dark', file: '01_briefing_dashboard_dark.png' },
  { url: 'http://localhost:5173/fences?theme=light', file: '02_spoken_fences_studio.png' },
  { url: 'http://localhost:5173/fences?theme=dark', file: '02_spoken_fences_studio_dark.png' },
  { url: 'http://localhost:5173/studio?theme=light', file: '02b_code_studio.png' },
  { url: 'http://localhost:5173/studio?theme=dark', file: '02b_code_studio_dark.png' },
  { url: 'http://localhost:5173/incidents?theme=light', file: '03_incidents_and_memory.png' },
  { url: 'http://localhost:5173/incidents?theme=dark', file: '03_incidents_and_memory_dark.png' },
  { url: 'http://localhost:5173/copilot?theme=light', file: '04_ask_the_repo_copilot.png' },
  { url: 'http://localhost:5173/copilot?theme=dark', file: '04_ask_the_repo_copilot_dark.png' },
  { url: 'http://localhost:5173/settings?theme=light', file: '05_studio_settings.png' },
  { url: 'http://localhost:5173/settings?theme=dark', file: '05_studio_settings_dark.png' },
  { url: 'http://localhost:5173/login?theme=light', file: '06_login_auth.png' },
  { url: 'http://localhost:5173/login?theme=dark', file: '06_login_auth_dark.png' },
];

for (const p of pages) {
  const outPath = resolve(SCREENSHOT_DIR, p.file);
  console.log(`Capturing ${p.url} -> ${p.file}...`);
  execFileSync(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--window-size=1440,1080',
    '--virtual-time-budget=4000',
    `--screenshot=${outPath}`,
    p.url,
  ]);
  const brainPath = resolve(ARTIFACT_DIR, p.file);
  copyFileSync(outPath, brainPath);
  console.log(`Copied to brain artifact: ${brainPath}`);
}
console.log('All Light & Dark mode screenshots captured successfully.');
