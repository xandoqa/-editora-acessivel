/**
 * Português do Brasil — o dicionário de referência.
 *
 * Este arquivo é a fonte da verdade: o tipo `ChaveDeTraducao` é derivado dele,
 * e os outros idiomas são tipados como `Dicionario`. Consequência prática: se
 * você acrescentar uma chave aqui e esquecer de traduzir, **o projeto não
 * compila**. Tradução faltando vira erro de tipo, não texto em português
 * aparecendo no meio do inglês.
 *
 * Convenções:
 *  - chave em pontos, agrupada por área: `nav.`, `conta.`, `catalogo.`…
 *  - `{nome}` marca um valor interpolado em tempo de execução;
 *  - o texto é o da interface. **Conteúdo de usuário nunca entra aqui**:
 *    título de obra, sinopse, avaliação e nome de pessoa são escritos por
 *    quem publicou e aparecem como foram escritos, em qualquer idioma.
 */

export const ptBR = {
  // --- Vocabulário comum -------------------------------------------------
  'comum.entrar': 'Entrar',
  'comum.sair': 'Sair',
  'comum.cancelar': 'Cancelar',
  'comum.salvar': 'Salvar',
  'comum.fechar': 'Fechar',
  'comum.voltar': 'Voltar',
  'comum.continuar': 'Continuar',
  'comum.confirmar': 'Confirmar',
  'comum.carregando': 'Carregando…',
  'comum.buscar': 'Buscar',

  // --- Navegação ---------------------------------------------------------
  'nav.abrirMenu': 'Abrir menu de navegação',
  'nav.buscarObras': 'Buscar obras',
  'nav.buscaPlaceholder': 'Buscar HQs, graphic novels, autores e obras com audiodescrição…',
  'nav.planos': 'Planos do Livrin',
  'nav.publicar': 'Publique sua obra',

  // --- Conta -------------------------------------------------------------
  'conta.menu': 'Menu da conta de {nome}',
  'conta.painel': 'Meu painel',
  'conta.perfil': 'Meu perfil',
  'conta.administracao': 'Administração',

  // --- Recursos de acessibilidade ---------------------------------------
  'a11y.grupo': 'Recursos de acessibilidade',
  'a11y.altoContraste': 'Alto contraste',
  'a11y.altoContrasteTitulo': 'Alto contraste (amarelo/preto)',
  'a11y.diminuirTexto': 'Diminuir tamanho do texto',
  'a11y.aumentarTexto': 'Aumentar tamanho do texto',

  // --- Temas -------------------------------------------------------------
  'tema.seletor': 'Tema da interface',
  'tema.escolher': 'Escolher tema',
  'tema.claros': 'Claros',
  'tema.escuros': 'Escuros',
  'tema.atual': 'Tema atual: {nome}',
  'tema.papel.nome': 'Papel',
  'tema.papel.descricao': 'Branco quente e tinta azul-escura. O padrão.',
  'tema.sepia.nome': 'Sépia',
  'tema.sepia.descricao': 'Papel âmbar, tinta marrom. Para leitura longa.',
  'tema.tinta.nome': 'Tinta',
  'tema.tinta.descricao': 'Neutro frio, sem tom quente. O mais sóbrio.',
  'tema.noite.nome': 'Noite',
  'tema.noite.descricao': 'Escuro com fundo arroxeado. Pouco brilho.',
  'tema.grafite.nome': 'Grafite',
  'tema.grafite.descricao': 'Escuro cinza-azulado, mais neutro que o Noite.',
  'tema.indigo.nome': 'Índigo',
  'tema.indigo.descricao': 'Escuro com destaque âmbar no lugar do azul.',

  // --- Idiomas -----------------------------------------------------------
  'idioma.seletor': 'Idioma do site',
  'idioma.escolher': 'Escolher idioma',
  'idioma.atual': 'Idioma atual: {nome}',
  'idioma.pt-BR': 'Português (Brasil)',
  'idioma.en': 'English',
  'idioma.fr': 'Français',
  'idioma.aviso':
    'A interface muda de idioma. As obras, sinopses e avaliações continuam no idioma em que foram escritas.',
} as const;
