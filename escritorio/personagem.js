// Bonequinho voxel (quadradinho) com poses: em pé, andando, sentado digitando, sentado relaxado e tomando café.
import * as THREE from 'three';

const geoCache = new Map();
function caixa(w, h, d) {
  const chave = `${w}|${h}|${d}`;
  if (!geoCache.has(chave)) geoCache.set(chave, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(chave);
}

function bloco(w, h, d, cor, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(caixa(w, h, d), new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85 }));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Membro com o pivô no topo (ombro/quadril) para girar naturalmente
function membro(w, h, d, cor, corPonta, alturaPonta) {
  const pivo = new THREE.Group();
  pivo.add(bloco(w, h - alturaPonta, d, cor, 0, -(h - alturaPonta) / 2, 0));
  pivo.add(bloco(w * 1.02, alturaPonta, d * 1.02, corPonta, 0, -h + alturaPonta / 2, 0));
  return pivo;
}

const ALTURA_PERNA = 0.62;

export class Personagem {
  constructor(visual) {
    this.raiz = new THREE.Group();
    this.corpo = new THREE.Group(); // sobe/desce quando senta
    this.raiz.add(this.corpo);

    const { pele, cabelo, penteado, camisa, calca, sapato } = visual;

    this.pernaE = membro(0.24, ALTURA_PERNA, 0.26, calca, sapato, 0.1);
    this.pernaD = membro(0.24, ALTURA_PERNA, 0.26, calca, sapato, 0.1);
    this.pernaE.position.set(-0.14, ALTURA_PERNA, 0);
    this.pernaD.position.set(0.14, ALTURA_PERNA, 0);

    const torso = bloco(0.6, 0.66, 0.34, camisa, 0, ALTURA_PERNA + 0.33, 0);
    const gola = bloco(0.26, 0.06, 0.35, pele, 0, ALTURA_PERNA + 0.64, 0.002);

    this.bracoE = membro(0.18, 0.62, 0.2, camisa, pele, 0.16);
    this.bracoD = membro(0.18, 0.62, 0.2, camisa, pele, 0.16);
    this.bracoE.position.set(-0.4, ALTURA_PERNA + 0.62, 0);
    this.bracoD.position.set(0.4, ALTURA_PERNA + 0.62, 0);

    this.cabeca = new THREE.Group();
    this.cabeca.position.set(0, ALTURA_PERNA + 0.66, 0);
    this.cabeca.add(bloco(0.52, 0.5, 0.48, pele, 0, 0.27, 0));
    // Rosto (a frente é +z)
    const olho = 0x231c18;
    this.cabeca.add(bloco(0.07, 0.09, 0.02, olho, -0.11, 0.3, 0.245));
    this.cabeca.add(bloco(0.07, 0.09, 0.02, olho, 0.11, 0.3, 0.245));
    this.cabeca.add(bloco(0.14, 0.03, 0.02, 0xb5574b, 0, 0.16, 0.245));
    // Cabelo
    this.cabeca.add(bloco(0.56, 0.14, 0.52, cabelo, 0, 0.56, 0));
    this.cabeca.add(bloco(0.56, 0.34, 0.08, cabelo, 0, 0.4, -0.24));
    this.cabeca.add(bloco(0.06, 0.22, 0.48, cabelo, -0.27, 0.43, 0));
    this.cabeca.add(bloco(0.06, 0.22, 0.48, cabelo, 0.27, 0.43, 0));
    if (penteado === 'longo') {
      this.cabeca.add(bloco(0.56, 0.62, 0.1, cabelo, 0, 0.12, -0.25));
      this.cabeca.add(bloco(0.08, 0.5, 0.2, cabelo, -0.28, 0.12, -0.12));
      this.cabeca.add(bloco(0.08, 0.5, 0.2, cabelo, 0.28, 0.12, -0.12));
    }

    // Copo de café (aparece na pausa)
    this.copo = bloco(0.12, 0.16, 0.12, 0xf4f1ea, 0, -0.62, 0.08);
    this.copo.add(bloco(0.125, 0.04, 0.125, 0x6b4226, 0, 0.06, 0));
    this.copo.visible = false;
    this.bracoD.add(this.copo);

    this.corpo.add(this.pernaE, this.pernaD, torso, gola, this.bracoE, this.bracoD, this.cabeca);

    this.pose = 'em-pe';
    this.andando = false;
    this.fase = Math.random() * 10;
  }

  definirPose(pose) {
    this.pose = pose;
    this.copo.visible = pose === 'cafe';
  }

  atualizar(dt) {
    this.fase += dt;
    const t = this.fase;
    const sentado = this.pose === 'digitando' || this.pose === 'sentado';
    const suave = (atual, alvo, k = 10) => atual + (alvo - atual) * Math.min(1, dt * k);

    let pernas = 0, pernaE = 0, pernaD = 0, bracoE = 0, bracoD = 0, abreE = 0, abreD = 0;
    let altura = 0, cabecaX = 0, cabecaY = 0, balanco = 0;

    if (this.andando) {
      const s = Math.sin(t * 9);
      pernaE = s * 0.6;
      pernaD = -s * 0.6;
      bracoE = -s * 0.5;
      bracoD = s * 0.5;
      balanco = Math.abs(Math.cos(t * 9)) * 0.05;
    } else if (sentado) {
      pernas = -Math.PI / 2;
      altura = -ALTURA_PERNA + 0.5; // quadril na altura do assento
      if (this.pose === 'digitando') {
        bracoE = -1.15 + Math.sin(t * 22) * 0.07;
        bracoD = -1.15 + Math.sin(t * 22 + 1.7) * 0.07;
        cabecaX = 0.12 + Math.sin(t * 0.7) * 0.04;
        cabecaY = Math.sin(t * 0.45) * 0.12;
      } else {
        bracoE = -0.35;
        bracoD = -0.35;
        abreE = -0.15;
        abreD = 0.15;
        cabecaY = Math.sin(t * 0.3) * 0.3;
      }
    } else if (this.pose === 'cafe') {
      // Leva o copo à boca de tempos em tempos
      const gole = Math.max(0, Math.sin(t * 0.9)) ** 6;
      bracoD = -0.9 - gole * 1.1;
      abreD = 0.25;
      cabecaX = -gole * 0.15;
    } else if (this.pose === 'pensando') {
      // Erro: coça a cabeça
      bracoD = -2.6 + Math.sin(t * 6) * 0.15;
      abreD = 0.3;
      cabecaX = 0.1;
      cabecaY = Math.sin(t * 1.3) * 0.2;
    } else {
      // Respiração parada
      balanco = Math.sin(t * 2) * 0.01;
      cabecaY = Math.sin(t * 0.4) * 0.25;
    }

    this.pernaE.rotation.x = suave(this.pernaE.rotation.x, pernas || pernaE);
    this.pernaD.rotation.x = suave(this.pernaD.rotation.x, pernas || pernaD);
    this.bracoE.rotation.x = suave(this.bracoE.rotation.x, bracoE);
    this.bracoD.rotation.x = suave(this.bracoD.rotation.x, bracoD);
    this.bracoE.rotation.z = suave(this.bracoE.rotation.z, abreE);
    this.bracoD.rotation.z = suave(this.bracoD.rotation.z, abreD);
    this.cabeca.rotation.x = suave(this.cabeca.rotation.x, cabecaX, 5);
    this.cabeca.rotation.y = suave(this.cabeca.rotation.y, cabecaY, 3);
    this.corpo.position.y = suave(this.corpo.position.y, altura + balanco, 12);
  }
}
