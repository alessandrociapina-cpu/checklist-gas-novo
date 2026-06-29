/* Versão do aplicativo e histórico de atualizações (mais recente primeiro) */
'use strict';

const APP_VERSAO = '1.12.1';

const HISTORICO_VERSOES = [
  {
    versao: '1.12.1',
    data: '2026-06-23',
    itens: [
      'Correção da opção de pressão: 350 mbar (antes 350 bar)'
    ]
  },
  {
    versao: '1.12.0',
    data: '2026-06-23',
    itens: [
      'Anexo de arquivos PDF (ao lado de Câmera/Galeria); os anexos são impressos ao final do relatório — contribuição da OLMS',
      'Fotos maiores na impressão do relatório (2 por linha)',
      'Aviso de que assinaturas pendentes podem ser assinadas digitalmente'
    ]
  },
  {
    versao: '1.11.0',
    data: '2026-06-23',
    itens: [
      'Campos de Data e Hora de Início e de Fim do Serviço na aba Dados da Obra'
    ]
  },
  {
    versao: '1.10.0',
    data: '2026-06-23',
    itens: [
      'Atualização automática quando há internet (service worker rede-primeiro), mantendo o funcionamento offline em campo'
    ]
  },
  {
    versao: '1.9.0',
    data: '2026-06-20',
    itens: [
      'Nova aba Atualização Cadastral (obrigatória), antes de Responsáveis',
      'Permite registrar uma ou mais atualizações do cadastro (rede, informação, posição, descrição e fotos)',
      'Atualização cadastral incluída no relatório'
    ]
  },
  {
    versao: '1.8.0',
    data: '2026-06-20',
    itens: [
      'Unidades passam a ser OVMT, OIOT e OVMS',
      'Município Tremembé incluído na lista'
    ]
  },
  {
    versao: '1.7.0',
    data: '2026-06-20',
    itens: [
      'Ícone do app agora exibe o texto "Check-list Gás" abaixo do símbolo Sabesp'
    ]
  },
  {
    versao: '1.6.0',
    data: '2026-06-20',
    itens: [
      'Identidade visual Sabesp: paleta azul Sabesp e logo na tela inicial, no relatório e no ícone do app'
    ]
  },
  {
    versao: '1.5.0',
    data: '2026-06-20',
    itens: [
      'Reforço de segurança: Content-Security-Policy, validação de imagens e escape reforçado',
      'Proteção contra backup JSON malicioso (anti-XSS na restauração)'
    ]
  },
  {
    versao: '1.4.0',
    data: '2026-06-20',
    itens: [
      'Nova identidade visual: paleta verde-petróleo com destaque âmbar',
      'Novos ícones do app, para diferenciar do check-list anterior'
    ]
  },
  {
    versao: '1.3.0',
    data: '2026-06-19',
    itens: [
      'Assinatura com o dedo na tela para Fiscal Sabesp, Responsável Executora, Encarregado, Coordenador e Plantonista',
      'Novo campo Fiscal Sabesp no topo da aba Responsáveis',
      'Assinaturas exibidas no relatório/PDF'
    ]
  },
  {
    versao: '1.2.0',
    data: '2026-06-19',
    itens: [
      'Ao salvar o relatório em PDF, o nome do arquivo passa a incluir o endereço da obra, o município e a OS'
    ]
  },
  {
    versao: '1.1.0',
    data: '2026-06-19',
    itens: [
      'Aba Responsáveis: novos campos Empresa Executora e Responsável Executora (antes de Encarregado, Coordenador e Plantonista)'
    ]
  },
  {
    versao: '1.0.0',
    data: '2026-06-19',
    itens: [
      'Versão inicial do novo check-list de segurança',
      'Abas: Dados da Obra, Rede de Gás, Verificação de Segurança, Responsáveis, Observações e Relatório PDF',
      'Captura de localização GPS, fotos por câmera/galeria e relatório com evidências fotográficas',
      'Funcionamento 100% offline (PWA) e backup/restauração em JSON'
    ]
  }
];
