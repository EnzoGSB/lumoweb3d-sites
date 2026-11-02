// Monta o escritório: sala, mobília, mesas de trabalho e as telas (canvas) que mostram o que cada agente faz.
import * as THREE from 'three';
import { COR, FONTE_TITULO, logo, marcaPronta } from './marca.js';

// Sala: x ∈ [-10, 10], z ∈ [-7, 7]. Paredes no fundo (z = -7) e na esquerda (x = -10).
export const SALA = { x: 10, z: 7, alturaParede: 4.2 };
export const CORREDOR_Z = 0.6; // faixa livre usada para andar entre os ambientes
export const POSICOES_MESA = [-5, 0, 5];
const MESA_Z = -2.5;

const mat = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, ...extra });

function bloco(pai, w, h, d, material, x, y, z, { sombra = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof material === 'object' ? material : mat(material));
  m.position.set(x, y, z);
  m.castShadow = sombra;
  m.receiveShadow = true;
  pai.add(m);
  return m;
}

function telaCanvas(largura, altura) {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return { canvas, ctx: canvas.getContext('2d'), textura };
}

function texturaPiso() {
  const { canvas, ctx, textura } = telaCanvas(512, 512);
  const tons = ['#b88a5c', '#b3845a', '#bd9062', '#ad7f54', '#c29467'];
  const tabua = 64;
  for (let linha = 0; linha < 512 / tabua; linha++) {
    let x = linha % 2 ? -96 : 0;
    while (x < 512) {
      const comp = 160 + ((linha * 37 + x) % 3) * 48;
      ctx.fillStyle = tons[(linha * 7 + Math.abs(x)) % tons.length];
      ctx.fillRect(x, linha * tabua, comp, tabua);
      ctx.fillStyle = 'rgba(60,35,15,.35)';
      ctx.fillRect(x, linha * tabua, 2, tabua);
      x += comp;
    }
    ctx.fillStyle = 'rgba(60,35,15,.4)';
    ctx.fillRect(0, linha * tabua, 512, 2);
  }
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(5, 3.5);
  return textura;
}

function planta(pai, x, z, escala = 1) {
  const g = new THREE.Group();
  bloco(g, 0.5, 0.5, 0.5, '#d9d4cc', 0, 0.25, 0);
  bloco(g, 0.44, 0.04, 0.44, '#5b4030', 0, 0.5, 0);
  const folhas = ['#3f8f4a', '#4fa35a', '#367c40'];
  [[0, 0.8, 0, 0.6], [0.15, 1.2, 0.1, 0.45], [-0.15, 1.15, -0.1, 0.42], [0, 1.5, 0, 0.32]].forEach(([fx, fy, fz, s], i) =>
    bloco(g, s, s, s, folhas[i % 3], fx, fy, fz),
  );
  g.position.set(x, 0, z);
  g.scale.setScalar(escala);
  pai.add(g);
}

function cadeira(pai, x, z, cor) {
  const g = new THREE.Group();
  bloco(g, 0.06, 0.4, 0.06, '#2a2a2a', 0, 0.2, 0);
  bloco(g, 0.6, 0.04, 0.06, '#2a2a2a', 0, 0.03, 0);
  bloco(g, 0.06, 0.04, 0.6, '#2a2a2a', 0, 0.03, 0);
  bloco(g, 0.62, 0.1, 0.58, cor, 0, 0.45, 0);
  bloco(g, 0.62, 0.7, 0.1, cor, 0, 0.85, 0.3);
  g.position.set(x, 0, z);
  pai.add(g);
  return g;
}

