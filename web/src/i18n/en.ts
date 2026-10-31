/**
 * English.
 *
 * Typed as `Dicionario`: every key of the Portuguese reference must be here.
 * Miss one and the build fails — which is the point.
 */

import type { Dicionario } from './tipos';

export const en: Dicionario = {
  // --- Common ------------------------------------------------------------
  'comum.entrar': 'Sign in',
  'comum.sair': 'Sign out',
  'comum.cancelar': 'Cancel',
  'comum.salvar': 'Save',
  'comum.fechar': 'Close',
  'comum.voltar': 'Back',
  'comum.continuar': 'Continue',
  'comum.confirmar': 'Confirm',
  'comum.carregando': 'Loading…',
  'comum.buscar': 'Search',

  // --- Navigation --------------------------------------------------------
  'nav.abrirMenu': 'Open navigation menu',
  'nav.buscarObras': 'Search works',
  'nav.buscaPlaceholder': 'Search comics, graphic novels, authors and works with audio description…',
  'nav.planos': 'Livrin plans',
  'nav.publicar': 'Publish your work',

  // --- Account -----------------------------------------------------------
  'conta.menu': 'Account menu for {nome}',
  'conta.painel': 'My dashboard',
  'conta.perfil': 'My profile',
  'conta.administracao': 'Administration',

  // --- Accessibility controls --------------------------------------------
  'a11y.grupo': 'Accessibility controls',
  'a11y.altoContraste': 'High contrast',
  'a11y.altoContrasteTitulo': 'High contrast (yellow on black)',
  'a11y.diminuirTexto': 'Decrease text size',
  'a11y.aumentarTexto': 'Increase text size',

  // --- Themes ------------------------------------------------------------
  'tema.seletor': 'Interface theme',
  'tema.escolher': 'Choose a theme',
  'tema.claros': 'Light',
  'tema.escuros': 'Dark',
  'tema.atual': 'Current theme: {nome}',
  'tema.papel.nome': 'Paper',
  'tema.papel.descricao': 'Warm white and dark blue ink. The default.',
  'tema.sepia.nome': 'Sepia',
  'tema.sepia.descricao': 'Amber paper, brown ink. For long reading.',
  'tema.tinta.nome': 'Ink',
  'tema.tinta.descricao': 'Cool neutral, no warm cast. The soberest one.',
  'tema.noite.nome': 'Night',
  'tema.noite.descricao': 'Dark with a purple cast. Low glare.',
  'tema.grafite.nome': 'Graphite',
  'tema.grafite.descricao': 'Blue-grey dark, more neutral than Night.',
  'tema.indigo.nome': 'Indigo',
  'tema.indigo.descricao': 'Dark with an amber accent instead of blue.',

  // --- Languages ---------------------------------------------------------
  'idioma.seletor': 'Site language',
  'idioma.escolher': 'Choose a language',
  'idioma.atual': 'Current language: {nome}',
  'idioma.pt-BR': 'Português (Brasil)',
  'idioma.en': 'English',
  'idioma.fr': 'Français',
  'idioma.aviso':
    'This changes the interface. Works, synopses and reviews stay in the language they were written in.',
};
