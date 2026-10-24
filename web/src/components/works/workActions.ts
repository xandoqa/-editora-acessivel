import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../../lib/api';
import type { Work } from '../../types/api';
import { useToast } from '../ui/Toast';

/**
 * Ações do autor sobre a obra (enviar para análise, excluir) com atualização
 * dos painéis.
 *
 * Não há mais ação de publicar: a aprovação da curadoria já coloca a obra no
 * catálogo (seção 8 da especificação).
 */
export function useWorkActions() {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = (id?: number) => {
    void qc.invalidateQueries({ queryKey: ['me'] });
    void qc.invalidateQueries({ queryKey: ['catalog'] });
    if (id) void qc.invalidateQueries({ queryKey: ['work', id] });
  };

  const submit = useMutation({
    mutationFn: async (id: number) => (await api.post<Work>(`/works/${id}/submit`)).data,
    onSuccess: (w) => {
      toast.success(`“${w.title}” foi enviada para a curadoria.`);
      refresh(w.id);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/works/${id}`),
    onSuccess: () => {
      toast.success('Obra excluída.');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return { submit, remove };
}