function mesaDeTrabalho(pai, x, corAgente) {
  const g = new THREE.Group();
  g.position.set(x, 0, MESA_Z);
  const madeira = mat('#e9e4dc');
  bloco(g, 2.4, 0.06, 1.1, madeira, 0, 0.78, 0);
  for (const [px, pz] of [[-1.12, -0.48], [1.12, -0.48], [-1.12, 0.48], [1.12, 0.48]]) {
    bloco(g, 0.06, 0.78, 0.06, '#3a3a3a', px, 0.39, pz);
  }
  // Gaveteiro
  bloco(g, 0.5, 0.6, 0.9, '#d6d0c6', 0.85, 0.3, 0);

  // Monitor com tela viva
  bloco(g, 0.1, 0.32, 0.1, '#2a2a2a', 0, 0.97, -0.3);
  bloco(g, 0.4, 0.03, 0.25, '#2a2a2a', 0, 0.82, -0.3);
  bloco(g, 1.24, 0.74, 0.06, '#1d1d1f', 0, 1.42, -0.32);
  const tela = telaCanvas(320, 190);
  const telaMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.66), new THREE.MeshBasicMaterial({ map: tela.textura }));
  telaMesh.position.set(0, 1.42, -0.285);
  g.add(telaMesh);

  // Teclado, mouse, caneca na cor do agente, papelada
  bloco(g, 0.7, 0.03, 0.22, '#2f2f33', 0, 0.825, 0.18);
  bloco(g, 0.1, 0.03, 0.14, '#2f2f33', 0.55, 0.825, 0.2);
  bloco(g, 0.12, 0.16, 0.12, corAgente, -0.85, 0.89, 0.15);
  bloco(g, 0.32, 0.04, 0.24, '#fafafa', -0.75, 0.83, -0.25);

  // Luz da tela no rosto de quem trabalha
  const brilho = new THREE.PointLight('#9cc4ff', 0, 2.2);
  brilho.position.set(0, 1.4, 0.2);
  g.add(brilho);

  pai.add(g);
  const cadeiraObj = cadeira(pai, x, MESA_Z + 1.1, corAgente);
  return { x, grupo: g, tela, brilho, cadeira: cadeiraObj, assento: { x, z: MESA_Z + 1.05, rot: Math.PI } };
}

function placaVaga(mesa) {
  const { canvas, ctx, textura } = telaCanvas(256, 96);
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 40px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('VAGA', 128, 52);
  ctx.font = '20px system-ui';
  ctx.fillText('aberta', 128, 80);
  const placa = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 0.04), [
    mat('#d4a24c'), mat('#d4a24c'), mat('#d4a24c'), mat('#d4a24c'),
    new THREE.MeshStandardMaterial({ map: textura }), mat('#d4a24c'),
  ]);
  placa.position.set(-0.3, 0.95, 0.25);
  placa.rotation.x = -0.35;
  mesa.grupo.add(placa);
}

function janela(pai, x) {
  const g = new THREE.Group();
  bloco(g, 2.2, 1.9, 0.12, '#f3f3f3', 0, 0, 0);
  const vidro = new THREE.MeshStandardMaterial({ color: '#9fd3ff', emissive: '#7fbfff', emissiveIntensity: 0.6, roughness: 0.2 });
  bloco(g, 0.98, 1.72, 0.02, vidro, -0.52, 0, 0.07, { sombra: false });
  bloco(g, 0.98, 1.72, 0.02, vidro, 0.52, 0, 0.07, { sombra: false });
  // Silhueta da cidade
  [[-0.8, 0.35], [-0.55, 0.6], [-0.25, 0.25], [0.2, 0.5], [0.5, 0.3], [0.8, 0.55]].forEach(([bx, h]) =>
    bloco(g, 0.22, h, 0.01, '#6c95c2', bx, -0.86 + h / 2, 0.085, { sombra: false }),
  );
  g.position.set(x, 2.25, -SALA.z + 0.08);
  pai.add(g);
  return vidro;
}

function quadro(pai, w, h, x, y, z, rotY, borda) {
  const tela = telaCanvas(Math.round(w * 200), Math.round(h * 200));
  const g = new THREE.Group();
  bloco(g, w + 0.12, h + 0.12, 0.08, borda, 0, 0, 0);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tela.textura }));
  mesh.position.z = 0.05;
  g.add(mesh);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  pai.add(g);
  return tela;
}

