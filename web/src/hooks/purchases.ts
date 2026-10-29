import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type {
  CardInput,
  ItemDoHistorico,
  PlanoOpcoes,
  LibraryItem,
  PaymentMethod,
  Purchase,
  PurchaseHistoryItem,
  PurchaseResult,
} from '../types/api';

/**
 * Aquisição de obras pagas.
 *
 * Repare no que `abrirCobranca` NÃO envia: valor. O preço é lido da obra no
 * servidor. A tela mostra o preço para a pessoa conferir antes de pagar — mas
 * mostrar não é o mesmo que mandar, e é por isso que mexer no navegador não
 * muda o que será cobrado.
 */

/** Biblioteca pessoal: as obras que a pessoa adquiriu. */
export function useMyLibrary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'library', user?.id],
    queryFn: async () => (await api.get<LibraryItem[]>('/me/library')).data,
    enabled: !!user,
  });
}

/** Histórico de compras, com todos os estados. */
export function useMyPurchases() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'purchases', user?.id],
    queryFn: async () => (await api.get<PurchaseHistoryItem[]>('/me/purchases')).data,
    enabled: !!user,
  });
}

/** Acompanha uma cobrança aberta (para o PIX e o boleto mostrarem o estado). */
export function usePurchase(id: number | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['purchase', id, user?.id ?? 0],
    queryFn: async () => (await api.get<Purchase>(`/purchases/${id}`)).data,
    enabled: !!id && !!user,
  });
}

export function useAbrirCobranca(workId: number) {
  return useMutation({
    mutationFn: async (input: { method: PaymentMethod; card?: CardInput }) =>
      (await api.post<PurchaseResult>(`/works/${workId}/purchase`, input)).data,
  });
}

export function useConfirmarCobranca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (purchaseId: number) => (await api.post<Purchase>(`/purchases/${purchaseId}/confirm`)).data,
    onSuccess: (purchase) => {
      // Confirmou: a biblioteca mudou, e a obra pode ter acabado de abrir.
      void qc.invalidateQueries({ queryKey: ['me', 'library'] });
      void qc.invalidateQueries({ queryKey: ['me', 'purchases'] });
      void qc.invalidateQueries({ queryKey: ['work', purchase.workId] });
    },
  });
}

export function useCancelarCobranca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (purchaseId: number) => (await api.post<Purchase>(`/purchases/${purchaseId}/cancel`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me', 'purchases'] });
    },
  });
}

/* ----------------------------- Histórico de leitura ---------------------------- */

export function useReadingHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'reading-history', user?.id],
    queryFn: async () => (await api.get<ItemDoHistorico[]>('/me/reading-history')).data,
    enabled: !!user,
  });
}

export function useApagarHistorico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.delete<{ removidas: number }>('/me/reading-history')).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me', 'reading-history'] });
    },
  });
}

/* -------------------------------- Plano premium -------------------------------- */

export function usePlanoOpcoes() {
  return useQuery({
    queryKey: ['plans', 'options'],
    queryFn: async () => (await api.get<PlanoOpcoes>('/plans/options')).data,
  });
}

export function useAssinarPlano() {
  return useMutation({
    mutationFn: async (input: { method: PaymentMethod; card?: CardInput }) =>
      (await api.post<PurchaseResult>('/me/plan/subscribe', input)).data,
  });
}

export function useCancelarPlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<{ plan: string }>('/me/plan/cancel')).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
