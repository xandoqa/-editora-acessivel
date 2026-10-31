import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import type { AuthResponse, Role } from '../../types/api';
import { ROLE_DESCRIPTION } from '../../lib/labels';
import { TextInput } from '../../components/ui';
import AuthShell from './AuthShell';
import { useT } from '../../i18n/I18nContext';
import type { ChaveDeTraducao } from '../../i18n/tipos';

/**
 * Perfis que o cadastro público oferece. Administrador só a própria
 * administração concede.
 *
 * O rótulo é uma CHAVE de tradução, não um texto: a lista é module-level e
 * roda uma vez, antes de qualquer idioma ser escolhido. Guardar o texto aqui
 * congelaria o português no primeiro carregamento.
 */
const PERFIS: { value: Role; label: ChaveDeTraducao }[] = [
  { value: 'LEITOR', label: 'cadastro.queroLer' },
  { value: 'ESCRITOR', label: 'cadastro.queroPublicar' },
];

export default function Register() {
  const { login } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', headline: '' });
  const [role, setRole] = useState<Role>('LEITOR');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setErrors({ confirm: t('cadastro.senhasNaoConferem') });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        headline: form.headline || undefined,
        role,
      });
      login(data.token, data.user);
      navigate(data.user.role === 'LEITOR' ? '/' : '/dashboard', { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell subtitle={t('cadastro.subtitulo')}>
      {error && (
        <p className="mb-5 rounded-xl border-l-4 border-danger bg-surface-high p-4 text-sm text-ink" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-5">
        <fieldset>
          <legend className="label">{t('cadastro.comoVaiUsar')}</legend>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('cadastro.perfilDaConta')}>
            {PERFIS.map((p) => {
              const ativo = role === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setRole(p.value)}
                  className={`hc-border rounded-xl border p-4 text-left transition-colors ${
                    ativo ? 'border-primary bg-primary-container' : 'border-outline/60 bg-surface-high hover:bg-surface-highest'
                  }`}
                >
                  <span className={`block font-semibold ${ativo ? 'text-primary-onContainer' : 'text-ink'}`}>{t(p.label)}</span>
                  <span className={`mt-1 block text-sm ${ativo ? 'text-primary-onContainer' : 'text-ink-muted'}`}>
                    {ROLE_DESCRIPTION[p.value]}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            {t('cadastro.daParaMudar')}
          </p>
        </fieldset>
        <TextInput label={t('cadastro.nomeCompleto')} required autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <TextInput label={t('cadastro.email')} type="email" required autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextInput
          label={t('cadastro.apresentacao')}
          value={form.headline}
          onChange={set('headline')}
          error={errors.headline}
          placeholder={t('cadastro.apresentacaoEx')}
          hint={t('cadastro.apresentacaoDica')}
          maxLength={160}
        />
        <TextInput
          label={t('cadastro.senha')}
          type="password"
          required
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint={t('cadastro.senhaDica')}
        />
        <TextInput label={t('cadastro.confirmeSenha')} type="password" required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <button type="submit" className="btn-brand w-full py-3 text-base" disabled={busy}>
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          {t('cadastro.criarConta')} <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        {t('cadastro.jaTemConta')}{' '}
        <Link to="/login" className="font-semibold text-primary underline underline-offset-4">
          {t('cadastro.entrarPlataforma')}
        </Link>
      </p>
    </AuthShell>
  );
}
