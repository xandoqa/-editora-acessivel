import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '../types/api';

/**
 * Cliente HTTP único. Por padrão usa caminho relativo (/api): em desenvolvimento
 * o Vite faz proxy para a API e em produção o Nginx faz o mesmo. Para apontar
 * para outra origem, defina VITE_API_URL no build.
 */
export const TOKEN_KEY = 'livrin_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60_000,
});

api.interceptors.request.use((config) => {
  const token = safeStorage.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Notifica o AuthContext quando a sessão expira (401) para limpar o login. */
type UnauthorizedListener = () => void;
let onUnauthorized: UnauthorizedListener | null = null;
export function setUnauthorizedListener(fn: UnauthorizedListener | null) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiErrorBody>) => {
    const isAuthRoute = error.config?.url?.startsWith('/auth/login') || error.config?.url?.startsWith('/auth/register');
    if (error.response?.status === 401 && !isAuthRoute && safeStorage.get(TOKEN_KEY)) onUnauthorized?.();
    return Promise.reject(error);
  },
);

export interface FieldError {
  field: string;
  message: string;
}

/** Extrai uma mensagem amigável de qualquer erro da API. */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    return error.response.data?.error?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

/** Erros por campo (validação 400) para exibir junto aos inputs. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return {};
  const details = error.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries((details as FieldError[]).filter((d) => d?.field).map((d) => [d.field, d.message]));
}

/** localStorage com try/catch (modo privado ou armazenamento bloqueado não quebram o app). */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignora */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignora */
    }
  },
};

/** Baixa um arquivo autenticado e dispara o "Salvar como" do navegador. */
export async function downloadAuthenticated(url: string, filename: string) {
  const res = await api.get<Blob>(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
