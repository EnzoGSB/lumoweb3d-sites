// Formulário de filtros do Léo. Os nomes dos campos são os de scraper/filtros.js,
// que também valida tudo no servidor antes de rodar.

const TRES = [['qualquer', 'Tanto faz'], ['sim', 'Sim'], ['nao', 'Não']];

const GRUPOS = [
  {
    titulo: 'O que buscar',
    aberto: true,
    campos: [
      { nome: 'nichos', rotulo: 'Nicho da empresa', tipo: 'texto', dica: 'Separe por vírgula', exemplo: 'Pizzarias, Hamburguerias', largo: true },
      { nome: 'locais', rotulo: 'Localização', tipo: 'texto', dica: 'Cada nicho é buscado em cada local', exemplo: 'Moema, Perdizes, Campinas', largo: true },
      { nome: 'buscaLivre', rotulo: 'Ou uma busca livre', tipo: 'texto', dica: 'Se preenchida, substitui nicho e local', exemplo: 'Clínicas veterinárias 24h perto de Pinheiros', largo: true },
      { nome: 'visitarPorBusca', rotulo: 'Negócios a visitar por busca', tipo: 'numero', min: 1, max: 500, padrao: 60 },
      { nome: 'maxLeads', rotulo: 'Parar ao salvar (leads)', tipo: 'numero', min: 1, exemplo: 'Sem limite' },
    ],
  },
  {
    titulo: 'Google: estrelas e avaliações',
    aberto: true,
    campos: [
      { nome: 'estrelasMin', rotulo: 'Estrelas: no mínimo', tipo: 'numero', min: 0, max: 5, passo: 0.1, exemplo: '0' },
      { nome: 'estrelasMax', rotulo: 'Estrelas: no máximo', tipo: 'numero', min: 0, max: 5, passo: 0.1, exemplo: '5' },
      { nome: 'avaliacoesMin', rotulo: 'Avaliações: no mínimo', tipo: 'numero', min: 0, exemplo: '0' },
      { nome: 'avaliacoesMax', rotulo: 'Avaliações: no máximo', tipo: 'numero', min: 0, exemplo: 'Sem limite' },
      { nome: 'semNota', rotulo: 'Aceitar quem ainda não tem nota', tipo: 'caixa', largo: true },
      { aviso: 'O número de avaliações só aparece com o Maps logado. Veja "Como rodar", no fim do formulário.', largo: true },
    ],
  },
  {
    titulo: 'Telefone',
    aberto: true,
    campos: [
      {
        nome: 'telefoneTipo',
        rotulo: 'Tipo',
        tipo: 'lista',
        padrao: 'celular',
        opcoes: [['celular', 'Celular (padrão WhatsApp)'], ['fixo', 'Só fixo'], ['com-telefone', 'Qualquer um com telefone'], ['sem-telefone', 'Só sem telefone'], ['qualquer', 'Tanto faz']],
      },
      { nome: 'telefonePrefixos', rotulo: 'Começa com', tipo: 'texto', dica: 'DDD + início do número', exemplo: '119, 219' },
      { nome: 'telefoneDdds', rotulo: 'DDDs aceitos', tipo: 'texto', exemplo: '11, 19, 21' },
      { aviso: 'Só leads com celular entram na fila da Marina (designer), porque o site é construído em torno do WhatsApp.', largo: true },
    ],
  },
  {
    titulo: 'Site do negócio',
    aberto: true,
    campos: [
      {
        nome: 'siteTipos',
        rotulo: 'O link no Google é',
        tipo: 'marcas',
        largo: true,
        dica: 'Nada marcado = tanto faz',
        opcoes: [
          ['sem-site', 'Não tem link'],
          ['agregador', 'Linktree e parecidos'],
          ['instagram', 'Instagram'],
          ['facebook', 'Facebook'],
          ['whatsapp', 'WhatsApp'],
          ['outra-rede', 'Outra rede / Google'],
          ['delivery', 'Delivery (iFood…)'],
          ['agendamento', 'Agendamento'],
          ['proprio', 'Site próprio'],
          ['fora-do-ar', 'Site fora do ar'],
        ],
      },
      { nome: 'siteResponsivo', rotulo: 'Site próprio responsivo', tipo: 'lista', opcoes: TRES },
      { nome: 'siteHttps', rotulo: 'Site próprio com HTTPS', tipo: 'lista', opcoes: TRES },
      { nome: 'siteNotaMin', rotulo: 'Qualidade: no mínimo (0–100)', tipo: 'numero', min: 0, max: 100, exemplo: '80 = alta qualidade' },
      { nome: 'siteNotaMax', rotulo: 'Qualidade: no máximo (0–100)', tipo: 'numero', min: 0, max: 100, exemplo: '50 = site fraco' },
      { nome: 'analisarSite', rotulo: 'Medir a qualidade dos sites próprios (mais lento)', tipo: 'caixa', padrao: true, largo: true },
      { aviso: 'A nota mede o site aberto como celular: responsivo, velocidade, HTTPS, texto legível, botões tocáveis e títulos. Não avalia o design. Mínimo ou "responsivo: sim" exclui quem não tem site próprio; para ver só sites próprios fracos, marque também "Site próprio".', largo: true },
    ],
  },
  {
    titulo: 'Mais filtros do Google',
    campos: [
      { nome: 'categoriaContem', rotulo: 'Categoria contém', tipo: 'texto', exemplo: 'pizzaria, delivery' },
      { nome: 'categoriaNaoContem', rotulo: 'Categoria não contém', tipo: 'texto', exemplo: 'condomínio' },
      { nome: 'nomeContem', rotulo: 'Nome contém', tipo: 'texto' },
      { nome: 'nomeNaoContem', rotulo: 'Nome não contém', tipo: 'texto', exemplo: 'Bráz, Domino' },
      { nome: 'enderecoContem', rotulo: 'Endereço contém', tipo: 'texto', dica: 'Bairro, cidade ou CEP', exemplo: 'Moema, 045' },
      { nome: 'enderecoNaoContem', rotulo: 'Endereço não contém', tipo: 'texto' },
      {
        nome: 'situacao',
        rotulo: 'Situação',
        tipo: 'lista',
        padrao: 'aberto',
        opcoes: [['aberto', 'Em funcionamento'], ['fechado', 'Fechado (temporário ou definitivo)'], ['qualquer', 'Tanto faz']],
      },
      { nome: 'abertoAgora', rotulo: 'Aberto agora', tipo: 'lista', opcoes: TRES },
      { nome: 'reivindicado', rotulo: 'Perfil reivindicado pelo dono', tipo: 'lista', opcoes: TRES },
      { nome: 'anuncio', rotulo: 'É anúncio (Patrocinado)', tipo: 'lista', opcoes: TRES },
      { nome: 'foto', rotulo: 'Tem foto', tipo: 'lista', opcoes: TRES },
      { nome: 'horario', rotulo: 'Tem horário publicado', tipo: 'lista', opcoes: TRES },
      { nome: 'pedidoOnline', rotulo: 'Tem pedido on-line', tipo: 'lista', opcoes: TRES },
      { nome: 'reserva', rotulo: 'Tem reserva / agendamento', tipo: 'lista', opcoes: TRES },
      { nome: 'localizadoEm', rotulo: 'Dentro de shopping/edifício', tipo: 'lista', opcoes: TRES },
      {
        nome: 'faixasPreco',
        rotulo: 'Faixa de preço',
        tipo: 'marcas',
        largo: true,
        dica: 'O Maps só informa em parte dos negócios; quem não informa é recusado',
        opcoes: [['barato', 'Barato'], ['moderado', 'Moderado'], ['caro', 'Caro'], ['muito-caro', 'Muito caro']],
      },
    ],
  },
  {
    titulo: 'Como rodar',
    campos: [
      { nome: 'janela', rotulo: 'Abrir a janela do navegador', tipo: 'caixa', padrao: true, largo: true },
      { nome: 'login', rotulo: 'Usar meu login do Google (libera as avaliações)', tipo: 'caixa', largo: true },
      { login: true, largo: true },
      { nome: 'pausaMs', rotulo: 'Pausa entre negócios (ms)', tipo: 'numero', min: 0, max: 30000, passo: 100, padrao: 1000 },
    ],
  },
];

