/* Módulo de relatório — consolida as abas e permite imprimir/salvar em PDF */
'use strict';

/* Nome de arquivo sugerido ao salvar o PDF (o navegador usa o título da página).
   Inclui o endereço da obra, o município e a OS, sem caracteres inválidos. */
function nomeArquivoRelatorio(cl) {
  const partes = ['Checklist Gás'];
  const endereco = (cl.obra.endereco || '').trim();
  if (endereco) partes.push(endereco);
  const municipio = (municipioExibicao(cl.obra) || '').trim();
  if (municipio) partes.push(municipio);
  const os = (cl.obra.os || '').toString().trim();
  if (os) partes.push('OS ' + os);
  return partes.join(' - ')
    .replace(/[\\/:*?"<>|]+/g, ' ')   // caracteres inválidos em nome de arquivo
    .replace(/\s+/g, ' ')
    .trim() || 'Checklist Gás';
}

/* Imprime/salva o PDF com um nome de arquivo baseado no endereço da obra */
function imprimirRelatorio(cl) {
  const tituloOriginal = document.title;
  document.title = nomeArquivoRelatorio(cl);
  const restaurar = () => {
    document.title = tituloOriginal;
    window.removeEventListener('afterprint', restaurar);
  };
  window.addEventListener('afterprint', restaurar);
  setTimeout(restaurar, 60000); // garante a restauração mesmo se afterprint não disparar
  window.print();
}

/* Galeria de fotos com a localização GPS de cada uma (quando registrada).
   src é validado (imagemSegura) e as coordenadas são coagidas a número para evitar
   injeção/erros vindos de um backup restaurado. */
function galeriaFotosRel(fts, altText) {
  const alt = esc(altText);
  return `<div class="rel-fotos">${fts.map(ft => {
    const src = imagemSegura(ft.dataUrl);
    const lat = Number(ft.local && ft.local.lat);
    const lon = Number(ft.local && ft.local.lon);
    const prec = Number(ft.local && ft.local.precisao);
    const temGeo = Number.isFinite(lat) && Number.isFinite(lon);
    return `
    <figure class="rel-foto-fig">
      <img src="${src}" alt="${alt}">
      ${temGeo ? `<figcaption>📍 <a href="https://www.google.com/maps?q=${lat},${lon}"
          target="_blank" rel="noopener noreferrer">${lat.toFixed(6)}, ${lon.toFixed(6)}</a>${Number.isFinite(prec) ? ` ±${prec} m` : ''}</figcaption>`
        : `<figcaption class="sem-geo">sem localização</figcaption>`}
    </figure>`;
  }).join('')}</div>`;
}

/* Valor de um campo para o relatório (trata "Outros" e vazio) */
function valorCampoRel(c, dados) {
  const v = dados[c.id];
  if (v === '' || v === undefined || v === null) return '<span class="rel-num">—</span>';
  if (c.tipo === 'data') return esc(fmtData(v));
  if (c.outro && v === 'Outros') return esc(dados[c.outro.id] || 'Outros');
  return esc(v);
}

/* Assinaturas dos responsáveis (campos com assinatura) para o relatório */
function assinaturasRel(cl) {
  const assinaturas = cl.assinaturas || {};
  return CHECKLIST_DEF.responsaveis.filter(c => c.assinatura).map(c => {
    const img = assinaturas[c.id];
    const nome = cl.responsaveis[c.id];
    const src = imagemSegura(img);
    return `<div class="rel-ass">
      ${src ? `<img src="${src}" alt="Assinatura">` : `<div class="pendente">Pendente</div>`}
      <div class="nome">${esc(nome) || '&nbsp;'}</div>
      <div class="papel">${esc(c.label)}</div>
    </div>`;
  }).join('');
}

function tabelaCamposRel(defArray, dados) {
  return `<table class="rel-tabela">
      ${defArray.map((c, idx) => `
        <tr>
          <td class="rel-num" style="width:28px">${idx + 1}</td>
          <th style="width:46%">${esc(c.label)}</th>
          <td>${valorCampoRel(c, dados)}</td>
        </tr>`).join('')}
    </table>`;
}

/* Tabela de Atualização Cadastral para o relatório (só os registros válidos) */
function secaoCadastroRel(cl) {
  const validos = ((cl.cadastro && cl.cadastro.registros) || []).filter(registroCadastroValido);
  if (!validos.length) {
    return `<p class="rel-just rel-just-pend">⚠ ATUALIZAÇÃO CADASTRAL PENDENTE — nenhuma atualização registrada.</p>`;
  }
  return `<table class="rel-tabela">
      <tr><th style="width:24px">#</th><th style="width:64px">Rede</th><th>Informações</th>
          <th style="width:20%">Posição na via</th><th style="width:36%">Descrição</th></tr>
      ${validos.map((r, i) => `
        <tr>
          <td class="rel-num centro">${i + 1}</td>
          <td>${esc(r.rede) || '—'}</td>
          <td>${(r.tipos || []).length ? esc(r.tipos.join(', ')) : '—'}</td>
          <td>${esc(r.posicao) || '—'}</td>
          <td>${esc(r.descricao) || '—'}</td>
        </tr>`).join('')}
    </table>`;
}

/* Há ao menos uma assinatura ainda não preenchida? */
function temAssinaturaPendente(cl) {
  const ass = cl.assinaturas || {};
  return CHECKLIST_DEF.responsaveis.filter(c => c.assinatura).some(c => !imagemSegura(ass[c.id]));
}

/* Carrega o pdf.js sob demanda (fica no cache para uso offline) */
let _pdfjs = null;
function carregarPdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_pdfjs) return _pdfjs;
  _pdfjs = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'js/vendor/pdf.min.js';
    s.onload = () => {
      try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js'; } catch { /* ok */ }
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(new Error('Falha ao carregar pdf.js'));
    document.head.appendChild(s);
  });
  return _pdfjs;
}

