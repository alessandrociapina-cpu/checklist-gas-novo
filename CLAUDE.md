# CLAUDE.md

Instruções para o Claude Code ao trabalhar neste repositório.

## O que é este projeto

**Checklist Gás (novo)** — PWA de campo para o novo check-list de segurança de obras
com interferência em rede de gás (serviços de água e esgoto da Sabesp). Reaproveita a
arquitetura do app `checklist-gas` anterior, com a estrutura de campos/abas atualizada.

Estrutura do formulário (7 abas):
1. Dados da Obra
2. Informações da Rede de Gás
3. Verificação de Segurança (Sim/Não + justificativa + fotos)
4. Atualização Cadastral (obrigatória; um ou mais registros + fotos)
5. Responsáveis
6. Observações (texto + fotos)
7. Relatório PDF

## Arquitetura

App estático, **sem build, sem dependências externas** (precisa funcionar 100% offline
em campo). JavaScript puro, dados locais no aparelho.

| Arquivo | Papel |
|---|---|
| `index.html` | ponto de entrada; carrega: versao → data → db → relatorio → app |
| `js/versao.js` | `APP_VERSAO` e `HISTORICO_VERSOES` (changelog do selo de versão) |
| `js/data.js` | **fonte única da definição do checklist** (abas, campos, opções) + `novoChecklist()`, `migrarChecklist()`, `progressoChecklist()` |
| `js/db.js` | persistência em IndexedDB (DB `checklist-gas-novo` v2, stores `checklists`, `fotos` e `anexos`) |
| `js/vendor/pdf.min.js` | pdf.js (build legacy) carregado sob demanda no relatório para rasterizar anexos PDF; worker em `js/vendor/pdf.worker.min.js` |
| `js/assinatura.js` | modal de captura de assinatura no dedo (canvas) — `capturarAssinatura()` |
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
   de segurança, `cad:<idRegistro>` para a atualização cadastral e `obs` para as observações.
   **Anexos PDF** usam o mesmo esquema de `itemKey` no store `anexos` e são rasterizados (pdf.js)
   ao final do relatório para saírem na impressão.
7. **Assinaturas no dedo**: campos de `responsaveis` com `assinatura: true` ganham um canvas; a
   imagem (dataURL PNG) fica em `cl.assinaturas[<idCampo>]` (dentro do próprio checklist, vai no
   backup JSON). O relatório exibe a seção Assinaturas a partir desses campos.

## Validação

CI no GitHub Actions (`.github/workflows/ci.yml`), em todo push/PR, com dois jobs:
- **lint**: `node --check` em todos os `.js` + `node test/estrutura.js` (confere que o cache do
  `sw.js` e as referências do `index.html` apontam para arquivos existentes, e que todo script do
  `index.html` está no cache do service worker).
- **e2e**: `node test/e2e.js` — Playwright (Chromium) sobe seu próprio `python3 -m http.server`,
  cria checklist, preenche as abas, marca Sim/Não, anexa foto, gera o relatório e confere o
  conteúdo. Não pode haver erros de console.

Localmente: `npm install` e `npm test` (ou `npm run e2e`). O app em si continua **sem
dependências de runtime**; o `package.json` é só ferramenta de desenvolvimento/teste.

## Decisões de produto já tomadas

- Respostas "Não" na Verificação de Segurança **exigem justificativa** (destaque vermelho;
  no relatório aparecem como "RESPOSTA 'NÃO' — SEM JUSTIFICATIVA").
- Localização é capturada por GPS no formato decimal `lat / lon` e fica editável manualmente.
- Dados são locais por aparelho; compartilhamento entre pessoas é via backup/restauração JSON.
- PDF do relatório usa a impressão nativa do navegador (sem bibliotecas).
- Campos "Outros" (Unidade, Município, Tipo de Serviço) abrem campo de digitação manual.
