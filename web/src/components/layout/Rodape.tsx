import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  Clock,
  Contrast,
  GraduationCap,
  Scale,
  Wallet,
  Github,
  HandHeart,
  Mail,
  PersonStanding,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useT } from '../../i18n/I18nContext';
import type { ChaveDeTraducao } from '../../i18n/tipos';
import { LogoMark } from './Logo';
import { Reticula } from '../ui/Quadrinhos';

/**
 * Rodapé do site.
 *
 * Três decisões que o separam de um rodapé de loja qualquer:
 *
 *  1. **Não há bandeira de cartão.** Uma fileira de selos Visa/Mastercard diz
 *     "aceitamos esses cartões", e aqui seria mentira: o pagamento é simulado.
 *     No lugar dela há uma linha que explica o que de fato acontece. Parecer
 *     uma loja de verdade seria fácil; seria também desonesto.
 *
 *  2. **Não há CNPJ inventado.** Número de registro é identificador de
 *     empresa real — inventar um para parecer profissional é falsificar
 *     documento, ainda que em HTML. O que vai no lugar é o que o Livrin é:
 *     trabalho acadêmico.
 *
 *  3. **Os contatos são fictícios e o rodapé diz isso.** Quem bater o olho
 *     precisa saber que não adianta escrever para aquele endereço.
 *
 * O convite para apoiar o projeto continua aqui, discreto e no fim da página,
 * como pede a seção 19 da especificação — nunca um banner, nunca um anteparo
 * na frente da leitura.
 */

interface ItemDeMenu {
  rotulo: ChaveDeTraducao;
  para: string;
}

const LER: ItemDeMenu[] = [
  { rotulo: 'nav.inicio', para: '/' },
  { rotulo: 'nav.leitorAcessivel', para: '/leitor' },
  { rotulo: 'nav.autores', para: '/autores' },
  { rotulo: 'nav.planos', para: '/planos' },
  { rotulo: 'nav.biblioteca', para: '/biblioteca' },
  { rotulo: 'nav.historico', para: '/historico' },
];

const PUBLICAR: ItemDeMenu[] = [
  { rotulo: 'nav.publicarObra', para: '/submit' },
  { rotulo: 'nav.emAnalise', para: '/review' },
  { rotulo: 'nav.meuPainel', para: '/dashboard' },
];

/** Quem ainda não publica vê o convite, não o painel de quem já publica. */
const PUBLICAR_VISITANTE: ItemDeMenu[] = [
  { rotulo: 'nav.queroPublicar', para: '/profile' },
  { rotulo: 'cadastro.criarConta', para: '/register' },
];

const LIVRIN: ItemDeMenu[] = [
  { rotulo: 'rodape.sobre', para: '/sobre' },
  { rotulo: 'rodape.apoiar', para: '/apoiar' },
  { rotulo: 'nav.contato', para: '/contato' },
];

/** Meios de pagamento que a simulação aceita. Não são bandeiras de cartão. */
const MEIOS = ['Pix', 'Cartão', 'Boleto'];

const REPOSITORIO = 'https://github.com/xandoqa/-editora-acessivel';

/**
 * Os quatro selos da faixa. Cada um afirma algo CONFERÍVEL: o contraste tem
 * script, a licença tem arquivo, a simulação está escrita na tela de compra, e
 * o caráter acadêmico está no NOTICE. Selo que ninguém pode checar é enfeite.
 */
const SELOS: { icone: ReactNode; titulo: ChaveDeTraducao; texto: ChaveDeTraducao }[] = [
  { icone: <Wallet className="h-5 w-5" aria-hidden />, titulo: 'selo.pagamento', texto: 'selo.pagamentoTexto' },
  { icone: <Contrast className="h-5 w-5" aria-hidden />, titulo: 'selo.acessibilidade', texto: 'selo.acessibilidadeTexto' },
  { icone: <Scale className="h-5 w-5" aria-hidden />, titulo: 'selo.codigo', texto: 'selo.codigoTexto' },
  { icone: <GraduationCap className="h-5 w-5" aria-hidden />, titulo: 'selo.academico', texto: 'selo.academicoTexto' },
];

