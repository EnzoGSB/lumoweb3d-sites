import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { criarPredio, instalarLuz, abrirVao, ALTURA_ANDAR, FOLGA_ANDAR_ACESO, LUZ, SALA } from './mundo.js';
import { Funcionario, ROTULOS } from './funcionario.js';
import { montarFiltros } from './filtros-leo.js';
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

const ZOOM_ANDAR = 0.8;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.set(22, 11, 22); // ângulo baixo: de frente para o corte do prédio, como casa de bonecas
camera.zoom = ZOOM_ANDAR;

const controles = new OrbitControls(camera, rotulos.domElement);
controles.target.set(0, 0.5, 0);
controles.enableDamping = true;
controles.minZoom = 0.45;
controles.maxZoom = 3;
controles.minPolarAngle = 0.95; // mais alto que isso, a laje de cima tapa o andar aceso
controles.maxPolarAngle = 1.35;
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
cena.add(sol, sol.target);

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
let cobertura = null;
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
  ({ predio, cobertura } = criarPredio(cena, estado.andares, estado.agentes));
  for (const a of estado.agentes) {
    const andar = predio.get(a.andar);
    funcionarios.set(a.id, new Funcionario(a, andar.mesas.get(a.id), andar.grupo, andar.pontos, abrirDetalhe));
  }

  // Placas dos andares (aparecem nos andares apagados e na vista do prédio)
  for (const andar of predio.values()) {
    instalarLuz(andar);
    andar.folga = 0;
    const el = document.createElement('button');
    el.className = 'placa-andar';
    el.addEventListener('click', () => mudarVista(andar.numero));
    const placa = new CSS2DObject(el);
    placa.position.set(SALA.x - 1.5, 3.2, SALA.z);
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

function andarAceso(n) {
  return vista === 'predio' || vista === n;
}

function mudarVista(nova, animar = true) {
  vista = nova;
  try {
    localStorage.setItem('escritorio-vista', String(nova));
  } catch {}

  // Todos os andares seguem na cena e trabalhando: a vista só decide qual fica de luz acesa.
  // Crachás só no andar aceso; os apagados mostram a placa com o que está acontecendo lá.
  for (const f of funcionarios.values()) f.etiqueta.visible = vista === f.membro.andar;
  for (const [n, placa] of placasAndar) placa.visible = vista === 'predio' || vista !== n;

  // O sol acompanha o andar aceso, e só ele projeta sombra: senão a laje de cima escureceria o de baixo
  const yAceso = vista === 'predio' ? 0 : (vista - 1) * ALTURA_ANDAR;
  sol.position.y = 26 + yAceso;
  sol.target.position.y = yAceso;
  for (const andar of predio.values()) {
    for (const m of andar.sombras) m.castShadow = vista === andar.numero;
  }

  const topo = predio.size * ALTURA_ANDAR;
  alvoCamera =
    vista === 'predio'
      ? { y: topo / 2 + 1.5, zoom: Math.min(ZOOM_ANDAR, 21 / (topo + 15)) }
      : { y: yAceso + 4, zoom: ZOOM_ANDAR };
  if (!animar) {
    moverCamera(1);
    alvoCamera = null;
    moverAndares(1);
  }

  document.querySelectorAll('#andares button').forEach((b) => b.classList.toggle('ativo', b.dataset.vista === String(vista)));
  document.body.dataset.vista = String(vista);
  if (estado) atualizarHud();
}

// Abre o pé-direito do andar aceso e empurra para cima o que está acima dele
function moverAndares(k) {
  let subida = 0;
  for (const andar of predio.values()) {
    andar.folga += ((vista === andar.numero ? FOLGA_ANDAR_ACESO : 0) - andar.folga) * k;
    andar.grupo.position.y = (andar.numero - 1) * ALTURA_ANDAR + subida;
    abrirVao(andar, andar.folga);
    subida += andar.folga;
  }
  cobertura.position.y = predio.size * ALTURA_ANDAR + subida;
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

// Servidor sem o expediente (versão pública ou aberto antes desta versão): sem seletores
const comSeletores = () => !PUBLICO && Boolean(estado.expediente);

// Seletor do agente: ligado = não para nunca; desligado = pausa autorizada (só no escritório local)
function seletorMembro(a) {
  if (a.vaga || !comSeletores()) return '';
  return `<button class="seletor" role="switch" data-agente="${a.id}" aria-checked="${a.ligado}"
        aria-label="${esc(a.nome)}: ${a.ligado ? 'trabalhando sem parar' : 'em pausa'}" title="${a.ligado ? 'Autorizar pausa' : 'Chamar de volta ao trabalho'}"></button>`;
}

function cartaoMembro(a) {
  return `
      <li class="linha-membro">${seletorMembro(a)}<button class="membro" data-id="${a.id}" data-estado="${a.estado}" style="--cor:${a.cor}">
        <span class="avatar">${esc((a.nome ?? '?')[0])}</span>
        <span class="info"><b>${esc(a.nome ?? 'Vaga aberta')}</b><small>${esc(a.cargo)} · <code>${esc(a.pasta)}</code></small></span>
        <span class="selo">${ROTULOS[a.estado] ?? a.estado}</span>
      </button></li>`;
}

let equipeDesenhada = '';

function atualizarHud() {
  const ativos = estado.agentes.filter((a) => a.estado === 'trabalhando').length;
  const contratados = estado.agentes.filter((a) => !a.vaga).length;
  $('#m-leads').textContent = estado.leads.total;
  $('#m-sites').textContent = estado.leads.comSite;
  $('#m-fila').textContent = estado.leads.naFila;
  $('#m-ativos').textContent = `${ativos}/${contratados}`;

  if (comSeletores()) {
    const empresa = estado.expediente.empresa;
    $('#expediente').hidden = false;
    $('#expediente').classList.toggle('encerrado', !empresa);
    $('#expediente-texto').textContent = empresa ? 'Ninguém para sem a sua ordem' : 'Empresa parada. Ligue para retomar';
    $('#seletor-empresa').setAttribute('aria-checked', String(empresa));
    $('#seletor-empresa').title = empresa ? 'Parar a empresa toda' : 'Retomar o expediente';
  }

  // Equipe agrupada por andar; o andar em foco vem primeiro
  const ordem = [...estado.andares].sort((a, b) => (b.numero === vista) - (a.numero === vista));
  // Só refaz a lista se algo mudou: refazer a cada 2 s engoliria cliques e tiraria o foco dos seletores
  const equipeHtml = ordem
    .map(
      (andar) => `
      <li class="grupo-andar${andarAceso(andar.numero) ? '' : ' fora'}">
        <button data-vista="${andar.numero}"><b>${numero(andar.numero)}</b> ${esc(andar.nome)}</button>
        <ul>${doAndar(andar.numero).map(cartaoMembro).join('')}</ul>
      </li>`,
    )
    .join('');
  if (equipeHtml !== equipeDesenhada) {
    equipeDesenhada = equipeHtml;
    $('#equipe').innerHTML = equipeHtml;
  }

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

async function mudarExpediente(pedido) {
  try {
    await fetch('/api/expediente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
    });
    await buscarEstado();
  } catch {
    document.body.classList.add('desconectado');
  }
}

$('#seletor-empresa').addEventListener('click', () => mudarExpediente({ empresa: !estado.expediente.empresa }));

$('#equipe').addEventListener('click', (e) => {
  const seletor = e.target.closest('.seletor');
  if (seletor) return mudarExpediente({ agente: seletor.dataset.agente, ligado: seletor.getAttribute('aria-checked') !== 'true' });
  const andar = e.target.closest('.grupo-andar > button')?.dataset.vista;
  if (andar) return mudarVista(Number(andar));
  const id = e.target.closest('.membro')?.dataset.id;
  if (!id) return;
  const f = funcionarios.get(id);
  if (vista !== f.membro.andar) mudarVista(f.membro.andar);
  abrirDetalhe(f);
});

let detalheAberto = null;
function abrirDetalhe(f) {
  if (!f) return;
  const a = estado.agentes.find((x) => x.id === f.membro.id);
  // O terminal só é montado ao abrir outro funcionário; nas atualizações a cada 2 s só os dados mudam
  if (detalheAberto !== a.id) montarTerminal(a);
  detalheAberto = a.id;
  const andar = estado.andares.find((x) => x.numero === a.andar);
  const s = a.status ?? {};
  const linha = (rotulo, valor) => (valor != null && valor !== '' ? `<dt>${rotulo}</dt><dd>${valor}</dd>` : '');
  $('#detalhe').style.setProperty('--cor', a.cor);
  const html = `
    <header>
      <span class="avatar">${esc((a.nome ?? '?')[0])}</span>
      <div><h2>${esc(a.nome ?? 'Vaga aberta')}</h2><p>${esc(a.cargo)}</p></div>
    </header>
    ${blocoProblema(a)}
    <p class="descricao">${esc(a.descricao)}</p>
    ${blocoLeadsComErro(a)}
    <dl>
      ${linha('Andar', andar ? `${numero(andar.numero)} · ${esc(andar.nome)}` : null)}
      ${linha('Pasta', `<code>${esc(a.pasta)}</code>`)}
      ${linha('Situação', ROTULOS[a.estado] ?? a.estado)}
      ${linha('Fazendo agora', ['trabalhando', 'plantao'].includes(a.estado) ? esc(s.tarefa) : null)}
      ${linha('Lead atual', esc(s.leadAtual))}
      ${linha('Fila', s.fila)}
      ${linha('Próxima execução', s.proximaExecucao && a.estado === 'plantao' ? fmtHora(s.proximaExecucao) : null)}
      ${linha('Último sinal', s.atualizadoEm ? `${new Date(s.atualizadoEm).toLocaleDateString('pt-BR')} ${fmtHora(s.atualizadoEm)}` : null)}
    </dl>
    ${
      s.historico?.length
        ? `<h3>Histórico</h3><ol class="historico">${s.historico
            .map((h) => `<li data-estado="${h.estado}"><time>${fmtHora(h.em)}</time> ${esc(h.mensagem)}</li>`)
            .join('')}</ol>`
        : ''
    }`;
  // Sem isso, a atualização a cada 2 s fecharia o detalhe técnico e voltaria a rolagem
  const conteudo = $('#detalhe .conteudo');
  if (conteudo.dataset.html !== html) {
    conteudo.innerHTML = html;
    conteudo.dataset.html = html;
  }
  $('#detalhe').hidden = false;
}

function blocoProblema(a) {
  const p = a.problema;
  if (!p) return '';
  const desde = p.desde ? `${new Date(p.desde).toLocaleDateString('pt-BR')} às ${fmtHora(p.desde)}` : null;
  return `
    <section class="problema" role="alert">
      <h4>${esc(p.titulo)}</h4>
      <dl>
        <dt>Causa</dt><dd>${esc(p.causa)}</dd>
        ${p.mensagem ? `<dt>Mensagem</dt><dd><code>${esc(p.mensagem)}</code></dd>` : ''}
        <dt>Como resolver</dt><dd>${esc(p.acao)}</dd>
        ${p.lead ? `<dt>Lead</dt><dd>${esc(p.lead)}</dd>` : ''}
        ${desde ? `<dt>Desde</dt><dd>${desde}</dd>` : ''}
      </dl>
      ${p.detalhe ? `<details open><summary>Erro técnico</summary><pre>${esc(p.detalhe)}</pre></details>` : ''}
    </section>`;
}

function blocoLeadsComErro(a) {
  if (!a.leadsComErro?.length) return '';
  return `
    <details class="leads-com-erro"><summary>${a.leadsComErro.length} lead(s) com falha</summary>
      <ul>${a.leadsComErro.map((l) => `<li><b>${esc(l.nome)}</b> (${l.tentativas}/3): ${esc(l.erro)}</li>`).join('')}</ul>
    </details>`;
}
$('#detalhe .fechar').addEventListener('click', () => {
  $('#detalhe').hidden = true;
  detalheAberto = null;
  delete $('#detalhe .conteudo').dataset.html;
  montarTerminal(null);
});

// ---------- Terminal do funcionário (só no escritório local) ----------
let fluxoTerminal = null;

function montarTerminal(a) {
  fluxoTerminal?.close();
  fluxoTerminal = null;
  const area = $('#detalhe .area-terminal');
  $('#detalhe').classList.toggle('com-terminal', Boolean(a?.terminal));
  if (!a?.terminal) {
    area.innerHTML = '';
    return;
  }

  const comFormulario = a.terminal.formulario && !PUBLICO;
  area.innerHTML = `
    ${
      comFormulario
        ? `<div class="abas-leo" role="tablist">
             <button type="button" role="tab" data-aba="filtros">Filtros</button>
             <button type="button" role="tab" data-aba="terminal">Terminal</button>
           </div>
           <div class="painel-filtros"></div>`
        : '<h3>Terminal</h3>'
    }
    <div class="terminal" role="log" aria-live="polite">
      <div class="saida"></div>
      <form class="linha-comando" autocomplete="off">
        <label for="comando-terminal">${esc(a.terminal.prompt)}</label>
        <input id="comando-terminal" spellcheck="false" placeholder="${esc(a.terminal.exemplo)}">
      </form>
    </div>`;
  const saida = area.querySelector('.saida');
  const form = area.querySelector('form');
  const input = area.querySelector('input');

  const escrever = (texto, fluxo = 'sistema') => {
    const div = document.createElement('div');
    div.className = `l-${fluxo}`;
    div.textContent = texto;
    saida.append(div);
    saida.scrollTop = saida.scrollHeight;
  };
  const ajuda = () => {
    escrever(`Digite o que o ${a.nome} deve buscar no Google Maps. Exemplos:`);
    escrever(`  ${a.terminal.exemplo}`);
    escrever('  Academias em Pinheiros --headless   (sem abrir a janela do navegador)');
    escrever(`Comandos: parar · limpar · ajuda${a.terminal.login ? ' · entrar (login do Google)' : ''}`);
  };

  if (PUBLICO) {
    escrever('O terminal só funciona no escritório local.');
    escrever('No seu computador: npm run escritorio → http://localhost:3333');
    input.disabled = true;
    input.placeholder = 'Indisponível na versão pública';
    return;
  }

  const pedir = async (corpo) => {
    try {
      const resp = await fetch(`/api/terminal/${a.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      return await resp.json();
    } catch {
      return { ok: false, mensagem: 'Sem conexão com o servidor do escritório.' };
    }
  };

  const terminalEl = area.querySelector('.terminal');
  const mostrarAba = (aba) => {
    if (!comFormulario) return;
    area.querySelector('.painel-filtros').hidden = aba !== 'filtros';
    terminalEl.hidden = aba !== 'terminal';
    for (const b of area.querySelectorAll('[data-aba]')) b.setAttribute('aria-selected', String(b.dataset.aba === aba));
    if (aba === 'terminal') {
      saida.scrollTop = saida.scrollHeight;
      input.focus();
    }
  };
  area.querySelector('.abas-leo')?.addEventListener('click', (e) => {
    const aba = e.target.closest('[data-aba]')?.dataset.aba;
    if (aba) mostrarAba(aba);
  });

  // Ao iniciar, vai para o terminal para acompanhar; erro de validação fica no formulário
  const pedirEAcompanhar = async (corpo) => {
    const r = await pedir(corpo);
    if (r.ok) mostrarAba('terminal');
    else formulario.erro(r.mensagem);
  };
  const formulario = comFormulario
    ? montarFiltros(area.querySelector('.painel-filtros'), {
        aoBuscar: (filtros) => pedirEAcompanhar({ filtros }),
        aoEntrar: () => pedirEAcompanhar({ comando: 'entrar' }),
        aoParar: () => pedir({ comando: 'parar' }),
      })
    : null;
  mostrarAba('filtros');

  ajuda();
  fluxoTerminal = new EventSource(`/api/terminal/${a.id}`);
  fluxoTerminal.onmessage = (e) => {
    const ev = JSON.parse(e.data);
    if (ev.tipo === 'linha') escrever(ev.texto, ev.fluxo);
    if (ev.tipo === 'estado') {
      terminalEl.classList.toggle('rodando', ev.rodando);
      input.placeholder = ev.rodando ? 'Rodando… digite "parar" para interromper' : a.terminal.exemplo;
      formulario?.atualizar(ev);
    }
  };

  const historico = [];
  let posicao = 0;
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    posicao = Math.max(0, Math.min(historico.length, posicao + (e.key === 'ArrowUp' ? -1 : 1)));
    input.value = historico[posicao] ?? '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const comando = input.value.trim();
    if (!comando) return;
    historico.push(comando);
    posicao = historico.length;
    input.value = '';
    if (comando === 'limpar') return void (saida.innerHTML = '');
    if (comando === 'ajuda') return ajuda();
    const r = await pedir({ comando });
    if (!r.ok && r.mensagem) escrever(r.mensagem, 'erro');
  });
  if (!comFormulario) setTimeout(() => input.focus(), 50);
}

// Clique direto no prédio: um andar apagado acende; no andar aceso, o bonequinho abre o detalhe
const raio = new THREE.Raycaster();
let andarNaMira = null;
let inicioClique = null;

function mirar(e) {
  const r = rotulos.domElement.getBoundingClientRect();
  raio.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  return raio.intersectObjects([...predio.values()].map((a) => a.volume))[0]?.object.userData.andar ?? null;
}

// Crachás e placas ficam fora do OrbitControls: ele captura o ponteiro e o clique nunca chegaria neles
rotulos.domElement.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.etiqueta, .placa-andar')) e.stopPropagation();
}, true);
rotulos.domElement.addEventListener('pointerdown', (e) => (inicioClique = { x: e.clientX, y: e.clientY }));
rotulos.domElement.addEventListener('pointermove', (e) => {
  if (!predio || e.buttons) return;
  andarNaMira = mirar(e);
  rotulos.domElement.style.cursor = andarNaMira && andarNaMira !== vista ? 'pointer' : '';
});
rotulos.domElement.addEventListener('pointerleave', () => (andarNaMira = null));
rotulos.domElement.addEventListener('click', (e) => {
  // Arrastar para girar a câmera também termina em clique
  if (!predio || !inicioClique || Math.hypot(e.clientX - inicioClique.x, e.clientY - inicioClique.y) > 5) return;
  if (e.target.closest('.etiqueta, .placa-andar')) return;
  const n = mirar(e);
  if (!n) return;
  if (n !== vista) return mudarVista(n);
  const alvo = raio.intersectObject(predio.get(n).grupo, true).find((i) => i.object.userData.funcionario?.presente);
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
    moverAndares(Math.min(1, dt * 6));
    for (const f of funcionarios.values()) f.atualizar(dt);
    for (const andar of predio.values()) {
      for (const animar of andar.animacoes) animar(t);
      const luz = andarAceso(andar.numero) ? LUZ.acesa : andarNaMira === andar.numero ? LUZ.mira : LUZ.apagada;
      andar.luz.value.lerp(luz, Math.min(1, dt * 6));
    }

    acumTelas += dt;
    if (acumTelas > 0.12) {
      acumTelas = 0;
      for (const a of estado.agentes) {
        const f = funcionarios.get(a.id);
        if (!f) continue;
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