const CAMPOS = GRUPOS.flatMap((g) => g.campos).filter((c) => c.nome);

const ATALHOS = [
  ['Sem site', { siteTipos: ['sem-site'] }],
  ['Só Linktree e redes', { siteTipos: ['agregador', 'instagram', 'facebook', 'whatsapp', 'outra-rede'] }],
  ['Site próprio fraco', { siteTipos: ['proprio', 'fora-do-ar'], siteNotaMax: 60 }],
  ['Site de alta qualidade', { siteTipos: ['proprio'], siteResponsivo: 'sim', siteNotaMin: 80 }],
  ['Boa nota, sem site', { estrelasMin: 4.5, siteTipos: ['sem-site', 'agregador', 'instagram', 'facebook'] }],
];

const CHAVE = 'filtros-leo';
const lerSalvo = () => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) ?? {};
  } catch {
    return {};
  }
};
const salvar = (valores) => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(valores));
  } catch {}
};

function htmlCampo(c) {
  const classe = `campo${c.largo ? ' largo' : ''}`;
  if (c.aviso) return `<p class="${classe} aviso-filtro">${c.aviso}</p>`;
  if (c.login) {
    return `<div class="${classe} linha-login"><span data-login-estado></span>
      <button type="button" data-acao="entrar" class="botao-secundario">Entrar no Google</button>
      <small>Abre o Chrome para você entrar uma vez. Prefira uma conta secundária: automatizar o Maps logado pode gerar restrições na conta.</small></div>`;
  }
  const dica = c.dica ? `<small>${c.dica}</small>` : '';
  const id = `f-${c.nome}`;
  if (c.tipo === 'caixa') return `<label class="${classe} caixa"><input type="checkbox" name="${c.nome}"> <span>${c.rotulo}</span></label>`;
  if (c.tipo === 'marcas') {
    return `<fieldset class="${classe} marcas"><legend>${c.rotulo}</legend>
      ${c.opcoes.map(([v, r]) => `<label><input type="checkbox" name="${c.nome}" value="${v}"><span>${r}</span></label>`).join('')}${dica}</fieldset>`;
  }
  if (c.tipo === 'lista') {
    return `<label class="${classe}" for="${id}">${c.rotulo}<select id="${id}" name="${c.nome}">${c.opcoes.map(([v, r]) => `<option value="${v}">${r}</option>`).join('')}</select>${dica}</label>`;
  }
  const attrs = c.tipo === 'numero' ? `type="number" min="${c.min ?? ''}" max="${c.max ?? ''}" step="${c.passo ?? 1}"` : 'type="text"';
  return `<label class="${classe}" for="${id}">${c.rotulo}<input id="${id}" name="${c.nome}" ${attrs} placeholder="${c.exemplo ?? ''}" autocomplete="off">${dica}</label>`;
}

