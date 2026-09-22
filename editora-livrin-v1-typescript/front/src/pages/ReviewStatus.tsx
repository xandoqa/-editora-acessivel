import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchReview } from "../api/client";
import type { Work } from "../types/domain";

const STAGE_ICON: Record<string, string> = {
  concluido: "✓",
  em_andamento: "↻",
  pendente: "",
};

export function ReviewStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchReview(id)
      .then((res) => setWork(res.work))
      .catch((err) => setError(err instanceof Error ? err.message : "Obra não encontrada."));
  }, [id]);

  if (error) {
    return (
      <div className="page page-narrow">
        <div className="state-message">{error}</div>
        <Link to="/painel" className="btn btn-ghost">
          ← Voltar ao painel
        </Link>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="page">
        <div className="state-message">
          <div className="spinner" />
          Carregando status editorial...
        </div>
      </div>
    );
  }

  const currentStage = work.reviewStages.findIndex((s) => s.status !== "concluido") + 1;

  return (
    <div className="page">
      <span className="eyebrow">FLUXO DE AVALIAÇÃO EDITORIAL</span>
      <h1 style={{ margin: "10px 0 4px" }}>{work.title}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 26, maxWidth: 620 }}>
        Acompanhe em tempo real as validações de conteúdo, diagramação inclusiva e testes de
        audiodescrição para publicação na plataforma.
      </p>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px" }}>
          <div className="section-heading">
            <h2>Etapas da análise</h2>
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
              Etapa {currentStage || work.reviewStages.length} de {work.reviewStages.length}
            </span>
          </div>

          {work.reviewStages.map((stage) => (
            <div className="review-stage" key={stage.id}>
              <div className={`review-stage-dot ${stage.status}`}>
                {STAGE_ICON[stage.status] || stage.id}
              </div>
              <div>
                <h4>{stage.title}</h4>
                {stage.detail && <p>{stage.detail}</p>}
              </div>
            </div>
          ))}

          {work.reviewNotes.length > 0 && (
            <>
              <div className="section-heading" style={{ marginTop: 10 }}>
                <h2>Notas dos Pareceristas</h2>
              </div>
              {work.reviewNotes.map((note) => (
                <div key={note.id} className="stat-card" style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{note.authorName}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 8 }}>
                    {note.authorRole}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {note.message}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ width: 260, flexShrink: 0 }}>
          <div className="stat-card" style={{ marginBottom: 14 }}>
            <div style={{ width: "100%", height: 100, borderRadius: 8, background: work.coverColor, marginBottom: 12 }} />
            <div className="work-row-title">{work.title}</div>
            <div className="work-row-meta">{work.genre} · {work.pageCount} páginas</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Audiodescrição</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{work.audiodescricaoProgress}%</div>
          </div>

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 14 }}
            disabled
            title="Liberado automaticamente após a aprovação da última etapa"
          >
            Publicar (aguardando aprovação)
          </button>
        </div>
      </div>
    </div>
  );
}
