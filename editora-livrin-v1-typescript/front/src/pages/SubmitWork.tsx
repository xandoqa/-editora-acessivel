import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitWork } from "../api/client";

const GENRES = [
  "Ficção",
  "Ficção Científica",
  "Ficção Histórica",
  "Drama",
  "Aventura",
  "Poesia",
  "Romance",
  "Jovem Adulto",
];

export function SubmitWorkPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [textoAlternativo, setTextoAlternativo] = useState(false);
  const [leitorDeTela, setLeitorDeTela] = useState(false);
  const [audiodescricao, setAudiodescricao] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitWork({
        title,
        genre,
        synopsis,
        pageCount: Number(pageCount),
        formats: ["PDF"],
        preExisting: { textoAlternativo, leitorDeTela, audiodescricao },
      });
      navigate(`/em-analise/${res.work.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a obra.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page page-narrow">
      <span className="eyebrow">SUBMISSÃO EDITORIAL</span>
      <h1 style={{ margin: "10px 0 4px" }}>Publicar meu livro ou quadrinho</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
        Envie seu manuscrito ou graphic novel para verificação técnica de acessibilidade
        (WCAG 2.2 AAA). Nossa curadoria revisa diagramação, contraste e camadas descritivas.
      </p>

      {error && (
        <div className="form-alert" role="alert">
          <span aria-hidden="true">⚠️</span>
          <div>
            <strong>Não foi possível enviar</strong>
            {error}
          </div>
        </div>
      )}

      <form className="form-card" onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>Informações da Publicação</h3>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor="title">Título do livro ou HQ</label>
            <span className="field-hint">{title.length}/120</span>
          </div>
          <div className="input-shell">
            <input
              id="title"
              required
              maxLength={120}
              placeholder="Meu livro incrível..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <div className="field-label-row">
              <label htmlFor="genre">Gênero literário</label>
            </div>
            <div className="input-shell">
              <select id="genre" required value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="" disabled>
                  Selecione uma categoria...
                </option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <div className="field-label-row">
              <label htmlFor="pages">Nº de páginas</label>
            </div>
            <div className="input-shell">
              <input
                id="pages"
                type="number"
                min={1}
                required
                placeholder="240"
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor="synopsis">Sinopse da obra</label>
            <span className="field-hint">Recomendado: 100 a 800 caracteres</span>
          </div>
          <div className="input-shell">
            <textarea
              id="synopsis"
              required
              minLength={100}
              maxLength={800}
              placeholder="Uma história sobre..."
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
            />
          </div>
        </div>

        <h3 style={{ marginBottom: 6 }}>Recursos de Acessibilidade Pré-existentes</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 0, marginBottom: 14 }}>
          Identifique os recursos já incorporados no seu arquivo para acelerar a aprovação.
        </p>

        <div className="checkbox-grid">
          <label className="checkbox-card">
            <input
              type="checkbox"
              checked={textoAlternativo}
              onChange={(e) => setTextoAlternativo(e.target.checked)}
            />
            <span>
              <strong>Texto alternativo nas imagens / quadrinhos</strong>
              Descrições semânticas em todos os quadros e balões.
            </span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              checked={leitorDeTela}
              onChange={(e) => setLeitorDeTela(e.target.checked)}
            />
            <span>
              <strong>Arquivo compatível com leitores de tela</strong>
              Estrutura de títulos H1–H6 com ordem de leitura lógica.
            </span>
          </label>

          <label className="checkbox-card">
            <input
              type="checkbox"
              checked={audiodescricao}
              onChange={(e) => setAudiodescricao(e.target.checked)}
            />
            <span>
              <strong>Audiodescrição disponível</strong>
              Faixa de áudio sintetizada ou gravada em voz humana.
            </span>
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
            🔒 Seus direitos autorais permanecem 100% sob seu controle.
          </span>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar para análise ▷"}
          </button>
        </div>
      </form>
    </div>
  );
}
