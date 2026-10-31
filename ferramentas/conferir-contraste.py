#!/usr/bin/env python3
"""
Mede o contraste de todos os temas do Livrin.

O projeto promete AAA (7:1) para texto e 3:1 para limite de componente. Promessa
que ninguém mede é promessa que envelhece: basta alguém ajustar um token "só um
tom" para um par cair abaixo do limite sem que nada quebre na tela.

Este script lê os tokens direto de `web/src/styles/global.css`, calcula o
contraste de cada par que importa e reprova com código 1 se algum ficar abaixo
do exigido. Não depende de nada além da biblioteca padrão.

    python3 ferramentas/conferir-contraste.py
    python3 ferramentas/conferir-contraste.py --tema sepia
    python3 ferramentas/conferir-contraste.py --detalhado

A fórmula é a da WCAG 2 (luminância relativa com correção sRGB). Ver
https://webaim.org/articles/contrast/ para os patamares.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / 'web' / 'src' / 'styles' / 'global.css'

# Patamares da WCAG 2.
AAA_TEXTO = 7.0  # 1.4.6 — texto normal
AA_TEXTO = 4.5  # 1.4.3 — texto normal
AA_GRAFICO = 3.0  # 1.4.11 — componente de interface e limite


# --------------------------------------------------------------------------- #
# Cor
# --------------------------------------------------------------------------- #
def canal(valor: float) -> float:
    v = valor / 255
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def luminancia(rgb: tuple[int, int, int]) -> float:
    r, g, b = (canal(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    la, lb = luminancia(a), luminancia(b)
    claro, escuro = max(la, lb), min(la, lb)
    return (claro + 0.05) / (escuro + 0.05)


# --------------------------------------------------------------------------- #
# Leitura dos temas a partir do CSS
# --------------------------------------------------------------------------- #
# Cada tema é um bloco `:root` (o padrão) ou `:root.<classe>`. O nome vem do
# comentário `/* tema: <id> — <rótulo> */` logo acima, quando existe.
BLOCO = re.compile(
    r'(?:/\*\s*tema:\s*(?P<id>[\w-]+)\s*(?:—|-)\s*(?P<rotulo>[^*]+?)\s*\*/\s*)?'
    r'^(?P<seletor>:root(?:\.[\w-]+)?)\s*\{(?P<corpo>[^}]*)\}',
    re.M,
)
TOKEN = re.compile(r'--(?P<nome>c-[\w-]+):\s*(?P<v>\d+)\s+(\d+)\s+(\d+)\s*;')


def ler_temas(caminho: Path) -> dict[str, dict]:
    css = caminho.read_text(encoding='utf-8')
    temas: dict[str, dict] = {}
    for m in BLOCO.finditer(css):
        corpo = m.group('corpo')
        tokens = {
            t.group('nome'): (int(t.group(2)), int(t.group(3)), int(t.group(4)))
            for t in TOKEN.finditer(corpo)
        }
        if not tokens:
            continue
        seletor = m.group('seletor')
        ident = m.group('id') or ('papel' if seletor == ':root' else seletor.split('.')[-1])
        temas[ident] = {
            # Só a primeira linha: o resto do comentário é a justificativa do tema.
            'rotulo': (m.group('rotulo') or ident).strip().splitlines()[0].strip(),
            'seletor': seletor,
            'tokens': tokens,
        }
    # Cada tema herda do `:root` o que não redefine — como no navegador.
    base = temas.get('papel', {}).get('tokens', {})
    for ident, tema in temas.items():
        if ident != 'papel':
            tema['tokens'] = {**base, **tema['tokens']}
    return temas


# --------------------------------------------------------------------------- #
# Os pares que importam
# --------------------------------------------------------------------------- #
SUPERFICIES = ['c-bg', 'c-surface', 'c-surface-low', 'c-surface-high', 'c-surface-highest']

# (frente, fundo, mínimo, descrição)
def pares(t: dict[str, tuple[int, int, int]]) -> list[tuple[str, str, float, str]]:
    lista: list[tuple[str, str, float, str]] = []

    # Texto sobre toda superfície: o corpo do texto tem de passar em AAA.
    for sup in SUPERFICIES:
        lista.append(('c-ink', sup, AAA_TEXTO, 'texto principal'))
        lista.append(('c-ink-muted', sup, AAA_TEXTO, 'texto secundário'))
        lista.append(('c-ink-subtle', sup, AAA_TEXTO, 'texto discreto'))

    # Cores de papel: link e estado sobre as superfícies onde de fato aparecem.
    for cor, desc in [
        ('c-primary', 'link e ação'),
        ('c-accent', 'sucesso'),
        ('c-warn', 'atenção'),
        ('c-danger', 'erro'),
        ('c-admin', 'administração'),
    ]:
        for sup in ['c-bg', 'c-surface', 'c-surface-high']:
            lista.append((cor, sup, AA_TEXTO, desc))

    # Texto dentro de um botão ou de uma pílula colorida.
    lista.append(('c-on-primary', 'c-primary', AA_TEXTO, 'texto no botão'))
    lista.append(('c-on-accent', 'c-accent', AA_TEXTO, 'texto no selo de sucesso'))
    lista.append(('c-on-primary-container', 'c-primary-container', AA_TEXTO, 'texto na pílula'))

    # Limite de componente: 1.4.11 pede 3:1 contra o que estiver ao lado.
    for sup in ['c-bg', 'c-surface', 'c-surface-high']:
        lista.append(('c-outline', sup, AA_GRAFICO, 'borda de campo'))
        lista.append(('c-outline-strong', sup, AA_GRAFICO, 'borda em destaque'))

    return [p for p in lista if p[0] in t and p[1] in t]


# --------------------------------------------------------------------------- #
def main() -> int:
    ap = argparse.ArgumentParser(description='Mede o contraste dos temas do Livrin.')
    ap.add_argument('--tema', help='mede só este tema (id)')
    ap.add_argument('--detalhado', action='store_true', help='mostra também os pares que passam')
    args = ap.parse_args()

    if not CSS.exists():
        print(f'Não achei o CSS em {CSS}', file=sys.stderr)
        return 2

    temas = ler_temas(CSS)
    if args.tema:
        if args.tema not in temas:
            print(f'Tema "{args.tema}" não existe. Há: {", ".join(sorted(temas))}', file=sys.stderr)
            return 2
        temas = {args.tema: temas[args.tema]}

    falhas = 0
    for ident, tema in temas.items():
        t = tema['tokens']
        resultados = []
        for frente, fundo, minimo, desc in pares(t):
            r = contraste(t[frente], t[fundo])
            resultados.append((r >= minimo, r, minimo, frente, fundo, desc))

        ruins = [r for r in resultados if not r[0]]
        falhas += len(ruins)
        marca = 'OK  ' if not ruins else 'FALHA'
        pior = min((r[1] / r[2], r) for r in resultados)[1]
        print(f'\n{marca} {ident} ({tema["rotulo"]}) — {len(resultados)} pares, '
              f'pior margem: {pior[3]} sobre {pior[4]} = {pior[1]:.2f}:1 (mínimo {pior[2]:.0f})')

        for ok, r, minimo, frente, fundo, desc in resultados:
            if ok and not args.detalhado:
                continue
            simbolo = '  ok ' if ok else '  >> '
            print(f'{simbolo}{frente:24} sobre {fundo:18} {r:5.2f}:1  '
                  f'(mín {minimo:.0f}) — {desc}')

    print()
    if falhas:
        print(f'{falhas} par(es) abaixo do mínimo.')
        return 1
    print('Todos os pares passam.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
