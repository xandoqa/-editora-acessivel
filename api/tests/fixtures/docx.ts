/**
 * .docx mínimo, mas de verdade: um ZIP válido com `word/document.xml` dentro.
 *
 * A API não abre o arquivo — ela confere a extensão e a assinatura (um .docx
 * começa com `PK\x03\x04`, como todo ZIP) e guarda o original. Mesmo assim o
 * fixture é um ZIP legítimo, e não só os quatro bytes da assinatura: um fixture
 * que mente passa no teste de hoje e esconde a falha do dia em que alguém
 * decidir abrir o arquivo no servidor.
 *
 * O conteúdo segue o mesmo XML que o leitor do navegador interpreta — um título
 * de nível 1 e um parágrafo com itálico. Ver web/src/components/reader/docxParser.ts.
 */

function crc32(dados: Buffer): number {
  let c = ~0;
  for (let i = 0; i < dados.length; i++) {
    c ^= dados[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

/** ZIP sem compressão (método "stored"), que é tudo o que um .docx exige. */
function zipSemCompressao(entradas: [string, string][]): Buffer {
  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let deslocamento = 0;

  for (const [nome, texto] of entradas) {
    const nomeBytes = Buffer.from(nome, 'utf8');
    const dados = Buffer.from(texto, 'utf8');
    const crc = crc32(dados);

    const local = Buffer.alloc(30);
    local.write('PK\x03\x04', 0, 'latin1');
    local.writeUInt16LE(20, 4); // versão mínima
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(dados.length, 18); // tamanho comprimido
    local.writeUInt32LE(dados.length, 22); // tamanho original
    local.writeUInt16LE(nomeBytes.length, 26);
    locais.push(local, nomeBytes, dados);

    const central = Buffer.alloc(46);
    central.write('PK\x01\x02', 0, 'latin1');
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(dados.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nomeBytes.length, 28);
    central.writeUInt32LE(deslocamento, 42);
    centrais.push(central, nomeBytes);

    deslocamento += local.length + nomeBytes.length + dados.length;
  }

  const diretorio = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.write('PK\x05\x06', 0, 'latin1');
  fim.writeUInt16LE(entradas.length, 8);
  fim.writeUInt16LE(entradas.length, 10);
  fim.writeUInt32LE(diretorio.length, 12);
  fim.writeUInt32LE(deslocamento, 16);

  return Buffer.concat([...locais, diretorio, fim]);
}

const DOCUMENT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Capítulo um</w:t></w:r></w:p><w:p><w:r><w:t>Era uma </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>vez</w:t></w:r></w:p></w:body></w:document>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

export const DOCX_BYTES = zipSemCompressao([
  ['[Content_Types].xml', CONTENT_TYPES],
  ['word/document.xml', DOCUMENT_XML],
]);
