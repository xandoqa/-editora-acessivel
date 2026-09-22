import { useEffect, useMemo, useState } from "react";
import { fetchCatalog } from "../api/client";
import { WorkCard } from "../components/WorkCard";
import type { WorkSummary } from "../types/domain";

const FILTERS = [
  { key: "todos", label: "Todos os Títulos" },
  { key: "ficção", label: "Ficção" },
  { key: "ficção científica", label: "Ficção Científica" },
  { key: "drama", label: "Drama" },
  { key: "aventura", label: "Aventura" },
  { key: "poesia", label: "Poesia" },
];

export function CatalogPage() {
  const [works, setWorks] = useState<WorkSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("todos");

  useEffect(() => {
    let cancelled = false;
    setWorks(null);
    fetchCatalog({ genre: activeFilter === "todos" ? undefined : activeFilter })
      .then((res) => {
        if (!cancelled) setWorks(res.works);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar catálogo.");
      });
    return () => {
      cancelled = true;
    };
  }, [activeFilter]);

  const count = useMemo(() => works?.length ?? 0, [works]);

  return (
    <div className="page">
      <div className="hero-banner">
        <div className="hero-banner-text">
          <span className="eyebrow">CATÁLOGO EDITORIAL ABERTO · {count} títulos inclusivos</span>
          <h1>Leituras em destaque</h1>
          <p>
            Histórias plurais que todo mundo pode ler e sentir. Narrativas visuais independentes
            com tecnologia assistiva integrada, audiodescrição imersiva e tipografia universal.
          </p>
          <div className="hero-tags">
            <span>🎧 Audiodescrição nativa</span>
            <span>🔤 Compatível com leitores de tela</span>
            <span>🤟 Janela de Libras</span>
          </div>
        </div>
      </div>

      <div className="filter-row" role="tablist" aria-label="Filtrar por gênero">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={activeFilter === f.key}
            className={`filter-chip ${activeFilter === f.key ? "active" : ""}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="section-heading">
        <h2>Exibindo {count} obras</h2>
      </div>

      {error && <div className="state-message">{error}</div>}

      {!error && works === null && (
        <div className="state-message">
          <div className="spinner" />
          Carregando catálogo...
        </div>
      )}

      {!error && works !== null && works.length === 0 && (
        <div className="state-message">Nenhuma obra encontrada para este filtro.</div>
      )}

      {works && works.length > 0 && (
        <div className="work-grid">
          {works.map((w) => (
            <WorkCard key={w.id} work={w} />
          ))}
        </div>
      )}
    </div>
  );
}
