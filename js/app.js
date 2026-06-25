/* Checklist Gás — aplicação principal (roteamento e telas) */
'use strict';

const ETAPAS = [
  { id: 'obra',         rotulo: 'Dados da Obra' },
  { id: 'gas',          rotulo: 'Rede de Gás' },
  { id: 'seguranca',    rotulo: 'Verificação de Segurança' },
  { id: 'cadastro',     rotulo: 'Atualização Cadastral' },
  { id: 'responsaveis', rotulo: 'Responsáveis' },
  { id: 'observacoes',  rotulo: 'Observações' },
  { id: 'relatorio',    rotulo: 'Relatório PDF' }
];

let clAtual = null;          // checklist em edição
let etapaAtualIdx = 0;       // índice da aba aberta (para re-render após assinar)
let salvarTimer = null;

const $view = () => document.getElementById('view');
const $topo = () => document.getElementById('topo');

/* ---------- util ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtData(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

function avisoSalvo() {
  const el = document.getElementById('aviso-salvo');
  el.classList.add('mostrar');
  clearTimeout(avisoSalvo._t);
  avisoSalvo._t = setTimeout(() => el.classList.remove('mostrar'), 1200);
}

function agendarSalvar() {
  clearTimeout(salvarTimer);
  salvarTimer = setTimeout(async () => {
    if (clAtual) {
      await DB.salvarChecklist(clAtual);
      avisoSalvo();
    }
  }, 400);
}

/* Persiste imediatamente as edições pendentes (evita perda ao trocar de aba/tela) */
async function flushSalvar() {
  clearTimeout(salvarTimer);
  if (clAtual) await DB.salvarChecklist(clAtual);
}

