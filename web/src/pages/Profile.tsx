import { useState, type FormEvent } from 'react';
import { UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { api, errorMessage, fieldErrors } from '../lib/api';
import type { User } from '../types/api';
import { PageHeader, TextInput } from '../components/ui';
import { useToast } from '../components/ui/Toast';

/** Perfil do usuário: nome, apresentação e troca de senha. */
export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [headline, setHeadline] = useState(user?.headline ?? '');
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'profile' | 'password' | null>(null);

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
