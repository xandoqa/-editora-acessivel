import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, Check, Info, Mail, Send, ShieldCheck } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n/I18nContext';
import { SelectInput, TextArea, TextInput } from '../components/ui';
import { EstrelaDeImpacto, LinhasDeVelocidade, Reticula } from '../components/ui/Quadrinhos';
import Pingo from '../components/contato/Pingo';
import type { Humor } from '../components/contato/pingo';
import type { ChaveDeTraducao } from '../i18n/tipos';

/**
 * Entre em Contato.
 *
 * Duas decisões que separam esta tela do formulário da referência:
 *
 * **1. Não há "não sou um robô".** O desafio de caixinha é barreira conhecida
 * para quem usa leitor de tela: o desafio visual é impossível, o sonoro falha
 * com frequência, e o modo invisível julga movimento de mouse — que quem
 * navega por teclado não produz. Pôr justamente esse controle na única tela
 * onde alguém pede ajuda contradiria a proposta do projeto inteiro. No lugar
 * vão campo-armadilha, limitador por IP e limites de tamanho, que não cobram
 * nada de quem é humano. A tela explica isso em voz alta, porque a ausência de
 * captcha costuma ser lida como descuido.
 *
 * **2. A confirmação não mente.** A API responde `gravada` e `entregue`
 * separadamente, e a tela diz os dois. Quando o e-mail não sai — sem SMTP
 * configurado, sem rede —, a mensagem foi guardada do mesmo jeito e a pessoa
 * fica sabendo exatamente disso, com um número de protocolo. "Enviado com
 * sucesso" quando nada foi enviado é o tipo de mentira pequena que faz alguém
 * esperar uma resposta que nunca vem.
 */

interface Resposta {
  id: number;
  gravada: boolean;
  entregue: boolean;
}

const ASSUNTOS: { valor: string; rotulo: ChaveDeTraducao }[] = [
  { valor: 'DUVIDA', rotulo: 'assunto.DUVIDA' },
  { valor: 'ACESSIBILIDADE', rotulo: 'assunto.ACESSIBILIDADE' },
  { valor: 'PUBLICAR', rotulo: 'assunto.PUBLICAR' },
  { valor: 'PEDIDO', rotulo: 'assunto.PEDIDO' },
  { valor: 'PROBLEMA', rotulo: 'assunto.PROBLEMA' },
  { valor: 'IMPRENSA', rotulo: 'assunto.IMPRENSA' },
  { valor: 'OUTRO', rotulo: 'assunto.OUTRO' },
];

const LIMITE_MENSAGEM = 4000;

