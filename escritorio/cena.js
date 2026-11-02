import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { criarPredio, ALTURA_ANDAR, SALA } from './mundo.js';
import { Funcionario, ROTULOS } from './funcionario.js';
import { desenharMonitor, desenharTV, desenharTV3D, desenharRelogio, desenharFluxo } from './telas.js';

const $ = (s) => document.querySelector(s);
const palco = $('#palco');

// ---------- Renderização ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
palco.appendChild(renderer.domElement);

const rotulos = new CSS2DRenderer();
rotulos.domElement.className = 'camada-rotulos';
palco.appendChild(rotulos.domElement);

const cena = new THREE.Scene();
cena.background = new THREE.Color('#14273C'); // azul-marinho da marca

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.set(22, 20.5, 22);
camera.zoom = 1.08;

const controles = new OrbitControls(camera, rotulos.domElement);
controles.target.set(0, 0.5, 0);
controles.enableDamping = true;
controles.minZoom = 0.45;
controles.maxZoom = 3;
controles.minPolarAngle = 0.55;
controles.maxPolarAngle = 1.2;
controles.minAzimuthAngle = 0.15;
controles.maxAzimuthAngle = 1.42;
controles.screenSpacePanning = true;

const ceu = new THREE.HemisphereLight('#ffffff', '#8a7560', 1.6);
cena.add(ceu);
const sol = new THREE.DirectionalLight('#fff4e0', 2.2);
sol.position.set(10, 26, 12);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
sol.shadow.bias = -0.0005;
cena.add(sol);

function ajustarTamanho() {
  const w = palco.clientWidth;
  const h = palco.clientHeight;
  const aspecto = w / h;
  const meiaAltura = Math.max(10.5, 15.5 / aspecto);
  Object.assign(camera, { left: -meiaAltura * aspecto, right: meiaAltura * aspecto, top: meiaAltura, bottom: -meiaAltura });
  // Centraliza o escritório na área que o painel lateral não cobre
  const painel = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--painel')) || 0;
  camera.setViewOffset(w, h, painel ? (painel + 16) / 2 : 0, 0, w, h);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  rotulos.setSize(w, h);
}
addEventListener('resize', ajustarTamanho);
ajustarTamanho();

// ---------- Dados ----------
let estado = null;
let predio = null; // Map<numero do andar, andar>
const funcionarios = new Map();
const placasAndar = new Map();

// No seu PC lê a API ao vivo; na versão pública (GitHub Pages) lê a foto dos dados enviada pelo publicador
const PUBLICO = !['localhost', '127.0.0.1'].includes(location.hostname);
const FONTE = PUBLICO ? 'estado.json' : '/api/estado';

async function buscarEstado() {
  try {
    const resp = await fetch(`${FONTE}?t=${Date.now()}`, { cache: 'no-store' });
    estado = await resp.json();
    document.body.classList.remove('desconectado');
    if (PUBLICO) $('#atualizado').textContent = ` · dados de ${fmtHora(estado.agora)}`;
    aplicarEstado();
  } catch {
    document.body.classList.add('desconectado');
  }
}

const doAndar = (n) => estado.agentes.filter((a) => a.andar === n);
const numero = (n) => String(n).padStart(2, '0');

function montarPredio() {
  predio = criarPredio(cena, estado.andares, estado.agentes);
  for (const a of estado.agentes) {
    const andar = predio.get(a.andar);
    funcionarios.set(a.id, new Funcionario(a, andar.mesas.get(a.id), andar.grupo, andar.pontos, abrirDetalhe));
  }

  // Placas dos andares (aparecem na vista do prédio)
  for (const andar of predio.values()) {
    const el = document.createElement('button');
    el.className = 'placa-andar';
    el.addEventListener('click', () => mudarVista(andar.numero));
    const placa = new CSS2DObject(el);
    placa.position.set(SALA.x - 1.5, 1.2, SALA.z);
    andar.grupo.add(placa);
    placasAndar.set(andar.numero, placa);
  }

  $('#andares').innerHTML = [
    `<button data-vista="predio">Prédio<small>Todos os andares</small></button>`,
    ...estado.andares.map((a) => `<button data-vista="${a.numero}"><b>${numero(a.numero)}</b>${esc(a.nome)}<small>${esc(a.placa)}</small></button>`),
  ].join('');
  mudarVista(vistaSalva(), false);
}

