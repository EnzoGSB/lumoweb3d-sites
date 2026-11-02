// Comportamento de cada funcionário: decide para onde ir conforme o status do agente e anda até lá.
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Personagem } from './personagem.js';
import { CORREDOR_Z } from './mundo.js';

const VELOCIDADE = 1.7;
// Entrada pela frente-direita; o sorteio de x fica à direita da mesa de reunião e do pedestal
const PORTA = { x: 8.4, z: 6.8 };
const ocupados = new Set();

const ROTULO_ESTADO = {
  trabalhando: 'Trabalhando',
  ocioso: 'Pausa',
  erro: 'Com problema',
  offline: 'Fora do expediente',
  vaga: 'Vaga aberta',
};

function anguloSuave(atual, alvo, k) {
  let d = alvo - atual;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return atual + d * k;
}

export class Funcionario {
  // `andar` é o grupo 3D do andar: o bonequinho anda em coordenadas locais dele
  constructor(membro, mesa, andar, pontos, aoClicar) {
    this.membro = membro;
    this.mesa = mesa;
    this.pontos = pontos;
    this.estado = membro.vaga ? 'vaga' : 'offline';
    this.status = null;
    this.caminho = [];
    this.destino = null;
    this.espera = 0;

    this.etiqueta = this.criarEtiqueta(aoClicar);

    if (membro.vaga) {
      this.mesa.grupo.add(this.etiqueta);
      this.etiqueta.position.set(0, 2.3, 0);
      return;
    }

    this.boneco = new Personagem(membro.visual);
    this.boneco.raiz.visible = false;
    this.boneco.raiz.position.set(PORTA.x, 0, PORTA.z);
    this.boneco.raiz.traverse((o) => (o.userData.funcionario = this));
    andar.add(this.boneco.raiz);
    this.presente = false;
    this.mesa.grupo.add(this.etiqueta);
    this.etiqueta.position.set(0, 2.3, 1.05);
  }

  criarEtiqueta(aoClicar) {
    const el = document.createElement('button');
    el.className = 'etiqueta';
    el.style.setProperty('--cor', this.membro.cor);
    el.innerHTML = `
      <span class="balao"></span>
      <span class="cracha"><i class="ponto"></i><b>${this.membro.nome ?? this.membro.cargo}</b><small>${
        this.membro.nome ? this.membro.cargo : 'Vaga aberta'
      }</small></span>`;
    el.addEventListener('click', () => aoClicar(this));
    this.elBalao = el.querySelector('.balao');
    const obj = new CSS2DObject(el);
    obj.center.set(0.5, 1);
    return obj;
  }

  get posicao() {
    return this.boneco.raiz.position;
  }

  assentoDaMesa() {
    const { x, z, rot } = this.mesa.assento;
    return { nome: `mesa-${this.membro.id}`, x, z, rot, pose: 'digitando' };
  }

  // Caminho em "L" pelo corredor central, para não atravessar as mesas
  irPara(destino) {
    if (this.destino) ocupados.delete(this.destino.nome);
    if (destino.nome) ocupados.add(destino.nome);

    const p = this.posicao;
    const pontos = [];
    if (this.saida) pontos.push(this.saida);
    const entrada = destino.entrada ?? destino;
    if (Math.abs(p.z - CORREDOR_Z) > 0.05 || Math.abs(p.x - entrada.x) > 0.05) {
      pontos.push({ x: (this.saida ?? p).x, z: CORREDOR_Z }, { x: entrada.x, z: CORREDOR_Z });
    }
    pontos.push(entrada);
    if (destino.entrada) pontos.push({ x: destino.x, z: destino.z });

    this.caminho = pontos;
    this.destino = destino;
    this.saida = destino.entrada ?? null;
    this.chegou = false;
    this.boneco.definirPose('em-pe');
  }