/* Converte cada página de um PDF (dataURL) em imagem JPEG (dataURL) */
async function rasterizarPdf(lib, dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const doc = await lib.getDocument({ data: bytes, disableAutoFetch: true, disableStream: true }).promise;
  const paginas = [];
  const total = Math.min(doc.numPages, 30); // limite de segurança
  for (let n = 1; n <= total; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const escala = Math.min(2, 1200 / base.width);
    const viewport = page.getViewport({ scale: escala });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    paginas.push(canvas.toDataURL('image/jpeg', 0.82));
  }
  try { doc.destroy(); } catch { /* ok */ }
  return paginas;
}

/* Seção de anexos PDF do relatório (páginas rasterizadas para imprimir junto) */
async function renderAnexosRel(anexos) {
  if (!anexos.length) return '';
  let lib;
  try { lib = await carregarPdfjs(); }
  catch {
    return `<div class="rel-secao rel-anexos"><h3>Anexos (PDF)</h3>
      <p class="rel-num">Não foi possível carregar o leitor de PDF para incluir os anexos.</p></div>`;
  }
  const blocos = [];
  for (const a of anexos) {
    let paginas = [];
    try { paginas = await rasterizarPdf(lib, a.dataUrl); } catch { paginas = []; }
    const imgs = paginas.map((src, i) =>
      `<img class="anexo-pagina" src="${src}" alt="${esc(a.nome)} — página ${i + 1}">`).join('');
    blocos.push(`<div class="anexo-bloco">
      <div class="anexo-titulo">📄 ${esc(a.nome)}</div>
      ${imgs || `<p class="rel-num">Não foi possível renderizar este PDF.</p>`}
    </div>`);
  }
  return `<div class="rel-secao rel-anexos"><h3>Anexos (PDF)</h3>${blocos.join('')}</div>`;
}