function aplicarEstado() {
  if (!predio) montarPredio();
  for (const a of estado.agentes) funcionarios.get(a.id)?.atualizarStatus(a);

  const marketing = predio.get(1);
  if (marketing) {
    desenharTV(marketing.tv, estado);
    desenharFluxo(marketing.fluxo, doAndar(1));
  }
  const impressao = predio.get(2);
  if (impressao) desenharTV3D(impressao.tv, doAndar(2));

  for (const [n, placa] of placasAndar) {
    const equipe = doAndar(n);
    const ativos = equipe.filter((a) => a.estado === 'trabalhando').length;
    const contratados = equipe.filter((a) => !a.vaga).length;
    const andar = predio.get(n);
    placa.element.innerHTML = `<b>${numero(n)}</b><span>${esc(andar.nome)}<small>${
      contratados ? `${ativos} trabalhando · ${contratados}/${equipe.length} na equipe` : `${equipe.length} vagas abertas`
    }</small></span>`;
  }

  atualizarHud();
  if (detalheAberto) abrirDetalhe(funcionarios.get(detalheAberto));
}

// ---------- Vistas: prédio inteiro ou um andar ----------
let vista = 1;
let alvoCamera = null;

function vistaSalva() {
  try {
    const v = localStorage.getItem('escritorio-vista');
    if (v === 'predio') return 'predio';
    if (predio.has(Number(v))) return Number(v);
  } catch {}
  return 1;
}

function andarVisivel(n) {
  return vista === 'predio' || vista === n;
}

function mudarVista(nova, animar = true) {
  vista = nova;
  try {
    localStorage.setItem('escritorio-vista', String(nova));
  } catch {}

  for (const andar of predio.values()) andar.grupo.visible = andarVisivel(andar.numero);
  // Na vista do prédio os andares se sobrepõem: troca os crachás pelas placas de cada andar
  for (const f of funcionarios.values()) f.etiqueta.visible = vista !== 'predio' && andarVisivel(f.membro.andar);
  for (const placa of placasAndar.values()) placa.visible = vista === 'predio';

  const topo = (predio.size - 1) * ALTURA_ANDAR;
  alvoCamera =
    vista === 'predio'
      ? { y: topo / 2 + 1.5, zoom: 0.62 }
      : { y: (vista - 1) * ALTURA_ANDAR + 0.5, zoom: 1.08 };
  if (!animar) {
    moverCamera(1);
    alvoCamera = null;
  }

  document.querySelectorAll('#andares button').forEach((b) => b.classList.toggle('ativo', b.dataset.vista === String(vista)));
  document.body.dataset.vista = String(vista);
  if (estado) atualizarHud();
}

// Desliza alvo e câmera juntos (mantendo o ângulo que a pessoa escolheu) e ajusta o zoom
function moverCamera(k) {
  const dy = (alvoCamera.y - controles.target.y) * k;
  controles.target.y += dy;
  camera.position.y += dy;
  // Recentraliza no eixo horizontal só ao trocar de vista
  const dx = -controles.target.x * k;
  const dz = -controles.target.z * k;
  controles.target.x += dx;
  controles.target.z += dz;
  camera.position.x += dx;
  camera.position.z += dz;
  camera.zoom += (alvoCamera.zoom - camera.zoom) * k;
  camera.updateProjectionMatrix();
}

$('#andares').addEventListener('click', (e) => {
  const v = e.target.closest('button')?.dataset.vista;
  if (v) mudarVista(v === 'predio' ? 'predio' : Number(v));
});

