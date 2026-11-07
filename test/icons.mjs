// Рисует PNG-иконки из public/icon.svg (тёмная) и icon-light.svg (светлая) для установки на экран.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const b = await chromium.launch();
for (const [f, pre] of [['public/icon.svg', 'icon'], ['public/icon-light.svg', 'icon-light']]) {
  const svg = readFileSync(f, 'utf8');
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</body>`);
    await p.screenshot({ path: `public/${pre}-${s}.png` });
  }
}
await b.close();
console.log('icons ok');
