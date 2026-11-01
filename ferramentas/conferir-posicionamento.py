#!/usr/bin/env python3
"""Impede a volta do bug de posicionamento da 3.6.2.

O que aconteceu
---------------
A 3.6.2 trocou as linhas de 1px por sombras em degradê. Para o pseudo-elemento
`::after` se ancorar, as classes `.borda-degrade-b` e `.borda-degrade-r`
declararam `position: relative` no `global.css`. O efeito colateral destruiu o
layout:

    .borda-degrade-r            →  especificidade 0-1-0
    .fixed  (Tailwind)          →  especificidade 0-1-0

Empate em especificidade é decidido pela ORDEM no arquivo, e as nossas regras
ficam depois do `@tailwind utilities` (linha 3). Resultado: `relative` venceu
`sticky` no cabeçalho e `fixed` na barra lateral. O cabeçalho caiu no meio da
página; a lateral virou uma caixa de 72px em vez de ocupar a altura da tela.

Nem o `tsc`, nem o build, nem o teste de contraste viam isso: CSS válido,
tipos válidos, contraste intacto — e a tela quebrada.

O segundo defeito (3.6.4)
-------------------------
O painel dos seletores de tema e idioma era `absolute right-0`: ancorado na
borda direita do BOTÃO, crescendo para a esquerda. Isso serve para o último
controle da barra — o avatar, colado na direita, tem a tela inteira para
crescer. Não serve para um botão no meio da barra: no celular, um painel de
288px a partir dos ~150px do botão começava em −138px, e metade dele ficava
fora da tela, impossível de tocar. A regra 3 abaixo impede que o próximo painel
nasça assim.

O que este script verifica
--------------------------
Três regras, todas estáticas (não precisa de navegador):

1. Nenhuma regra de CLASSE ÚNICA no `global.css` declara `position`, `display`
   ou `z-index`. São exatamente as propriedades que o Tailwind entrega em
   utilitárias de classe única, onde quem chega depois no arquivo ganha. Quem
   precisa dessas propriedades declara na marcação, onde o conflito é visível.

2. Todo elemento que usa `borda-degrade-b`/`borda-degrade-r` carrega uma classe
   de posicionamento no próprio `className` — porque o `::after` precisa de um
   bloco de contenção, e agora o CSS não dá mais um de graça.

3. Nenhum painel novo usa `absolute right-0`. Quem precisa abrir um painel a
   partir de um botão usa `PAINEL_FLUTUANTE`, que em tela estreita prende o
   painel à tela em vez de ancorá-lo no botão. As duas exceções existentes
   estão registradas com o motivo em `ANCORA_DIREITA_PERMITIDA`.

Sai com código 1 se qualquer uma falhar.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CSS = RAIZ / "web/src/styles/global.css"
COMPONENTES = RAIZ / "web/src"

# Propriedades que o Tailwind também entrega como utilitária de classe única.
# Declará-las numa classe nossa de classe única é apostar na ordem do arquivo.
DISPUTADAS = {"position", "display", "z-index"}

POSICIONAMENTO = {"relative", "absolute", "fixed", "sticky"}

CLASSE_UNICA = re.compile(r"\.[a-z0-9_-]+\Z", re.I)
# O primeiro caractere do seletor não pode ser espaço: senão o casamento começa
# dentro de uma linha em branco e o número de linha do erro sai errado.
REGRA = re.compile(r"(?m)^[ \t]*([^@{}\s][^{}]*?)\{([^{}]*)\}")
COMENTARIO = re.compile(r"/\*.*?\*/", re.S)


def sem_comentarios(texto: str) -> str:
    """Apaga comentários preservando a contagem de linhas.

    Não é zelo à toa: um comentário de bloco engolia o seletor seguinte na
    primeira versão deste script, e o teste passava com o bug no arquivo.
    Em vez de apagar o trecho, troca cada caractere por espaço e mantém os
    `\\n`, para o número de linha do erro continuar valendo.
    """
    return COMENTARIO.sub(
        lambda m: "".join("\n" if c == "\n" else " " for c in m.group(0)), texto
    )


def conferir_css() -> list[str]:
    """Regra 1: nenhuma classe única nossa mexe nas propriedades disputadas."""
    problemas: list[str] = []
    texto = sem_comentarios(CSS.read_text(encoding="utf-8"))
    deslocamentos = [0]
    for linha in texto.split("\n"):
        deslocamentos.append(deslocamentos[-1] + len(linha) + 1)

    def numero_da_linha(pos: int) -> int:
        for i, d in enumerate(deslocamentos):
            if d > pos:
                return i
        return len(deslocamentos)

    for m in REGRA.finditer(texto):
        seletor, corpo = m.group(1).strip(), m.group(2)
        declaradas = {
            p.split(":", 1)[0].strip().lower() for p in corpo.split(";") if ":" in p
        }
        colisao = declaradas & DISPUTADAS
        if not colisao:
            continue
        partes = [p.strip() for p in seletor.split(",")]
        if all(CLASSE_UNICA.fullmatch(p) for p in partes):
            problemas.append(
                f"global.css:{numero_da_linha(m.start())}  "
                f"`{seletor.replace(chr(10), ' ')}` declara {sorted(colisao)} — "
                "classe única empata com as utilitárias do Tailwind e vence pela "
                "ordem do arquivo. Declare na marcação."
            )
    return problemas


def conferir_marcacao() -> list[str]:
    """Regra 2: quem usa o degradê traz o próprio bloco de contenção."""
    problemas: list[str] = []
    for arquivo in sorted(COMPONENTES.rglob("*.tsx")):
        for n, linha in enumerate(arquivo.read_text(encoding="utf-8").split("\n"), 1):
            if "borda-degrade" not in linha:
                continue
            m = re.search(r'className="([^"]+)"', linha)
            if not m:
                continue
            classes = set(m.group(1).split())
            if not classes & POSICIONAMENTO:
                relativo = arquivo.relative_to(RAIZ)
                problemas.append(
                    f"{relativo}:{n}  usa `borda-degrade` sem classe de "
                    f"posicionamento ({'/'.join(sorted(POSICIONAMENTO))}) — "
                    "o ::after não terá bloco de contenção e o degradê vai "
                    "aparecer no lugar errado."
                )
    return problemas


# Painéis ancorados à direita do BOTÃO que os abre. Só é seguro quando o botão
# está colado na borda direita da tela ou quando o painel não existe em tela
# estreita — senão o painel cresce para a esquerda e sai da tela, que é o bug
# da 3.6.4. Quem entrar nesta lista precisa de um motivo escrito.
ANCORA_DIREITA_PERMITIDA = {
    "web/src/components/layout/Topbar.tsx": (
        "menu do avatar — é o último controle da barra, então tem a largura "
        "inteira à esquerda para crescer"
    ),
    "web/src/components/layout/LeituraEmVoz.tsx": (
        "fica no grupo de acessibilidade, que é `hidden sm:flex` — não existe "
        "abaixo de 640px, onde o espaço acaba"
    ),
}


def conferir_ancoragem() -> list[str]:
    """Regra 3: painel novo ancorado à direita precisa de decisão explícita."""
    problemas: list[str] = []
    for arquivo in sorted(COMPONENTES.rglob("*.tsx")):
        relativo = str(arquivo.relative_to(RAIZ))
        for n, linha in enumerate(arquivo.read_text(encoding="utf-8").split("\n"), 1):
            if "absolute right-0" not in linha:
                continue
            if relativo in ANCORA_DIREITA_PERMITIDA:
                continue
            problemas.append(
                f"{relativo}:{n}  painel `absolute right-0` ancorado no botão. "
                "Em tela estreita ele cresce para a esquerda e sai da tela "
                "(bug da 3.6.4). Use `PAINEL_FLUTUANTE` de "
                "`web/src/components/layout/painelFlutuante.ts` — ou, se o "
                "botão for o último da barra, registre a exceção com o motivo "
                "em ANCORA_DIREITA_PERMITIDA, neste arquivo."
            )
    return problemas


def main() -> int:
    problemas = conferir_css() + conferir_marcacao() + conferir_ancoragem()
    if problemas:
        print("Posicionamento: FALHOU\n")
        for p in problemas:
            print(f"  - {p}")
        print(
            "\nContexto: dois defeitos reais deram origem a estas regras — a "
            "3.6.2 (cabeçalho fora do topo, barra lateral sem altura) e a "
            "3.6.4 (painel do seletor fora da tela no celular). Veja o "
            "comentário no topo deste arquivo."
        )
        return 1

    print("Posicionamento: OK")
    print("  - nenhuma classe única do global.css declara position/display/z-index")
    print("  - todo uso de borda-degrade traz a própria classe de posicionamento")
    print(
        "  - nenhum painel novo ancorado à direita do botão "
        f"({len(ANCORA_DIREITA_PERMITIDA)} exceções registradas, com motivo)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
