import { Link } from 'react-router-dom';
import {
  Clock,
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
];

/** Meios de pagamento que a simulação aceita. Não são bandeiras de cartão. */
const MEIOS = ['Pix', 'Cartão', 'Boleto'];

const REPOSITORIO = 'https://github.com/xandoqa/-editora-acessivel';

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
    <footer className="mt-20 border-t border-outline/25 bg-surface-low" aria-label={t('rodape.titulo')}>
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-8">
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

        {/* Pagamento: o que de fato acontece, no lugar das bandeiras de cartão. */}
        <div className="mt-10 flex flex-col gap-3 border-t border-outline/25 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              {t('rodape.pagamentoTitulo')}
            </p>
            <p className="mt-1 max-w-xl text-sm text-ink-muted">{t('rodape.pagamentoTexto')}</p>
          </div>
          <ul className="flex flex-wrap gap-2" aria-hidden>
            {MEIOS.map((meio) => (
              <li
                key={meio}
                className="rounded-md border border-outline/50 px-2.5 py-1 text-xs font-semibold text-ink-muted"
              >
                {meio}
              </li>
            ))}
          </ul>
        </div>
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
