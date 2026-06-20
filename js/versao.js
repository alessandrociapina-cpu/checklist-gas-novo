/* Versão do aplicativo e histórico de atualizações (mais recente primeiro) */
'use strict';

const APP_VERSAO = '1.3.0';

const HISTORICO_VERSOES = [
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
