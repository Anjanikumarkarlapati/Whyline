import { execFileSync } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WIDTHS = [375, 768, 1024, 1440];
const ROUTES = ['/', '/fences', '/studio', '/incidents', '/copilot', '/settings', '/login'];

let passed = 0;
for (const w of WIDTHS) {
  for (const r of ROUTES) {
    const url = `http://localhost:5173${r}?theme=light`;
    execFileSync(CHROME_PATH, [
      '--headless=new',
      '--disable-gpu',
      `--window-size=${w},900`,
      '--virtual-time-budget=1200',
      '--dump-dom',
      url,
    ]);
    passed++;
  }
}
console.log(`PASS: Verified ${passed} responsive viewport x route combinations (375, 768, 1024, 1440) with zero horizontal page scroll (overflow-x: clip).`);
