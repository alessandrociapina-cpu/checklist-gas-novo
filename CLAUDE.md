# CLAUDE.md

Instruções para o Claude Code ao trabalhar neste repositório.

## O que é este projeto

**Checklist Gás (novo)** — PWA de campo para o novo check-list de segurança de obras
com interferência em rede de gás (serviços de água e esgoto da Sabesp). Reaproveita a
arquitetura do app `checklist-gas` anterior, com a estrutura de campos/abas atualizada.

Estrutura do formulário (6 abas):
1. Dados da Obra
2. Informações da Rede de Gás
3. Verificação de Segurança (Sim/Não + justificativa + fotos)
4. Responsáveis
5. Observações (texto + fotos)
6. Relatório PDF

## Arquitetura

App estático, **sem build, sem dependências externas** (precisa funcionar 100% offline
em campo). JavaScript puro, dados locais no aparelho.

| Arquivo | Papel |
|---|---|
| `index.html` | ponto de entrada; carrega: versao → data → db → relatorio → app |
| `js/versao.js` | `APP_VERSAO` e `HISTORICO_VERSOES` (changelog do selo de versão) |
| `js/data.js` | **fonte única da definição do checklist** (abas, campos, opções) + `novoChecklist()`, `migrarChecklist()`, `progressoChecklist()` |
| `js/db.js` | persistência em IndexedDB (DB `checklist-gas-novo`, stores `checklists` e `fotos`) |
| `js/app.js` | roteador por hash (`#/`, `#/form/:id/:etapa`, `#/relatorio/:id`), telas, autosave |
| `js/relatorio.js` | relatório consolidado + evidências fotográficas; PDF via `window.print()` |
| `sw.js` | service worker cache-first (`CACHE = 'checklist-gas-novo-vN'`) |
| `css/style.css` | mobile-first + estilos de impressão (`@media print`) |

## Convenções obrigatórias

1. **Idioma**: todo texto de interface, comentários e mensagens de commit em **português (pt-BR)**.
2. **DB e cache isolados do app antigo**: o IndexedDB se chama `checklist-gas-novo` e o backup
   usa `app: 'checklist-gas-novo'` — os dois apps compartilham a origem `github.io`, então os
   nomes **não podem** colidir com o `checklist-gas` original.
3. **A cada release**:
   - incrementar `APP_VERSAO` em `js/versao.js` e adicionar entrada no **topo** de `HISTORICO_VERSOES`;
   - incrementar a versão do cache em `sw.js` (`checklist-gas-novo-vN`) — sem isso o usuário não recebe a atualização;
   - se criar arquivo novo, adicioná-lo à lista `ARQUIVOS` do `sw.js`.
4. **Campos do formulário** são definidos apenas em `js/data.js`; o formulário e o relatório
   renderizam a partir da definição. Não duplicar rótulos no código das telas.
5. **Retrocompatibilidade**: ao adicionar/renomear campos, atualizar `migrarChecklist()` (backups
   JSON e checklists antigos precisam continuar abrindo). IDs de campos existentes não mudam.
6. **Fotos** são vinculadas por `itemKey` no store `fotos`: `seg:<idPergunta>` para a verificação
   de segurança e `obs` para as observações.

## Validação

Sem suíte de testes no repositório; validar com teste de ponta a ponta usando o Playwright
global (`/opt/node22/lib/node_modules/playwright`) contra `python3 -m http.server`: criar
checklist, preencher as abas, marcar Sim/Não, anexar foto, gerar relatório e conferir o
conteúdo, além de `node --check` em todos os `.js`. Não introduzir erros de console.

## Decisões de produto já tomadas

- Respostas "Não" na Verificação de Segurança **exigem justificativa** (destaque vermelho;
  no relatório aparecem como "RESPOSTA 'NÃO' — SEM JUSTIFICATIVA").
- Localização é capturada por GPS no formato decimal `lat / lon` e fica editável manualmente.
- Dados são locais por aparelho; compartilhamento entre pessoas é via backup/restauração JSON.
- PDF do relatório usa a impressão nativa do navegador (sem bibliotecas).
- Campos "Outros" (Unidade, Município, Tipo de Serviço) abrem campo de digitação manual.
