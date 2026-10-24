#!/usr/bin/env python3
"""
Gera os arquivos das obras de demonstração a partir dos textos em
`ferramentas/historias/`.

Por que gerar em vez de versionar o binário pronto: o conteúdo é original e
escrito para o projeto, e deixar a fonte em texto puro torna a autoria
verificável, o texto corrigível e o arquivo reproduzível. Também garante o que
mais importa aqui — que o PDF tenha **texto de verdade**, e não uma imagem de
texto. Um PDF escaneado é ilegível para leitor de tela, e numa plataforma de
acessibilidade isso seria contradizer a própria proposta.

Uso:
    python3 ferramentas/gerar-obras.py api/seed-assets/works

Requer: reportlab (PDF) e Pillow (páginas de quadrinho).
    pip install reportlab pillow

Formato dos textos de entrada:
    # Título
    @ Autoria
    = Linha de apoio (gênero, formato)
    ## Título de capítulo
    Parágrafos separados por linha em branco.

Para quadrinhos, cada `## N` abre uma página, com:
    [CENA] descrição do quadro        → vira a arte e o texto alternativo
    [LEGENDA] texto de caixa
    [FALA] Personagem: fala
"""
from __future__ import annotations

import os
import re
import sys
import zipfile
from dataclasses import dataclass, field

# --------------------------------------------------------------------------
# Leitura do formato
# --------------------------------------------------------------------------


@dataclass
class Bloco:
    tipo: str  # 'capitulo' | 'paragrafo' | 'cena' | 'legenda' | 'fala'
    texto: str
    quem: str = ''


@dataclass
class Obra:
    titulo: str = ''
    autoria: str = ''
    apoio: str = ''
    sinopse: str = ''
    blocos: list[Bloco] = field(default_factory=list)

    @property
    def paginas_hq(self) -> list[list[Bloco]]:
        """Agrupa os blocos por página, para os quadrinhos."""
        paginas: list[list[Bloco]] = []
        for b in self.blocos:
            if b.tipo == 'capitulo':
                paginas.append([])
            elif paginas:
                paginas[-1].append(b)
        return [p for p in paginas if p]


def ler(caminho: str) -> Obra:
    obra = Obra()
    buffer: list[str] = []

    def fecha_paragrafo():
        if buffer:
            obra.blocos.append(Bloco('paragrafo', ' '.join(buffer).strip()))
            buffer.clear()

    for linha in open(caminho, encoding='utf-8').read().splitlines():
        crua = linha.rstrip()
        if not crua.strip():
            fecha_paragrafo()
            continue
        if crua.startswith('# '):
            obra.titulo = crua[2:].strip()
        elif crua.startswith('@ '):
            obra.autoria = crua[2:].strip()
        elif crua.startswith('= '):
            obra.apoio = crua[2:].strip()
        elif crua.startswith('% '):
            obra.sinopse = crua[2:].strip()
        elif crua.startswith('## '):
            fecha_paragrafo()
            obra.blocos.append(Bloco('capitulo', crua[3:].strip()))
        elif crua.startswith('[CENA]'):
            fecha_paragrafo()
            obra.blocos.append(Bloco('cena', crua[6:].strip()))
        elif crua.startswith('[LEGENDA]'):
            fecha_paragrafo()
            obra.blocos.append(Bloco('legenda', crua[9:].strip()))
        elif crua.startswith('[FALA]'):
            fecha_paragrafo()
            resto = crua[6:].strip()
            quem, _, fala = resto.partition(':')
            obra.blocos.append(Bloco('fala', fala.strip(), quem.strip()))
        else:
            buffer.append(crua.strip())
    fecha_paragrafo()
    return obra


# --------------------------------------------------------------------------
# PDF — com texto de verdade, selecionável e legível por leitor de tela
# --------------------------------------------------------------------------

PAPEL = (0.965, 0.953, 0.925)
TINTA = (0.09, 0.086, 0.102)


