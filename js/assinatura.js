/* Captura de assinatura por desenho (canvas) — abre em modal e devolve dataURL */
'use strict';

function capturarAssinatura(titulo) {
  return new Promise(resolve => {
    const fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.innerHTML = `
      <div class="modal">
        <h3>${titulo}</h3>
        <canvas></canvas>
        <div class="acoes-modal">
          <button class="btn btn-secundario" data-acao="limpar">Limpar</button>
          <button class="btn btn-secundario" data-acao="cancelar">Cancelar</button>
          <button class="btn btn-primario" data-acao="confirmar">Confirmar</button>
        </div>
      </div>`;
    document.body.appendChild(fundo);

    const canvas = fundo.querySelector('canvas');
    const escala = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * escala;
    canvas.height = rect.height * escala;
    const ctx = canvas.getContext('2d');
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0083c1';

    let desenhando = false;
    let desenhou = false;

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    }
    function inicio(e) {
      e.preventDefault();
      desenhando = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function mover(e) {
      if (!desenhando) return;
      e.preventDefault();
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      desenhou = true;
    }
    function fim() { desenhando = false; }

    canvas.addEventListener('mousedown', inicio);
    canvas.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', fim);
    canvas.addEventListener('touchstart', inicio, { passive: false });
    canvas.addEventListener('touchmove', mover, { passive: false });
    canvas.addEventListener('touchend', fim);

    function fechar(valor) {
      window.removeEventListener('mouseup', fim);
      fundo.remove();
      resolve(valor);
    }

    fundo.addEventListener('click', e => {
      const acao = e.target.dataset && e.target.dataset.acao;
      if (acao === 'limpar') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        desenhou = false;
      } else if (acao === 'cancelar' || e.target === fundo) {
        fechar(null);
      } else if (acao === 'confirmar') {
        fechar(desenhou ? canvas.toDataURL('image/png') : null);
      }
    });
  });
}
