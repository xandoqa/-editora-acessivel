import { Link } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import AuthShell from './AuthShell';

/**
 * A plataforma ainda não envia e-mails (não há servidor SMTP configurado), então
 * a recuperação de acesso é feita pela administração, que pode redefinir a senha
 * na área administrativa. Ver docs/authentication.md.
 */
export default function ForgotPassword() {
  return (
    <AuthShell subtitle="Recupere o acesso à sua conta">
      <div className="rounded-xl bg-surface-high p-5">
        <div className="flex gap-3">
          <LifeBuoy className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
          <div className="space-y-3 text-sm text-ink-muted">
            <p className="font-semibold text-ink">Como recuperar sua senha</p>
            <p>
              Por segurança, a redefinição de senha é feita pela equipe de acessibilidade da Livrin. Entre em contato com a administração
              informando o e-mail cadastrado: uma nova senha temporária será definida para você.
            </p>
            <p>Depois de entrar, altere a senha em <strong className="text-ink">Meu perfil</strong>.</p>
          </div>
        </div>
      </div>
      <Link to="/login" className="btn-secondary mt-5 w-full">
        Voltar para o login
      </Link>
    </AuthShell>
  );
}
