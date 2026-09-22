import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchWork } from "../api/client";
import type { WorkSummary } from "../types/domain";

export function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<WorkSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchWork(id)
      .then((res) => setWork(res.work))
      .catch((err) => setError(err instanceof Error ? err.message : "Obra não encontrada."));
  }, [id]);

  if (error) {
    return (
      <div className="page page-narrow">
        <div className="state-message">{error}</div>
        <Link to="/" className="btn btn-ghost">
          ← Voltar ao catálogo
        </Link>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="page">
        <div className="state-message">
          <div className="spinner" />
          Carregando obra...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/" className="btn btn-ghost" style={{ marginBottom: 20 }}>
        ← Voltar ao catálogo
      </Link>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        <div
          style={{
            width: 220,
            height: 300,
            borderRadius: 14,
            background: work.coverColor,
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 280 }}>
          <span className="eyebrow">{work.genre.toUpperCase()}</span>
          <h1 style={{ fontSize: 28, margin: "10px 0 4px" }}>{work.title}</h1>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
            {work.pageCount} páginas
            {work.rating ? ` · ★ ${work.rating.toFixed(1)}` : ""}
            {work.wcagLevel ? ` · WCAG ${work.wcagLevel}` : ""}
          </div>

          <div className="a11y-tags" style={{ marginBottom: 20 }}>
            {work.accessibility.audiodescricao && <span className="a11y-pill">🎧 Audiodescrição</span>}
            {work.accessibility.altoContraste && <span className="a11y-pill">◐ Alto contraste</span>}
            {work.accessibility.fontesAcessiveis && <span className="a11y-pill">🔤 Fontes acessíveis</span>}
            {work.accessibility.librasNosDialogos && <span className="a11y-pill">🤟 Libras</span>}
            {work.accessibility.leitorDeTela && <span className="a11y-pill">🖥 Leitor de tela</span>}
          </div>

          <button className="btn btn-primary">▶ Iniciar Leitura Acessível</button>

          <h3 style={{ marginTop: 28, fontSize: 15 }}>Sinopse</h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7, fontSize: 14.5, maxWidth: 640 }}>
            {work.synopsis}
          </p>

          <h3 style={{ marginTop: 20, fontSize: 15 }}>Formatos disponíveis</h3>
          <div className="a11y-tags">
            {work.formats.map((f) => (
              <span key={f} className="a11y-pill">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
