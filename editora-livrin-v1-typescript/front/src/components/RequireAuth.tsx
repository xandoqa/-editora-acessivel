import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="state-message">
        <div className="spinner" />
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/entrar" replace />;
  }

  return <>{children}</>;
}
