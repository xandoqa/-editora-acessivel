import type {
  AuthorStats,
  PublicUser,
  Work,
  WorkSummary,
} from "../types/domain";

const TOKEN_KEY = "livrin:token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(body?.error ?? "Erro inesperado ao falar com a API.", res.status);
  }
  return body as T;
}

// --- Auth ---

export function login(email: string, password: string) {
  return request<{ token: string; user: PublicUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(input: {
  name: string;
  email: string;
  password: string;
  role: "autor" | "leitor";
}) {
  return request<{ token: string; user: PublicUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchMe() {
  return request<{ user: PublicUser }>("/auth/me");
}

// --- Works ---

export function fetchCatalog(params?: { genre?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params?.genre) search.set("genre", params.genre);
  if (params?.q) search.set("q", params.q);
  const qs = search.toString();
  return request<{ total: number; works: WorkSummary[] }>(`/works${qs ? `?${qs}` : ""}`);
}

export function fetchWork(id: string) {
  return request<{ work: WorkSummary }>(`/works/${id}`);
}

export function submitWork(input: {
  title: string;
  genre: string;
  synopsis: string;
  pageCount: number;
  formats: string[];
  preExisting: {
    textoAlternativo: boolean;
    leitorDeTela: boolean;
    audiodescricao: boolean;
  };
}) {
  return request<{ work: Work }>("/works", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchDashboard() {
  return request<{ stats: AuthorStats; works: Work[] }>("/works/me/dashboard");
}

export function fetchPending() {
  return request<{ works: Work[] }>("/works/me/pending");
}

export function fetchReview(id: string) {
  return request<{ work: Work }>(`/works/me/${id}/review`);
}
