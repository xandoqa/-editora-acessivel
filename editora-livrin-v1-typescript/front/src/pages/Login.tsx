import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      // erro já fica disponível via useAuth().error
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="brand-mark" aria-hidden="true" style={{ margin: "0 auto" }}>
            📖
          </div>
          <span className="eyebrow" style={{ margin: "12px auto 0" }}>
            ACESSO EDITORIAL · WCAG 2.2 AAA
          </span>
          <h1>Editora Livrin</h1>
          <p>Publique sua história independente com acessibilidade universal</p>
        </div>

        {error && (
          <div className="form-alert" role="alert">
            <span aria-hidden="true">⚠️</span>
            <div>
              <strong>Falha na autenticação</strong>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <div className="field-label-row">
              <label htmlFor="email">E-mail do autor ou leitor</label>
              <span className="field-hint">Obrigatório</span>
            </div>
            <div className="input-shell">
              <span aria-hidden="true">@</span>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="autor@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
              />
            </div>
          </div>

          <div className="field">
            <div className="field-label-row">
              <label htmlFor="password">Senha de acesso</label>
              <a href="#recuperar">Esqueceu a senha?</a>
            </div>
            <div className="input-shell">
              <span aria-hidden="true">🔒</span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar na Plataforma →"}
          </button>
        </form>

        <p className="auth-switch">
          Não possui uma conta? <Link to="/cadastro">Cadastre-se como autor ou leitor</Link>
        </p>

        <p className="auth-switch" style={{ marginTop: 4 }}>
          Conta de exemplo: marina@livrin.app / livrin123
        </p>
      </div>
    </div>
  );
}