/** Monta o formulário dentro de `el`. Devolve { atualizar({ rodando, loginGoogle }), erro(texto) }. */
export function montarFiltros(el, { aoBuscar, aoParar, aoEntrar }) {
  el.innerHTML = `
    <form class="filtros" novalidate>
      <div class="atalhos"><span>Atalhos:</span>
        ${ATALHOS.map(([r], i) => `<button type="button" data-atalho="${i}">${r}</button>`).join('')}
      </div>
      ${GRUPOS.map(
        (g) => `<details class="grupo-filtro"${g.aberto ? ' open' : ''}><summary>${g.titulo}</summary>
          <div class="campos">${g.campos.map(htmlCampo).join('')}</div></details>`,
      ).join('')}
      <p class="erro-filtro" role="alert" hidden></p>
      <div class="acoes-filtro">
        <button type="submit" class="botao-principal">Iniciar busca</button>
        <button type="button" data-acao="parar" class="botao-secundario" hidden>Parar</button>
        <button type="button" data-acao="limpar" class="botao-secundario">Limpar filtros</button>
      </div>
    </form>`;
  const form = el.querySelector('form');
  const erro = el.querySelector('.erro-filtro');

  const preencher = (valores) => {
    for (const c of CAMPOS) {
      const v = valores[c.nome] ?? c.padrao ?? (c.tipo === 'lista' ? 'qualquer' : c.tipo === 'caixa' ? false : '');
      if (c.tipo === 'marcas') {
        for (const i of form.querySelectorAll(`[name="${c.nome}"]`)) i.checked = (valores[c.nome] ?? []).includes(i.value);
      } else if (c.tipo === 'caixa') {
        form.elements[c.nome].checked = v === true;
      } else {
        form.elements[c.nome].value = v;
      }
    }
  };

  const ler = () => {
    const valores = {};
    for (const c of CAMPOS) {
      if (c.tipo === 'marcas') valores[c.nome] = [...form.querySelectorAll(`[name="${c.nome}"]:checked`)].map((i) => i.value);
      else if (c.tipo === 'caixa') valores[c.nome] = form.elements[c.nome].checked;
      else valores[c.nome] = form.elements[c.nome].value;
    }
    return valores;
  };

  const mostrarErro = (texto) => {
    erro.textContent = texto ?? '';
    erro.hidden = !texto;
  };

  preencher(lerSalvo());
  form.addEventListener('change', () => salvar(ler()));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    mostrarErro(null);
    salvar(ler());
    aoBuscar(ler());
  });
  form.addEventListener('click', (e) => {
    const atalho = e.target.closest('[data-atalho]')?.dataset.atalho;
    if (atalho !== undefined) {
      // O atalho mantém o que buscar e como rodar; só troca os filtros
      const { nichos, locais, buscaLivre, visitarPorBusca, maxLeads, janela, login, pausaMs } = ler();
      preencher({ nichos, locais, buscaLivre, visitarPorBusca, maxLeads, janela, login, pausaMs, ...ATALHOS[atalho][1] });
      salvar(ler());
      return;
    }
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (acao === 'parar') aoParar();
    if (acao === 'entrar') aoEntrar();
    if (acao === 'limpar') {
      preencher({});
      salvar(ler());
      mostrarErro(null);
    }
  });

  return {
    erro: mostrarErro,
    atualizar({ rodando, loginGoogle }) {
      form.querySelector('.botao-principal').disabled = rodando;
      form.querySelector('.botao-principal').textContent = rodando ? 'Buscando…' : 'Iniciar busca';
      form.querySelector('[data-acao="parar"]').hidden = !rodando;
      form.querySelector('[data-acao="entrar"]').disabled = rodando;
      const estado = form.querySelector('[data-login-estado]');
      estado.textContent = loginGoogle ? '● Conectado ao Google' : '○ Sem login do Google';
      estado.classList.toggle('conectado', loginGoogle);
    },
  };
}
