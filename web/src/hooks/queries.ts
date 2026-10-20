import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type {
  AudioDescription,
  AuthorDashboard,
  CatalogResponse,
  Feedback,
  Genre,
  MySummary,
  MyWork,
  Review,
  Work,
} from '../types/api';

/** Hooks de leitura (React Query). Chaves começando com 'me'/'admin' são limpas no logout. */

export interface CatalogParams {
  q?: string;
  format?: string;
  feature?: string;
  genreId?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function useCatalog(params: CatalogParams) {
  return useQuery({
    queryKey: ['catalog', params],
    queryFn: async () => (await api.get<CatalogResponse>('/works', { params })).data,
    placeholderData: keepPreviousData,
  });
}

export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: async () => (await api.get<Genre[]>('/genres')).data,
    staleTime: 5 * 60_000,
  });
}

export function useWork(id: number | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['work', id, user?.id ?? 0],
    queryFn: async () => (await api.get<Work>(`/works/${id}`)).data,
    enabled: !!id,
  });
}

export function useAudioDescriptions(id: number | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['audio-descriptions', id, user?.id ?? 0],
    queryFn: async () => (await api.get<AudioDescription[]>(`/works/${id}/audio-descriptions`)).data,
    enabled: !!id,
  });
}

export function useWorkFeedbacks(id: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['feedbacks', id],
    queryFn: async () => (await api.get<Feedback[]>(`/works/${id}/feedbacks`)).data,
    enabled: !!id && enabled,
  });
}

export function useMySummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'summary', user?.id],
    queryFn: async () => (await api.get<MySummary>('/me/summary')).data,
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useMyWorks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'works', user?.id],
    queryFn: async () => (await api.get<MyWork[]>('/me/works')).data,
    enabled: !!user,
  });
}

export function useMyDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'dashboard', user?.id],
    queryFn: async () => (await api.get<AuthorDashboard>('/me/dashboard')).data,
    enabled: !!user,
  });
}

export function useReview(id: number | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'review', id, user?.id],
    queryFn: async () => (await api.get<Review>(`/works/${id}/review`)).data,
    enabled: !!id && !!user,
  });
}
