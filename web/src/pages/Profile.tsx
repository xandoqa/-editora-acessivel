import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, SquarePen, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { api, errorMessage, fieldErrors } from '../lib/api';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '../lib/labels';
import type { User } from '../types/api';
import { Badge, PageHeader, TextInput } from '../components/ui';
import { useToast } from '../components/ui/Toast';

/** Perfil do usuário: nome, apresentação e troca de senha. */
export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [headline, setHeadline] = useState(user?.headline ?? '');
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'profile' | 'password' | 'role' | null>(null);

  // Quem chegou aqui tentando abrir uma página de escritor.
  const redirecionado = (location.state as { deniedRole?: string } | null)?.deniedRole === 'ESCRITOR';

  const enableWriter = async () => {
    setBusy('role');
    try {
      const { data } = await api.post<{ user: User }>('/auth/me/writer');
      updateUser(data.user);
      toast.success('Perfil de escritor ativado. Agora você pode publicar suas obras.');
      navigate('/submit');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('profile');
    try {
      const { data } = await api.patch<{ user: User }>('/auth/me', { name, headline });
      updateUser(data.user);
      setErrors({});
      toast.success('Perfil atualizado.');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirm) {
      setErrors({ confirm: 'As senhas não conferem.' });
      return;
    }
    setBusy('password');
    try {
      await api.post('/auth/me/password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
      setErrors({});
      toast.success('Senha alterada com sucesso.');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Minha conta" icon={<UserRound className="h-4 w-4" aria-hidden />} title="Meu perfil" description={user?.email} />
      <div className="space-y-6">
        <section className="card p-6" aria-labelledby="perfil-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="perfil-title" className="text-xl font-semibold text-ink">
              Seu perfil na plataforma
            </h2>
            {user && <Badge tone={user.role === 'ADMIN' ? 'admin' : 'accent'}>{ROLE_LABEL[user.role]}</Badge>}
          </div>
          {user && <p className="mt-2 text-sm text-ink-muted">{ROLE_DESCRIPTION[user.role]}</p>}

          {/* O plano é informativo aqui: ativar é decisão da administração, e
              não existe compra de assinatura — nem vai existir. */}
          {user && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <span className="eyebrow text-ink-subtle">Plano</span>
              <Badge tone={user.plan === 'PREMIUM' ? 'accent' : 'muted'}>
                {user.plan === 'PREMIUM' ? 'Premium' : 'Gratuito'}
              </Badge>
              {user.plan === 'PREMIUM'
                ? 'Você lê as obras com publicidade sem anúncios. Obras pagas continuam exigindo aquisição.'
                : 'As obras que a autoria monetiza por publicidade exibem anúncios. O plano é alterado pela administração.'}
            </p>
          )}

          {user?.role === 'LEITOR' && (
            <div className="mt-5 rounded-xl border border-primary/40 bg-primary-container/40 p-4">
              {redirecionado && (
                <p className="mb-2 text-sm font-semibold text-ink">
                  Essa página é da área de escritor. Ative o perfil abaixo para entrar nela.
                </p>
              )}
              <p className="text-sm text-ink">
                Quer publicar suas próprias obras? Ative o perfil de escritor. Você continua lendo e avaliando
                normalmente; só ganha a possibilidade de cadastrar e enviar obras para a curadoria.
              </p>
              <button type="button" className="btn-primary mt-4" onClick={enableWriter} disabled={busy === 'role'}>
                {busy === 'role' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <SquarePen className="h-5 w-5" aria-hidden />}
                Ativar perfil de escritor
              </button>
            </div>
          )}
        </section>
        <form onSubmit={saveProfile} className="card space-y-5 p-6">
          <h2 className="text-xl font-semibold text-ink">Dados públicos</h2>
          <TextInput label="Nome" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={120} />
          <TextInput
            label="Como você se apresenta"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            error={errors.headline}
            maxLength={160}
            hint="Aparece junto às suas avaliações e mensagens à curadoria."
          />
          <button type="submit" className="btn-primary" disabled={busy === 'profile'}>
            Salvar perfil
          </button>
        </form>
        <form onSubmit={savePassword} className="card space-y-5 p-6">
          <h2 className="text-xl font-semibold text-ink">Alterar senha</h2>
          <TextInput label="Senha atual" type="password" autoComplete="current-password" required value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} error={errors.currentPassword} />
          <TextInput label="Nova senha" type="password" autoComplete="new-password" required value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} error={errors.newPassword} hint="Mínimo de 8 caracteres, com letras e números." />
          <TextInput label="Confirme a nova senha" type="password" autoComplete="new-password" required value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} error={errors.confirm} />
          <button type="submit" className="btn-primary" disabled={busy === 'password'}>
            Alterar senha
          </button>
        </form>
      </div>
    </div>
  );
}
