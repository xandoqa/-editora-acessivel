import { Link } from "react-router-dom";
import type { WorkSummary } from "../types/domain";

function accessibilityLabels(w: WorkSummary): string[] {
  const labels: string[] = [];
  if (w.accessibility.audiodescricao) labels.push("Audiodescrição");
  if (w.accessibility.altoContraste) labels.push("Alto contraste");
  if (w.accessibility.fontesAcessiveis) labels.push("Fontes acessíveis");
  if (w.accessibility.librasNosDialogos) labels.push("Libras");
  return labels.slice(0, 2);
}

export function WorkCard({ work }: { work: WorkSummary }) {
  return (
    <Link to={`/obras/${work.id}`} className="work-card">
      <div className="work-cover" style={{ background: work.coverColor }}>
        {work.wcagLevel && <span className="badge">WCAG {work.wcagLevel}</span>}
      </div>
      <div className="work-body">
        <span className="work-genre">{work.genre}</span>
        <span className="work-title">{work.title}</span>
        <p className="work-synopsis">{work.synopsis}</p>
        <div className="a11y-tags">
          {accessibilityLabels(work).map((label) => (
            <span key={label} className="a11y-pill">
              {label}
            </span>
          ))}
        </div>
        <div className="work-meta">
          <span>{work.pageCount}p</span>
          <span>{work.rating ? `★ ${work.rating.toFixed(1)}` : "Novo"}</span>
        </div>
      </div>
    </Link>
  );
}
