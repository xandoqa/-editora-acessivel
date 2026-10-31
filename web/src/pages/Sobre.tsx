import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, GraduationCap, HeartHandshake, PersonStanding } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { OndaDivisoria } from '../components/ui/Ornamentos';
import { useT } from '../i18n/I18nContext';
import type { ChaveDeTraducao } from '../i18n/tipos';

/**
 * Sobre o Livrin.
 *
 * O conteúdo vem da documentação do projeto — README, `docs/accessibility.md`,
 * `docs/business-rules.md` e `NOTICE.md` — e não de texto inventado para
 * encher página. Inclusive a parte incômoda: que é um trabalho acadêmico e que
 * todo pagamento é simulado. Um "sobre nós" que esconde isso seria o único
 * lugar do site mentindo, já que a interface avisa em todos os outros.
 *
 * Alguns trechos trazem **negrito** em sintaxe de marcação. A função `comNegrito`
 * converte só isso — não é um interpretador de Markdown, e não deve virar um:
 * o texto vem do dicionário de tradução, que é nosso, não de conteúdo enviado
 * por usuário.
 */

/** Converte `**assim**` em <strong>. Nada além disso. */
function comNegrito(texto: string) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
    parte.startsWith('**') && parte.endsWith('**') ? (
      <strong key={i} className="font-semibold text-ink">
        {parte.slice(2, -2)}
      </strong>
    ) : (
      parte
    ),
  );
}

interface Secao {
  icone: typeof PersonStanding;
  titulo: ChaveDeTraducao;
  texto: ChaveDeTraducao;
}

const SECOES: Secao[] = [
  { icone: HeartHandshake, titulo: 'sobre.porqueTitulo', texto: 'sobre.porqueTexto' },
  { icone: BookOpenCheck, titulo: 'sobre.leituraTitulo', texto: 'sobre.leituraTexto' },
  { icone: PersonStanding, titulo: 'sobre.a11yTitulo', texto: 'sobre.a11yTexto' },
  { icone: BookOpenCheck, titulo: 'sobre.curadoriaTitulo', texto: 'sobre.curadoriaTexto' },
  { icone: GraduationCap, titulo: 'sobre.projetoTitulo', texto: 'sobre.projetoTexto' },
];

export default function Sobre() {
  const t = useT();

  return (
    <>
      <PageHeader title={t('sobre.titulo')} description={t('sobre.subtitulo')} />

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {SECOES.map(({ icone: Icone, titulo, texto }) => (
          <section key={titulo} className="card p-6" aria-labelledby={titulo}>
            <h2 id={titulo} className="flex items-start gap-3 text-xl font-bold text-ink sm:text-2xl">
              <Icone className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
              {t(titulo)}
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">{comNegrito(t(texto))}</p>
          </section>
        ))}
      </div>

      <OndaDivisoria className="mt-12 text-outline/50" />

      <div className="mt-6 flex justify-center">
        <Link to="/" className="btn-primary px-6 py-3">
          {t('sobre.verCatalogo')} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </>
  );
}