  atualizarStatus(agente) {
    const mudou = agente.estado !== this.estado;
    this.estado = agente.estado;
    this.status = agente.status;

    const el = this.etiqueta.element;
    el.dataset.estado = this.estado;
    const tarefa = this.status?.tarefa ?? '';
    const texto =
      this.estado === 'trabalhando' || this.estado === 'erro'
        ? tarefa
        : this.estado === 'ocioso' && this.membro.daemon && this.status?.proximaExecucao
          ? `Próximo site às ${new Date(this.status.proximaExecucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          : ROTULO_ESTADO[this.estado];
    this.elBalao.textContent = texto.length > 46 ? `${texto.slice(0, 45)}…` : texto;

    if (mudou && !this.membro.vaga) this.decidir(true);
  }

  decidir(forcar = false) {
    if (this.membro.vaga) return;

    if (this.estado === 'offline') {
      if (this.presente && this.destino?.nome !== 'porta') this.irPara({ nome: 'porta', ...PORTA, rot: 0, pose: 'saindo' });
      return;
    }

    if (!this.presente) {
      // Chegando ao escritório
      // Cada um entra por um ponto um pouco diferente, para ninguém andar "dentro" do outro
      this.presente = true;
      this.boneco.raiz.visible = true;
      this.boneco.raiz.position.set(PORTA.x - Math.random(), 0, PORTA.z);
      this.saida = null;
      this.boneco.raiz.add(this.etiqueta);
      this.etiqueta.position.set(0, 2.3, 0);
    }

    if (this.estado === 'trabalhando') {
      if (this.destino?.nome !== `mesa-${this.membro.id}`) this.irPara(this.assentoDaMesa());
      else if (this.chegou) this.boneco.definirPose('digitando');
    } else if (this.estado === 'erro') {
      const { x, rot } = this.mesa.assento;
      if (this.destino?.nome !== `erro-${this.membro.id}`) {
        this.irPara({ nome: `erro-${this.membro.id}`, x, z: this.mesa.assento.z + 0.75, rot, pose: 'pensando' });
      }
    } else if (forcar || this.espera <= 0) {
      // Pausa: café, água, janela, sofá... ou fica um pouco na própria mesa
      const livres = this.pontos.filter((p) => !ocupados.has(p.nome) && p.nome !== this.destino?.nome);
      const escolha =
        Math.random() < 0.2 || !livres.length
          ? { ...this.assentoDaMesa(), pose: 'sentado' }
          : livres[Math.floor(Math.random() * livres.length)];
      this.irPara(escolha);
      this.espera = Infinity; // começa a contar quando chegar
    }
  }

  atualizar(dt) {
    if (!this.boneco || !this.presente) return;
    const raiz = this.boneco.raiz;

    if (this.caminho.length) {
      const alvo = this.caminho[0];
      const dx = alvo.x - raiz.position.x;
      const dz = alvo.z - raiz.position.z;
      const dist = Math.hypot(dx, dz);
      const passo = VELOCIDADE * dt;
      if (dist <= passo) {
        raiz.position.x = alvo.x;
        raiz.position.z = alvo.z;
        this.caminho.shift();
      } else {
        raiz.position.x += (dx / dist) * passo;
        raiz.position.z += (dz / dist) * passo;
        raiz.rotation.y = anguloSuave(raiz.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 12));
      }
      this.boneco.andando = true;
    } else if (this.destino && !this.chegou) {
      this.chegou = true;
      this.boneco.andando = false;
      if (this.destino.nome === 'porta') {
        // Saiu do escritório
        this.presente = false;
        raiz.visible = false;
        ocupados.delete('porta');
        this.destino = null;
        this.mesa.grupo.add(this.etiqueta);
        this.etiqueta.position.set(0, 2.3, 1.05);
        return;
      }
      this.boneco.definirPose(this.destino.pose);
      this.espera = 8 + Math.random() * 14;
    } else {
      this.boneco.andando = false;
      if (this.destino) raiz.rotation.y = anguloSuave(raiz.rotation.y, this.destino.rot, Math.min(1, dt * 6));
      if (this.estado === 'ocioso') {
        this.espera -= dt;
        if (this.espera <= 0) this.decidir();
      }
    }

    this.boneco.atualizar(dt);
  }
}

export const ROTULOS = ROTULO_ESTADO;
