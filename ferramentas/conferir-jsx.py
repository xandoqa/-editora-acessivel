#!/usr/bin/env python3
"""Confere o balanceamento das tags JSX dos componentes.

Por que existe
--------------
Este projeto é desenvolvido num ambiente onde `node_modules` não pode ser
instalado — o registro npm é inalcançável. Sem `tsc` e sem `vite`, uma `<div>`
aberta e não fechada só aparece quando a integração contínua roda, dois minutos
depois, e normalmente depois de o commit já estar no ar.

Este script não substitui o compilador: ele responde UMA pergunta, a que mais
dá errado ao mexer em aninhamento de JSX — "toda tag que abre fecha, na ordem
certa?". É uma rede, não um teto.

Como ele lê o arquivo
---------------------
Um varredor caractere a caractere, não uma expressão regular. Expressão regular
não dá conta de JSX de verdade: `onClick={() => setX(!x)}` tem `>` dentro de
chaves aninhadas dentro de um atributo que atravessa quatro linhas, e qualquer
regex ou acha um `>` que não fecha tag, ou perde o que fecha. O varredor
acompanha string, comentário e profundidade de chave, e só considera `>` quando
está fora de tudo isso.

    python3 ferramentas/conferir-jsx.py [arquivo.tsx ...]

Sem argumentos, confere todos os .tsx de web/src. Sai com 1 se achar problema.
"""

from __future__ import annotations

import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# Tags HTML que não precisam de fechamento. Em JSX elas costumam vir com `/>`,
# mas um `<br>` solto acontece e não é erro de balanceamento.
VAZIAS = {"br", "hr", "img", "input", "meta", "link", "source", "track", "wbr", "area", "base", "col", "embed", "param"}


class Varredor:
    """Percorre o arquivo guardando onde está: código, string, comentário."""

    def __init__(self, texto: str) -> None:
        self.t = texto
        self.i = 0
        self.n = len(texto)

    def linha(self, pos: int) -> int:
        return self.t.count("\n", 0, pos) + 1

    def pular_string(self) -> bool:
        """Consome uma string ou template, inclusive escapes."""
        aspas = self.t[self.i]
        if aspas not in "\"'`":
            return False
        self.i += 1
        while self.i < self.n:
            c = self.t[self.i]
            if c == "\\":
                self.i += 2
                continue
            if c == aspas:
                self.i += 1
                return True
            self.i += 1
        return True

    def pular_comentario(self) -> bool:
        if self.t.startswith("//", self.i):
            fim = self.t.find("\n", self.i)
            self.i = self.n if fim < 0 else fim
            return True
        if self.t.startswith("/*", self.i):
            fim = self.t.find("*/", self.i + 2)
            self.i = self.n if fim < 0 else fim + 2
            return True
        return False


def ler_tag(v: Varredor) -> tuple[str, bool, bool, int] | None:
    """Lê uma tag a partir de `<`. Devolve (nome, é_fechamento, é_autofechada, posição)."""
    inicio = v.i
    v.i += 1
    fechamento = False
    if v.i < v.n and v.t[v.i] == "/":
        fechamento = True
        v.i += 1
    # Fragmento: <> ou </>
    if v.i < v.n and v.t[v.i] == ">":
        v.i += 1
        return ("<>", fechamento, False, inicio)
    # Nome da tag. Componente começa com maiúscula; elemento, com minúscula.
    ini_nome = v.i
    while v.i < v.n and (v.t[v.i].isalnum() or v.t[v.i] in "._-"):
        v.i += 1
    nome = v.t[ini_nome : v.i]
    if not nome:
        v.i = inicio + 1
        return None  # `<` que não é tag (comparação, genérico)

    # Parâmetro de tipo de função seta: `const set = <K extends keyof T>(…)`.
    # Aqui o `<` vem depois de espaço, igualzinho a JSX, mas o que segue o
    # nome é a palavra `extends` — que nunca aparece num atributo de tag.
    if v.t[v.i :].lstrip().startswith("extends "):
        v.i = inicio + 1
        return None

    # Atributos, até o `>` que está fora de string, comentário e chaves.
    profundidade = 0
    while v.i < v.n:
        c = v.t[v.i]
        if c in "\"'`":
            v.pular_string()
            continue
        if v.pular_comentario():
            continue
        if c == "{":
            profundidade += 1
        elif c == "}":
            profundidade -= 1
        elif profundidade == 0 and c == "/" and v.t.startswith("/>", v.i):
            v.i += 2
            return (nome, fechamento, True, inicio)
        elif profundidade == 0 and c == ">":
            v.i += 1
            return (nome, fechamento, False, inicio)
        v.i += 1
    return None


