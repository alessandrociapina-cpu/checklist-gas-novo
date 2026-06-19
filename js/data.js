/* Definição do checklist — fonte única dos campos, opções e abas do novo check-list */
'use strict';

const UNIDADES = ['OVMS', 'OVMI', 'OV', 'Outros'];

const MUNICIPIOS = [
  'São José dos Campos', 'Taubaté', 'Caçapava', 'Pindamonhangaba', 'Caraguatatuba', 'Outros'
];

const TIPOS_SERVICO = [
  'Reparo de rede de água',
  'Reparo de rede de esgoto',
  'Assentamento de rede de água',
  'Assentamento de rede de esgoto',
  'Remanejamento de rede de água',
  'Remanejamento de rede de esgoto',
  'Ligação dimensionada',
  'Outros'
];

const CHECKLIST_DEF = {
  titulo: 'CHECKLIST DE SEGURANÇA - OBRAS COM INTERFERÊNCIA EM REDE DE GÁS',

  /* Aba 1 — Dados da Obra */
  obra: [
    { id: 'unidade', label: 'Unidade Responsável', tipo: 'select',
      opcoes: UNIDADES, outro: { id: 'unidadeOutro', placeholder: 'Informe a unidade' } },
    { id: 'os', label: 'Número da OS', tipo: 'numero' },
    { id: 'endereco', label: 'Endereço', tipo: 'texto', placeholder: 'Endereço da obra' },
    { id: 'municipio', label: 'Município', tipo: 'select',
      opcoes: MUNICIPIOS, outro: { id: 'municipioOutro', placeholder: 'Digite o nome do município' } },
    { id: 'localizacao', label: 'Localização', tipo: 'gps',
      hint: 'Toque em "Obter localização" para capturar as coordenadas GPS do aparelho' },
    { id: 'tipoServico', label: 'Tipo de Serviço', tipo: 'select',
      opcoes: TIPOS_SERVICO, outro: { id: 'tipoServicoOutro', placeholder: 'Informe o tipo de serviço' } }
  ],

  /* Aba 2 — Informações da Rede de Gás */
  gas: [
    { id: 'protocoloComgas', label: 'Protocolo de Atendimento Comgás', tipo: 'texto' },
    { id: 'protocoloAcompanhamento', label: 'Protocolo de Acompanhamento', tipo: 'texto' },
    { id: 'qtdInterferencias', label: 'Quantidade de Interferências', tipo: 'numero' },
    { id: 'material', label: 'Material', tipo: 'opcoes', opcoes: ['PE', 'Aço'] },
    { id: 'profundidade', label: 'Profundidade (m)', tipo: 'numero', passo: '0.01' },
    { id: 'diametro', label: 'Diâmetro Rede/Ramal de Gás', tipo: 'opcoes',
      opcoes: ['20', '40', '63', '90', '125', '4"', '6"', '8"'] },
    { id: 'pressao', label: 'Pressão', tipo: 'opcoes',
      opcoes: ['350 bar', '4 bar', '7 bar', '17 bar'] },
    { id: 'distanciaVala', label: 'Distância entre a vala a ser aberta e a interferência mais próxima do gás (m)',
      tipo: 'numero', passo: '0.01' },
    { id: 'criticidade', label: 'Criticidade', tipo: 'opcoes', opcoes: ['Alta', 'Média', 'Baixa'] },
    { id: 'responsavelDemarcacao', label: 'Responsável pela demarcação em campo', tipo: 'texto' }
  ],

  /* Aba 3 — Verificação de Segurança (Sim/Não; justificativa obrigatória no "Não"; fotos) */
  seguranca: [
    { id: 'interferencias',
      pergunta: 'Interferências localizadas e demarcadas?' },
    { id: 'cadastroGas',
      pergunta: 'Foram disponibilizados os cadastros de gás para a equipe de campo?' },
    { id: 'cadastroAguaEsgoto',
      pergunta: 'Foram disponibilizados os cadastros de água e esgoto para a equipe de campo?' },
    { id: 'equipeTreinada',
      pergunta: 'A equipe de campo está treinada para leitura correta dos cadastros e execução segura da atividade?' }
  ],

  /* Aba 4 — Responsáveis */
  responsaveis: [
    { id: 'empresaExecutora', label: 'Empresa Executora', tipo: 'texto', placeholder: 'Nome da empresa executora' },
    { id: 'responsavelExecutora', label: 'Responsável Executora', tipo: 'texto', placeholder: 'Nome do responsável da executora' },
    { id: 'encarregado', label: 'Encarregado Sabesp', tipo: 'texto', placeholder: 'Nome do encarregado' },
    { id: 'coordenador', label: 'Coordenador Sabesp', tipo: 'texto', placeholder: 'Nome do coordenador' },
    { id: 'plantonista', label: 'Plantonista - fins de semana, feriados e período noturno',
      tipo: 'texto', placeholder: 'Nome do plantonista' }
  ]
};

