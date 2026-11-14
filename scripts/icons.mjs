// Renders crisp PNG app icons (home screen, lock screen fallback) from a
// dot-matrix "JAM" mark. Run with `npm run icons` (needs Playwright + Chromium).
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const F = {
  J: ['..XXX', '....X', '....X', '....X', 'X...X', 'X...X', '.XXX.'],
  A: ['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X'],
};
const step = 22, r = 8.6, cols = 17, x0 = (512 - (cols - 1) * step) / 2, y0 = 196;
let dots = '';
let grid = '';
['J', 'A', 'M'].forEach((ch, i) => F[ch].forEach((row, y) => [...row].forEach((c, x) => {
  if (c === 'X') dots += `<circle cx="${x0 + (i * 6 + x) * step}" cy="${y0 + y * step}" r="${r}"/>`;
})));
for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) grid += `<circle cx="${14 + x * 22.5}" cy="${14 + y * 22.5}" r="2.4"/>`;
const svg = fs.readFileSync('public/icons/icon.svg', 'utf8').replace('<g id="grid" fill="#fff" opacity="0.08"></g>', `<g fill="#fff" opacity="0.08">${grid}</g>`).replace('<g id="dots" fill="url(#t)"></g>', `<g fill="url(#t)">${dots}</g>`);
fs.writeFileSync('public/icons/icon.svg', svg);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [name, size, pad] of [['icon-512.png', 512, 0], ['icon-192.png', 192, 0], ['apple-touch-icon.png', 180, 0], ['maskable-512.png', 512, 0.1], ['favicon-48.png', 48, 0]]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<html><body style="margin:0;background:#050507;display:grid;place-items:center;width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await page.screenshot({ path: `public/icons/${name}`, omitBackground: false });
}
await browser.close();
console.log('icons written');