// ---------- Interface ----------
const fmtHora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function cartaoMembro(a) {
  return `
      <li><button class="membro" data-id="${a.id}" data-estado="${a.estado}" style="--cor:${a.cor}">
        <span class="avatar">${esc((a.nome ?? '?')[0])}</span>
        <span class="info"><b>${esc(a.nome ?? 'Vaga aberta')}</b><small>${esc(a.cargo)} · <code>${esc(a.pasta)}</code></small></span>
        <span class="selo">${ROTULOS[a.estado] ?? a.estado}</span>
      </button></li>`;
}

function atualizarHud() {
  const ativos = estado.agentes.filter((a) => a.estado === 'trabalhando').length;
  const contratados = estado.agentes.filter((a) => !a.vaga).length;
  $('#m-leads').textContent = estado.leads.total;
  $('#m-sites').textContent = estado.leads.comSite;
  $('#m-fila').textContent = estado.leads.naFila;
  $('#m-ativos').textContent = `${ativos}/${contratados}`;

  // Equipe agrupada por andar; o andar em foco vem primeiro
  const ordem = [...estado.andares].sort((a, b) => (b.numero === vista) - (a.numero === vista));
  $('#equipe').innerHTML = ordem
    .map(
      (andar) => `
      <li class="grupo-andar${andarVisivel(andar.numero) ? '' : ' fora'}">
        <button data-vista="${andar.numero}"><b>${numero(andar.numero)}</b> ${esc(andar.nome)}</button>
        <ul>${doAndar(andar.numero).map(cartaoMembro).join('')}</ul>
      </li>`,
    )
    .join('');

  $('#sites').innerHTML = estado.sites.length
    ? estado.sites
        .map(
          (s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">
            <b>${esc(s.nome)}</b><small>${esc(s.categoria ?? '')} · ${new Date(s.geradoEm).toLocaleDateString('pt-BR')} ${fmtHora(s.geradoEm)}</small></a></li>`,
        )
        .join('')
    : '<li class="vazio">Nenhum site publicado ainda.</li>';

  const nomes = Object.fromEntries(estado.agentes.map((a) => [a.id, a]));
  $('#atividade').innerHTML = estado.atividade.length
    ? estado.atividade
        .map(
          (h) => `<li style="--cor:${nomes[h.agente]?.cor}"><time>${fmtHora(h.em)}</time>
            <span><b>${esc(nomes[h.agente]?.nome ?? h.agente)}</b> ${esc(h.mensagem)}</span></li>`,
        )
        .join('')
    : '<li class="vazio">Sem atividade ainda.</li>';
}

$('#equipe').addEventListener('click', (e) => {
  const andar = e.target.closest('.grupo-andar > button')?.dataset.vista;
  if (andar) return mudarVista(Number(andar));
  const id = e.target.closest('.membro')?.dataset.id;
  if (!id) return;
  const f = funcionarios.get(id);
  if (!andarVisivel(f.membro.andar) || vista === 'predio') mudarVista(f.membro.andar);
  abrirDetalhe(f);
});

let detalheAberto = null;
function abrirDetalhe(f) {
  if (!f) return;
  detalheAberto = f.membro.id;
  const a = estado.agentes.find((x) => x.id === f.membro.id);
  const andar = estado.andares.find((x) => x.numero === a.andar);
  const s = a.status ?? {};
  const linha = (rotulo, valor) => (valor != null && valor !== '' ? `<dt>${rotulo}</dt><dd>${valor}</dd>` : '');
  $('#detalhe').style.setProperty('--cor', a.cor);
  $('#detalhe .conteudo').innerHTML = `
    <header>
      <span class="avatar">${esc((a.nome ?? '?')[0])}</span>
      <div><h2>${esc(a.nome ?? 'Vaga aberta')}</h2><p>${esc(a.cargo)}</p></div>
    </header>
    <p class="descricao">${esc(a.descricao)}</p>
    <dl>
      ${linha('Andar', andar ? `${numero(andar.numero)} · ${esc(andar.nome)}` : null)}
      ${linha('Pasta', `<code>${esc(a.pasta)}</code>`)}
      ${linha('Situação', ROTULOS[a.estado] ?? a.estado)}
      ${linha('Fazendo agora', a.estado === 'trabalhando' || a.estado === 'erro' ? esc(s.tarefa) : null)}
      ${linha('Lead atual', esc(s.leadAtual))}
      ${linha('Fila', s.fila)}
      ${linha('Próxima execução', s.proximaExecucao && a.estado !== 'offline' ? fmtHora(s.proximaExecucao) : null)}
      ${linha('Último sinal', s.atualizadoEm ? `${new Date(s.atualizadoEm).toLocaleDateString('pt-BR')} ${fmtHora(s.atualizadoEm)}` : null)}
    </dl>
    ${
      s.historico?.length
        ? `<h3>Histórico</h3><ol class="historico">${s.historico
            .map((h) => `<li data-estado="${h.estado}"><time>${fmtHora(h.em)}</time> ${esc(h.mensagem)}</li>`)
            .join('')}</ol>`
        : ''
    }`;
  $('#detalhe').hidden = false;
}
$('#detalhe .fechar').addEventListener('click', () => {
  $('#detalhe').hidden = true;
  detalheAberto = null;
});

// Clique direto no bonequinho (só nos andares à mostra)
const raio = new THREE.Raycaster();
rotulos.domElement.addEventListener('click', (e) => {
  if (vista === 'predio') return;
  const r = rotulos.domElement.getBoundingClientRect();
  raio.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const alvo = raio
    .intersectObjects(cena.children, true)
    .find((i) => i.object.userData.funcionario && andarVisivel(i.object.userData.funcionario.membro.andar));
  if (alvo) abrirDetalhe(alvo.object.userData.funcionario);
});

// ---------- Luz do dia (segue o horário real) ----------
function atualizarLuz() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const dia = Math.min(1, Math.max(0, Math.min(h - 6, 19 - h) / 1.5)); // 0 = noite, 1 = dia
  ceu.intensity = 0.7 + dia * 0.9;
  sol.intensity = 0.6 + dia * 1.6;
  sol.color.set(dia > 0.5 ? '#fff4e0' : '#ffd9a8');
  for (const andar of predio.values()) {
    for (const vidro of andar.vidros) {
      vidro.color.set(dia > 0.5 ? '#9fd3ff' : '#1e2a4a');
      vidro.emissive.set(dia > 0.5 ? '#7fbfff' : '#0f1830');
    }
  }
  $('#relogio').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ---------- Loop ----------
const relogioCena = new THREE.Clock();
let acumTelas = 0;
let acumRelogio = 1;
function quadro() {
  const dt = Math.min(relogioCena.getDelta(), 0.1);
  const t = relogioCena.elapsedTime;

  if (alvoCamera) {
    moverCamera(Math.min(1, dt * 6));
    if (Math.abs(alvoCamera.y - controles.target.y) < 0.01 && Math.abs(alvoCamera.zoom - camera.zoom) < 0.005) alvoCamera = null;
  }
  controles.update();

  if (predio && estado) {
    for (const f of funcionarios.values()) f.atualizar(dt);
    for (const andar of predio.values()) {
      if (andar.grupo.visible) for (const animar of andar.animacoes) animar(t);
    }

    acumTelas += dt;
    if (acumTelas > 0.12) {
      acumTelas = 0;
      for (const a of estado.agentes) {
        const f = funcionarios.get(a.id);
        if (!f || !andarVisivel(a.andar)) continue;
        desenharMonitor(f.mesa.tela, a, t);
        f.mesa.brilho.intensity = a.estado === 'trabalhando' ? 1.2 : 0;
      }
    }
    acumRelogio += dt;
    if (acumRelogio > 1) {
      acumRelogio = 0;
      for (const andar of predio.values()) desenharRelogio(andar.relogio);
      atualizarLuz();
    }
  }

  renderer.render(cena, camera);
  rotulos.render(cena, camera);
  requestAnimationFrame(quadro);
}

await buscarEstado();
setInterval(buscarEstado, PUBLICO ? 30_000 : 2000);
quadro();