function itemSegurancaVazio() {
  return { resposta: '', justificativa: '' };
}

/* Cria um checklist vazio */
function novoChecklist() {
  const obra = {};
  CHECKLIST_DEF.obra.forEach(c => {
    obra[c.id] = '';
    if (c.outro) obra[c.outro.id] = '';
  });

  const gas = {};
  CHECKLIST_DEF.gas.forEach(c => { gas[c.id] = ''; });

  const seguranca = CHECKLIST_DEF.seguranca.map(itemSegurancaVazio);

  const responsaveis = {};
  CHECKLIST_DEF.responsaveis.forEach(c => { responsaveis[c.id] = ''; });

  return {
    id: 'cl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    obra,
    gas,
    seguranca,
    responsaveis,
    observacoes: { texto: '' }
  };
}

/* Garante que checklists antigos (ou de backup) tenham os campos atuais */
function migrarChecklist(cl) {
  if (!cl) return cl;
  cl.obra = cl.obra || {};
  CHECKLIST_DEF.obra.forEach(c => {
    if (cl.obra[c.id] === undefined) cl.obra[c.id] = '';
    if (c.outro && cl.obra[c.outro.id] === undefined) cl.obra[c.outro.id] = '';
  });
  cl.gas = cl.gas || {};
  CHECKLIST_DEF.gas.forEach(c => { if (cl.gas[c.id] === undefined) cl.gas[c.id] = ''; });
  if (!Array.isArray(cl.seguranca)) cl.seguranca = CHECKLIST_DEF.seguranca.map(itemSegurancaVazio);
  CHECKLIST_DEF.seguranca.forEach((q, i) => {
    if (!cl.seguranca[i]) cl.seguranca[i] = itemSegurancaVazio();
    if (cl.seguranca[i].resposta === undefined) cl.seguranca[i].resposta = '';
    if (cl.seguranca[i].justificativa === undefined) cl.seguranca[i].justificativa = '';
  });
  cl.responsaveis = cl.responsaveis || {};
  CHECKLIST_DEF.responsaveis.forEach(c => { if (cl.responsaveis[c.id] === undefined) cl.responsaveis[c.id] = ''; });
  if (!cl.observacoes) cl.observacoes = { texto: '' };
  if (cl.observacoes.texto === undefined) cl.observacoes.texto = '';
  return cl;
}

/* Resposta de segurança está resolvida: "Sim" ou "Não" com justificativa */
function segResolvida(s) {
  return s.resposta === 'Sim' || (s.resposta === 'Não' && (s.justificativa || '').trim() !== '');
}

/* Exibição de valor de select com opção "Outros" (usa o campo digitado) */
function valorComOutro(dados, campo) {
  const v = dados[campo.id];
  if (campo.outro && v === 'Outros') return dados[campo.outro.id] || 'Outros';
  return v;
}

function unidadeExibicao(obra) {
  return obra.unidade === 'Outros' ? (obra.unidadeOutro || 'Outros') : obra.unidade;
}

function municipioExibicao(obra) {
  return obra.municipio === 'Outros' ? (obra.municipioOutro || 'Outros') : obra.municipio;
}

function tipoServicoExibicao(obra) {
  return obra.tipoServico === 'Outros' ? (obra.tipoServicoOutro || 'Outros') : obra.tipoServico;
}

/* Progresso: verificações de segurança respondidas / total e pendências */
function progressoChecklist(cl) {
  const total = CHECKLIST_DEF.seguranca.length;
  let ok = 0, pend = 0;
  (cl.seguranca || []).forEach(s => {
    if (segResolvida(s)) ok++;
    else if (s.resposta === 'Não') pend++;
  });
  return { ok, total, pend, pct: total ? Math.round(ok / total * 100) : 0 };
}
