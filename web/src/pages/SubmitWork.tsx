import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpenCheck, Save, ShieldCheck } from 'lucide-react';
import { api, errorMessage, fieldErrors } from '../lib/api';
import type { Work } from '../types/api';
import WorkForm from '../components/works/WorkForm';
import { PageHeader } from '../components/ui';
import { useToast } from '../components/ui/Toast';

export default function SubmitWork() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const onSubmit = async (data: FormData, action: string) => {
    data.append('action', action);
    setBusy(true);
    setErrors({});
    setProgress(0);
    try {
      const { data: work } = await api.post<Work>('/works', data, {
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      void qc.invalidateQueries({ queryKey: ['me'] });
      if (action === 'submit') {
        toast.success('Obra enviada para análise! Acompanhe a curadoria em tempo real.');
        navigate(`/review/${work.id}`);
      } else {
        toast.success('Rascunho salvo. Você pode continuar o envio quando quiser.');
        navigate(`/works/${work.id}/edit`);
      }
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, 'Erro ao enviar obra. Verifique os campos.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Submissão editorial"
        icon={<BookOpenCheck className="h-4 w-4" aria-hidden />}
        title="Publicar meu livro ou quadrinho"
        description="Envie seu manuscrito ou graphic novel para verificação técnica de acessibilidade (WCAG 2.2 AAA). Nossa curadoria revisa diagramação, contraste e camadas descritivas."
        actions={
          <span className="card-high flex items-center gap-2 px-4 py-2 text-sm font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-accent" aria-hidden />
            <span>
              Curadoria Inclusiva
              <br />
              <span className="text-xs font-normal text-ink-muted">Resposta em até 48h</span>
            </span>
          </span>
        }
      />
      <WorkForm
        errors={errors}
        busy={busy}
        uploadProgress={progress}
        onSubmit={onSubmit}
        actions={[
          { action: 'draft', label: 'Salvar rascunho', variant: 'secondary', icon: <Save className="h-5 w-5" aria-hidden /> },
          { action: 'submit', label: 'Enviar para análise', variant: 'primary', requiresFile: true },
        ]}
      />
    </div>
  );
}
