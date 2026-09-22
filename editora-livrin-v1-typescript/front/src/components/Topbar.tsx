import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="brand-mark" aria-hidden="true">
          📖
        </span>
        <span className="brand-text">
          <strong>Livrin</strong>
          <span>Quadrinhos Acessíveis</span>
        </span>
      </Link>

      <div className="topbar-search" role="search">
        <span aria-hidden="true">🔍</span>
        <input
          type="search"
          placeholder="Buscar HQs, graphic novels, autores e obras com audiodescrição..."
          aria-label="Buscar no catálogo"
        />
      </div>

      <nav className="topbar-nav">
        {user ? (
          <>
            {user.role === "autor" && (
              <>
                <Link to="/painel" className="btn btn-ghost">
                  Meu Painel
                </Link>
                <Link to="/publicar" className="btn btn-primary">
                  + Publique sua obra
                </Link>
              </>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout();
                navigate("/entrar");
              }}
            >
              Sair ({user.name.split(" ")[0]})
            </button>
          </>
        ) : (
          <Link to="/entrar" className="btn btn-primary">
            Entrar / Cadastrar
          </Link>
        )}
      </nav>
    </header>
  );
}
