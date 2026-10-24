import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, AtSign, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { api, errorMessage } from '../../lib/api';
import type { AuthResponse } from '../../types/api';
import AuthShell from './AuthShell';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      login(data.token, data.user);
      const destino = data.user.role === 'ADMIN' ? '/admin' : data.user.role === 'ESCRITOR' ? '/dashboard' : '/';
      navigate(from && from !== '/login' ? from : destino, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'E-mail ou senha incorretos.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell subtitle="Publique sua história independente com acessibilidade universal">
      {error && (
        <div className="mb-6 flex gap-3 rounded-xl border-l-4 border-danger bg-surface-high p-4" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="font-semibold text-danger">Falha na autenticação</p>
            <p className="text-sm text-ink-muted">{error} Verifique seus dados cadastrais ou recupere o acesso.</p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="email" className="label">
              E-mail do autor ou leitor
            </label>
            <span className="text-xs font-semibold text-ink-subtle">Obrigatório</span>
          </div>
          <div className="relative">
            <AtSign className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="autor@email.com"
              className="input pl-12"
              aria-invalid={!!error}
            />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="label">
              Senha de acesso
            </label>
            <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-12 pr-12"
              aria-invalid={!!error}
            />
            <button
              type="button"
              className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted hover:text-ink"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
        <button type="submit" className="btn-brand w-full py-3 text-base" disabled={busy}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
          Entrar na Plataforma <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Não possui uma conta?{' '}
        <Link to="/register" className="font-semibold text-primary underline underline-offset-4">
          Cadastre-se como autor ou leitor
        </Link>
      </p>
    </AuthShell>
  );
}
