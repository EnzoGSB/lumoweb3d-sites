// Identidade LUMO WEB 3D (Guia de marca): cores, logo original e fontes para desenhar nos canvas da cena.
export const COR = {
  marinho: '#14273C',
  laranja: '#FFA602',
  branco: '#FEFDF9',
};

export const FONTE_TITULO = 'Montserrat, Inter, system-ui, sans-serif';
export const FONTE_TEXTO = 'Inter, system-ui, sans-serif';

// A logo só aparece sobre fundo claro: ainda não existe versão aprovada para fundo escuro
export const logo = new Image();
logo.src = 'marca/logo.png';

/** Resolve quando a logo e as fontes da marca estiverem prontas para usar em canvas. */
export const marcaPronta = Promise.all([
  logo.decode().catch(() => {}),
  document.fonts.load(`800 64px Montserrat`).catch(() => {}),
  document.fonts.load(`600 20px Inter`).catch(() => {}),
]);
