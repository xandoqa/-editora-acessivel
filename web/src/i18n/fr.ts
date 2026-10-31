/**
 * Français.
 *
 * Typé comme `Dicionario` : toutes les clés de la référence portugaise doivent
 * être présentes. S'il en manque une, la compilation échoue — c'est voulu.
 */

import type { Dicionario } from './tipos';

export const fr: Dicionario = {
  // --- Commun ------------------------------------------------------------
  'comum.entrar': 'Se connecter',
  'comum.sair': 'Se déconnecter',
  'comum.cancelar': 'Annuler',
  'comum.salvar': 'Enregistrer',
  'comum.fechar': 'Fermer',
  'comum.voltar': 'Retour',
  'comum.continuar': 'Continuer',
  'comum.confirmar': 'Confirmer',
  'comum.carregando': 'Chargement…',
  'comum.buscar': 'Rechercher',

  // --- Navigation --------------------------------------------------------
  'nav.abrirMenu': 'Ouvrir le menu de navigation',
  'nav.buscarObras': 'Rechercher des œuvres',
  'nav.buscaPlaceholder':
    'Rechercher BD, romans graphiques, auteurs et œuvres avec audiodescription…',
  'nav.planos': 'Offres Livrin',
  'nav.publicar': 'Publiez votre œuvre',

  // --- Compte ------------------------------------------------------------
  'conta.menu': 'Menu du compte de {nome}',
  'conta.painel': 'Mon tableau de bord',
  'conta.perfil': 'Mon profil',
  'conta.administracao': 'Administration',

  // --- Accessibilité -----------------------------------------------------
  'a11y.grupo': 'Options d’accessibilité',
  'a11y.altoContraste': 'Contraste élevé',
  'a11y.altoContrasteTitulo': 'Contraste élevé (jaune sur noir)',
  'a11y.diminuirTexto': 'Diminuer la taille du texte',
  'a11y.aumentarTexto': 'Augmenter la taille du texte',

  // --- Thèmes ------------------------------------------------------------
  'tema.seletor': 'Thème de l’interface',
  'tema.escolher': 'Choisir un thème',
  'tema.claros': 'Clairs',
  'tema.escuros': 'Sombres',
  'tema.atual': 'Thème actuel : {nome}',
  'tema.papel.nome': 'Papier',
  'tema.papel.descricao': 'Blanc chaud et encre bleu foncé. Le thème par défaut.',
  'tema.sepia.nome': 'Sépia',
  'tema.sepia.descricao': 'Papier ambré, encre brune. Pour les longues lectures.',
  'tema.tinta.nome': 'Encre',
  'tema.tinta.descricao': 'Neutre froid, sans teinte chaude. Le plus sobre.',
  'tema.noite.nome': 'Nuit',
  'tema.noite.descricao': 'Sombre aux reflets violets. Peu de luminosité.',
  'tema.grafite.nome': 'Graphite',
  'tema.grafite.descricao': 'Sombre gris-bleu, plus neutre que Nuit.',
  'tema.indigo.nome': 'Indigo',
  'tema.indigo.descricao': 'Sombre avec une touche ambrée au lieu du bleu.',

  // --- Langues -----------------------------------------------------------
  'idioma.seletor': 'Langue du site',
  'idioma.escolher': 'Choisir une langue',
  'idioma.atual': 'Langue actuelle : {nome}',
  'idioma.pt-BR': 'Português (Brasil)',
  'idioma.en': 'English',
  'idioma.fr': 'Français',
  'idioma.aviso':
    'Cela change l’interface. Les œuvres, résumés et avis restent dans la langue dans laquelle ils ont été écrits.',
};