function Coluna({ titulo, itens }: { titulo: ChaveDeTraducao; itens: ItemDeMenu[] }) {
  const t = useT();
  return (
    <nav aria-label={t(titulo)}>
      <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-primary">{t(titulo)}</h3>
      <ul className="mt-3 space-y-2">
        {itens.map((item) => (
          <li key={item.para}>
            <Link
              to={item.para}
              className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            >
              {t(item.rotulo)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Rodape() {
  const t = useT();
  const { isWriter } = useAuth();

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-outline/25 bg-surface-low" aria-label={t('rodape.titulo')}>
      {/* A retícula fecha a página: densa na borda de cima e sumindo para
          baixo, para o bloco de links e os selos ficarem sobre papel limpo. */}
      <Reticula className="pointer-events-none absolute inset-x-0 top-0 h-52 w-full text-primary/[0.09] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="relative mx-auto w-full max-w-[1280px] px-4 py-10 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Identidade */}
          <div className="sm:col-span-2 lg:col-span-1">
            <LogoMark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">{t('rodape.lema')}</p>

            <p className="mt-5 inline-flex items-start gap-2 rounded-xl border border-outline/40 px-3 py-2 text-xs font-semibold leading-snug text-ink">
              <PersonStanding className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              {t('rodape.seloA11y')}
            </p>
          </div>

          <Coluna titulo="rodape.colLer" itens={LER} />
          {/* A coluna de publicação muda conforme o perfil: um leitor não tem o
              que fazer com "Em análise", e quem já publica não precisa do
              convite para virar autor. */}
          <Coluna titulo="rodape.colPublicar" itens={isWriter ? PUBLICAR : PUBLICAR_VISITANTE} />
          <Coluna titulo="rodape.colLivrin" itens={LIVRIN} />

          <div>
            <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-primary">
              {t('rodape.colContato')}
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-muted">
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                <span>contato@livrin.exemplo</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                <span>(11) 0000-0000</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                <span>{t('rodape.horario')}</span>
              </li>
              <li>
                <a
                  href={REPOSITORIO}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                >
                  <Github className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                  {t('rodape.codigo')}
                </a>
              </li>
            </ul>
            <p className="mt-3 text-xs leading-snug text-ink-subtle">{t('rodape.contatoFicticio')}</p>
          </div>
        </div>

        {/*
          A faixa de selos.
          ----------------
          A referência que pediu esta faixa trazia bandeiras de cartão,
          logotipos dos Correios e um selo "site seguro" do Google. Nenhum dos
          três entra, e por dois motivos diferentes: são marcas registradas que
          não são nossas, e todos os três seriam MENTIRA — o pagamento aqui é
          simulado, não existe entrega física e ninguém certificou este site.

          Selo serve para dizer em que confiar. Um selo falso estraga
          exatamente a coisa que ele deveria construir. Então a faixa ficou,
          com o que é verdade — e o que é verdade aqui é verificável: o
          contraste é medido por script, a licença está no repositório, e a
          simulação do pagamento está escrita na própria tela de compra.
        */}
        <section className="mt-10 border-t border-outline/25 pt-7" aria-labelledby="selos-titulo">
          <h3 id="selos-titulo" className="eyebrow mb-4 text-center text-ink-subtle">
            {t('selo.faixa')}
          </h3>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SELOS.map((selo) => (
              <li key={selo.titulo} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-highest text-accent" aria-hidden>
                  {selo.icone}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">{t(selo.titulo)}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{t(selo.texto)}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* Os meios de pagamento continuam nomeados em texto, sem bandeira:
              dizer "Pix, cartão e boleto" é verdade; desenhar a bandeira da
              Visa ao lado seria afirmar um acordo que não existe. */}
          <p className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-subtle">
            <span className="font-bold uppercase tracking-wider">{t('rodape.pagamentoTitulo')}:</span>
            {MEIOS.map((meio) => (
              <span key={meio} className="rounded-md border border-outline/50 px-2 py-0.5 font-semibold text-ink-muted">
                {meio}
              </span>
            ))}
          </p>
        </section>
      </div>

      <div className="border-t border-outline/25">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="space-y-1 text-xs leading-relaxed text-ink-subtle">
            <p className="font-semibold text-ink-muted">{t('rodape.academico')}</p>
            <p>{t('rodape.licenca')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            {/* O carimbo de versão fica: é o que responde "estou mesmo vendo a
                correção que subiu?" sem precisar abrir o inspetor. */}
            <span className="text-xs text-ink-subtle" title={t('rodape.versao')}>
              v{__LIVRIN_VERSAO__}
            </span>
            <Link to="/apoiar" className="btn-secondary">
              <HandHeart className="h-4 w-4" aria-hidden /> {t('rodape.apoiar')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
