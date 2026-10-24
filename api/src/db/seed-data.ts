import type { Dialogue, UserRole, WorkFormat, WorkStatus } from './schema';

/**
 * Dados de demonstração (usados apenas quando SEED_DEMO_DATA=true).
 * Reproduzem o conteúdo do protótipo de telas: catálogo, painel do autor,
 * fluxo de análise e leitor acessível. Arquivos de amostra ficam em ../../seed-assets.
 */

export const GENRES = [
  'Ficção Científica',
  'Aventura',
  'Fantasia',
  'Fantasia Épica',
  'Slice of Life',
  'Ficção Histórica',
  'Drama',
  'Romance',
  'Poesia',
  'Jovem Adulto',
];

export interface DemoUser {
  key: string;
  name: string;
  email: string;
  role: UserRole;
  headline?: string;
}

export const DEMO_USERS: DemoUser[] = [
  { key: 'marina', name: 'Marina Bastos', email: 'marina@livrin.com', role: 'ESCRITOR', headline: 'Autora e quadrinista independente' },
  { key: 'lorena', name: 'Lorena Campolina', email: 'lorena@livrin.com', role: 'ESCRITOR', headline: 'Roteiro e Ilustrações Originais' },
  { key: 'eloa', name: 'Eloá Santana', email: 'eloa@livrin.com', role: 'ESCRITOR', headline: 'Escritora' },
  { key: 'caua', name: 'Cauã Pataxó', email: 'caua@livrin.com', role: 'ESCRITOR', headline: 'Autor de leitura fácil' },
  { key: 'mduarte', name: 'Marina Duarte', email: 'marina.duarte@livrin.com', role: 'ESCRITOR', headline: 'Graphic novelist' },
  { key: 'tiago', name: 'Tiago Medeiros', email: 'tiago@livrin.com', role: 'ESCRITOR', headline: 'Poeta visual' },
  { key: 'lucas', name: 'Lucas Camargo', email: 'lucas@livrin.com', role: 'LEITOR', headline: 'Baixa Visão Severa · Leitor de Tela' },
  { key: 'tatiane', name: 'Tatiane Rocha', email: 'tatiane@livrin.com', role: 'LEITOR', headline: 'Deficiência Motora · Switch Access' },
  { key: 'gabriel', name: 'Gabriel Miranda', email: 'gabriel@livrin.com', role: 'LEITOR', headline: 'Dislexia & TDAH' },
  { key: 'camila', name: 'Camila Fontes', email: 'camila@livrin.com', role: 'ADMIN', headline: 'Especialista em Acessibilidade Visual' },
  { key: 'rodrigo', name: 'Rodrigo Santana', email: 'rodrigo@livrin.com', role: 'ADMIN', headline: 'Parecerista Editorial de Quadrinhos' },
];

export interface DemoWork {
  key: string;
  author: string;
  title: string;
  subtitle?: string;
  genre: string;
  format: WorkFormat;
  pages: number;
  synopsis: string;
  status: WorkStatus;
  editionLabel?: string;
  isbn?: string;
  ageRating?: string;
  authorNotes?: string;
  tags?: string[];
  flags: Partial<Record<'hasAudioDesc' | 'hasLeitorTela' | 'hasTextoAlt' | 'hasLibras' | 'hasFacilLeitura' | 'hasAltoContraste', boolean>>;
  audioDescriber?: string;
  audioNarrator?: string;
  audioReviewer?: string;
  cover?: string;
  file?: string;
  publishedDaysAgo?: number;
  submittedDaysAgo?: number;
}

