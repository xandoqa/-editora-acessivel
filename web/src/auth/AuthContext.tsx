import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, safeStorage, setUnauthorizedListener, TOKEN_KEY } from '../lib/api';
import type { User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  /** true enquanto valida o token salvo com a API na abertura do app. */
  loading: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = 'livrin_user';

/**
 * Sessão do usuário. O token JWT fica no localStorage e é enviado no header
 * Authorization pelo cliente HTTP. Ao abrir o app, o perfil é revalidado em
 * /auth/me — se a conta foi desativada ou o token expirou, a sessão é encerrada.
 * Importante: esconder menus aqui é só conveniência; quem garante a permissão é a API.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(() => {
    const stored = safeStorage.get(USER_KEY);
    try {
      return stored && safeStorage.get(TOKEN_KEY) ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => !!safeStorage.get(TOKEN_KEY));

  const logout = useCallback(() => {
    safeStorage.remove(TOKEN_KEY);
    safeStorage.remove(USER_KEY);
    setUser(null);
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === 'me' || q.queryKey[0] === 'admin' });
  }, [queryClient]);

  const login = useCallback(
    (token: string, nextUser: User) => {
      safeStorage.set(TOKEN_KEY, token);
      safeStorage.set(USER_KEY, JSON.stringify(nextUser));
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === 'me' || q.queryKey[0] === 'admin' });
      setUser(nextUser);
    },
    [queryClient],
  );

  const updateUser = useCallback((nextUser: User) => {
    safeStorage.set(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  useEffect(() => {
    setUnauthorizedListener(logout);
    return () => setUnauthorizedListener(null);
  }, [logout]);

  useEffect(() => {
    if (!safeStorage.get(TOKEN_KEY)) return;
    let active = true;
    api
      .get<{ user: User }>('/auth/me')
      .then((res) => active && updateUser(res.data.user))
      .catch(() => active && logout())
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [logout, updateUser]);

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'ADMIN', login, logout, updateUser }),
    [user, loading, login, logout, updateUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