async function telaRelatorio(cl) {
  const idxRelatorio = ETAPAS.findIndex(e => e.id === 'relatorio');
  montarTopo(`Relatório · OS ${cl.obra.os || 'sem número'}`, null, `#/form/${cl.id}/${idxRelatorio}`);

  const fotos = await DB.fotosDoChecklist(cl.id);
  const fotosPorItem = {};
  fotos.forEach(f => { (fotosPorItem[f.itemKey] = fotosPorItem[f.itemKey] || []).push(f); });

  // Anexos PDF: rasterizados em imagens para saírem impressos ao final do relatório
  const anexos = await DB.anexosDoChecklist(cl.id);
  let anexosHtml = '';
  if (anexos.length) {
    $view().innerHTML = `<div class="rel-carregando">Preparando anexos em PDF para impressão…</div>`;
    anexosHtml = await renderAnexosRel(anexos);
  }

  const p = progressoChecklist(cl);

  /* Verificação de segurança */
  const linhasSeg = CHECKLIST_DEF.seguranca.map((q, i) => {
    const d = cl.seguranca[i];
    const just = (d.justificativa || '').trim();
    let detalhe = '';
    if (d.resposta === 'Não') {
      detalhe = just
        ? `<div class="rel-just">Justificativa: ${esc(just)}</div>`
        : `<div class="rel-just rel-just-pend">⚠ RESPOSTA "NÃO" — SEM JUSTIFICATIVA</div>`;
    }
    const cls = d.resposta === 'Sim' ? 'ok-sim' : (d.resposta === 'Não' ? 'ok-nao' : '');
    return `
      <tr>
        <td class="rel-num centro">${i + 1}</td>
        <td>${esc(q.pergunta)}${detalhe}</td>
        <td class="${cls}">${esc(d.resposta) || '—'}</td>
      </tr>`;
  }).join('');

  /* Evidências fotográficas — legenda por campo (segurança e observações) */
  const gruposFoto = [
    ...CHECKLIST_DEF.seguranca.map(q => ({ key: `seg:${q.id}`, rotulo: q.pergunta })),
    ...((cl.cadastro && cl.cadastro.registros) || []).map((r, i) =>
      ({ key: `cad:${r.id}`, rotulo: `Atualização cadastral — Registro ${i + 1}${r.rede ? ' (' + r.rede + ')' : ''}` })),
    { key: 'obs', rotulo: 'Observações da obra' }
  ];
  const evidencias = gruposFoto.map(grp => {
    const fts = fotosPorItem[grp.key] || [];
    if (!fts.length) return '';
    return `<div class="rel-foto-rotulo">${esc(grp.rotulo)}</div>
      ${galeriaFotosRel(fts, grp.rotulo)}`;
  }).join('');

  const obs = (cl.observacoes.texto || '').trim();

  $view().innerHTML = `
    <div class="acoes-relatorio">
      <button class="btn btn-primario" id="btn-pdf">🖨 Gerar PDF (Imprimir / Salvar)</button>
      <button class="btn btn-secundario" id="btn-compartilhar">📤 Compartilhar</button>
    </div>
    <div class="relatorio" id="relatorio">
      <div class="rel-cabecalho">
        <img class="rel-logo" src="icons/sabesp-logo.png" alt="Sabesp">
        <h2>${esc(CHECKLIST_DEF.titulo)}</h2>
        <div class="rel-meta">OS ${esc(cl.obra.os) || '—'} · ${esc(municipioExibicao(cl.obra)) || '—'}
          · ${esc(unidadeExibicao(cl.obra)) || '—'} · Gerado em ${new Date().toLocaleString('pt-BR')}</div>
      </div>

      <div class="rel-resumo">
        <div class="cartao-resumo">
          <div class="valor ${p.pct === 100 && !p.pend ? 'completo' : ''}">${p.pct}%</div>
          <div class="desc">Verificações</div>
        </div>
        <div class="cartao-resumo">
          <div class="valor">${p.ok}/${p.total}</div>
          <div class="desc">Respondidas</div>
        </div>
        <div class="cartao-resumo">
          <div class="valor ${p.pend ? 'pendente-num' : 'completo'}">${p.pend}</div>
          <div class="desc">Sem justificativa</div>
        </div>
        <div class="cartao-resumo">
          <div class="valor">${fotos.length}</div>
          <div class="desc">Fotos</div>
        </div>
        <div class="cartao-resumo">
          <div class="valor">${esc(cl.gas.criticidade) || '—'}</div>
          <div class="desc">Criticidade</div>
        </div>
      </div>

      <div class="rel-secao">
        <h3>Dados da Obra</h3>
        ${tabelaCamposRel(CHECKLIST_DEF.obra, cl.obra)}
      </div>

      <div class="rel-secao">
        <h3>Informações da Rede de Gás</h3>
        ${tabelaCamposRel(CHECKLIST_DEF.gas, cl.gas)}
      </div>

      <div class="rel-secao">
        <h3>Verificação de Segurança <span style="float:right">${p.ok}/${p.total}</span></h3>
        <table class="rel-tabela">
          <tr><th style="width:24px">#</th><th>Pergunta</th><th style="width:64px">Resposta</th></tr>
          ${linhasSeg}
        </table>
      </div>

      <div class="rel-secao">
        <h3>Atualização Cadastral</h3>
        ${secaoCadastroRel(cl)}
      </div>

      <div class="rel-secao">
        <h3>Responsáveis</h3>
        ${tabelaCamposRel(CHECKLIST_DEF.responsaveis, cl.responsaveis)}
      </div>

      <div class="rel-secao">
        <h3>Assinaturas</h3>
        <div class="rel-assinaturas">${assinaturasRel(cl)}</div>
        ${temAssinaturaPendente(cl) ? `<p class="rel-obs-assinatura">Observação: assinaturas pendentes poderão ser assinadas digitalmente no PDF (assinatura/certificado digital).</p>` : ''}
      </div>

      <div class="rel-secao">
        <h3>Observações</h3>
        ${obs ? `<p class="rel-obs">${esc(obs)}</p>` : `<p class="rel-num">Sem observações.</p>`}
      </div>

      <div class="rel-secao">
        <h3>Evidências Fotográficas</h3>
        ${evidencias || `<p class="rel-num">Nenhuma foto anexada.</p>`}
      </div>

      ${anexosHtml}
    </div>`;

  document.getElementById('btn-pdf').onclick = () => imprimirRelatorio(cl);

  document.getElementById('btn-compartilhar').onclick = async () => {
    const resumo =
      `${CHECKLIST_DEF.titulo}\n` +
      `OS: ${cl.obra.os || '—'} | ${cl.obra.endereco || ''} - ${municipioExibicao(cl.obra) || ''}\n` +
      `Unidade: ${unidadeExibicao(cl.obra) || '—'} | Tipo de serviço: ${tipoServicoExibicao(cl.obra) || '—'}\n` +
      `Criticidade: ${cl.gas.criticidade || '—'} | Verificações: ${p.ok}/${p.total} (${p.pct}%)` +
      (p.pend ? ` | ⚠ ${p.pend} sem justificativa` : '') + '\n' +
      `Encarregado Sabesp: ${cl.responsaveis.encarregado || '—'} | Coordenador Sabesp: ${cl.responsaveis.coordenador || '—'}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Checklist Gás - OS ${cl.obra.os || ''}`, text: resumo }); } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(resumo);
      alert('Resumo copiado para a área de transferência.');
    }
  };
}
