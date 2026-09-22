import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register, setToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"autor" | "leitor">("leitor");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await register({ name, email, password, role });
      setToken(res.token);
      // reaproveita o fluxo de login para popular o contexto com o usuário atual
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar.");
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
          <h1>Cadastre-se na Livrin</h1>
          <p>Crie sua conta como autor(a) ou leitor(a)</p>
        </div>

        {error && (
          <div className="form-alert" role="alert">
            <span aria-hidden="true">⚠️</span>
            <div>
              <strong>Não foi possível concluir o cadastro</strong>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <div className="field-label-row">
              <label htmlFor="name">Nome completo</label>
            </div>
            <div className="input-shell">
              <input
                id="name"
                required
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <div className="field-label-row">
              <label htmlFor="reg-email">E-mail</label>
            </div>
            <div className="input-shell">
              <input
                id="reg-email"
                type="email"
                required
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <div className="field-label-row">
              <label htmlFor="reg-password">Senha</label>
            </div>
            <div className="input-shell">
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                placeholder="mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <div className="field-label-row">
              <label htmlFor="role">Quero me cadastrar como</label>
            </div>
            <div className="input-shell">
              <select id="role" value={role} onChange={(e) => setRole(e.target.value as "autor" | "leitor")}>
                <option value="leitor">Leitor(a)</option>
                <option value="autor">Autor(a) / Quadrinista</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Criando conta..." : "Criar minha conta"}
          </button>
        </form>

        <p className="auth-switch">
          Já tem uma conta? <Link to="/entrar">Entrar na plataforma</Link>
        </p>
      </div>
    </div>
  );
}
