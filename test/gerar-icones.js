/* Gera os ícones do PWA (192 e 512) com o símbolo do logo Sabesp em branco sobre
   fundo azul Sabesp e o texto "Check-list Gás" embaixo, via Chromium/Playwright.
   O logo é embutido como dataURL e recolorido para branco (brightness(0) invert(1));
   a palavra "sabesp" é recortada.
   Uso: NODE_PATH=/opt/node22/lib/node_modules node test/gerar-icones.js */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const LOGO = 'data:image/png;base64,' +
  fs.readFileSync(path.join(RAIZ, 'icons', 'sabesp-logo.png')).toString('base64');

const LOGO_W = 2244, LOGO_H = 3125;
const SIMBOLO_FRAC = 0.78; // fração da altura do arquivo ocupada pelo símbolo (sem "sabesp")
const AZUL = '#0083c1';

function html(size) {
  const alvo = size * 0.40;                       // tamanho do símbolo (menor p/ caber o texto)
  const simW = LOGO_W, simH = LOGO_H * SIMBOLO_FRAC;
  let dispH = alvo, dispW = simW / simH * dispH;
  if (dispW > alvo) { dispW = alvo; dispH = simH / simW * dispW; }
  const escala = dispW / simW;
  const imgW = LOGO_W * escala, imgH = LOGO_H * escala;
  const fonte = Math.round(size * 0.135);
  return `<!doctype html><html><body style="margin:0;padding:0">
    <div style="width:${size}px;height:${size}px;background:${AZUL};border-radius:${Math.round(size * 0.22)}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(size * 0.05)}px;overflow:hidden;font-family:system-ui,'Segoe UI',Arial,sans-serif">
      <div style="width:${dispW}px;height:${dispH}px;overflow:hidden">
        <img src="${LOGO}" style="width:${imgW}px;height:${imgH}px;display:block;filter:brightness(0) invert(1)">
      </div>
      <div style="color:#fff;font-weight:700;font-size:${fonte}px;line-height:1.05;text-align:center;max-width:${Math.round(size * 0.86)}px;letter-spacing:-0.01em">Check-list Gás</div>
    </div></body></html>`;
}

(async () => {
  const destino = path.join(RAIZ, 'icons');
  const browser = await chromium.launch();
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(html(size));
    await page.locator('img').first().waitFor();
    await page.screenshot({ path: path.join(destino, `icon-${size}.png`) });
    await page.close();
    console.log(`gerado icons/icon-${size}.png`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
