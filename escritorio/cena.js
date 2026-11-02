import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { criarEscritorio } from './mundo.js';
import { Funcionario, ROTULOS } from './funcionario.js';
import { desenharMonitor, desenharTV, desenharRelogio, desenharFluxo } from './telas.js';

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
camera.position.set(22, 20, 22);
camera.zoom = 1.08;

const controles = new OrbitControls(camera, rotulos.domElement);
controles.target.set(0, 0.5, 0);
controles.enableDamping = true;
controles.minZoom = 0.7;
controles.maxZoom = 3;
controles.minPolarAngle = 0.55;
controles.maxPolarAngle = 1.2;
controles.minAzimuthAngle = 0.15;
controles.maxAzimuthAngle = 1.42;
controles.screenSpacePanning = true;

const ceu = new THREE.HemisphereLight('#ffffff', '#8a7560', 1.6);
cena.add(ceu);
const sol = new THREE.DirectionalLight('#fff4e0', 2.2);
sol.position.set(10, 22, 12);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
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
let mundo = null;
const funcionarios = new Map();

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

function montarMundo(agentes) {
  mundo = criarEscritorio(cena, agentes);
  agentes.forEach((a, i) => {
    funcionarios.set(a.id, new Funcionario(a, mundo.mesas[i], cena, mundo.pontos, abrirDetalhe));
  });
}

function aplicarEstado() {
  if (!mundo) montarMundo(estado.agentes);
  for (const a of estado.agentes) funcionarios.get(a.id)?.atualizarStatus(a);
  desenharTV(mundo.tv, estado);
  desenharFluxo(mundo.fluxo, estado.agentes);
  atualizarHud();
  if (detalheAberto) abrirDetalhe(funcionarios.get(detalheAberto));
}

// ---------- Interface ----------
const fmtHora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function atualizarHud() {
  const ativos = estado.agentes.filter((a) => a.estado === 'trabalhando').length;
  const contratados = estado.agentes.filter((a) => !a.vaga).length;
  $('#m-leads').textContent = estado.leads.total;
  $('#m-sites').textContent = estado.leads.comSite;
  $('#m-fila').textContent = estado.leads.naFila;
  $('#m-ativos').textContent = `${ativos}/${contratados}`;

  $('#equipe').innerHTML = estado.agentes
    .map(
      (a) => `
      <li><button class="membro" data-id="${a.id}" data-estado="${a.estado}" style="--cor:${a.cor}">
        <span class="avatar">${esc((a.nome ?? '?')[0])}</span>
        <span class="info"><b>${esc(a.nome ?? 'Vaga aberta')}</b><small>${esc(a.cargo)} · <code>${esc(a.pasta)}</code></small></span>
        <span class="selo">${ROTULOS[a.estado] ?? a.estado}</span>
      </button></li>`,
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
  const id = e.target.closest('.membro')?.dataset.id;
  if (id) abrirDetalhe(funcionarios.get(id));
});

let detalheAberto = null;
function abrirDetalhe(f) {
  if (!f) return;
  detalheAberto = f.membro.id;
  const a = estado.agentes.find((x) => x.id === f.membro.id);
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

// Clique direto no bonequinho
const raio = new THREE.Raycaster();
rotulos.domElement.addEventListener('click', (e) => {
  const r = rotulos.domElement.getBoundingClientRect();
  raio.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const alvo = raio.intersectObjects(cena.children, true).find((i) => i.object.userData.funcionario);
  if (alvo) abrirDetalhe(alvo.object.userData.funcionario);
});

// ---------- Luz do dia (segue o horário real) ----------
function atualizarLuz() {
  if (!mundo) return;
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const dia = Math.min(1, Math.max(0, Math.min(h - 6, 19 - h) / 1.5)); // 0 = noite, 1 = dia
  ceu.intensity = 0.7 + dia * 0.9;
  sol.intensity = 0.6 + dia * 1.6;
  sol.color.set(dia > 0.5 ? '#fff4e0' : '#ffd9a8');
  for (const vidro of mundo.vidros) {
    vidro.color.set(dia > 0.5 ? '#9fd3ff' : '#1e2a4a');
    vidro.emissive.set(dia > 0.5 ? '#7fbfff' : '#0f1830');
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
  controles.update();

  if (mundo && estado) {
    for (const f of funcionarios.values()) f.atualizar(dt);

    acumTelas += dt;
    if (acumTelas > 0.12) {
      acumTelas = 0;
      estado.agentes.forEach((a, i) => {
        desenharMonitor(mundo.mesas[i].tela, a, t);
        mundo.mesas[i].brilho.intensity = a.estado === 'trabalhando' ? 1.2 : 0;
      });
    }
    acumRelogio += dt;
    if (acumRelogio > 1) {
      acumRelogio = 0;
      desenharRelogio(mundo.relogio);
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
