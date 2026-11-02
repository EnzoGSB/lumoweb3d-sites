// Desenho das telas em canvas: monitores das mesas, TV de métricas, relógio e quadro do fluxo.

function fundo(ctx, w, h, cor) {
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, w, h);
}

// Gerador pseudoaleatório estável, para as "linhas de código" não piscarem
function ruido(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const CORES_CODIGO = ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#e5e7eb'];

function telaScraper(ctx, w, h, t, status) {
  // Mapa com pinos caindo + lista de resultados
  fundo(ctx, w, h, '#e8eef0');
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  for (const [x1, y1, x2, y2] of [[0, 60, w, 90], [120, 0, 160, h], [0, 150, w, 120], [250, 0, 230, h]]) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.fillStyle = '#cfe8d0';
  ctx.fillRect(170, 20, 50, 30);
  for (let i = 0; i < 7; i++) {
    const fase = (t * 0.8 + i * 0.37) % 2.5;
    if (fase > 2) continue;
    const x = 110 + ruido(i + Math.floor(t * 0.8 / 2.5) * 7) * 190;
    const y = 30 + ruido(i * 3.1 + Math.floor(t * 0.8 / 2.5)) * 130 - Math.max(0, 0.3 - fase) * 80;
    ctx.fillStyle = i % 3 ? '#ea4335' : '#22c55e';
    ctx.beginPath();
    ctx.arc(x, y, 7, Math.PI, 0);
    ctx.lineTo(x, y + 12);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 100, h);
  for (let i = 0; i < 7; i++) {
    const y = 12 + i * 25 - ((t * 18) % 25);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(8, y, 60, 6);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(8, y + 10, 40, 4);
    ctx.fillStyle = i % 3 ? '#e5e7eb' : '#22c55e';
    ctx.fillRect(78, y + 2, 12, 12);
  }
  if (status?.progresso != null) {
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.fillRect(0, h - 8, w, 8);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, h - 8, w * status.progresso, 8);
  }
}

function telaDesigner(ctx, w, h, t) {
  // Página sendo montada à esquerda, código à direita
  fundo(ctx, w, h, '#1e1e2e');
  const ciclo = (t * 0.25) % 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(10, 10, 170, h - 20);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(10, 10, 170, 14);
  ['#ef4444', '#f59e0b', '#22c55e'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(18 + i * 9, 17, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  const blocos = [
    [16, 30, 158, 56, '#f97362'],
    [24, 42, 90, 8, '#ffffff'],
    [24, 56, 60, 5, '#ffe4e0'],
    [24, 68, 44, 10, '#22c55e'],
    [16, 94, 48, 40, '#fde2dd'],
    [71, 94, 48, 40, '#fde2dd'],
    [126, 94, 48, 40, '#fde2dd'],
    [16, 142, 158, 30, '#f1f5f9'],
  ];
  blocos.slice(0, Math.ceil(ciclo * blocos.length)).forEach(([x, y, bw, bh, c]) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, bw, bh);
  });
  for (let i = 0; i < 13; i++) {
    const linha = Math.floor(t * 3) + i;
    const y = 14 + i * 13;
    const recuo = (ruido(linha * 1.7) * 3) | 0;
    let x = 192 + recuo * 10;
    for (let p = 0; p < 3; p++) {
      const larg = 10 + ruido(linha * 5 + p) * 30;
      if (x + larg > w - 6) break;
      ctx.fillStyle = CORES_CODIGO[((linha + p) * 7) % CORES_CODIGO.length];
      ctx.fillRect(x, y, larg, 6);
      x += larg + 5;
    }
  }
  if (Math.floor(t * 2) % 2) {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(192, 14 + 12 * 13, 6, 8);
  }
}

function telaGenerica(ctx, w, h, t) {
  fundo(ctx, w, h, '#0f172a');
  for (let i = 0; i < 12; i++) {
    const linha = Math.floor(t * 3) + i;
    ctx.fillStyle = CORES_CODIGO[(linha * 5) % CORES_CODIGO.length];
    ctx.fillRect(14 + ((ruido(linha) * 4) | 0) * 12, 12 + i * 14, 40 + ruido(linha * 3) * 180, 6);
  }
}

function descanso(ctx, w, h, t) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#111827');
  g.addColorStop(1, '#1f2937');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const x = w / 2 + Math.sin(t * 0.5) * 70;
  const y = h / 2 + Math.cos(t * 0.37) * 40;
  ctx.font = 'bold 22px system-ui';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f5f5';
  ctx.fillText('LUMOWEB', x - 14, y);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('3D', x + 52, y);
}

function telaErro(ctx, w, h, t, status) {
  fundo(ctx, w, h, Math.floor(t * 2) % 2 ? '#7f1d1d' : '#991b1b');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px system-ui';
  ctx.fillText('!', w / 2, 80);
  ctx.font = '14px system-ui';
  ctx.fillText((status?.tarefa ?? 'Erro').slice(0, 38), w / 2, 120);
}