export const DEMO_WORKS: DemoWork[] = [
  {
    key: 'alem',
    author: 'lorena',
    title: 'Além das Estrelas',
    subtitle: 'Crônicas do Espaço',
    genre: 'Ficção Científica',
    format: 'QUADRINHO',
    pages: 6,
    status: 'APROVADO',
    editionLabel: 'Webcomic serial',
    isbn: '978-65-8912-04-1',
    ageRating: '12',
    synopsis:
      'No ano estelar de 2384, a tripulação da nave exploratória Alvorada recebe uma missão sem precedentes: mapear os setores esquecidos da Nebulosa Carina. O que parecia uma rotina de prospecção transforma-se numa profunda investigação sobre civilizações antigas e memórias sensoriais perdidas no vácuo. Conduzida pela comandante Yara — uma astrobióloga com baixa visão que utiliza sistemas cibernéticos de eco-localização — a narrativa desafia os tropos tradicionais da ficção científica, colocando a percepção sensorial, a solidariedade e as linguagens alternativas no centro da sobrevivência humana.',
    authorNotes:
      'Quadrinhos sempre foram vistos como uma mídia puramente visual, mas para mim são, antes de tudo, sequências de emoção e narrativa. Nesta obra, trabalhei durante seis meses ao lado de consultores cegos e pessoas com dislexia para garantir que a audiodescrição não fosse um anexo burocrático, mas uma camada poética integrada ao universo da história.',
    tags: ['EspaçoProfundo', 'ProtagonistaPCD', 'GraphicNovelBR', 'AudioComics'],
    flags: { hasAudioDesc: true, hasLeitorTela: true, hasTextoAlt: true, hasLibras: true, hasAltoContraste: true },
    audioDescriber: 'Thiago Alencar',
    audioNarrator: 'Sarah Menezes',
    audioReviewer: 'Instituto Acessibilidade Aberta',
    cover: 'alem-das-estrelas.webp',
    file: 'alem-das-estrelas.cbz',
    publishedDaysAgo: 40,
  },
  {
    key: 'mapa',
    author: 'marina',
    title: 'O Último Mapa',
    genre: 'Fantasia Épica',
    format: 'QUADRINHO',
    pages: 10,
    status: 'APROVADO',
    editionLabel: 'Edição especial',
    ageRating: '10',
    synopsis:
      'Em uma metrópole submersa, navegadores cegos desvendam rotas esquecidas guiados pelo som das correntes. Quando o último mapa da cidade desaparece, cabe a uma jovem cartógrafa reconstruí-lo com as mãos e os ouvidos.',
    tags: ['CidadeSubmersa', 'Cartografia', 'AudioComics'],
    flags: { hasAudioDesc: true, hasLeitorTela: true, hasTextoAlt: true },
    audioDescriber: 'Marina Bastos',
    audioNarrator: 'Sarah Menezes',
    cover: 'o-ultimo-mapa.webp',
    file: 'o-ultimo-mapa.cbz',
    publishedDaysAgo: 90,
  },
  {
    key: 'raizes',
    author: 'eloa',
    title: 'Raízes',
    genre: 'Ficção Histórica',
    format: 'LIVRO',
    pages: 9,
    status: 'APROVADO',
    editionLabel: 'Ficção histórica',
    ageRating: '12',
    synopsis:
      'Uma crônica de três gerações no sertão baiano contada com tipografia inclusiva, em que memória, terra e afeto se entrelaçam entre a casa de três portas de Dona Celeste e a neta que volta para reencontrá-la.',
    tags: ['Sertão', 'Memória', 'TipografiaInclusiva'],
    flags: { hasLeitorTela: true, hasFacilLeitura: true, hasAltoContraste: true },
    cover: 'raizes.webp',
    file: 'raizes.epub',
    publishedDaysAgo: 30,
  },
  {
    key: 'terra',
    author: 'caua',
    title: 'Terra Nova',
    genre: 'Aventura',
    format: 'LIVRO',
    pages: 6,
    status: 'APROVADO',
    editionLabel: 'Jovem adulto',
    ageRating: 'L',
    synopsis:
      'Vocabulário simplificado segundo normas internacionais de leitura fácil, em uma aventura sobre plantar a primeira árvore de uma aldeia recém-construída.',
    tags: ['LeituraFácil', 'Natureza'],
    flags: { hasFacilLeitura: true, hasLeitorTela: true },
    cover: 'terra-nova.webp',
    file: 'terra-nova.pdf',
    publishedDaysAgo: 20,
  },
  {
    key: 'chamas',
    author: 'mduarte',
    title: 'Chamas de Agosto',
    genre: 'Drama',
    format: 'QUADRINHO',
    pages: 9,
    status: 'APROVADO',
    editionLabel: 'Graphic novel',
    ageRating: '14',
    synopsis:
      'Narrativa densa sobre reconstrução urbana com roteiro de audiodescrição para cada prancha, acompanhando duas pessoas que reerguem a cidade depois do grande incêndio de agosto.',
    tags: ['Reconstrução', 'GraphicNovelBR'],
    flags: { hasAudioDesc: true, hasTextoAlt: true, hasAltoContraste: true },
    audioDescriber: 'Marina Duarte',
    cover: 'chamas-de-agosto.webp',
    file: 'chamas-de-agosto.cbz',
    publishedDaysAgo: 12,
  },
  {
    key: 'vozes',
    author: 'tiago',
    title: 'Vozes do Mar',
    genre: 'Poesia',
    format: 'ZINE',
    pages: 12,
    status: 'APROVADO',
    editionLabel: 'Zine independente',
    ageRating: 'L',
    synopsis:
      'Poemas visuais acompanhados por intérprete de Libras em alta definição integrada, sobre o mar, as conchas e os faróis que insistem em brilhar.',
    tags: ['Poesia', 'Libras'],
    flags: { hasLibras: true, hasLeitorTela: true },
    cover: 'vozes-do-mar.webp',
    file: 'vozes-do-mar.pdf',
    publishedDaysAgo: 5,
  },
  {
    key: 'ecos',
    author: 'mduarte',
    title: 'Ecos de la Marea',
    subtitle: 'Webcomic en español',
    genre: 'Drama',
    format: 'MANGA_WEBCOMIC',
    pages: 7,
    status: 'APROVADO',
    editionLabel: 'Webcomic serial',
    ageRating: 'L',
    synopsis:
      'Mara desenha o que escuta. Em uma vila onde a maré sobe duas vezes por dia e leva embora os sons da véspera, ela aprende com a avó a registrar em traço aquilo que o mar devolve: vozes antigas, conversas interrompidas, o silêncio que fica entre uma onda e outra. Webcomic em espanhol, criada para a Livrin, com painéis de alto contraste e audiodescrição integrada ao roteiro.',
    authorNotes:
      'Escrevi esta história em espanhol porque foi a língua em que minha avó me contava o mar. A diagramação segue uma leitura linear estrita, de cima para baixo, para que leitores de tela percorram os painéis na mesma ordem em que os olhos percorrem.',
    tags: ['Espanhol', 'Webcomic', 'AltoContraste', 'MarEMemoria'],
    flags: { hasAudioDesc: true, hasLeitorTela: true, hasTextoAlt: true, hasAltoContraste: true },
    audioDescriber: 'Marina Duarte',
    audioNarrator: 'Sarah Menezes',
    cover: 'ecos-de-la-marea.webp',
    file: 'ecos-de-la-marea.cbz',
    publishedDaysAgo: 8,
  },
  {
    key: 'zine',
    author: 'tiago',
    title: 'Zine Tátil #3',
    subtitle: 'Poesia visual de bolso',
    genre: 'Poesia',
    format: 'ZINE',
    pages: 7,
    status: 'APROVADO',
    editionLabel: 'Tiragem aberta',
    ageRating: 'L',
    synopsis:
      'Sete páginas de poesia visual pensadas para serem lidas em voz alta, com tipografia ampliada e muito espaço entre as linhas. O terceiro número do Zine Tátil reúne poemas sobre o que se lê com as mãos e com os ouvidos: mapas de relevo, inventários de ruído, braille de domingo. Tiragem aberta: copie, empreste, leia alto.',
    authorNotes:
      'Zine é feito para circular. Deixei as margens largas e as linhas curtas de propósito, para caber em qualquer ampliação sem quebrar o verso no meio.',
    tags: ['Zine', 'PoesiaVisual', 'LeituraFacil', 'TipografiaInclusiva'],
    flags: { hasLeitorTela: true, hasFacilLeitura: true, hasAltoContraste: true, hasTextoAlt: true },
    cover: 'zine-tatil-3.webp',
    file: 'zine-tatil-3.pdf',
    publishedDaysAgo: 15,
  },
  {
    key: 'rimas',
    author: 'eloa',
    title: 'Rimas',
    subtitle: 'Seleção em espanhol · domínio público',
    genre: 'Poesia',
    format: 'LIVRO',
    pages: 4,
    status: 'APROVADO',
    editionLabel: 'Edição acessível',
    ageRating: 'L',
    synopsis:
      'Três rimas de Gustavo Adolfo Bécquer (1836–1870), em espanhol, preparadas para leitura acessível. O texto está em domínio público e esta edição acrescenta apenas o trabalho de acessibilidade: estrutura semântica para leitores de tela, tipografia ampliável, espaçamento ajustável e uma nota editorial sobre a procedência do texto.',
    authorNotes:
      'Não sou a autora destes versos — eles são de Bécquer e já pertencem a todo mundo. O que fiz foi preparar a edição para que continuem pertencendo a todo mundo, inclusive a quem lê com os ouvidos ou com os dedos.',
    tags: ['Espanhol', 'DominioPublico', 'Poesia', 'TipografiaInclusiva'],
    flags: { hasLeitorTela: true, hasFacilLeitura: true, hasAltoContraste: true },
    audioReviewer: 'Instituto Acessibilidade Aberta',
    cover: 'rimas-becquer.webp',
    file: 'rimas-becquer.epub',
    publishedDaysAgo: 25,
  },
  {
    key: 'incrivel',
    author: 'marina',
    title: 'Meu Livro Incrível',
    subtitle: 'Volume 1: A Travessia das Vozes Silenciosas',
    genre: 'Ficção Científica',
    format: 'QUADRINHO',
    pages: 7,
    status: 'APROVADO',
    ageRating: '10',
    synopsis:
      'Uma aventura cósmica inesquecível: Ana, uma jovem astronauta que lê o mundo pelos ouvidos, segue uma música misteriosa até o fim do universo.',
    tags: ['Inclusão', 'SciFi'],
    flags: { hasAudioDesc: true, hasLeitorTela: true, hasTextoAlt: true, hasAltoContraste: true },
    audioNarrator: 'Sarah Menezes',
    cover: 'meu-livro-incrivel.webp',
    file: 'meu-livro-incrivel.cbz',
    submittedDaysAgo: 9,
    publishedDaysAgo: 2,
  },
  {
    key: 'cosmic',
    author: 'marina',
    title: 'Cosmic Fusion',
    subtitle: 'Issue #4',
    genre: 'Ficção Científica',
    format: 'MANGA_WEBCOMIC',
    pages: 4,
    status: 'EM_ANALISE',
    ageRating: '12',
    synopsis:
      'Uma astronauta transforma constelações em mapas táteis em Braille e descobre que o universo também pode ser tocado. Webcomic com pranchas adaptadas para leitura por voz.',
    tags: ['Braille', 'Webcomic'],
    flags: { hasAudioDesc: true, hasTextoAlt: true },
    cover: 'cosmic-fusion.webp',
    file: 'cosmic-fusion.cbz',
    submittedDaysAgo: 2,
  },
  {
    // Manuscrito em .docx: o formato em que quem escreve entrega o texto.
    // Está EM_ANALISE de propósito — é assim que ele chega à curadoria, antes
    // de ter capa pronta. Entre com a conta de curadoria para abri-lo no leitor
    // e ver o texto refluindo com a tipografia escolhida.
    key: 'alfabeto',
    author: 'caua',
    title: 'O Alfabeto das Coisas Pequenas',
    subtitle: 'Crônicas de leitura fácil',
    genre: 'Slice of Life',
    format: 'LIVRO',
    pages: 3,
    status: 'EM_ANALISE',
    ageRating: 'L',
    synopsis:
      'Crônicas curtas sobre uma rua, uma janela e as coisas miúdas que sustentam o dia. Escritas em frases curtas, para serem lidas em voz alta por quem está aprendendo a ler ou por quem lê para outra pessoa.',
    authorNotes: 'Mandei o manuscrito em Word mesmo, que é como eu escrevo.',
    tags: ['LeituraFacil', 'Cronicas', 'VozAlta'],
    flags: { hasFacilLeitura: true, hasLeitorTela: true },
    cover: 'o-alfabeto-das-coisas-pequenas.webp',
    file: 'o-alfabeto-das-coisas-pequenas.docx',
    submittedDaysAgo: 1,
  },
  {
    key: 'cronicas',
    author: 'marina',
    title: 'Crônicas Urbanas',
    genre: 'Slice of Life',
    format: 'QUADRINHO',
    pages: 85,
    status: 'RASCUNHO',
    synopsis: 'Pequenas histórias do cotidiano de uma cidade vertical, contadas por quem atravessa suas ruas todos os dias.',
    flags: { hasTextoAlt: true },
    cover: 'cronicas-urbanas.webp',
  },
];

