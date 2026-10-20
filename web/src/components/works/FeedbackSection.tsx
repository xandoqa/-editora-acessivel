import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareHeart, Star } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useWorkFeedbacks } from '../../hooks/queries';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { Feedback, Work } from '../../types/api';
import { Avatar, Stars, TextArea, TextInput } from '../ui';
import { useToast } from '../ui/Toast';

/** "Voz dos Leitores": avaliações reais da obra + formulário para o leitor logado. */
export default function FeedbackSection({ work }: { work: Work }) {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const published = work.status === 'PUBLICADO';
  const { data: feedbacks = [] } = useWorkFeedbacks(work.id, published);
  const canRate = !!user && published && user.id !== work.author.id;
  const { data: mine } = useQuery({
    queryKey: ['me', 'feedback', work.id],
    queryFn: async () => (await api.get<Feedback | null>(`/works/${work.id}/feedbacks/mine`)).data,
    enabled: canRate,
  });
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [aspect, setAspect] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!mine) return;
    setRating(mine.rating);
    setContent(mine.content);
    setAspect(mine.aspect ?? '');
  }, [mine]);

  const mutation = useMutation({
    mutationFn: async () => (await api.post<Feedback>(`/works/${work.id}/feedbacks`, { rating, content, aspect })).data,
    onSuccess: () => {
      setErrors({});
      toast.success(mine ? 'Sua avaliação foi atualizada.' : 'Obrigado! Sua avaliação foi publicada.');
      void qc.invalidateQueries({ queryKey: ['feedbacks', work.id] });
      void qc.invalidateQueries({ queryKey: ['me', 'feedback', work.id] });
      void qc.invalidateQueries({ queryKey: ['work', work.id] });
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  if (!published) return null;

  return (
    <section className="card p-5" aria-labelledby="feedback-title">
      <h2 id="feedback-title" className="mb-4 flex items-center gap-2 text-xl font-semibold text-ink">
        <MessageSquareHeart className="h-5 w-5 text-accent" aria-hidden /> Voz dos Leitores
      </h2>

      {feedbacks.length === 0 ? (
        <p className="mb-4 text-sm text-ink-muted">Esta obra ainda não recebeu avaliações. Seja a primeira pessoa a avaliar!</p>
      ) : (
        <ul className="mb-5 space-y-3">
          {feedbacks.map((f) => (
            <li key={f.id} className="card-high p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={f.user.name} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{f.user.name}</p>
                    {f.user.headline && <p className="text-xs text-ink-subtle">{f.user.headline}</p>}
                  </div>
                </div>
                <Stars value={f.rating} size={14} />
              </div>
              <p className="text-sm italic text-ink-muted">“{f.content}”</p>
              <p className="mt-2 text-xs text-ink-subtle">
                {f.aspect ? `${f.aspect} · ` : ''}
                {formatDate(f.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!user ? (
        <p className="text-sm text-ink-muted">
          <Link to="/login" className="font-semibold text-primary underline">
            Entre na sua conta
          </Link>{' '}
          para avaliar esta obra.
        </p>
      ) : canRate ? (
        <form onSubmit={submit} className="space-y-4 border-t border-outline/50 pt-4">
          <fieldset>
            <legend className="label">{mine ? 'Atualizar minha avaliação' : 'Avaliar esta obra'}</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                  onClick={() => setRating(n)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-accent hover:bg-surface-high"
                >
                  <Star className={`h-6 w-6 ${n <= rating ? 'fill-current' : 'opacity-40'}`} aria-hidden />
                </button>
              ))}
            </div>
          </fieldset>
          <TextInput
            label="Recurso avaliado (opcional)"
            value={aspect}
            onChange={(e) => setAspect(e.target.value)}
            placeholder="Ex.: Audiodescrição, Tipografia, Navegação por teclado"
            maxLength={80}
            error={errors.aspect}
          />
          <TextArea
            label="Comentário"
            required
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            error={errors.content}
            aside={`${content.length}/1500`}
            maxLength={1500}
            hint="Conte como foi a experiência de leitura com os recursos de acessibilidade (mínimo de 10 caracteres)."
          />
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mine ? 'Atualizar avaliação' : 'Publicar avaliação'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-ink-subtle">Autores não podem avaliar as próprias obras.</p>
      )}
    </section>
  );
}
