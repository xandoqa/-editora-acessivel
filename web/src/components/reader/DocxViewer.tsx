import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { PALETTES, textStyle } from './readerPrefs';
import { blocosDoDocumentXml, paginar, type BlocoDocx, type TrechoDocx } from './docxParser';
import type { ViewerProps } from './types';
import { Spinner } from '../ui';

/**
 * Leitor de manuscritos .docx.
 *
 * É o formato em que quem escreve de verdade entrega o texto, e por isso o
 * mais importante do ponto de vista da proposta do projeto: baixar a barreira
 * para publicar. Também é o formato mais acessível do leitor — ao contrário do
 * PDF, que é página fixa, aqui o texto reflui e obedece à tipografia, ao
 * espaçamento e à escala que o leitor escolheu.
 *
 * Nada de HTML do arquivo chega à página: o parser devolve blocos tipados e
 * cada um vira um componente React. Ver docxParser.ts.
 */

function Trechos({ trechos }: { trechos: TrechoDocx[] }) {
  return (
    <>
      {trechos.map((t, i) => {
        if (t.negrito && t.italico) return <strong key={i}><em>{t.texto}</em></strong>;
        if (t.negrito) return <strong key={i}>{t.texto}</strong>;
        if (t.italico) return <em key={i}>{t.texto}</em>;
        return <span key={i}>{t.texto}</span>;
      })}
    </>
  );
}

function Bloco({ bloco, cor }: { bloco: BlocoDocx; cor: { text: string; muted: string; surface: string } }) {
  switch (bloco.tipo) {
    case 'titulo': {
      const Tag = (['h2', 'h3', 'h4'] as const)[bloco.nivel - 1];
      return (
        <Tag className="mb-2 mt-5 font-display font-extrabold first:mt-0" style={{ fontSize: `${1.5 - (bloco.nivel - 1) * 0.2}em`, color: cor.text }}>
          <Trechos trechos={bloco.trechos} />
        </Tag>
      );
    }
    case 'item':
      return (
        <li className="ml-5 list-disc" style={{ marginLeft: `${1.25 + bloco.nivel * 1.25}rem`, color: cor.text }}>
          <Trechos trechos={bloco.trechos} />
        </li>
      );
    case 'tabela':
      return (
        <div className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-[0.9em]">
            <tbody>
              {bloco.linhas.map((linha, i) => (
                <tr key={i}>
                  {linha.map((celula, j) => (
                    <td key={j} className="border p-2 align-top" style={{ borderColor: `${cor.muted}55`, color: cor.text }}>
                      {celula}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return (
        <p className="mb-3" style={{ color: cor.text }}>
          <Trechos trechos={bloco.trechos} />
        </p>
      );
  }
}

export default function DocxViewer({ data, page, onPageCount, prefs, title }: ViewerProps) {
  const [blocos, setBlocos] = useState<BlocoDocx[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setErro('');
    JSZip.loadAsync(data)
      .then(async (zip) => {
        const documento = zip.file('word/document.xml');
        if (!documento) throw new Error('sem document.xml');
        return documento.async('string');
      })
      .then((xml) => {
        if (!ativo) return;
        const lidos = blocosDoDocumentXml(xml);
        if (!lidos.length) throw new Error('documento vazio');
        setBlocos(lidos);
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível abrir este arquivo do Word. Baixe a obra para ler no seu computador.');
      });
    return () => {
      ativo = false;
    };
  }, [data]);

  const paginas = useMemo(() => (blocos ? paginar(blocos) : null), [blocos]);

  useEffect(() => {
    if (paginas) onPageCount(paginas.length);
  }, [paginas, onPageCount]);

  if (erro) return <p className="p-6 text-center text-danger">{erro}</p>;
  if (!paginas) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner label="Abrindo o manuscrito..." />
      </div>
    );
  }

  const palette = PALETTES[prefs.palette];
  const atual = paginas[Math.min(Math.max(1, page), paginas.length) - 1] ?? [];

  return (
    <article
      className="mx-auto max-w-[70ch] rounded-lg p-5 md:p-8"
      style={{ background: palette.surface, ...textStyle(prefs) }}
      aria-label={`Página ${page} de ${title}`}
    >
      {atual.map((bloco, i) =>
        bloco.tipo === 'item' ? (
          <ul key={i} className="mb-3">
            <Bloco bloco={bloco} cor={palette} />
          </ul>
        ) : (
          <Bloco key={i} bloco={bloco} cor={palette} />
        ),
      )}
    </article>
  );
}
