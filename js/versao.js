/* Versão do aplicativo e histórico de atualizações (mais recente primeiro) */
'use strict';

const APP_VERSAO = '1.1.0';

const HISTORICO_VERSOES = [
  {
    versao: '1.1.0',
    data: '2026-06-19',
    itens: [
      'Aba Responsáveis: novos campos Empresa Executora e Responsável Executora',
      'Removido o campo Plantonista da aba Responsáveis'
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