export default function Contato() {
  const t = useT();
  const { user } = useAuth();

  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [assunto, setAssunto] = useState('');
  const [pedido, setPedido] = useState('');
  const [mensagem, setMensagem] = useState('');
  /** Campo-armadilha. Precisa continuar vazio; gente não o enxerga. */
  const [armadilha, setArmadilha] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState('');
  const [recibo, setRecibo] = useState<Resposta | null>(null);
  const [digitando, setDigitando] = useState(false);

  const enviar = useMutation({
    mutationFn: async () =>
      (
        await api.post<Resposta>('/contato', {
          name: nome,
          email,
          subject: assunto,
          orderRef: pedido || undefined,
          message: mensagem,
          website: armadilha,
        })
      ).data,
    onSuccess: (dados) => {
      setRecibo(dados);
      setErros({});
      setErroGeral('');
    },
    onError: (err) => {
      setErros(fieldErrors(err));
      setErroGeral(errorMessage(err, t('contato.erro')));
    },
  });

  const humor: Humor = recibo ? 'enviado' : erroGeral ? 'ops' : digitando ? 'escutando' : 'oi';

  /* ------------------------------ Recibo ---------------------------------- */
  if (recibo) {
    return (
      <div className="mx-auto max-w-2xl py-6 text-center">
        <Pingo humor="enviado" className="mx-auto h-32 w-32" rotulo={t('contato.pingo')} />

        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t('contato.obrigado', { nome })}
        </h1>

        <p className="mt-4 leading-relaxed text-ink-muted">
          {recibo.entregue ? t('contato.guardadaEEnviada') : t('contato.guardadaSemEmail')}
        </p>

        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-outline/50 px-4 py-2 font-mono text-sm text-ink">
          <Check className="h-4 w-4 text-accent" aria-hidden />
          {t('contato.protocolo', { id: recibo.id })}
        </p>

        <p className="mt-6 text-sm text-ink-subtle">{t('contato.prazo')}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setRecibo(null);
              setMensagem('');
              setAssunto('');
              setPedido('');
            }}
          >
            {t('contato.outra')}
          </button>
          <Link to="/" className="btn-ghost">
            {t('vitrine.verTudo')}
          </Link>
        </div>
      </div>
    );
  }

  /* ----------------------------- Formulário ------------------------------- */
  return (
    <div>
      {/*
        Abertura em linguagem de quadrinho: retícula, estrela de impacto e
        linhas de velocidade. Tudo desenhado aqui (ver ui/Quadrinhos), tudo
        decorativo, e tudo ATRÁS do conteúdo — enfeite que disputa leitura com
        o texto numa tela de pedir ajuda seria o oposto do que o projeto é.
      */}
      <header className="relative mb-10 overflow-hidden rounded-2xl border border-outline bg-surface-low px-6 py-8 sm:px-10 sm:py-10">
        <Reticula className="pointer-events-none absolute inset-0 h-full w-full text-primary/[0.12]" id="reticula-contato" />
        <EstrelaDeImpacto className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 text-accent/20" />
        <LinhasDeVelocidade className="pointer-events-none absolute -left-3 bottom-4 hidden h-24 w-20 text-primary/20 sm:block" />

        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <Pingo humor={humor} className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" rotulo={t('contato.pingo')} />
          <div className="min-w-0">
            <p className="eyebrow text-accent">{t('contato.olho')}</p>
            <h1 className="mt-2 font-display text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
              {t('contato.titulo')}
            </h1>
            <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">{t('contato.subtitulo')}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            enviar.mutate();
          }}
          className="card p-6 sm:p-8"
        >
          {erroGeral && (
            <p role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-danger bg-danger-container px-4 py-3 text-sm font-semibold text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {erroGeral}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextInput
                label={t('contato.nome')}
                hint={t('contato.nomeAjuda')}
                error={erros.name}
                required
                value={nome}
                autoComplete="name"
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <TextInput
              label={t('contato.email')}
              hint={t('contato.emailAjuda')}
              error={erros.email}
              required
              type="email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />

            <SelectInput
              label={t('contato.assunto')}
              hint={t('contato.assuntoAjuda')}
              error={erros.subject}
              required
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
            >
              <option value="">{t('contato.escolha')}</option>
              {ASSUNTOS.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {t(a.rotulo)}
                </option>
              ))}
            </SelectInput>

            <TextInput
              label={t('contato.pedido')}
              hint={t('contato.pedidoAjuda')}
              error={erros.orderRef}
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
            />

            <div className="sm:col-span-2">
              <TextArea
                label={t('contato.mensagem')}
                hint={t('contato.mensagemAjuda')}
                error={erros.message}
                required
                rows={8}
                maxLength={LIMITE_MENSAGEM}
                value={mensagem}
                onFocus={() => setDigitando(true)}
                onBlur={() => setDigitando(false)}
                onChange={(e) => setMensagem(e.target.value)}
              />
              {/* Contagem regressiva com `aria-live` discreto: quem usa leitor
                  de tela percebe que está perto do limite antes de esbarrar
                  nele, e não depois de o texto parar de entrar. */}
              <p className="mt-1 text-right text-xs text-ink-subtle" aria-live="polite">
                {t('contato.restam', { n: LIMITE_MENSAGEM - mensagem.length })}
              </p>
            </div>
          </div>

          {/*
            Campo-armadilha.
            `aria-hidden` + `tabIndex={-1}` + fora da tela: leitor de tela não
            anuncia, teclado não alcança, olho não vê. Robô que preenche tudo
            que encontra, sim — e é exatamente o que ele denuncia.
          */}
          <div aria-hidden className="pointer-events-none absolute left-[-9999px] h-px w-px overflow-hidden">
            <label htmlFor="website-armadilha">Website</label>
            <input
              id="website-armadilha"
              type="text"
              name="website"
              value={armadilha}
              onChange={(e) => setArmadilha(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button type="submit" className="btn-primary py-3" disabled={enviar.isPending}>
              <Send className="h-4 w-4" aria-hidden />
              {enviar.isPending ? t('contato.enviando') : t('contato.enviar')}
            </button>
            <span className="text-sm text-ink-subtle">{t('contato.prazo')}</span>
          </div>
        </form>

        {/* ----------------------------- Apoio ------------------------------ */}
        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <ShieldCheck className="h-5 w-5 text-accent" aria-hidden />
              {t('contato.semRobo').split('.')[0]}.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {t('contato.semRobo').split('. ').slice(1).join('. ')}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Mail className="h-5 w-5 text-accent" aria-hidden />
              {t('rodape.colContato')}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li>contato@livrin.exemplo</li>
              <li>{t('rodape.horario')}</li>
            </ul>
            <p className="mt-3 flex items-start gap-2 text-xs leading-snug text-ink-subtle">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {t('rodape.contatoFicticio')}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
