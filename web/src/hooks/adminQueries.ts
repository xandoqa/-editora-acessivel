import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  AdminDonation,
  AdminDonationStats,
  AdminStats,
  AdminUser,
  AdminUserDetail,
  AdminWorkDetail,
  Feedback,
  Genre,
  Paginated,
  Work,
} from '../types/api';

/** Consultas da área administrativa (todas exigem ADMIN na API). */

type Params = Record<string, string | number | undefined>;
const clean = (p: Params) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''));

export const useAdminStats = () =>
  useQuery({ queryKey: ['admin', 'stats'], queryFn: async () => (await api.get<AdminStats>('/admin/stats')).data });

export const useAdminWorks = (params: Params) =>
  useQuery({
    queryKey: ['admin', 'works', params],
    queryFn: async () => (await api.get<Paginated<Work>>('/admin/works', { params: clean(params) })).data,
    placeholderData: keepPreviousData,
  });

export const useAdminWork = (id: number | undefined) =>
  useQuery({
    queryKey: ['admin', 'work', id],
    queryFn: async () => (await api.get<AdminWorkDetail>(`/admin/works/${id}`)).data,
    enabled: !!id,
  });

export const useAdminUsers = (params: Params) =>
  useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => (await api.get<Paginated<AdminUser>>('/admin/users', { params: clean(params) })).data,
    placeholderData: keepPreviousData,
  });

export const useAdminUser = (id: number | undefined) =>
  useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: async () => (await api.get<AdminUserDetail>(`/admin/users/${id}`)).data,
    enabled: !!id,
  });

export const useAdminGenres = () =>
  useQuery({ queryKey: ['admin', 'genres'], queryFn: async () => (await api.get<Genre[]>('/admin/genres')).data });

export const useAdminFeedbacks = (params: Params) =>
  useQuery({
    queryKey: ['admin', 'feedbacks', params],
    queryFn: async () => (await api.get<Paginated<Feedback>>('/admin/feedbacks', { params: clean(params) })).data,
    placeholderData: keepPreviousData,
  });

export const useAdminDonations = (params: Params) =>
  useQuery({
    queryKey: ['admin', 'donations', params],
    queryFn: async () => (await api.get<Paginated<AdminDonation>>('/admin/donations', { params: clean(params) })).data,
    placeholderData: keepPreviousData,
  });

export const useAdminDonationStats = () =>
  useQuery({
    queryKey: ['admin', 'donation-stats'],
    queryFn: async () => (await api.get<AdminDonationStats>('/admin/donations/stats')).data,
  });