def gerar_pdf(obra: Obra, destino: str) -> None:
    from reportlab.lib.pagesizes import A5
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen import canvas as rl_canvas

    raiz = '/usr/share/fonts/truetype/dejavu'
    for nome, arq in [('Obra', 'DejaVuSerif.ttf'), ('Obra-Bold', 'DejaVuSerif-Bold.ttf'),
                      ('Apoio', 'DejaVuSans.ttf')]:
        if nome not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(nome, os.path.join(raiz, arq)))

    L, A = A5
    margem, topo, rodape = 20 * mm, 22 * mm, 18 * mm
    util = L - 2 * margem
    c = rl_canvas.Canvas(destino, pagesize=A5)
    c.setTitle(obra.titulo)
    c.setAuthor(obra.autoria)
    c.setSubject(obra.apoio)
    # Idioma do documento: leitor de tela precisa dele para escolher a voz.
    # A API do reportlab mudou de nome entre versões, então tentamos as duas
    # e seguimos sem o atributo se nenhuma existir — não vale derrubar a
    # geração inteira por causa de um campo de metadado.
    for metodo in ('setLang', 'setLanguage'):
        if hasattr(c, metodo):
            getattr(c, metodo)('pt-BR')
            break
    else:
        c._doc.Catalog.Lang = '(pt-BR)'

    estado = {'y': 0.0, 'pagina': 0}

    def fundo():
        c.setFillColorRGB(*PAPEL)
        c.rect(0, 0, L, A, stroke=0, fill=1)
        c.setFillColorRGB(*TINTA)

    def nova_pagina():
        if estado['pagina']:
            c.setFont('Apoio', 7.5)
            c.setFillColorRGB(0.42, 0.40, 0.44)
            c.drawCentredString(L / 2, rodape - 6 * mm, str(estado['pagina']))
            c.setFillColorRGB(*TINTA)
            c.showPage()
        estado['pagina'] += 1
        fundo()
        estado['y'] = A - topo

    def espaco(h: float) -> None:
        if estado['y'] - h < rodape:
            nova_pagina()

    def quebra(texto: str, fonte: str, tam: float) -> list[str]:
        linhas, atual = [], ''
        for palavra in texto.split():
            teste = f'{atual} {palavra}'.strip()
            if c.stringWidth(teste, fonte, tam) <= util:
                atual = teste
            else:
                linhas.append(atual)
                atual = palavra
        if atual:
            linhas.append(atual)
        return linhas

    def escreve(texto: str, fonte: str, tam: float, entrelinha: float,
                antes: float = 0, depois: float = 0, cor=TINTA, centro=False) -> None:
        estado['y'] -= antes
        for linha in quebra(texto, fonte, tam):
            espaco(entrelinha)
            c.setFont(fonte, tam)
            c.setFillColorRGB(*cor)
            if centro:
                c.drawCentredString(L / 2, estado['y'], linha)
            else:
                c.drawString(margem, estado['y'], linha)
            estado['y'] -= entrelinha
        estado['y'] -= depois
        c.setFillColorRGB(*TINTA)

    # --- Folha de rosto ---
    nova_pagina()
    estado['y'] = A * 0.60
    escreve(obra.titulo, 'Obra-Bold', 22, 27, centro=True, depois=6 * mm)
    escreve(obra.autoria, 'Apoio', 11, 15, centro=True, cor=(0.35, 0.33, 0.38))
    if obra.apoio:
        escreve(obra.apoio, 'Apoio', 8.5, 12, centro=True, antes=4 * mm, cor=(0.45, 0.43, 0.48))
    estado['y'] = rodape + 10 * mm
    escreve('Editora Livrin · obra original de demonstração', 'Apoio', 7.5, 10,
            centro=True, cor=(0.48, 0.46, 0.50))

    # --- Miolo ---
    primeiro = True
    for b in obra.blocos:
        if b.tipo == 'capitulo':
            if not primeiro:
                nova_pagina()
            else:
                nova_pagina()
                primeiro = False
            escreve(b.texto, 'Obra-Bold', 13.5, 18, depois=5 * mm)
        elif b.tipo == 'paragrafo':
            escreve(b.texto, 'Obra', 10.5, 16.5, depois=3.2 * mm)

    nova_pagina()
    c.save()