export interface DemoAudioDescription {
  pageNumber: number;
  chapterLabel: string;
  chapterTitle: string;
  panelLabel: string;
  description: string;
  dialogues: Dialogue[];
}

export const DEMO_AUDIO_DESCRIPTIONS: Record<string, DemoAudioDescription[]> = {
  alem: [
    {
      pageNumber: 1,
      chapterLabel: 'Capítulo 1',
      chapterTitle: 'O Limiar da Nebulosa Carina',
      panelLabel: 'Painel 1 • Plano Aberto',
      description:
        'A nave Alvorada desliza silenciosamente pelo cosmos. Seu casco prateado reflete tons quentes de ametista emitidos pelos gases da Nebulosa. No quadrante superior, pequenos detritos rochosos flutuam em gravidade zero.',
      dialogues: [
        { speaker: 'Comandante Yara', tone: 'Voz firme', text: 'Mantenham os sensores direcionais ligados. Essa névoa tem densidade magnética que nenhum mapa estelar previu.' },
        { speaker: 'Sintético N-400', tone: 'Comunicação tátil', text: 'Frequência de pulso detectada. Não é estática orbital... há um padrão repetitivo de quatro compassos.' },
      ],
    },
    {
      pageNumber: 2,
      chapterLabel: 'Capítulo 1',
      chapterTitle: 'O Limiar da Nebulosa Carina',
      panelLabel: 'Painel 2 • Plano Geral',
      description:
        'Um planeta azul-acinzentado ocupa o lado direito do quadro, envolto por névoa violeta e pontos de luz. À esquerda, a Alvorada parece pequena diante da imensidão.',
      dialogues: [{ speaker: 'Comandante Yara', tone: 'Sussurro', text: 'Sinto a vibração no casco antes mesmo dos sensores. Este planeta está cantando.' }],
    },
    {
      pageNumber: 3,
      chapterLabel: 'Capítulo 1',
      chapterTitle: 'O Limiar da Nebulosa Carina',
      panelLabel: 'Painel 3 • Plano Médio',
      description:
        'Interior da ponte de comando. Seis consoles iluminados em ciano formam um semicírculo. Yara está de costas, com a mão apoiada no painel central.',
      dialogues: [
        { speaker: 'Comandante Yara', tone: 'Calma', text: 'Leia em voz alta cada leitura, N-400. Quero ouvir o caminho.' },
        { speaker: 'Sintético N-400', tone: 'Comunicação tátil', text: 'Eco-localização ativa. Distância até a superfície: 12 quilômetros.' },
      ],
    },
    {
      pageNumber: 4,
      chapterLabel: 'Capítulo 1',
      chapterTitle: 'O Limiar da Nebulosa Carina',
      panelLabel: 'Painel 4 • Close',
      description:
        'Círculos concêntricos verdes se expandem a partir do centro do quadro, como ondas sonoras visíveis, sobre um fundo de estrelas.',
      dialogues: [{ speaker: 'Comandante Yara', tone: 'Emocionada', text: 'Quatro compassos... é uma linguagem. Alguém está nos chamando.' }],
    },
  ],
  mapa: [
    {
      pageNumber: 1,
      chapterLabel: 'Capítulo 1',
      chapterTitle: 'A cidade que respira',
      panelLabel: 'Capa • Plano Aberto',
      description: 'Uma figura encapuzada observa, do alto de um rochedo, uma cidade submersa iluminada por constelações desenhadas como rotas.',
      dialogues: [],
    },
    {
      pageNumber: 2,
      chapterLabel: 'Capítulo 1',
      chapterTitle: 'A cidade que respira',
      panelLabel: 'Prancha 2 • Plano Geral',
      description: 'Prédios cobertos de algas sob a água azul-escura. Bolhas sobem entre as janelas acesas em amarelo.',
      dialogues: [{ speaker: 'Navegadora', tone: 'Atenta', text: 'As correntes mudaram de novo. Escute — o eco vem do norte.' }],
    },
  ],
  incrivel: [
    {
      pageNumber: 2,
      chapterLabel: 'Volume 1',
      chapterTitle: 'A Travessia das Vozes Silenciosas',
      panelLabel: 'Página de abertura',
      description: 'Ana ajusta o capacete no último posto avançado da galáxia. Ao fundo, uma nebulosa verde e azul pulsa lentamente.',
      dialogues: [{ speaker: 'Ana', tone: 'Decidida', text: 'Vamos seguir a música.' }],
    },
  ],
};

