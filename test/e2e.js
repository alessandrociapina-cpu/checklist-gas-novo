/* Teste de ponta a ponta (Playwright) — cria um checklist, preenche as abas,
   anexa foto, gera o relatório e confere o conteúdo. Sobe seu próprio servidor
   estático (python3) para servir o app. Uso: node test/e2e.js  */
'use strict';

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const PORT = process.env.PORT || 8123;
const BASE = `http://localhost:${PORT}/`;

function aguardarServidor(url, tentativas = 50) {
  return new Promise((resolve, reject) => {
    const tentar = n => {
      const req = http.get(url, res => { res.resume(); resolve(); });
      req.on('error', () => {
        if (n <= 0) return reject(new Error('Servidor não respondeu'));
        setTimeout(() => tentar(n - 1), 200);
      });
    };
    tentar(tentativas);
  });
}

(async () => {
  const servidor = spawn('python3', ['-m', 'http.server', String(PORT)], {
    cwd: RAIZ, stdio: 'ignore'
  });
  let browser;
  const encerrar = () => { try { servidor.kill(); } catch { /* ok */ } };

  try {
    await aguardarServidor(BASE);
    browser = await chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const erros = [];
    page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
    page.on('pageerror', e => erros.push('PAGEERROR: ' + e.message));

    const checa = (cond, msg) => {
      if (!cond) throw new Error('FALHA: ' + msg);
      console.log('  ✓ ' + msg);
    };

    await page.goto(BASE);
    await page.waitForSelector('#btn-novo');

    // Rótulos dos botões de backup na tela inicial
    const txtBackup = (await page.textContent('#btn-exportar')).trim();
    const txtRest = (await page.textContent('#btn-importar')).trim();
    checa(txtBackup.includes('Backup') && !txtBackup.includes('JSON'), 'botão "Backup"');
    checa(txtRest.includes('Restaurar Backup'), 'botão "Restaurar Backup"');
    checa(await page.locator('.logo-sabesp img').count() === 1, 'logo Sabesp na tela inicial');

    await page.click('#btn-novo');
    await page.waitForSelector('.etapas');

    // Aba 1 — Dados da Obra
    await page.selectOption('select[data-campo="unidade"]', 'OVMS');
    await page.fill('input[data-campo="os"]', '123456');
    await page.fill('input[data-campo="endereco"]', 'Rua das Flores, 100');
    await page.selectOption('select[data-campo="municipio"]', 'Taubaté');
    await page.fill('input[data-campo="localizacao"]', '-23.531109 / -46.695648');
    await page.selectOption('select[data-campo="tipoServico"]', 'Outros');
    await page.waitForSelector('input[data-campo="tipoServicoOutro"]:not([hidden])');
    await page.fill('input[data-campo="tipoServicoOutro"]', 'Serviço especial X');
    await page.fill('input[data-campo="dataInicio"]', '2026-06-23');
    await page.fill('input[data-campo="horaInicio"]', '08:00');
    await page.fill('input[data-campo="dataFim"]', '2026-06-23');
    await page.fill('input[data-campo="horaFim"]', '17:30');

    // Aba 2 — Rede de Gás
    await page.click('.etapa-chip[data-etapa="1"]');
    await page.waitForSelector('.opcoes[data-campo="material"]');
    await page.click('.opcoes[data-campo="material"] .opcao[data-valor="PE"]');
    await page.click('.opcoes[data-campo="diametro"] .opcao[data-valor="63"]');
    await page.click('.opcoes[data-campo="pressao"] .opcao[data-valor="4 bar"]');
    await page.click('.opcoes[data-campo="criticidade"] .opcao[data-valor="Alta"]');
    await page.fill('input[data-campo="responsavelDemarcacao"]', 'Fulano de Tal');

    // Aba 3 — Verificação de Segurança (+ foto na pergunta 1)
    await page.click('.etapa-chip[data-etapa="2"]');
    await page.waitForSelector('.item-seg');
    const itens = await page.$$('.item-seg');
    await itens[0].$eval('.opcao[data-valor="Sim"]', el => el.click());
    await itens[1].$eval('.opcao[data-valor="Não"]', el => el.click());
    await page.waitForTimeout(100);
    await itens[1].$eval('textarea[data-campo="justificativa"]', el => el.focus());
    await page.keyboard.type('Cadastro não disponível no momento');
    await itens[2].$eval('.opcao[data-valor="Sim"]', el => el.click());
    await itens[3].$eval('.opcao[data-valor="Sim"]', el => el.click());

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQz0AEYBxVSF8FAGn0Av/2bdGtAAAAAElFTkSuQmCC', 'base64');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      itens[0].$eval('.btn-foto[data-fonte="galeria"]', el => el.click())
    ]);
    await fileChooser.setFiles({ name: 'cadastro.png', mimeType: 'image/png', buffer: png });
    await page.waitForFunction(
      () => document.querySelectorAll('.item-seg')[0].querySelectorAll('.foto-mini').length >= 1,
      null, { timeout: 5000 });

    // Aba 4 — Atualização Cadastral (obrigatória)
    await page.click('.etapa-chip[data-etapa="3"]');
    await page.waitForSelector('.registro-cad');
    await page.click('.registro-cad .opcoes[data-campo="rede"] .opcao[data-valor="Água"]');
    await page.click('.registro-cad .opcoes[data-campo="tipos"] .opcao[data-valor="Profundidade"]');
    await page.fill('.registro-cad textarea[data-campo="descricao"]', 'Cadastro omitia a profundidade; rede a 0,50 m na calçada.');

    // Aba 5 — Responsáveis
    await page.click('.etapa-chip[data-etapa="4"]');
    await page.waitForSelector('input[data-campo="fiscal"]');
    await page.fill('input[data-campo="fiscal"]', 'Fiscal F');
    await page.fill('input[data-campo="empresaExecutora"]', 'Construtora XYZ');
    await page.fill('input[data-campo="responsavelExecutora"]', 'Responsável Executora D');
    await page.fill('input[data-campo="encarregado"]', 'Encarregado A');
    await page.fill('input[data-campo="coordenador"]', 'Coordenador B');
    await page.fill('input[data-campo="plantonista"]', 'Plantonista C');

    // Assinatura no dedo do Fiscal Sabesp (desenha no canvas e confirma)
    await page.click('.assinatura-campo[data-assinatura="fiscal"] [data-preview]');
    await page.waitForSelector('.modal-fundo canvas');
    const cv = await page.locator('.modal-fundo canvas').boundingBox();
    await page.mouse.move(cv.x + 30, cv.y + 40);
    await page.mouse.down();
    await page.mouse.move(cv.x + 90, cv.y + 90);
    await page.mouse.move(cv.x + 150, cv.y + 50);
    await page.mouse.up();
    await page.click('.modal-fundo [data-acao="confirmar"]');
    await page.waitForSelector('.assinatura-campo[data-assinatura="fiscal"] [data-preview] img', { timeout: 5000 });

    // Aba 6 — Observações
    await page.click('.etapa-chip[data-etapa="5"]');
    await page.waitForSelector('textarea[data-obs]');
    await page.fill('textarea[data-obs]', 'Escavação manual com sondagem prévia.');

    // Aba 7 — Relatório
    await page.click('.etapa-chip[data-etapa="6"]');
    await page.waitForSelector('#btn-gerar-rel');
    await page.click('#btn-gerar-rel');
    await page.waitForSelector('#relatorio');

    const texto = await page.textContent('#relatorio');
    checa(await page.locator('#relatorio .rel-logo').count() === 1, 'logo Sabesp no relatório');
    checa(texto.includes('123456'), 'OS no relatório');
    checa(texto.includes('Rua das Flores'), 'endereço no relatório');
    checa(texto.includes('Taubaté'), 'município no relatório');
    checa(texto.includes('Serviço especial X'), 'tipo de serviço "Outros" no relatório');
    checa(texto.includes('23/06/2026'), 'data de início no relatório (dd/mm/aaaa)');
    checa(texto.includes('08:00') && texto.includes('17:30'), 'horas de início e fim no relatório');
    checa(texto.includes('-23.531109 / -46.695648'), 'localização no relatório');
    checa(texto.includes('PE'), 'material no relatório');
    checa(texto.includes('Alta'), 'criticidade no relatório');
    checa(texto.includes('Cadastro não disponível'), 'justificativa no relatório');
    checa(texto.includes('Construtora XYZ'), 'empresa executora no relatório');
    checa(texto.includes('Encarregado A'), 'responsável no relatório');
    checa(texto.includes('Escavação manual'), 'observações no relatório');
    checa(texto.includes('Atualização Cadastral'), 'seção de atualização cadastral no relatório');
    checa(texto.includes('Cadastro omitia a profundidade'), 'descrição da atualização cadastral no relatório');
    checa(texto.includes('Fiscal Sabesp'), 'papel Fiscal Sabesp na seção de assinaturas');
    const numAss = await page.$$eval('#relatorio .rel-assinaturas img', els => els.length);
    checa(numAss >= 1, 'assinatura desenhada exibida no relatório');
    checa(texto.includes('Evidências Fotográficas'), 'seção de evidências fotográficas');

    const numImgs = await page.$$eval('#relatorio .rel-fotos img', els => els.length);
    checa(numImgs >= 1, 'foto exibida como evidência');
    const rotulos = await page.$$eval('#relatorio .rel-foto-rotulo', els => els.map(e => e.textContent.trim()));
    checa(rotulos.some(r => r.includes('Interferências localizadas')), 'legenda do campo na evidência');

    // Nome do PDF baseado no endereço da obra (intercepta window.print)
    const tituloPdf = await page.evaluate(() => new Promise(resolve => {
      window.print = () => resolve(document.title);
      document.getElementById('btn-pdf').click();
    }));
    checa(tituloPdf.includes('Rua das Flores, 100'), 'nome do PDF inclui o endereço da obra');
    checa(tituloPdf.includes('OS 123456'), 'nome do PDF inclui a OS');

    // Busca na tela inicial + persistência
    await page.goto(BASE);
    await page.waitForSelector('.cartao-checklist');
    await page.fill('#busca', '123456');
    await page.waitForTimeout(200);
    const cartoes = await page.$$('.cartao-checklist');
    checa(cartoes.length === 1, 'busca por OS retorna 1 resultado');

    // --- Segurança: validador de imagem rejeita src forjado, aceita dataURL válido ---
    const sanit = await page.evaluate(() => ({
      forjado: imagemSegura('x" onerror="window.__xss=1'),
      vazio: imagemSegura('javascript:alert(1)'),
      valido: imagemSegura('data:image/png;base64,AAAABBBB'),
      escapa: esc('a"><b')
    }));
    checa(sanit.forjado === '' && sanit.vazio === '', 'imagemSegura rejeita src não-imagem');
    checa(sanit.valido === 'data:image/png;base64,AAAABBBB', 'imagemSegura aceita dataURL válido');
    checa(!sanit.escapa.includes('"') && !sanit.escapa.includes('<'), 'esc escapa aspas e sinais');

    // --- Segurança: backup malicioso não injeta atributo/script (XSS via restauração) ---
    page.on('dialog', d => d.accept());
    await page.evaluate(() => { window.__xss = 0; });
    const payload = {
      app: 'checklist-gas-novo', versao: 1,
      dados: [{
        checklist: { id: 'x" onmouseover="window.__xss=1', obra: { os: 'XSSCASE', endereco: 'addr', municipio: 'Taubaté' } },
        fotos: [{ id: 'f" onerror="window.__xss=1', checklistId: 'x" onmouseover="window.__xss=1',
                  itemKey: 'seg:interferencias', dataUrl: 'x" onerror="window.__xss=1', local: null }]
      }]
    };
    await page.setInputFiles('#arq-importar', { name: 'evil.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
    await page.waitForFunction(() => [...document.querySelectorAll('.cartao-checklist .os')].some(e => e.textContent.includes('XSSCASE')), null, { timeout: 5000 });
    const temAtributoInjetado = await page.evaluate(() =>
      [...document.querySelectorAll('.cartao-checklist')].some(el => el.hasAttribute('onmouseover')));
    checa(!temAtributoInjetado, 'id de backup malicioso não vira atributo (escape ok)');
    checa(await page.evaluate(() => window.__xss) === 0, 'nenhum script do backup malicioso executou');

    if (erros.length) throw new Error('Erros de console: ' + JSON.stringify(erros));
    console.log('\n✅ E2E concluído com sucesso (sem erros de console).');
  } finally {
    if (browser) await browser.close();
    encerrar();
  }
})().catch(e => { console.error(e); process.exit(1); });