# --------------------------------------------------------------------------
# EPUB — texto que reflui, que é o formato mais acessível que existe
# --------------------------------------------------------------------------

CSS_EPUB = """body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.7;
  margin: 1.2em; color: #17161a; background: #f6f3ec; }
h1 { font-size: 1.5em; line-height: 1.2; margin: 0 0 .2em; }
h2 { font-size: 1.15em; margin: 2em 0 .6em; }
p { margin: 0 0 1em; text-align: justify; hyphens: auto; }
.autoria { color: #46434f; font-style: italic; margin-bottom: 2em; }
"""


def escapa(t: str) -> str:
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def gerar_epub(obra: Obra, destino: str) -> None:
    capitulos: list[tuple[str, list[str]]] = []
    for b in obra.blocos:
        if b.tipo == 'capitulo':
            capitulos.append((b.texto, []))
        elif b.tipo == 'paragrafo' and capitulos:
            capitulos[-1][1].append(b.texto)

    arquivos: dict[str, str] = {}
    for i, (titulo, paragrafos) in enumerate(capitulos, 1):
        abertura = ''
        if i == 1:
            abertura = (f'<h1>{escapa(obra.titulo)}</h1>'
                        f'<p class="autoria">{escapa(obra.autoria)}</p>')
        corpo = ''.join(f'<p>{escapa(p)}</p>' for p in paragrafos)
        arquivos[f'OEBPS/cap{i}.xhtml'] = (
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR" lang="pt-BR">'
            f'<head><title>{escapa(titulo)}</title>'
            '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
            f'<body>{abertura}<h2>{escapa(titulo)}</h2>{corpo}</body></html>'
        )

    itens = '\n'.join(f'<item id="cap{i}" href="cap{i}.xhtml" media-type="application/xhtml+xml"/>'
                      for i in range(1, len(capitulos) + 1))
    ordem = '\n'.join(f'<itemref idref="cap{i}"/>' for i in range(1, len(capitulos) + 1))
    sumario = '\n'.join(f'<li><a href="cap{i}.xhtml">{escapa(t)}</a></li>'
                        for i, (t, _) in enumerate(capitulos, 1))

    arquivos['OEBPS/style.css'] = CSS_EPUB
    arquivos['OEBPS/nav.xhtml'] = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" '
        'xml:lang="pt-BR" lang="pt-BR"><head><title>Sumário</title></head><body>'
        f'<nav epub:type="toc"><h1>Sumário</h1><ol>{sumario}</ol></nav></body></html>'
    )
    arquivos['OEBPS/content.opf'] = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id" '
        'xml:lang="pt-BR"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">'
        f'<dc:identifier id="id">livrin-{os.path.basename(destino)}</dc:identifier>'
        f'<dc:title>{escapa(obra.titulo)}</dc:title>'
        f'<dc:creator>{escapa(obra.autoria)}</dc:creator>'
        '<dc:language>pt-BR</dc:language>'
        '<meta property="dcterms:modified">2026-10-24T00:00:00Z</meta>'
        '</metadata><manifest>'
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
        '<item id="css" href="style.css" media-type="text/css"/>'
        f'{itens}</manifest><spine>{ordem}</spine></package>'
    )
    arquivos['META-INF/container.xml'] = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
        '<rootfiles><rootfile full-path="OEBPS/content.opf" '
        'media-type="application/oebps-package+xml"/></rootfiles></container>'
    )

    with zipfile.ZipFile(destino, 'w') as z:
        # O mimetype precisa ser a primeira entrada e ficar sem compressão.
        z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', zipfile.ZIP_STORED)
        for nome, conteudo in arquivos.items():
            z.writestr(nome, conteudo, zipfile.ZIP_DEFLATED)


# --------------------------------------------------------------------------
# CBZ — páginas de quadrinho desenhadas, no mesmo vocabulário das capas
# --------------------------------------------------------------------------

PALETA_HQ = [('#1b2a6b', '#f2d49b'), ('#14484f', '#e9d7b6'), ('#4a2545', '#efc7a0'),
             ('#8f3a24', '#f4e3c8'), ('#20466e', '#e4d2ae'), ('#2f4a2c', '#e8d9a8')]


