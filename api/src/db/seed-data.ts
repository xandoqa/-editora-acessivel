import type { Dialogue, WorkFormat, WorkStatus } from './schema';

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
  role: 'USER' | 'ADMIN';
  headline?: string;
}

export const DEMO_USERS: DemoUser[] = [
  { key: 'marina', name: 'Marina Bastos', email: 'marina@livrin.com', role: 'USER', headline: 'Autora e quadrinista independente' },
  { key: 'lorena', name: 'Lorena Campolina', email: 'lorena@livrin.com', role: 'USER', headline: 'Roteiro e Ilustrações Originais' },
  { key: 'eloa', name: 'Eloá Santana', email: 'eloa@livrin.com', role: 'USER', headline: 'Escritora' },
  { key: 'caua', name: 'Cauã Pataxó', email: 'caua@livrin.com', role: 'USER', headline: 'Autor de leitura fácil' },
  { key: 'mduarte', name: 'Marina Duarte', email: 'marina.duarte@livrin.com', role: 'USER', headline: 'Graphic novelist' },
  { key: 'tiago', name: 'Tiago Medeiros', email: 'tiago@livrin.com', role: 'USER', headline: 'Poeta visual' },
  { key: 'lucas', name: 'Lucas Camargo', email: 'lucas@livrin.com', role: 'USER', headline: 'Baixa Visão Severa · Leitor de Tela' },
  { key: 'tatiane', name: 'Tatiane Rocha', email: 'tatiane@livrin.com', role: 'USER', headline: 'Deficiência Motora · Switch Access' },
  { key: 'gabriel', name: 'Gabriel Miranda', email: 'gabriel@livrin.com', role: 'USER', headline: 'Dislexia & TDAH' },
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
    pages: 148,
    status: 'PUBLICADO',
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
    file: 'alem-das-estrelas.pdf',
    publishedDaysAgo: 40,
  },
  {
    key: 'mapa',
    author: 'marina',
    title: 'O Último Mapa',
    genre: 'Fantasia Épica',
    format: 'QUADRINHO',
    pages: 208,
    status: 'PUBLICADO',
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
    pages: 310,
    status: 'PUBLICADO',
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
    pages: 142,
    status: 'PUBLICADO',
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
    pages: 278,
    status: 'PUBLICADO',
    editionLabel: 'Graphic novel',
    ageRating: '14',
    synopsis:
      'Narrativa densa sobre reconstrução urbana com roteiro de audiodescrição para cada prancha, acompanhando duas pessoas que reerguem a cidade depois do grande incêndio de agosto.',
    tags: ['Reconstrução', 'GraphicNovelBR'],
    flags: { hasAudioDesc: true, hasTextoAlt: true, hasAltoContraste: true },
    audioDescriber: 'Marina Duarte',
    cover: 'chamas-de-agosto.webp',
    file: 'chamas-de-agosto.pdf',
    publishedDaysAgo: 12,
  },
  {
    key: 'vozes',
    author: 'tiago',
    title: 'Vozes do Mar',
    genre: 'Poesia',
    format: 'ZINE',
    pages: 88,
    status: 'PUBLICADO',
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
    key: 'incrivel',
    author: 'marina',
    title: 'Meu Livro Incrível',
    subtitle: 'Volume 1: A Travessia das Vozes Silenciosas',
    genre: 'Ficção Científica',
    format: 'QUADRINHO',
    pages: 132,
    status: 'APROVADO',
    ageRating: '10',
    synopsis:
      'Uma aventura cósmica inesquecível: Ana, uma jovem astronauta que lê o mundo pelos ouvidos, segue uma música misteriosa até o fim do universo.',
    tags: ['Inclusão', 'SciFi'],
    flags: { hasAudioDesc: true, hasLeitorTela: true, hasTextoAlt: true, hasAltoContraste: true },
    audioNarrator: 'Sarah Menezes',
    cover: 'meu-livro-incrivel.webp',
    file: 'meu-livro-incrivel.pdf',
    submittedDaysAgo: 9,
  },
  {
    key: 'cosmic',
    author: 'marina',
    title: 'Cosmic Fusion',
    subtitle: 'Issue #4',
    genre: 'Ficção Científica',
    format: 'MANGA_WEBCOMIC',
    pages: 240,
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
