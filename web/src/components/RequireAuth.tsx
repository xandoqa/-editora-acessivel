import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LoadingState } from './ui';
import type { Role } from '../types/api';

/**
 * Protege rotas do front-end (redireciona para o login). É apenas conveniência de
 * navegação: a API valida token e papel em todas as rotas protegidas.
 */
export default function RequireAuth({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState label="Verificando sua sessão..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to="/" replace state={{ denied: true }} />;
  return <Outlet />;
}
