import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';
import { useT } from '../i18n/I18nContext';

export default function NotFound() {
  const t = useT();
  return (
    <EmptyState
      title={t('erro.naoEncontrada')}
      description={t('erro.naoEncontradaTexto')}
      action={
        <Link to="/" className="btn-primary">
          {t('erro.voltarCatalogo')}
        </Link>
      }
    />
  );
}