export function desenharMonitor(tela, agente, t) {
  const { ctx, canvas, textura } = tela;
  const { width: w, height: h } = canvas;
  ctx.save();
  if (agente.estado === 'trabalhando') {
    if (agente.id === 'scraper') telaScraper(ctx, w, h, t, agente.status);
    else if (agente.id === 'designer') telaDesigner(ctx, w, h, t);
    else telaGenerica(ctx, w, h, t);
  } else if (agente.estado === 'erro') {
    telaErro(ctx, w, h, t, agente.status);
  } else if (agente.estado === 'ocioso') {
    descanso(ctx, w, h, t);
  } else {
    fundo(ctx, w, h, '#050505');
    ctx.fillStyle = Math.floor(t) % 2 ? '#f59e0b' : '#3b2a07';
    ctx.beginPath();
    ctx.arc(w - 14, h - 12, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  textura.needsUpdate = true;
}

export function desenharTV(tela, estado) {
  const { ctx, canvas, textura } = tela;
  const { width: w, height: h } = canvas;
  fundo(ctx, w, h, '#0b0f17');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 20px system-ui';
  ctx.fillText('PAINEL DO DIA', 26, 40);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString('pt-BR'), w - 26, 40);

  const itens = [
    ['Leads', estado.leads.total, '#60a5fa'],
    ['Sites no ar', estado.leads.comSite, '#4ade80'],
    ['Na fila', estado.leads.naFila, '#fbbf24'],
  ];
  itens.forEach(([rotulo, valor, cor], i) => {
    const x = 26 + i * ((w - 52) / 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = cor;
    ctx.font = 'bold 76px system-ui';
    ctx.fillText(String(valor), x, 140);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '22px system-ui';
    ctx.fillText(rotulo, x, 172);
  });

  const total = Math.max(1, estado.leads.total);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(26, 200, w - 52, 14);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(26, 200, ((w - 52) * estado.leads.comSite) / total, 14);

  const ultimo = estado.sites[0];
  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(ultimo ? `Último site: ${ultimo.nome}`.slice(0, 48) : 'Nenhum site publicado ainda', 26, 252);
  textura.needsUpdate = true;
}

export function desenharRelogio(tela) {
  const { ctx, canvas, textura } = tela;
  const s = canvas.width;
  const agora = new Date();
  fundo(ctx, s, s, '#fafafa');
  ctx.translate(s / 2, s / 2);
  ctx.strokeStyle = '#27272a';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.lineWidth = i % 3 ? 3 : 6;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * s * 0.36, -Math.cos(a) * s * 0.36);
    ctx.lineTo(Math.sin(a) * s * 0.44, -Math.cos(a) * s * 0.44);
    ctx.stroke();
  }
  const ponteiro = (fracao, comp, larg, cor) => {
    const a = fracao * Math.PI * 2;
    ctx.strokeStyle = cor;
    ctx.lineWidth = larg;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(a) * s * comp, -Math.cos(a) * s * comp);
    ctx.stroke();
  };
  const seg = agora.getSeconds();
  const min = agora.getMinutes() + seg / 60;
  ponteiro(((agora.getHours() % 12) + min / 60) / 12, 0.22, 8, '#18181b');
  ponteiro(min / 60, 0.32, 5, '#18181b');
  ponteiro(seg / 60, 0.36, 2, '#dc2626');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  textura.needsUpdate = true;
}

export function desenharFluxo(tela, agentes) {
  const { ctx, canvas, textura } = tela;
  const { width: w, height: h } = canvas;
  fundo(ctx, w, h, '#fbfbf8');
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 34px "Comic Sans MS", "Segoe Print", cursive';
  ctx.textAlign = 'left';
  ctx.fillText('Fluxo da equipe', 28, 50);

  const larg = (w - 56 - (agentes.length - 1) * 50) / agentes.length;
  agentes.forEach((a, i) => {
    const x = 28 + i * (larg + 50);
    const y = 110;
    ctx.strokeStyle = a.cor;
    ctx.lineWidth = a.estado === 'trabalhando' ? 7 : 4;
    ctx.setLineDash(a.vaga ? [10, 8] : []);
    ctx.strokeRect(x, y, larg, 110);
    ctx.setLineDash([]);
    ctx.fillStyle = a.cor;
    ctx.font = 'bold 28px "Comic Sans MS", "Segoe Print", cursive';
    ctx.textAlign = 'center';
    ctx.fillText(a.cargo.split(' ')[0], x + larg / 2, y + 48);
    ctx.fillStyle = '#475569';
    ctx.font = '22px "Comic Sans MS", "Segoe Print", cursive';
    ctx.fillText(a.nome ?? 'contratar!', x + larg / 2, y + 84);
    if (i < agentes.length - 1) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + larg + 8, y + 55);
      ctx.lineTo(x + larg + 42, y + 55);
      ctx.lineTo(x + larg + 30, y + 43);
      ctx.moveTo(x + larg + 42, y + 55);
      ctx.lineTo(x + larg + 30, y + 67);
      ctx.stroke();
    }
  });
  ctx.fillStyle = '#64748b';
  ctx.font = '20px "Comic Sans MS", "Segoe Print", cursive';
  ctx.textAlign = 'left';
  ctx.fillText('Maps  →  site sob medida  →  vídeo + abordagem', 28, 280);
  textura.needsUpdate = true;
}