def gerar_cbz(obra: Obra, destino: str) -> None:
    from PIL import Image, ImageDraw, ImageFont

    L, A, S = 900, 1270, 2
    fonte_cx = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    fonte_bd = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

    def rgb(h):
        return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

    def quebra(d, texto, fonte, largura):
        linhas, atual = [], ''
        for p in texto.split():
            t = f'{atual} {p}'.strip()
            if d.textlength(t, font=fonte) <= largura:
                atual = t
            else:
                linhas.append(atual)
                atual = p
        if atual:
            linhas.append(atual)
        return linhas

    paginas = obra.paginas_hq
    with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
        for i, blocos in enumerate(paginas, 1):
            fundo, traco = (rgb(c) for c in PALETA_HQ[(i - 1) % len(PALETA_HQ)])
            im = Image.new('RGB', (L * S, A * S), fundo)
            d = ImageDraw.Draw(im)
            f_cena = ImageFont.truetype(fonte_cx, 26 * S)
            f_leg = ImageFont.truetype(fonte_bd, 24 * S)
            f_fala = ImageFont.truetype(fonte_cx, 25 * S)
            f_quem = ImageFont.truetype(fonte_bd, 20 * S)
            f_num = ImageFont.truetype(fonte_bd, 22 * S)

            m = int(L * S * 0.07)
            y = m

            # Quadro grande. A "arte" é uma composição geométrica, e ela muda a
            # cada página: repetir o mesmo desenho sete vezes faz o quadrinho
            # parecer gabarito preenchido, não obra.
            alto = int(A * S * 0.40)
            x0, x1 = m, L * S - m
            y0, y1 = y, y + alto
            larg, altu = x1 - x0, y1 - y0
            d.rectangle([x0, y0, x1, y1], outline=traco, width=4 * S)
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            tipo = (i - 1) % 7

            if tipo == 0:  # arcos concêntricos de um canto
                for k in range(7):
                    r = altu * 0.22 + k * altu * 0.17
                    d.arc([x0 - r + larg * 0.2, y1 - r, x0 + r + larg * 0.2, y1 + r],
                          200, 340, fill=traco, width=3 * S)
            elif tipo == 1:  # horizonte com disco
                d.line([(x0 + 12 * S, cy + altu * 0.18), (x1 - 12 * S, cy + altu * 0.18)],
                       fill=traco, width=4 * S)
                r = altu * 0.22
                d.ellipse([cx + larg * 0.22 - r, cy - altu * 0.1 - r,
                           cx + larg * 0.22 + r, cy - altu * 0.1 + r], outline=traco, width=4 * S)
            elif tipo == 2:  # ondas
                import math as _m
                for k in range(5):
                    yy = y0 + altu * (0.22 + k * 0.14)
                    pts = [(x, yy + _m.sin(x / larg * _m.pi * 3 + k) * altu * 0.05)
                           for x in range(int(x0) + 14 * S, int(x1) - 14 * S, max(1, larg // 90))]
                    d.line(pts, fill=traco, width=3 * S, joint='curve')
            elif tipo == 3:  # serra
                d.polygon([(x0 + 14 * S, y1 - 14 * S), (x0 + larg * 0.30, y0 + altu * 0.35),
                           (x0 + larg * 0.50, y0 + altu * 0.66), (x0 + larg * 0.72, y0 + altu * 0.28),
                           (x1 - 14 * S, y1 - 14 * S)], outline=traco, width=4 * S)
            elif tipo == 4:  # trama de pontos
                passo = larg // 16
                r = max(2 * S, passo // 9)
                for yy in range(int(y0) + passo, int(y1), passo):
                    for xx in range(int(x0) + passo, int(x1), passo):
                        d.ellipse([xx - r, yy - r, xx + r, yy + r], fill=traco)
            elif tipo == 5:  # leque de raios
                import math as _m
                for k in range(15):
                    ang = _m.radians(192 + k * 10.5)
                    d.line([(cx, y1 + altu * 0.12),
                            (cx + _m.cos(ang) * larg, y1 + altu * 0.12 + _m.sin(ang) * larg)],
                           fill=traco, width=3 * S)
                d.rectangle([x0, y0, x1, y1], outline=fundo, width=10 * S)
                d.rectangle([x0, y0, x1, y1], outline=traco, width=4 * S)
            else:  # retângulos que se cruzam
                d.rectangle([x0 + larg * 0.10, y0 + altu * 0.16, x0 + larg * 0.58, y0 + altu * 0.78],
                            outline=traco, width=4 * S)
                d.rectangle([x0 + larg * 0.40, y0 + altu * 0.30, x0 + larg * 0.88, y0 + altu * 0.92],
                            outline=traco, width=4 * S)
            y += alto + int(A * S * 0.035)

            for b in blocos:
                if b.tipo == 'cena':
                    for linha in quebra(d, b.texto, f_cena, L * S - 2 * m - 20 * S):
                        d.text((m + 10 * S, y), linha, font=f_cena, fill=traco)
                        y += 36 * S
                    y += 16 * S
                elif b.tipo == 'legenda':
                    linhas = quebra(d, b.texto, f_leg, L * S - 2 * m - 60 * S)
                    alt = len(linhas) * 34 * S + 28 * S
                    d.rectangle([m, y, L * S - m, y + alt], fill=traco)
                    yy = y + 14 * S
                    for linha in linhas:
                        d.text((m + 24 * S, yy), linha, font=f_leg, fill=fundo)
                        yy += 34 * S
                    y += alt + 20 * S
                elif b.tipo == 'fala':
                    linhas = quebra(d, f'— {b.texto}', f_fala, L * S - 2 * m - 80 * S)
                    alt = len(linhas) * 34 * S + 56 * S
                    d.rounded_rectangle([m + 20 * S, y, L * S - m, y + alt],
                                        radius=22 * S, outline=traco, width=3 * S)
                    d.text((m + 44 * S, y + 14 * S), b.quem.upper(), font=f_quem, fill=traco)
                    yy = y + 46 * S
                    for linha in linhas:
                        d.text((m + 44 * S, yy), linha, font=f_fala, fill=traco)
                        yy += 34 * S
                    y += alt + 20 * S

            d.text((L * S - m - 40 * S, A * S - m), str(i), font=f_num, fill=traco)
            im = im.resize((L, A), Image.LANCZOS)
            # WEBP em vez de PNG: a mesma página cai de ~90 KB para ~12 KB, e
            # o leitor de CBZ do projeto já aceita o formato. Num acervo de
            # demonstração que vai junto no repositório, isso é a diferença
            # entre 4,7 MB e menos de 1 MB.
            tmp = f'{destino}.p{i:02d}.webp'
            im.save(tmp, 'WEBP', quality=88, method=6)
            z.write(tmp, f'{i:02d}.webp')
            os.remove(tmp)


# --------------------------------------------------------------------------

ALVOS = {
    'alem-das-estrelas': 'cbz',
    'meu-livro-incrivel': 'cbz',
    'terra-nova': 'pdf',
    'chamas-de-agosto': 'cbz',
    'vozes-do-mar': 'pdf',
    'raizes': 'epub',
    'o-ultimo-mapa': 'cbz',
}


def main() -> None:
    destino = sys.argv[1] if len(sys.argv) > 1 else 'api/seed-assets/works'
    origem = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'historias')
    os.makedirs(destino, exist_ok=True)

    for nome, formato in ALVOS.items():
        entrada = os.path.join(origem, f'{nome}.txt')
        if not os.path.exists(entrada):
            print(f'  (sem fonte) {nome}')
            continue
        obra = ler(entrada)
        saida = os.path.join(destino, f'{nome}.{formato}')
        {'pdf': gerar_pdf, 'epub': gerar_epub, 'cbz': gerar_cbz}[formato](obra, saida)
        tam = os.path.getsize(saida) / 1024
        print(f'  {obra.titulo:34} → {os.path.basename(saida):28} {tam:7.1f} KB')


if __name__ == '__main__':
    main()