export const DEMO_FEEDBACKS = [
  {
    work: 'mapa',
    user: 'lucas',
    rating: 5,
    aspect: 'Audiodescrição',
    content:
      "A audiodescrição em 'O Último Mapa' não descreve apenas as falas, ela transmite o peso das sombras e a expressão dos personagens. Foi a primeira vez que me emocionei acompanhando uma graphic novel sem depender de alguém do meu lado.",
  },
  {
    work: 'mapa',
    user: 'tatiane',
    rating: 5,
    aspect: 'Interface de Leitura Acessível',
    content:
      'A diagramação adaptativa e a navegação estrita por teclas de atalho funcionam perfeitamente com meu acionador de cabeça. O foco visual não se perde e os botões têm o tamanho ideal para evitar toques acidentais.',
  },
  {
    work: 'mapa',
    user: 'gabriel',
    rating: 5,
    aspect: 'Recursos Tipográficos Inclusivos',
    content:
      'Poder alternar a tipografia dos balões para fonte disléxica com fundo suave tirou a exaustão visual que sempre tive lendo quadrinhos tradicionais.',
  },
  { work: 'alem', user: 'lucas', rating: 5, aspect: 'Audiodescrição', content: 'A narração da Sarah Menezes com descrições táteis dos cenários é impecável. A Alvorada ganhou vida para mim.' },
  { work: 'alem', user: 'gabriel', rating: 4, aspect: 'Tipografia', content: 'A fonte OpenDyslexic e o espaçamento amplo deixaram a leitura muito mais confortável.' },
  { work: 'raizes', user: 'tatiane', rating: 5, aspect: 'Navegação', content: 'Sumário estruturado e capítulos curtos: consegui navegar só pelo teclado sem me perder.' },
];

export const DEMO_REVIEW_NOTES = [
  {
    work: 'cosmic',
    user: 'camila',
    hoursAgo: 3,
    content:
      'As descrições dos quadros de abertura do Capítulo 2 estão exemplares! Apenas sugerimos detalhar um pouco mais as expressões faciais da protagonista no confronto da página 48 para enriquecer a experiência de audiodescrição.',
  },
  {
    work: 'cosmic',
    user: 'rodrigo',
    hoursAgo: 26,
    content:
      'Excelente ritmo narrativo e transição entre pranchas. A diagramação digital mantém a legibilidade impecável mesmo no modo de alto contraste invertido.',
  },
];
