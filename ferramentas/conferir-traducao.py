#!/usr/bin/env python3
"""
Mede quanto da interface já sai do dicionário de tradução.

Tradução é o tipo de trabalho em que "está quase pronto" não quer dizer nada:
uma tela esquecida aparece em português no meio do inglês e estraga a
impressão de todas as outras. Este script existe para que o estado seja
medido, não alegado.

Ele procura, nos componentes de `web/src`, dois sinais de texto que ainda não
passa por `t()`:

  1. texto solto dentro de JSX — `<p>Algum texto</p>`;
  2. literal passado a uma propriedade que vira texto na tela — `label=`,
     `title=`, `placeholder=`, `aria-label=`, `hint=`, `description=`…

    python3 ferramentas/conferir-traducao.py
    python3 ferramentas/conferir-traducao.py --detalhado
    python3 ferramentas/conferir-traducao.py --limite 0   # reprova se sobrar algo

É heurística, e assume isso: nome de ícone, classe do Tailwind e caminho de
rota não contam. Pode haver falso positivo. O número serve para acompanhar a
direção e para ninguém dizer que terminou sem ter terminado.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / 'web' / 'src'

# Pastas que não produzem interface.
IGNORAR_PASTAS = {'i18n', 'types'}
IGNORAR_ARQUIVOS = {'labels.ts'}

PROPRIEDADES_DE_TEXTO = (
    'label', 'title', 'placeholder', 'aria-label', 'hint', 'description',
    'subtitle', 'legend', 'alt', 'caption', 'aviso', 'rotulo',
)

# Texto entre tags: pega letras de verdade, não `{expressão}` nem pontuação.
TEXTO_JSX = re.compile(r'>\s*([A-Za-zÀ-ÿ][^<>{}\n]{2,})\s*<')
PROP_TEXTO = re.compile(
    r'\b(' + '|'.join(re.escape(p) for p in PROPRIEDADES_DE_TEXTO) + r')=(["\'])(.*?)\2'
)

# Linhas que nunca contam.
RUIDO = re.compile(r'^\s*(//|/\*|\*)')
SO_SIMBOLOS = re.compile(r'^[\s\W\d]*$')


def interessa(texto: str) -> bool:
    t = texto.strip()
    if len(t) < 3 or SO_SIMBOLOS.match(t):
        return False
    # Precisa de ao menos uma palavra de três letras.
    return bool(re.search(r'[A-Za-zÀ-ÿ]{3}', t))


def achados(arquivo: Path) -> list[tuple[int, str]]:
    fora: list[tuple[int, str]] = []
    for n, linha in enumerate(arquivo.read_text(encoding='utf-8').splitlines(), 1):
        if RUIDO.match(linha):
            continue
        for m in TEXTO_JSX.finditer(linha):
            if interessa(m.group(1)):
                fora.append((n, m.group(1).strip()))
        for m in PROP_TEXTO.finditer(linha):
            if interessa(m.group(3)):
                fora.append((n, f'{m.group(1)}="{m.group(3).strip()}"'))
    return fora


def main() -> int:
    ap = argparse.ArgumentParser(description='Mede a cobertura de tradução da interface.')
    ap.add_argument('--detalhado', action='store_true', help='lista cada texto encontrado')
    ap.add_argument('--limite', type=int, default=None,
                    help='reprova (código 1) se sobrar mais que este número')
    args = ap.parse_args()

    arquivos = sorted(
        p for p in RAIZ.rglob('*.tsx')
        if not (set(p.relative_to(RAIZ).parts) & IGNORAR_PASTAS) and p.name not in IGNORAR_ARQUIVOS
    )

    por_arquivo: list[tuple[int, Path, list[tuple[int, str]]]] = []
    for arq in arquivos:
        itens = achados(arq)
        por_arquivo.append((len(itens), arq, itens))

    traduzidos = sum(1 for q, _, _ in por_arquivo if q == 0)
    total_itens = sum(q for q, _, _ in por_arquivo)

    print(f'{len(arquivos)} componentes · {traduzidos} sem texto solto · '
          f'{total_itens} trecho(s) ainda fora do dicionário\n')

    for quantos, arq, itens in sorted(por_arquivo, reverse=True):
        if quantos == 0:
            continue
        print(f'  {quantos:4}  {arq.relative_to(RAIZ)}')
        if args.detalhado:
            for linha, texto in itens:
                print(f'          {linha:4}: {texto[:88]}')

    if args.limite is not None and total_itens > args.limite:
        print(f'\nAcima do limite de {args.limite}.')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