export function criarEscritorio(cena, equipe) {
  const mundo = new THREE.Group();
  cena.add(mundo);

  // Piso e rodapé
  const piso = new THREE.Mesh(
    new THREE.BoxGeometry(SALA.x * 2, 0.2, SALA.z * 2),
    new THREE.MeshStandardMaterial({ map: texturaPiso(), roughness: 0.75 }),
  );
  piso.position.y = -0.1;
  piso.receiveShadow = true;
  mundo.add(piso);
  bloco(mundo, SALA.x * 2 + 0.3, 0.3, 0.3, '#3b3b3f', 0, -0.05, SALA.z + 0.15);
  bloco(mundo, 0.3, 0.3, SALA.z * 2 + 0.3, '#3b3b3f', SALA.x + 0.15, -0.05, 0);

  // Paredes
  const parede = mat('#eeeae4');
  bloco(mundo, SALA.x * 2 + 0.3, SALA.alturaParede, 0.3, parede, 0, SALA.alturaParede / 2, -SALA.z - 0.15);
  bloco(mundo, 0.3, SALA.alturaParede, SALA.z * 2, parede, -SALA.x - 0.15, SALA.alturaParede / 2, 0);
  bloco(mundo, SALA.x * 2, 0.18, 0.06, '#8a6a4a', 0, 0.09, -SALA.z + 0.03);
  bloco(mundo, 0.06, 0.18, SALA.z * 2, '#8a6a4a', -SALA.x + 0.03, 0.09, 0);
  // Faixa de madeira na parede esquerda (como um painel ripado)
  for (let i = 0; i < 26; i++) bloco(mundo, 0.06, 2.6, 0.22, i % 2 ? '#a77b52' : '#b5875c', -SALA.x + 0.04, 1.3, -6.6 + i * 0.25);

  const vidros = [-7.4, 2.5, 7.6].map((x) => janela(mundo, x));

  // Letreiro da empresa
  // Placa clara (a logo original só vai sobre fundo claro) com moldura azul-marinho
  const letreiro = quadro(mundo, 3.6, 0.8, -2.6, 3.3, -SALA.z + 0.1, 0, COR.marinho);
  marcaPronta.then(() => {
    const { ctx, canvas, textura } = letreiro;
    ctx.fillStyle = COR.branco;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(logo, 14, 8, 144, 144);
    ctx.fillStyle = COR.marinho;
    ctx.font = `800 60px ${FONTE_TITULO}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('LUMO WEB 3D', 176, 84);
    textura.needsUpdate = true;
  });

  // TV de métricas e relógio
  const tv = quadro(mundo, 2.6, 1.45, -2.6, 1.95, -SALA.z + 0.1, 0, '#0b1726');
  const relogio = quadro(mundo, 0.7, 0.7, 5.1, 3.25, -SALA.z + 0.1, 0, '#2a2a2a');

  // Quadro branco com o fluxo da equipe (parede esquerda)
  const fluxo = quadro(mundo, 3.2, 1.6, -SALA.x + 0.12, 2.2, 1.6, Math.PI / 2, '#b8bcc4');

  // Estante (parede esquerda)
  const estante = new THREE.Group();
  bloco(estante, 0.5, 2.2, 1.8, '#7a5536', 0, 1.1, 0);
  const coresLivros = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#34495e'];
  for (let prat = 0; prat < 4; prat++) {
    bloco(estante, 0.52, 0.05, 1.7, '#5d3f27', 0.01, 0.25 + prat * 0.52, 0);
    for (let i = 0; i < 8; i++) {
      if ((i * 3 + prat) % 7 === 0) continue;
      bloco(estante, 0.3, 0.38 - (i % 3) * 0.05, 0.14, coresLivros[(i + prat) % 6], 0.1, 0.46 + prat * 0.52 - (i % 3) * 0.025, -0.7 + i * 0.19);
    }
  }
  estante.position.set(-SALA.x + 0.3, 0, -3.4);
  mundo.add(estante);

  // Copa: bancada, cafeteira, geladeira, bebedouro
  bloco(mundo, 2.8, 0.9, 0.7, '#f4f4f2', 8.2, 0.45, -SALA.z + 0.4);
  bloco(mundo, 2.8, 0.06, 0.74, '#3a3a3d', 8.2, 0.93, -SALA.z + 0.4);
  bloco(mundo, 0.4, 0.5, 0.35, '#27272a', 7.4, 1.21, -SALA.z + 0.35);
  bloco(mundo, 0.14, 0.12, 0.14, '#f4f1ea', 7.4, 1.02, -SALA.z + 0.5);
  bloco(mundo, 0.5, 0.25, 0.35, '#c4c4c4', 8.6, 1.08, -SALA.z + 0.35);
  bloco(mundo, 0.9, 2.1, 0.8, '#d8dde3', 9.45, 1.05, -SALA.z + 1.6);
  bloco(mundo, 0.04, 0.5, 0.04, '#9aa0a6', 9.0, 1.4, -SALA.z + 1.4);
  const bebedouro = new THREE.Group();
  bloco(bebedouro, 0.45, 1.0, 0.45, '#e8eef3', 0, 0.5, 0);
  const galao = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 10), mat('#7cc4ff', { transparent: true, opacity: 0.75 }));
  galao.position.y = 1.25;
  bebedouro.add(galao);
  bebedouro.position.set(-7.6, 0, -SALA.z + 0.5);
  mundo.add(bebedouro);

  // Área de descanso: tapete, sofá, mesinha
  bloco(mundo, 4, 0.02, 3.6, COR.marinho, -7.6, 0.01, 4.6, { sombra: false });
  bloco(mundo, 0.5, 0.025, 0.5, COR.laranja, -6.0, 0.012, 6.0, { sombra: false });
  const sofa = mat('#4b5563');
  bloco(mundo, 1, 0.45, 3, sofa, -9.3, 0.3, 4.6);
  bloco(mundo, 0.3, 0.9, 3, sofa, -9.75, 0.6, 4.6);
  bloco(mundo, 1, 0.65, 0.3, sofa, -9.3, 0.4, 3.0);
  bloco(mundo, 1, 0.65, 0.3, sofa, -9.3, 0.4, 6.2);
  bloco(mundo, 0.75, 0.15, 0.7, '#6b7280', -9.25, 0.58, 4.0);
  bloco(mundo, 0.75, 0.15, 0.7, '#6b7280', -9.25, 0.58, 5.2);
  bloco(mundo, 1, 0.08, 1.4, '#8b6b4a', -7.0, 0.45, 4.6);
  bloco(mundo, 0.08, 0.42, 0.08, '#5a4532', -7.0, 0.21, 4.6);
  bloco(mundo, 0.3, 0.04, 0.22, '#e11d48', -6.9, 0.51, 4.3);

  // Mesa de reunião redonda
  const tampo = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 20), mat('#f2efe9'));
  tampo.position.set(5.5, 0.78, 4.4);
  tampo.castShadow = tampo.receiveShadow = true;
  mundo.add(tampo);
  bloco(mundo, 0.1, 0.75, 0.1, '#3a3a3a', 5.5, 0.38, 4.4);
  bloco(mundo, 0.5, 0.06, 0.36, '#fafafa', 5.3, 0.82, 4.3);

  // Plantas
  planta(mundo, -9.3, -6.3, 1.2);
  planta(mundo, 9.3, 6.3, 1.3);
  planta(mundo, -9.4, -1.2, 0.9);
  planta(mundo, 0.3, -6.3, 0.8);
  planta(mundo, 9.4, 1.5, 1.0);

  // Mesas de trabalho (uma por funcionário, na ordem do quadro)
  const mesas = equipe.map((membro, i) => {
    const mesa = mesaDeTrabalho(mundo, POSICOES_MESA[i] ?? i * 5 - 5, membro.cor);
    if (membro.vaga) placaVaga(mesa);
    return mesa;
  });

  // Pontos onde quem está à toa pode ir (fora das faixas das mesas, para o caminho não atravessar móveis)
  const pontos = [
    { nome: 'cafe', x: 7.4, z: -5.7, rot: Math.PI, pose: 'cafe' },
    { nome: 'cafe2', x: 8.5, z: -5.7, rot: Math.PI, pose: 'cafe' },
    { nome: 'agua', x: -7.6, z: -5.8, rot: Math.PI, pose: 'cafe' },
    { nome: 'janela', x: 2.5, z: -5.9, rot: Math.PI, pose: 'em-pe' },
    { nome: 'estante', x: -8.7, z: -3.4, rot: -Math.PI / 2, pose: 'em-pe' },
    { nome: 'quadro', x: -8.6, z: 1.6, rot: -Math.PI / 2, pose: 'em-pe' },
    // O sofá tem braços: chega pela frente (x = -8.1) e depois senta
    { nome: 'sofa1', x: -9.0, z: 4.0, rot: Math.PI / 2, pose: 'sentado', entrada: { x: -8.1, z: 4.0 } },
    { nome: 'sofa2', x: -9.0, z: 5.2, rot: Math.PI / 2, pose: 'sentado', entrada: { x: -8.1, z: 5.2 } },
    { nome: 'reuniao1', x: 4.4, z: 4.4, rot: Math.PI / 2, pose: 'em-pe' },
    { nome: 'reuniao2', x: 6.6, z: 4.4, rot: -Math.PI / 2, pose: 'em-pe' },
  ];

  return { mesas, tv, relogio, fluxo, vidros, pontos };
}
