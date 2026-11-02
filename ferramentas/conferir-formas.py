#!/usr/bin/env python3
"""Impede que botão de ícone volte a ser quadrado.

O defeito que deu origem a isto
-------------------------------
`.icon-btn` era um quadrado de cantos irregulares (`12px 14px 12px 14px`) com
borda transparente em repouso. Resultado: a forma só aparecia quando o mouse
chegava — e o que aparecia era um quadrado, do nada, bem ao lado de coisas
redondas (as cápsulas de acessibilidade, o avatar, os retratos dos autores, as
setas da roleta, a pílula do Fale Conosco).

Quem usou descreveu assim: *"algumas partes do site são redondas e, ao clicar,
fica quadrado"*. Reportou duas vezes antes de alguém entender. Nenhuma das
auditorias anteriores pegou, porque todas olhavam estrutura — import, rota,
migration — e nenhuma olhava **forma**.

O que este script verifica
--------------------------
1. `.icon-btn` continua redondo no `global.css`.
2. Nenhum botão SÓ DE ÍCONE usa raio de canto quadrado (`rounded-sm`, `-md`,
   `-lg`, `-xl`, `-2xl` ou valor arbitrário). Botão com texto fica de fora: o
   recorte irregular do `.btn` é identidade do projeto e continua valendo.

Exceções conhecidas ficam em `QUADRADOS_PERMITIDOS`, com motivo escrito.

    python3 ferramentas/conferir-formas.py

Sai com 1 se achar problema.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CSS = RAIZ / "web/src/styles/global.css"
COMPONENTES = RAIZ / "web/src"

RAIO_QUADRADO = re.compile(r"\brounded-(?:sm|md|lg|xl|2xl|3xl|\[[^\]]+\])\b")

# Nomes de ícone do lucide-react usados no projeto. Serve para reconhecer que o
# conteúdo do botão é um ícone, e não texto.
ICONE = re.compile(
    r"<(?:Chevron|Arrow|X|Menu|Search|Plus|Minus|Trash|Pencil|Check|Play|Pause|Volume|Eye|"
    r"Copy|Download|Info|Star|Heart|Settings|MoreH|Rotate|Zoom|Maximize|Share|Mail|Phone|"
    r"Bell|Filter|Calendar|Clock|Lock|Unlock|Send|Mic|Image|File|Link|Externa)"
)

BOTAO = re.compile(
    r"<button\b((?:[^<>{}]|\{[^{}]*\}|\{[^{}]*\{[^{}]*\}[^{}]*\})*?)>(.{0,260}?)</button>",
    re.S,
)

# Nada aqui hoje. A lista existe para que uma exceção futura precise de motivo
# escrito, em vez de passar despercebida.
QUADRADOS_PERMITIDOS: dict[str, str] = {}


def conferir_css() -> list[str]:
    texto = CSS.read_text(encoding="utf-8")
    bloco = re.search(r"\.icon-btn\s*\{([^}]*)\}", texto)
    if not bloco:
        return ["global.css: a classe `.icon-btn` sumiu"]
    corpo = bloco.group(1)
    redondo = "rounded-full" in corpo or re.search(r"border-radius:\s*(9999px|50%)", corpo)
    if not redondo:
        return [
            "global.css: `.icon-btn` não está redondo. Ele convive com cápsulas, "
            "avatar e retratos redondos; quadrado ali é a inconsistência que "
            "quem usou reportou duas vezes."
        ]
    return []


def conferir_marcacao() -> list[str]:
    problemas: list[str] = []
    for arquivo in sorted(COMPONENTES.rglob("*.tsx")):
        relativo = str(arquivo.relative_to(RAIZ))
        if relativo in QUADRADOS_PERMITIDOS:
            continue
        texto = arquivo.read_text(encoding="utf-8")
        for m in BOTAO.finditer(texto):
            attrs, corpo = m.group(1), m.group(2)
            classe = re.search(r'className=[{"`]+([^"`}]+)', attrs)
            if not classe:
                continue
            valor = classe.group(1)
            # Botão que já usa uma classe de componente segue o padrão dela.
            if any(c in valor for c in ("icon-btn", "btn-", "chip")):
                continue
            # Só interessa botão cujo conteúdo é um ícone e nada de texto.
            sem_tags = re.sub(r"<[^>]*>", "", corpo)
            sem_expressoes = re.sub(r"\{[^}]*\}", "", sem_tags).strip()
            if sem_expressoes or not ICONE.search(corpo):
                continue
            quadrado = RAIO_QUADRADO.search(valor)
            if quadrado:
                linha = texto[: m.start()].count("\n") + 1
                problemas.append(
                    f"{relativo}:{linha}  botão só de ícone com `{quadrado.group(0)}` — "
                    "botão de ícone é redondo neste projeto. Use `.icon-btn`, ou "
                    "`rounded-full` quando precisar de cor própria."
                )
    return problemas


def main() -> int:
    problemas = conferir_css() + conferir_marcacao()
    if problemas:
        print("Formas: FALHOU\n")
        for p in problemas:
            print(f"  - {p}")
        print(
            "\nO projeto tem dois formatos, e os dois têm lugar: recorte irregular "
            "para cartão e botão com texto (é a identidade), redondo para botão de "
            "ícone. Misturar os dois lado a lado é o que não funciona."
        )
        return 1

    print("Formas: OK")
    print("  - `.icon-btn` é redondo")
    print("  - nenhum botão só de ícone com canto quadrado")
    return 0


if __name__ == "__main__":
    sys.exit(main())