def conferir(caminho: Path) -> list[str]:
    texto = caminho.read_text(encoding="utf-8")
    v = Varredor(texto)
    pilha: list[tuple[str, int]] = []
    problemas: list[str] = []
    # `relative_to` levanta quando o arquivo está fora do projeto, e o script
    # aceita caminho avulso por argumento. Fora do projeto, mostra o caminho.
    try:
        relativo = caminho.relative_to(RAIZ)
    except ValueError:
        relativo = caminho

    while v.i < v.n:
        c = v.t[v.i]
        if c in "\"'`":
            v.pular_string()
            continue
        if v.pular_comentario():
            continue
        if c != "<":
            v.i += 1
            continue

        # `<` só abre tag quando vem letra, `/` ou `>` logo depois. `a < b`
        # não entra.
        proximo = v.t[v.i + 1] if v.i + 1 < v.n else ""
        if not (proximo.isalpha() or proximo in "/>"):
            v.i += 1
            continue

        # GENÉRICO, NÃO TAG.
        #
        # `useState<string>(...)`, `Record<K, V>`, `api.get<Resposta>(...)`:
        # em TypeScript o `<` de um genérico vem COLADO no identificador
        # anterior. Em JSX ele nunca vem — `<div>` é sempre precedido de
        # espaço, quebra de linha, `(`, `{`, `,`, `=` ou `>`.
        #
        # Sem esta regra o verificador acusava cento e quarenta tags "abertas
        # e nunca fechadas" em arquivos perfeitamente corretos, o que é pior
        # do que não verificar nada: relatório cheio de ruído ninguém lê.
        # A regra NÃO vale para tag de fechamento. `</p>` quase sempre vem
        # colado no texto que ele fecha (`...do dia</p>`), e aplicar a regra
        # ali fazia o verificador pular todos os fechamentos e acusar o
        # projeto inteiro de tags abertas — ruído que escondia o que importa.
        anterior = v.t[v.i - 1] if v.i > 0 else " "
        if proximo != "/" and (anterior.isalnum() or anterior in "_$)]"):
            v.i += 1
            continue

        tag = ler_tag(v)
        if tag is None:
            continue
        nome, fechamento, auto, pos = tag
        if auto or nome in VAZIAS:
            continue
        if fechamento:
            if not pilha:
                problemas.append(f"{relativo}:{v.linha(pos)}  </{nome}> sem abertura correspondente")
            elif pilha[-1][0] != nome:
                aberta, linha_aberta = pilha[-1]
                problemas.append(
                    f"{relativo}:{v.linha(pos)}  </{nome}> fecha <{aberta}>, aberta na linha {linha_aberta}"
                )
                pilha.pop()
            else:
                pilha.pop()
        else:
            pilha.append((nome, v.linha(pos)))

    for nome, linha in pilha:
        problemas.append(f"{relativo}:{linha}  <{nome}> aberta e nunca fechada")
    return problemas


def main() -> int:
    alvos = [Path(a) for a in sys.argv[1:]] or sorted((RAIZ / "web/src").rglob("*.tsx"))
    problemas: list[str] = []
    for caminho in alvos:
        problemas += conferir(caminho if caminho.is_absolute() else RAIZ / caminho)

    if problemas:
        print("JSX: FALHOU\n")
        for p in problemas:
            print(f"  - {p}")
        print("\nIsto confere apenas o balanceamento das tags. O compilador continua sendo o juiz.")
        return 1

    print(f"JSX: OK — {len(alvos)} arquivo(s), todas as tags fecham na ordem certa")
    return 0


if __name__ == "__main__":
    sys.exit(main())
