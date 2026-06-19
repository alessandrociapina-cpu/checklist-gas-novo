/* Validação estrutural — garante que o cache do service worker e as referências
   do index.html apontam para arquivos que realmente existem.
   Ajuda a cumprir a convenção: ao criar um arquivo novo, adicioná-lo ao sw.js. */
'use strict';

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const erros = [];

function existe(rel) {
  return fs.existsSync(path.join(raiz, rel));
}

/* 1) Lista ARQUIVOS do service worker */
const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
const bloco = sw.match(/const ARQUIVOS = \[([\s\S]*?)\];/);
if (!bloco) {
  erros.push('sw.js: lista ARQUIVOS não encontrada');
} else {
  const itens = [...bloco[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
  itens.forEach(it => {
    const rel = it.replace(/^\.\//, '');
    if (rel === '') return; // './' (raiz) não é arquivo
    if (!existe(rel)) erros.push(`sw.js: arquivo do cache não existe: ${it}`);
  });
}

/* 2) Referências locais do index.html (scripts, css, manifest, ícones) */
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m => m[1]);
refs.forEach(ref => {
  if (/^https?:/.test(ref) || ref.startsWith('data:') || ref.startsWith('#')) return;
  const rel = ref.replace(/^\.?\//, '');
  if (!existe(rel)) erros.push(`index.html: referência inexistente: ${ref}`);
});

/* 3) Todo arquivo .js carregado no index.html deve estar no cache do sw.js */
const scriptsHtml = [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(m => m[1].replace(/^\.?\//, ''));
const cacheItens = bloco
  ? [...bloco[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1].replace(/^\.\//, ''))
  : [];
scriptsHtml.forEach(s => {
  if (!cacheItens.includes(s)) erros.push(`sw.js: script "${s}" do index.html não está na lista de cache (offline ficaria quebrado)`);
});

if (erros.length) {
  console.error('Falhas estruturais:\n - ' + erros.join('\n - '));
  process.exit(1);
}
console.log('Validação estrutural OK (' + refs.length + ' referências, ' + cacheItens.length + ' itens em cache).');