/* Compressão de foto: redimensiona para no máx. 1280px e converte em JPEG */
function comprimirFoto(arquivo) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(arquivo);
    img.onload = () => {
      const MAX = 1280;
      let { width: w, height: h } = img;
      if (w > MAX || h > MAX) {
        const k = MAX / Math.max(w, h);
        w = Math.round(w * k);
        h = Math.round(h * k);
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}

/* Localização GPS atual; resolve null se indisponível/negado (nunca trava o fluxo) */
function obterLocalizacao() {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        precisao: Math.round(pos.coords.accuracy)
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

/* Coordenadas no formato lançado no campo de localização */
function formatarCoord(local) {
  if (!local) return '';
  return `${local.lat.toFixed(6)} / ${local.lon.toFixed(6)}`;
}

/* Anexa fotos a uma chave (pergunta de segurança ou observações) */
function ligarFotos(wrap, itemKey, aoMudar) {
  async function render() {
    const fotos = await DB.fotosDoItem(clAtual.id, itemKey);
    wrap.innerHTML = fotos.map(f => {
      // src validado e id escapado: dados podem vir de um backup restaurado
      const src = imagemSegura(f.dataUrl);
      const lat = Number(f.local && f.local.lat);
      const lon = Number(f.local && f.local.lon);
      const prec = Number(f.local && f.local.precisao);
      const temGeo = Number.isFinite(lat) && Number.isFinite(lon);
      return `
      <div class="foto-mini">
        <img src="${src}" alt="Evidência">
        ${temGeo ? `<span class="geo-badge" title="📍 ${lat.toFixed(6)}, ${lon.toFixed(6)}${Number.isFinite(prec) ? ` (±${prec} m)` : ''}">📍</span>` : ''}
        <button class="rm" data-foto="${esc(f.id)}" aria-label="Remover foto">✕</button>
      </div>`;
    }).join('') +
      `<button class="btn-foto" data-fonte="camera"><span class="cam">📷</span>Câmera</button>
       <button class="btn-foto" data-fonte="galeria"><span class="cam">🖼️</span>Galeria</button>`;
    if (aoMudar) aoMudar(fotos.length);
  }
  render();

  async function anexar(arquivo) {
    try {
      // comprime a imagem e captura o GPS em paralelo
      const [dataUrl, local] = await Promise.all([
        comprimirFoto(arquivo),
        obterLocalizacao()
      ]);
      await DB.salvarFoto({
        id: 'ft_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        checklistId: clAtual.id,
        itemKey,
        dataUrl,
        local,
        criadoEm: new Date().toISOString()
      });
      render();
    } catch {
      alert('Não foi possível processar a imagem.');
    }
  }

  wrap.addEventListener('click', async e => {
    const rm = e.target.closest('[data-foto]');
    if (rm) {
      await DB.excluirFoto(rm.dataset.foto);
      render();
      return;
    }
    const btn = e.target.closest('[data-fonte]');
    if (btn) {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      // câmera: força a captura ao vivo; galeria: sem capture, abre fotos do aparelho
      if (btn.dataset.fonte === 'camera') inp.setAttribute('capture', 'environment');
      inp.onchange = () => { if (inp.files[0]) anexar(inp.files[0]); };
      inp.click();
    }
  });
}

/* ---------- roteador ---------- */
async function rotear() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [tela, id, extra] = hash.split('/');
  await flushSalvar();

  if (tela === 'form' && id) {
    clAtual = migrarChecklist(await DB.obterChecklist(id));
    if (!clAtual) { location.hash = '#/'; return; }
    telaFormulario(parseInt(extra, 10) || 0);
  } else if (tela === 'relatorio' && id) {
    const cl = migrarChecklist(await DB.obterChecklist(id));
    if (!cl) { location.hash = '#/'; return; }
    await telaRelatorio(cl);
  } else {
    clAtual = null;
    await telaInicial();
  }
}

function montarTopo(titulo, sub, voltar) {
  $topo().innerHTML = `
    ${voltar ? `<button class="btn-icone" id="btn-voltar" aria-label="Voltar">←</button>` : ''}
    <h1>${esc(titulo)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</h1>`;
  if (voltar) document.getElementById('btn-voltar').onclick = () => { location.hash = voltar; };
}

/* ---------- versão e histórico de atualizações ---------- */
let popVersoes = null;

document.addEventListener('click', e => {
  if (popVersoes && !popVersoes.hidden && !popVersoes.contains(e.target)) popVersoes.hidden = true;
});

function montarBadgeVersao() {
  if (popVersoes) { popVersoes.remove(); popVersoes = null; }
  $topo().insertAdjacentHTML('beforeend',
    `<button class="badge-versao" id="badge-versao" aria-label="Versão e histórico de atualizações">v${APP_VERSAO}</button>`);

  const badge = document.getElementById('badge-versao');
  const pop = document.createElement('div');
  pop.className = 'popover-versoes';
  pop.hidden = true;
  pop.innerHTML = `
    <h4>Histórico de atualizações</h4>
    ${HISTORICO_VERSOES.map(v => `
      <div class="versao-bloco">
        <div class="versao-cabeca"><b>v${esc(v.versao)}</b><span>${fmtData(v.data)}</span></div>
        <ul>${v.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
      </div>`).join('')}`;
  document.body.appendChild(pop);
  popVersoes = pop;

  let fecharTimer = null;
  let abriuPorHover = 0;
  const abrir = () => {
    clearTimeout(fecharTimer);
    if (pop.hidden) abriuPorHover = Date.now();
    pop.hidden = false;
  };
  const fechar = () => { fecharTimer = setTimeout(() => { pop.hidden = true; }, 250); };

  badge.addEventListener('mouseenter', abrir);
  badge.addEventListener('mouseleave', fechar);
  pop.addEventListener('mouseenter', abrir);
  pop.addEventListener('mouseleave', fechar);
  badge.addEventListener('click', e => {            // toque no celular
    e.stopPropagation();
    clearTimeout(fecharTimer);
    if (Date.now() - abriuPorHover < 600) pop.hidden = false;
    else pop.hidden = !pop.hidden;
  });
}

/* ---------- tela inicial ---------- */
async function telaInicial() {
  montarTopo('Checklist Gás', 'Obras com interferência em rede de gás', null);
  montarBadgeVersao();
  const lista = (await DB.listarChecklists()).map(migrarChecklist);

  $view().innerHTML = `
    <div class="logo-sabesp"><img src="icons/sabesp-logo.png" alt="Sabesp"></div>
    <input type="search" class="busca" id="busca" placeholder="Buscar por OS, endereço ou responsável…">
    <div id="lista"></div>
    <div class="acoes-home">
      <button class="btn btn-secundario" id="btn-exportar">⬇ Backup</button>
      <button class="btn btn-secundario" id="btn-importar">⬆ Restaurar Backup</button>
    </div>
    <input type="file" id="arq-importar" accept="application/json" hidden>
    <button class="btn btn-primario btn-flutuante" id="btn-novo">＋ Novo checklist</button>`;

  function renderLista(filtro) {
    const f = (filtro || '').toLowerCase();
    const visiveis = lista.filter(cl => {
      const o = cl.obra, r = cl.responsaveis, g = cl.gas;
      return !f || [o.os, o.endereco, o.municipio, o.municipioOutro, o.unidade, o.unidadeOutro,
                    o.tipoServico, o.tipoServicoOutro, r.empresaExecutora, r.responsavelExecutora,
                    r.encarregado, r.coordenador, r.plantonista, g.responsavelDemarcacao]
        .some(v => (v || '').toString().toLowerCase().includes(f));
    });
    const alvo = document.getElementById('lista');
    if (!visiveis.length) {
      alvo.innerHTML = `<div class="vazio"><div class="icone-grande">📋</div>
        ${lista.length ? 'Nenhum checklist corresponde à busca.' : 'Nenhum checklist ainda.<br>Toque em <b>＋ Novo checklist</b> para começar.'}</div>`;
      return;
    }
    alvo.innerHTML = visiveis.map(cl => {
      const p = progressoChecklist(cl);
      const completo = p.pct === 100 && !p.pend;
      return `
      <div class="cartao-checklist ${completo ? 'concluido' : ''}" data-id="${esc(cl.id)}">
        <div class="linha1">
          <span class="os">OS ${esc(cl.obra.os) || 'sem número'}</span>
          <span class="data">${fmtData(cl.criadoEm)}</span>
        </div>
        <div class="endereco">${esc(cl.obra.endereco) || 'Endereço não informado'} · ${esc(municipioExibicao(cl.obra)) || '—'}</div>
        <div class="rodape">
          <div class="barra-prog ${completo ? 'cheia' : ''}"><div style="width:${p.pct}%"></div></div>
          <span class="pct">${p.ok}/${p.total} verif.${p.pend ? `<br><span class="pend-aviso">⚠ ${p.pend} sem justif.</span>` : ''}</span>
          <div class="acoes">
            <button data-acao="relatorio" title="Relatório">📄</button>
            <button data-acao="excluir" title="Excluir">🗑</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  renderLista('');

  document.getElementById('busca').addEventListener('input', e => renderLista(e.target.value));

  document.getElementById('lista').addEventListener('click', async e => {
    const cartao = e.target.closest('.cartao-checklist');
    if (!cartao) return;
    const id = cartao.dataset.id;
    const acao = e.target.dataset && e.target.dataset.acao;
    if (acao === 'excluir') {
      const cl = lista.find(c => c.id === id);
      if (confirm(`Excluir o checklist da OS ${cl.obra.os || '(sem número)'}? As fotos também serão removidas.`)) {
        await DB.excluirChecklist(id);
        const i = lista.indexOf(cl);
        if (i >= 0) lista.splice(i, 1);
        renderLista(document.getElementById('busca').value);
      }
    } else if (acao === 'relatorio') {
      location.hash = `#/relatorio/${id}`;
    } else {
      location.hash = `#/form/${id}/0`;
    }
  });

  document.getElementById('btn-novo').onclick = async () => {
    const cl = novoChecklist();
    await DB.salvarChecklist(cl);
    location.hash = `#/form/${cl.id}/0`;
  };

  document.getElementById('btn-exportar').onclick = async () => {
    const todos = await DB.listarChecklists();
    const comFotos = [];
    for (const cl of todos) {
      comFotos.push({ checklist: cl, fotos: await DB.fotosDoChecklist(cl.id) });
    }
    const blob = new Blob([JSON.stringify({ app: 'checklist-gas-novo', versao: 1, dados: comFotos })],
      { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-checklist-gas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  document.getElementById('btn-importar').onclick = () => document.getElementById('arq-importar').click();
  document.getElementById('arq-importar').addEventListener('change', async e => {
    const arq = e.target.files[0];
    if (!arq) return;
    try {
      const json = JSON.parse(await arq.text());
      if (json.app !== 'checklist-gas-novo' || !Array.isArray(json.dados)) throw new Error('formato');
      for (const reg of json.dados) {
        await DB.salvarChecklist(migrarChecklist(reg.checklist));
        for (const foto of reg.fotos || []) await DB.salvarFoto(foto);
      }
      alert(`Backup restaurado: ${json.dados.length} checklist(s).`);
      rotear();
    } catch {
      alert('Arquivo de backup inválido.');
    }
  });
}

/* ---------- formulário ---------- */
function etapaCompleta(etapa) {
  const o = clAtual.obra, g = clAtual.gas, r = clAtual.responsaveis;
  if (etapa.id === 'obra') return !!(o.os && o.endereco && o.municipio && o.unidade && o.tipoServico);
  if (etapa.id === 'gas') return !!(g.material && g.diametro && g.pressao && g.criticidade);
  if (etapa.id === 'seguranca') return clAtual.seguranca.every(segResolvida);
  if (etapa.id === 'cadastro') return cadastroPreenchido(clAtual) >= 1;
  if (etapa.id === 'responsaveis') return !!(r.empresaExecutora || r.responsavelExecutora || r.encarregado || r.coordenador || r.plantonista);
  if (etapa.id === 'observacoes') return (clAtual.observacoes.texto || '').trim() !== '';
  return false;
}

function telaFormulario(etapaIdx) {
  etapaIdx = Math.min(etapaIdx, ETAPAS.length - 1);
  etapaAtualIdx = etapaIdx;
  const etapa = ETAPAS[etapaIdx];
  montarTopo(`OS ${clAtual.obra.os || 'sem número'}`, etapa.rotulo, '#/');

  const chips = ETAPAS.map((e, i) =>
    `<button class="etapa-chip ${i === etapaIdx ? 'ativa' : ''} ${etapaCompleta(e) ? 'completa' : ''}"
      data-etapa="${i}">${esc(e.rotulo)}</button>`).join('');

  let corpo;
  if (etapa.id === 'obra')         corpo = htmlEtapaCampos('Dados da Obra', CHECKLIST_DEF.obra, clAtual.obra);
  else if (etapa.id === 'gas')     corpo = htmlEtapaCampos('Informações da Rede de Gás', CHECKLIST_DEF.gas, clAtual.gas);
  else if (etapa.id === 'seguranca') corpo = htmlEtapaSeguranca();
  else if (etapa.id === 'cadastro') corpo = htmlEtapaCadastro();
  else if (etapa.id === 'responsaveis') corpo = htmlEtapaCampos('Responsáveis', CHECKLIST_DEF.responsaveis, clAtual.responsaveis);
  else if (etapa.id === 'observacoes') corpo = htmlEtapaObservacoes();
  else corpo = htmlEtapaRelatorio();

  $view().innerHTML = `
    <div class="etapas">${chips}</div>
    <div style="padding-top:6px">${corpo}</div>
    <div class="nav-form">
      ${etapaIdx > 0
        ? `<button class="btn btn-secundario" id="btn-ant">← Anterior</button>` : ''}
      ${etapaIdx < ETAPAS.length - 1
        ? `<button class="btn btn-primario" id="btn-prox">Próxima →</button>` : ''}
    </div>`;

  $view().querySelector('.etapas').addEventListener('click', e => {
    const chip = e.target.closest('.etapa-chip');
    if (chip) location.hash = `#/form/${clAtual.id}/${chip.dataset.etapa}`;
  });
  const btnAnt = document.getElementById('btn-ant');
  if (btnAnt) btnAnt.onclick = () => { location.hash = `#/form/${clAtual.id}/${etapaIdx - 1}`; };
  const btnProx = document.getElementById('btn-prox');
  if (btnProx) btnProx.onclick = () => { location.hash = `#/form/${clAtual.id}/${etapaIdx + 1}`; };

  if (etapa.id === 'obra')         ligarEtapaCampos(CHECKLIST_DEF.obra, clAtual.obra);
  else if (etapa.id === 'gas')     ligarEtapaCampos(CHECKLIST_DEF.gas, clAtual.gas);
  else if (etapa.id === 'seguranca') ligarEtapaSeguranca();
  else if (etapa.id === 'cadastro') ligarEtapaCadastro();
  else if (etapa.id === 'responsaveis') ligarEtapaCampos(CHECKLIST_DEF.responsaveis, clAtual.responsaveis);
  else if (etapa.id === 'observacoes') ligarEtapaObservacoes();
  else ligarEtapaRelatorio();
}

/* --- renderização genérica de campos (obra, gás, responsáveis) --- */
function htmlControleCampo(c, dados) {
  const v = dados[c.id];
  if (c.tipo === 'opcoes') {
    return `<div class="opcoes" data-campo="${c.id}">` +
      c.opcoes.map(op =>
        `<button class="opcao ${v === op ? 'marcada' : ''}" data-valor="${esc(op)}">${esc(op)}</button>`
      ).join('') + `</div>`;
  }
  if (c.tipo === 'select') {
    return `<select data-campo="${c.id}" ${c.outro ? `data-tem-outro="${c.outro.id}"` : ''}>
        <option value="">Selecione…</option>
        ${c.opcoes.map(op => `<option value="${esc(op)}" ${v === op ? 'selected' : ''}>${esc(op)}</option>`).join('')}
      </select>` +
      (c.outro ? `<input type="text" class="campo-outro" data-campo="${c.outro.id}"
        placeholder="${esc(c.outro.placeholder)}" value="${esc(dados[c.outro.id])}"
        ${v === 'Outros' ? '' : 'hidden'}>` : '');
  }
  if (c.tipo === 'gps') {
    return `<div class="gps-bloco">
        <input type="text" data-campo="${c.id}" value="${esc(v)}" placeholder="-23.531109 / -46.695648">
        <button type="button" class="btn btn-secundario btn-gps" data-gps="${c.id}">📍 Obter localização</button>
      </div>`;
  }
  if (c.tipo === 'data') {
    return `<input type="date" data-campo="${c.id}" value="${esc(v)}">`;
  }
  if (c.tipo === 'hora') {
    return `<input type="time" data-campo="${c.id}" value="${esc(v)}">`;
  }
  if (c.tipo === 'areatexto') {
    return `<textarea data-campo="${c.id}" placeholder="${esc(c.placeholder || '')}">${esc(v)}</textarea>`;
  }
  if (c.tipo === 'numero') {
    return `<input type="number" inputmode="decimal" ${c.passo ? `step="${c.passo}"` : ''}
      min="0" data-campo="${c.id}" value="${esc(v)}" placeholder="${esc(c.placeholder || '')}">`;
  }
  return `<input type="text" data-campo="${c.id}" value="${esc(v)}" placeholder="${esc(c.placeholder || '')}">`;
}

function htmlAssinaturaCampo(c) {
  const img = (clAtual.assinaturas || {})[c.id];
  return `<div class="assinatura-campo" data-assinatura="${c.id}">
      <label class="rotulo rotulo-fotos">Assinatura</label>
      <div class="assinatura-preview" data-preview>${img ? `<img src="${imagemSegura(img)}" alt="Assinatura">` : 'Toque para assinar'}</div>
      ${img ? `<div class="assinatura-acoes"><button class="btn btn-perigo" data-acao="apagar">Apagar assinatura</button></div>` : ''}
    </div>`;
}

function htmlEtapaCampos(titulo, defArray, dados) {
  return `<div class="secao-titulo">${esc(titulo)}</div>` +
    defArray.map((c, idx) => `<div class="campo">
        <label class="rotulo"><span class="num">${idx + 1}.</span>${esc(c.label)}</label>
        ${htmlControleCampo(c, dados)}
        ${c.hint ? `<div class="hint">${esc(c.hint)}</div>` : ''}
        ${c.assinatura ? htmlAssinaturaCampo(c) : ''}
      </div>`).join('');
}

function ligarEtapaCampos(defArray, dados) {
  $view().querySelectorAll('input[data-campo], select[data-campo], textarea[data-campo]').forEach(inp => {
    inp.addEventListener('input', () => {
      dados[inp.dataset.campo] = inp.value;
      if (inp.dataset.temOutro) {
        const campoOutro = inp.closest('.campo').querySelector(`[data-campo="${inp.dataset.temOutro}"]`);
        campoOutro.hidden = inp.value !== 'Outros';
        if (!campoOutro.hidden) campoOutro.focus();
      }
      agendarSalvar();
    });
  });
  $view().querySelectorAll('.opcoes[data-campo]').forEach(grupo => {
    grupo.addEventListener('click', e => {
      const btn = e.target.closest('.opcao');
      if (!btn) return;
      const campo = grupo.dataset.campo;
      // tocar de novo na opção marcada desmarca
      const novo = dados[campo] === btn.dataset.valor ? '' : btn.dataset.valor;
      dados[campo] = novo;
      grupo.querySelectorAll('.opcao').forEach(b =>
        b.classList.toggle('marcada', b.dataset.valor === novo));
      agendarSalvar();
    });
  });
  $view().querySelectorAll('.btn-gps[data-gps]').forEach(btn => {
    btn.onclick = async () => {
      const campo = btn.dataset.gps;
      const inp = $view().querySelector(`input[data-campo="${campo}"]`);
      const rotulo = btn.textContent;
      btn.disabled = true;
      btn.textContent = '📍 Obtendo…';
      const local = await obterLocalizacao();
      btn.disabled = false;
      btn.textContent = rotulo;
      if (local) {
        const texto = formatarCoord(local);
        dados[campo] = texto;
        if (inp) inp.value = texto;
        agendarSalvar();
      } else {
        alert('Não foi possível obter a localização. Verifique se o GPS e a permissão de localização estão ativos.');
      }
    };
  });
  $view().querySelectorAll('.assinatura-campo[data-assinatura]').forEach(el => {
    const id = el.dataset.assinatura;
    const def = defArray.find(c => c.id === id);
    const label = def ? def.label : 'Assinatura';

    el.querySelector('[data-preview]').onclick = async () => {
      const img = await capturarAssinatura(label);
      if (img) {
        clAtual.assinaturas[id] = img;
        await DB.salvarChecklist(clAtual);
        telaFormulario(etapaAtualIdx);
      }
    };
    const apagar = el.querySelector('[data-acao=apagar]');
    if (apagar) apagar.onclick = async () => {
      if (!confirm(`Apagar a assinatura de ${label}?`)) return;
      clAtual.assinaturas[id] = null;
      await DB.salvarChecklist(clAtual);
      telaFormulario(etapaAtualIdx);
    };
  });
}

/* --- etapa: verificação de segurança --- */
function htmlEtapaSeguranca() {
  return `<div class="secao-titulo">Verificação de Segurança</div>
    <div class="aviso-regra">Respostas "Não" exigem justificativa obrigatória.</div>` +
    CHECKLIST_DEF.seguranca.map((q, i) => {
      const dado = clAtual.seguranca[i];
      const pendente = !segResolvida(dado);
      const ehNao = dado.resposta === 'Não';
      return `<div class="item-seg ${pendente && dado.resposta ? 'sem-just' : ''}" data-item="${i}">
        <div class="seg-pergunta"><span class="num-item">${i + 1}.</span>${esc(q.pergunta)}</div>
        <div class="opcoes seg-resposta" data-resposta>
          <button class="opcao ${dado.resposta === 'Sim' ? 'marcada sim' : ''}" data-valor="Sim">Sim</button>
          <button class="opcao ${dado.resposta === 'Não' ? 'marcada nao' : ''}" data-valor="Não">Não</button>
        </div>
        <div class="just-bloco" data-just ${ehNao ? '' : 'hidden'}>
          <label class="just-rotulo">Justificativa obrigatória (resposta "Não")</label>
          <textarea data-campo="justificativa" class="${ehNao && !(dado.justificativa || '').trim() ? 'just-vazia' : ''}"
            placeholder="Justifique a resposta…">${esc(dado.justificativa)}</textarea>
        </div>
        <label class="rotulo rotulo-fotos">Fotos (câmera ou galeria)</label>
        <div class="fotos-wrap" data-fotos></div>
      </div>`;
    }).join('');
}

function ligarEtapaSeguranca() {
  $view().querySelectorAll('.item-seg').forEach(el => {
    const i = parseInt(el.dataset.item, 10);
    const dado = clAtual.seguranca[i];
    const q = CHECKLIST_DEF.seguranca[i];
    const blocoJust = el.querySelector('[data-just]');
    const txtJust = blocoJust.querySelector('textarea');

    function atualizarEstado() {
      const ehNao = dado.resposta === 'Não';
      blocoJust.hidden = !ehNao;
      const pendente = ehNao && !(dado.justificativa || '').trim();
      el.classList.toggle('sem-just', pendente);
      txtJust.classList.toggle('just-vazia', pendente);
    }

    el.querySelector('[data-resposta]').addEventListener('click', e => {
      const btn = e.target.closest('.opcao');
      if (!btn) return;
      dado.resposta = dado.resposta === btn.dataset.valor ? '' : btn.dataset.valor;
      el.querySelectorAll('[data-resposta] .opcao').forEach(b => {
        const marcada = b.dataset.valor === dado.resposta;
        b.classList.toggle('marcada', marcada);
        b.classList.toggle('sim', marcada && b.dataset.valor === 'Sim');
        b.classList.toggle('nao', marcada && b.dataset.valor === 'Não');
      });
      atualizarEstado();
      agendarSalvar();
    });

    txtJust.addEventListener('input', () => {
      dado.justificativa = txtJust.value;
      atualizarEstado();
      agendarSalvar();
    });

    ligarFotos(el.querySelector('[data-fotos]'), `seg:${q.id}`);
  });
}

/* --- etapa: atualização cadastral (obrigatória; um ou mais registros) --- */
function htmlEtapaCadastro() {
  const def = CHECKLIST_DEF.cadastro;
  const registros = clAtual.cadastro.registros;
  const corpo = registros.map((r, i) => `
    <div class="registro-cad" data-reg="${esc(r.id)}">
      <div class="reg-cabeca">
        <h3>Registro ${i + 1}</h3>
        ${registros.length > 1 ? `<button class="btn-icone-reg" data-acao="remover" title="Remover registro">🗑</button>` : ''}
      </div>
      <label class="rotulo">Rede</label>
      <div class="opcoes" data-campo="rede">
        ${def.redes.map(op => `<button class="opcao ${r.rede === op ? 'marcada' : ''}" data-valor="${esc(op)}">${esc(op)}</button>`).join('')}
      </div>
      <label class="rotulo">Informação a atualizar no cadastro</label>
      <div class="opcoes" data-campo="tipos" data-multi>
        ${def.tipos.map(op => `<button class="opcao ${(r.tipos || []).includes(op) ? 'marcada' : ''}" data-valor="${esc(op)}">${esc(op)}</button>`).join('')}
      </div>
      <label class="rotulo">Posição da rede na via</label>
      <div class="opcoes" data-campo="posicao">
        ${def.posicoes.map(op => `<button class="opcao ${r.posicao === op ? 'marcada' : ''}" data-valor="${esc(op)}">${esc(op)}</button>`).join('')}
      </div>
      <label class="rotulo">Descrição da atualização</label>
      <textarea data-campo="descricao" class="${(r.descricao || '').trim() ? '' : 'just-vazia'}"
        placeholder="Ex.: o cadastro não informava a profundidade; rede encontrada a 0,50 m na calçada.">${esc(r.descricao)}</textarea>
      <label class="rotulo">Fotos (câmera ou galeria)</label>
      <div class="fotos-wrap" data-fotos></div>
    </div>`).join('');

  return `<div class="secao-titulo">${esc(def.titulo)}</div>
    <div class="aviso-regra">Etapa obrigatória: registre ao menos uma atualização do cadastro com base no que foi verificado em campo. Você pode adicionar mais de uma.</div>
    <div id="registros-cad">${corpo}</div>
    <button class="btn btn-secundario btn-bloco" id="btn-add-registro">＋ Adicionar outra atualização</button>`;
}

function ligarEtapaCadastro() {
  const idx = etapaAtualIdx;
  const cad = clAtual.cadastro;

  const btnAdd = document.getElementById('btn-add-registro');
  if (btnAdd) btnAdd.onclick = async () => {
    cad.registros.push(novoRegistroCadastro());
    await DB.salvarChecklist(clAtual);
    telaFormulario(idx);
  };

  $view().querySelectorAll('.registro-cad').forEach(el => {
    const reg = cad.registros.find(r => r.id === el.dataset.reg);
    if (!reg) return;

    const rm = el.querySelector('[data-acao=remover]');
    if (rm) rm.onclick = async () => {
      if (!confirm('Remover este registro? As fotos dele também serão removidas.')) return;
      const fotos = await DB.fotosDoItem(clAtual.id, `cad:${reg.id}`);
      for (const f of fotos) await DB.excluirFoto(f.id);
      cad.registros = cad.registros.filter(r => r.id !== reg.id);
      await DB.salvarChecklist(clAtual);
      telaFormulario(idx);
    };

    el.querySelectorAll('.opcoes[data-campo]').forEach(grupo => {
      const campo = grupo.dataset.campo;
      const multi = grupo.hasAttribute('data-multi');
      grupo.addEventListener('click', e => {
        const btn = e.target.closest('.opcao');
        if (!btn) return;
        if (multi) {
          const atual = reg[campo] || [];
          const i = atual.indexOf(btn.dataset.valor);
          if (i >= 0) atual.splice(i, 1); else atual.push(btn.dataset.valor);
          reg[campo] = atual;
          btn.classList.toggle('marcada', i < 0);
        } else {
          const novo = reg[campo] === btn.dataset.valor ? '' : btn.dataset.valor;
          reg[campo] = novo;
          grupo.querySelectorAll('.opcao').forEach(b => b.classList.toggle('marcada', b.dataset.valor === novo));
        }
        agendarSalvar();
      });
    });

    const txt = el.querySelector('textarea[data-campo=descricao]');
    txt.addEventListener('input', () => {
      reg.descricao = txt.value;
      txt.classList.toggle('just-vazia', !txt.value.trim());
      agendarSalvar();
    });

    ligarFotos(el.querySelector('[data-fotos]'), `cad:${reg.id}`);
  });
}

/* --- etapa: observações --- */
function htmlEtapaObservacoes() {
  return `<div class="secao-titulo">Observações</div>
    <div class="campo">
      <label class="rotulo">Informações sobre a escavação ou detalhes da obra</label>
      <textarea data-obs class="obs-grande"
        placeholder="Digite aqui as observações do fiscal…">${esc(clAtual.observacoes.texto)}</textarea>
    </div>
    <div class="campo">
      <label class="rotulo">Fotos (câmera ou galeria)</label>
      <div class="fotos-wrap" data-fotos></div>
    </div>`;
}

function ligarEtapaObservacoes() {
  const txt = $view().querySelector('[data-obs]');
  txt.addEventListener('input', () => {
    clAtual.observacoes.texto = txt.value;
    agendarSalvar();
  });
  ligarFotos($view().querySelector('[data-fotos]'), 'obs');
}

/* --- etapa: relatório PDF --- */
function htmlEtapaRelatorio() {
  const p = progressoChecklist(clAtual);
  return `<div class="secao-titulo">Relatório PDF</div>
    <div class="campo rel-intro">
      <p>Gere o relatório com todas as informações preenchidas nas abas anteriores e as evidências fotográficas.</p>
      ${p.pend ? `<p class="rel-aviso-pend">⚠ ${p.pend} verificação(ões) respondida(s) "Não" sem justificativa.</p>` : ''}
      ${cadastroPreenchido(clAtual) < 1 ? `<p class="rel-aviso-pend">⚠ Atualização cadastral pendente (registre ao menos uma).</p>` : ''}
      <button class="btn btn-primario btn-bloco" id="btn-gerar-rel">📄 Gerar relatório em PDF</button>
    </div>`;
}

function ligarEtapaRelatorio() {
  document.getElementById('btn-gerar-rel').onclick = () => {
    location.hash = `#/relatorio/${clAtual.id}`;
  };
}

/* ---------- inicialização ---------- */
window.addEventListener('hashchange', rotear);
window.addEventListener('load', () => {
  rotear();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
