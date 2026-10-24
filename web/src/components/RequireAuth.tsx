import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { hasAtLeast } from '../lib/labels';
import { LoadingState } from './ui';
import type { Role } from '../types/api';

/**
 * Protege rotas do front-end (redireciona para o login). `role` é o papel
 * MÍNIMO exigido, seguindo a hierarquia leitor → escritor → administrador.
 *
 * É apenas conveniência de navegação: quem garante a permissão é a API, que
 * valida token e papel em todas as rotas protegidas.
 */
export default function RequireAuth({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState label="Verificando sua sessão..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && !hasAtLeast(user.role, role)) {
    // Leitor tentando a área de escritor: o perfil é ativado em "Meu perfil".
    const to = role === 'ESCRITOR' ? '/profile' : '/';
    return <Navigate to={to} replace state={{ deniedRole: role }} />;
  }
  return <Outlet />;
}
