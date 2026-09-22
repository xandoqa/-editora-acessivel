import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboard } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { AuthorStats, Work } from "../types/domain";

const STATUS_LABEL: Record<Work["status"], string> = {
  rascunho: "Rascunho em edição",
  em_analise: "Em análise",
  aprovada: "Aprovada pelo comitê",
  publicada: "Publicada",
  recusada: "Recusada",
};

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AuthorStats | null>(null);
  const [works, setWorks] = useState<Work[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then((res) => {
        setStats(res.stats);
        setWorks(res.works);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar painel."));
  }, []);

  return (
    <div className="page">
      <span className="eyebrow">PAINEL EDITORIAL DO AUTOR</span>
      <h1 style={{ margin: "10px 0 4px" }}>Olá, {user?.name}</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: 620, marginBottom: 26 }}>
        Acompanhe o impacto social, o ciclo de homologação de acessibilidade WCAG 2.2 e a
        distribuição das suas histórias em quadrinhos inclusivas.
      </p>

      {error && <div className="state-message">{error}</div>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Obras Ativas</div>
            <div className="stat-value">{stats.activeWorks}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Leitores Totais</div>
            <div className="stat-value">{stats.totalReaders.toLocaleString("pt-BR")}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Índice de Acessibilidade</div>
            <div className="stat-value">
              {stats.accessibilityIndex || "—"}
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>/5</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pronta para Lançar</div>
            <div className="stat-value">{stats.readyToLaunch}</div>
          </div>
        </div>
      )}

      <div className="section-heading">
        <h2>Acervo & Produções</h2>
        <Link to="/publicar" className="btn btn-primary">
          + Submeter Nova Obra
        </Link>
      </div>

      {works === null && !error && (
        <div className="state-message">
          <div className="spinner" />
          Carregando obras...
        </div>
      )}

      {works && works.length === 0 && (
        <div className="state-message">
          Você ainda não publicou nenhuma obra.{" "}
          <Link to="/publicar" style={{ color: "var(--accent-hover)" }}>
            Publique a primeira agora
          </Link>
          .
        </div>
      )}

      {works?.map((w) => (
        <div className="work-row" key={w.id}>
          <div className="work-row-cover" style={{ background: w.coverColor }} />
          <div className="work-row-info">
            <div className="work-row-title">{w.title}</div>
            <div className="work-row-meta">
              {w.genre} · {w.pageCount} páginas
              {w.status === "publicada" ? ` · ${w.readCount.toLocaleString("pt-BR")} leituras` : ""}
            </div>
          </div>
          <span className={`status-badge status-${w.status}`}>{STATUS_LABEL[w.status]}</span>
          {w.status === "em_analise" && (
            <Link to={`/em-analise/${w.id}`} className="btn btn-ghost">
              Acompanhar
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
