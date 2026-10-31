import { Link } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import AuthShell from './AuthShell';
import { useT } from '../../i18n/I18nContext';

/**
 * A plataforma ainda não envia e-mails (não há servidor SMTP configurado), então
 * a recuperação de acesso é feita pela administração, que pode redefinir a senha
 * na área administrativa. Ver docs/authentication.md.
 */
export default function ForgotPassword() {
  const t = useT();
  return (
    <AuthShell subtitle={t('auth.recuperarSubtitulo')}>
      <div className="rounded-xl bg-surface-high p-5">
        <div className="flex gap-3">
          <LifeBuoy className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
          <div className="space-y-3 text-sm text-ink-muted">
            <p className="font-semibold text-ink">{t('auth.comoRecuperar')}</p>
            <p>{t('auth.recuperarTexto')}</p>
            <p>
              {t('auth.depoisDeEntrar')} <strong className="text-ink">{t('conta.perfil')}</strong>.
            </p>
          </div>
        </div>
      </div>
      <Link to="/login" className="btn-secondary mt-5 w-full">
        {t('auth.voltarLogin')}
      </Link>
    </AuthShell>
  );
}
