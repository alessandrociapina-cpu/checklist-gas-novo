# Checklist Gás (novo)

PWA de campo para o **novo check-list de segurança de obras com interferência em rede de gás** (serviços de água e esgoto da Sabesp). Reaproveita a base do app `checklist-gas` anterior, com a estrutura de campos e abas atualizada.

## Abas do formulário

1. **Dados da Obra** — Unidade Responsável (OVMS, OVMI, OV ou Outros), Número da OS, Endereço, Município (com opção Outros), Localização (captura GPS do aparelho) e Tipo de Serviço (com opção Outros).
2. **Informações da Rede de Gás** — Protocolo de Atendimento Comgás, Protocolo de Acompanhamento, Quantidade de Interferências, Material (PE/Aço), Profundidade, Diâmetro (20, 40, 63, 90, 125, 4", 6", 8"), Pressão (350 bar, 4 bar, 7 bar, 17 bar), Distância entre a vala e a interferência mais próxima do gás, Criticidade (Alta/Média/Baixa) e Responsável pela demarcação em campo.
3. **Verificação de Segurança** — 4 perguntas Sim/Não com justificativa obrigatória para "Não" e fotos (câmera ou galeria).
4. **Responsáveis** — Encarregado Sabesp, Coordenador Sabesp e Plantonista (fins de semana, feriados e período noturno).
5. **Observações** — campo livre para o fiscal e fotos.
6. **Relatório PDF** — gera o relatório consolidado com todas as abas e as **Evidências Fotográficas** (cada foto legendada pelo campo a que se refere); impressão/salvamento em PDF pelo navegador.

## Funcionalidades

- **Localização GPS** — botão que lança as coordenadas do aparelho no campo de localização.
- **Fotos de evidência** — câmera ou galeria, com compressão automática e geoposicionamento.
- **Backup** — exportação e restauração de todos os dados (incluindo fotos) em JSON.
- **100% offline** — dados em IndexedDB no aparelho e app shell em cache via Service Worker; instalável (PWA).

## Como usar

App estático — basta servir os arquivos por HTTPS (ou `localhost`):

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

### Publicação no GitHub Pages

Em **Settings → Pages**, selecione o branch desejado e a pasta `/ (root)`.

## Estrutura

```
index.html              ponto de entrada
manifest.webmanifest    manifesto PWA
sw.js                   service worker (cache offline)
css/style.css           estilos (mobile-first + impressão)
js/versao.js            versão e histórico de atualizações
js/data.js              definição do checklist (campos, opções, abas)
js/db.js                persistência (IndexedDB: checklists e fotos)
js/app.js               telas: lista, formulário por abas, autosave
js/relatorio.js         geração do relatório/PDF
icons/                  ícones do app
```
