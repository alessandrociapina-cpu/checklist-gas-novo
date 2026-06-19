/* Persistência local em IndexedDB — checklists e fotos */
'use strict';

const DB = (() => {
  const NOME = 'checklist-gas-novo';
  const VERSAO = 1;
  let db = null;

  function abrir() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(NOME, VERSAO);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('checklists')) {
          d.createObjectStore('checklists', { keyPath: 'id' });
        }
        if (!d.objectStoreNames.contains('fotos')) {
          const st = d.createObjectStore('fotos', { keyPath: 'id' });
          st.createIndex('porItem', ['checklistId', 'itemKey']);
          st.createIndex('porChecklist', 'checklistId');
        }
      };
      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(store, modo, fn) {
    return abrir().then(d => new Promise((resolve, reject) => {
      const t = d.transaction(store, modo);
      const resultado = fn(t.objectStore(store));
      t.oncomplete = () => resolve(resultado.result !== undefined ? resultado.result : resultado);
      t.onerror = () => reject(t.error);
    }));
  }

  return {
    salvarChecklist(cl) {
      cl.atualizadoEm = new Date().toISOString();
      return tx('checklists', 'readwrite', st => st.put(cl));
    },

    obterChecklist(id) {
      return abrir().then(d => new Promise((resolve, reject) => {
        const req = d.transaction('checklists').objectStore('checklists').get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      }));
    },

    listarChecklists() {
      return abrir().then(d => new Promise((resolve, reject) => {
        const req = d.transaction('checklists').objectStore('checklists').getAll();
        req.onsuccess = () => {
          const lista = req.result || [];
          lista.sort((a, b) => (b.atualizadoEm || '').localeCompare(a.atualizadoEm || ''));
          resolve(lista);
        };
        req.onerror = () => reject(req.error);
      }));
    },

    async excluirChecklist(id) {
      const fotos = await this.fotosDoChecklist(id);
      await tx('fotos', 'readwrite', st => { fotos.forEach(f => st.delete(f.id)); return {}; });
      return tx('checklists', 'readwrite', st => st.delete(id));
    },

    salvarFoto(foto) {
      return tx('fotos', 'readwrite', st => st.put(foto));
    },

    excluirFoto(id) {
      return tx('fotos', 'readwrite', st => st.delete(id));
    },

    fotosDoItem(checklistId, itemKey) {
      return abrir().then(d => new Promise((resolve, reject) => {
        const idx = d.transaction('fotos').objectStore('fotos').index('porItem');
        const req = idx.getAll([checklistId, itemKey]);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      }));
    },

    fotosDoChecklist(checklistId) {
      return abrir().then(d => new Promise((resolve, reject) => {
        const idx = d.transaction('fotos').objectStore('fotos').index('porChecklist');
        const req = idx.getAll(checklistId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      }));
    }
  };
})();
