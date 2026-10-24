import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import type { AuthResponse, Role } from '../../types/api';
import { ROLE_DESCRIPTION } from '../../lib/labels';
import { TextInput } from '../../components/ui';
import AuthShell from './AuthShell';

/** Perfis que o cadastro público oferece. Administrador só a própria administração concede. */
const PERFIS: { value: Role; label: string }[] = [
  { value: 'LEITOR', label: 'Quero ler' },
  { value: 'ESCRITOR', label: 'Quero publicar' },
];

export default function Register() {
  const { login } = useAuth();
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
      setErrors({ confirm: 'As senhas não conferem.' });
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
    <AuthShell subtitle="Crie sua conta para publicar obras, avaliar leituras e acompanhar a curadoria">
      {error && (
        <p className="mb-5 rounded-xl border-l-4 border-danger bg-surface-high p-4 text-sm text-ink" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-5">
        <fieldset>
          <legend className="label">Como você vai usar a Livrin?</legend>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Perfil da conta">
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
                  <span className={`block font-semibold ${ativo ? 'text-primary-onContainer' : 'text-ink'}`}>{p.label}</span>
                  <span className={`mt-1 block text-sm ${ativo ? 'text-primary-onContainer' : 'text-ink-muted'}`}>
                    {ROLE_DESCRIPTION[p.value]}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            Dá para mudar depois: leitores ativam o perfil de escritor em “Meu perfil”.
          </p>
        </fieldset>
        <TextInput label="Nome completo" required autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <TextInput label="E-mail" type="email" required autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <TextInput
          label="Como você se apresenta (opcional)"
          value={form.headline}
          onChange={set('headline')}
          error={errors.headline}
          placeholder="Ex.: Quadrinista independente · Baixa visão"
          hint="Aparece junto às suas avaliações e mensagens. Compartilhe apenas o que quiser."
          maxLength={160}
        />
        <TextInput
          label="Senha"
          type="password"
          required
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint="Mínimo de 8 caracteres, com letras e números."
        />
        <TextInput label="Confirme a senha" type="password" required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <button type="submit" className="btn-brand w-full py-3 text-base" disabled={busy}>
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          Criar minha conta <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Já tem conta?{' '}
        <Link to="/login" className="font-semibold text-primary underline underline-offset-4">
          Entrar na plataforma
        </Link>
      </p>
    </AuthShell>
  );
}
