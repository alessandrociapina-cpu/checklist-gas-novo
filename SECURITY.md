# Segurança — Checklist Gás (novo)

Documento de apoio para revisão de segurança (TI Sabesp). Descreve o modelo de
ameaças, as proteções implementadas e as limitações conhecidas do aplicativo.

## Visão geral / arquitetura

- **Aplicação 100% client-side e estática** (HTML/CSS/JavaScript puro), servida pelo
  GitHub Pages sobre **HTTPS**. Não há servidor de aplicação, banco de dados remoto,
  autenticação ou API própria.
- **Sem dependências de runtime e sem CDNs**: o app não carrega nenhum script, fonte
  ou recurso de terceiros. Todo o código é versionado neste repositório e auditável.
  (O `package.json` traz apenas ferramentas de desenvolvimento/teste, que **não** vão
  para o aparelho.)
- **Dados ficam apenas no aparelho** (IndexedDB `checklist-gas-novo`). Nada é enviado
  para a internet. O compartilhamento entre pessoas é manual, via exportação/importação
  de um arquivo **backup JSON**.
- Funciona **offline** via Service Worker (cache-first, somente da própria origem).

## Modelo de ameaças considerado

| Ameaça | Tratamento |
|---|---|
| **XSS** (script injetado em campos do formulário) | Toda saída em HTML passa por escape (`esc()`); nenhum dado do usuário é inserido como HTML cru. |
| **XSS via backup JSON malicioso** (importar arquivo de terceiro) | `src` de imagens validados por `imagemSegura()` (só aceita `data:image/...;base64`); `id`s escapados nos atributos; coordenadas coagidas a número. |
| **Execução de script externo / inline** | **Content-Security-Policy** restritiva (`script-src 'self'`), sem scripts inline nem `eval`. |
| **Exfiltração de dados** | Sem chamadas de rede; `connect-src 'self'`. Os dados não saem do aparelho exceto no backup que o próprio usuário exporta. |
| **Clickjacking** | CSP `object-src 'none'`; ver limitação sobre `frame-ancestors` abaixo. |
| **Man-in-the-middle** | Servido por HTTPS (GitHub Pages). |

## Proteções implementadas

### 1. Content-Security-Policy (defesa em profundidade)
Definida via `<meta http-equiv>` em `index.html`:

```
default-src 'self';
script-src 'self';            (sem scripts inline/externos, sem eval)
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;   (fotos/assinaturas como data:, compressão via blob:)
connect-src 'self';
manifest-src 'self';
base-uri 'none';
form-action 'none';
object-src 'none';
```

### 2. Escape de saída (anti-XSS)
- Função `esc()` aplica escape de `& < > "` em **todo** texto do usuário inserido no DOM.
- `id`s que podem vir de um backup importado (checklist e foto) são escapados nos
  atributos `data-*`.

### 3. Validação de imagens (`imagemSegura()`)
- Fotos e assinaturas são `dataURL`. Antes de virarem `src`, são validadas contra
  `^data:image/(png|jpeg|webp|gif);base64,...`. Qualquer valor fora desse padrão
  (ex.: um `src` forjado em backup malicioso) é descartado, impedindo *attribute
  breakout* / `onerror`.

### 4. Coordenadas GPS tratadas como número
- Latitude/longitude/precisão são convertidas com `Number()` e checadas com
  `Number.isFinite()` antes de aparecer no relatório (evita injeção e erros de render
  a partir de um backup adulterado).

### 5. Links externos
- O único link externo (mapa da foto) abre com `rel="noopener noreferrer"` e
  `referrer-policy: no-referrer`.

## Itens auditados (resultado: OK)

- Sem uso de `eval`, `new Function`, `document.write` ou `innerHTML` com dado de usuário não escapado.
- Sem `dangerouslySetInnerHTML`/templates inseguros; renderização baseada em definição estática (`js/data.js`).
- Sem segredos, tokens ou credenciais no código.
- Service Worker só faz cache de recursos da **própria origem**.
- `window.print()` ajusta apenas `document.title` (texto), sem injeção.
- Sem cookies; sem `localStorage` com dado sensível (uso de IndexedDB local).

## Limitações conhecidas e recomendações

- **`frame-ancestors`/`X-Frame-Options`**: a diretiva é ignorada quando entregue por
  `<meta>`; bloqueio total de *iframing* exigiria um **cabeçalho HTTP**, que o GitHub
  Pages não permite configurar. Risco baixo (app não exibe dados de outras origens).
  Se for requisito, hospedar atrás de um proxy/CDN que adicione os cabeçalhos
  (`X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`).
- **Dados locais não criptografados**: ficam no IndexedDB do aparelho. Recomenda-se
  **bloqueio de tela (PIN/biometria)** no dispositivo. Em caso de perda/roubo, os
  checklists podem ser acessados por quem destravar o aparelho.
- **Backup JSON**: importe apenas arquivos de **origem confiável**. Mesmo com as
  proteções anti-XSS, o backup é a única via de entrada de dados externos.

## Como validar

CI no GitHub Actions roda em todo push/PR:
- `node --check` em todo o JavaScript + verificação estrutural;
- testes Playwright de ponta a ponta, incluindo **casos de segurança** (rejeição de
  `src` forjado, escape de `id` malicioso e não-execução de script via backup).
