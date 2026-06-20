/* Gera os ícones do PWA (192 e 512) a partir de um SVG, via Chromium/Playwright.
   Uso: NODE_PATH=/opt/node22/lib/node_modules node test/gerar-icones.js */
'use strict';

const path = require('path');
const { chromium } = require('playwright');

/* Ícone: fundo verde-petróleo (sangria total p/ maskable), círculo âmbar e check */
function svg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="112" fill="#0f5e57"/>
    <circle cx="256" cy="256" r="150" fill="#f5a623"/>
    <path d="M188 262 l46 46 l94 -100" fill="none" stroke="#0f5e57"
      stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

(async () => {
  const destino = path.join(__dirname, '..', 'icons');
  const browser = await chromium.launch();
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><body style="margin:0;padding:0;line-height:0">${svg(size)}</body></html>`);
    await page.screenshot({ path: path.join(destino, `icon-${size}.png`), omitBackground: true });
    await page.close();
    console.log(`gerado icons/icon-${size}.png`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
