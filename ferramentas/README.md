# Ferramentas

Duas famílias de script, nenhuma delas parte da aplicação: os que **geram**
conteúdo de demonstração (rodam à mão, quando se quer refazer os arquivos) e os
que **conferem** o que o compilador não vê.

## Conferência

| Script | O que mede | Reprova o PR? |
| --- | --- | --- |
| `conferir-contraste.py` | 39 pares de cor por tema, 273 no total, pela fórmula da WCAG | sim |
| `conferir-posicionamento.py` | Que nenhuma classe única do `global.css` dispute `position`/`display`/`z-index` com as utilitárias do Tailwind | sim |
| `conferir-traducao.py` | Quanto da interface ainda não passa pelo dicionário | não — cobertura é parcial e declarada |

```bash
python3 ferramentas/conferir-contraste.py
python3 ferramentas/conferir-posicionamento.py
python3 ferramentas/conferir-traducao.py --detalhado
```

Os três rodam na integração contínua e não precisam de dependência nenhuma além
do Python. Existem porque **cada um nasceu de um defeito que passou**: tokens de
texto discreto abaixo de 7:1, o layout quebrado da 3.6.2 e listas de texto fixo
que nunca eram traduzidas.

## Geração

Scripts que **geram** conteúdo do projeto. Não fazem parte da aplicação e não são executados por ela: rodam à mão, quando se quer refazer os arquivos de demonstração.

Guardar a fonte em texto, e o gerador junto, torna a autoria verificável, o conteúdo corrigível e o arquivo reproduzível.

| Script | O que faz |
| --- | --- |
| `gerar-capas.py` | Capas das obras de demonstração: composições geométricas originais, sem texto |
| `gerar-obras.py` | Os arquivos das obras (PDF, EPUB, CBZ) a partir dos textos em `historias/` |

```bash
pip install pillow reportlab

python3 ferramentas/gerar-capas.py api/seed-assets/covers
python3 ferramentas/gerar-obras.py api/seed-assets/works
```

## `historias/`

Os textos originais das obras de demonstração — contos, poemas e roteiros de quadrinho escritos para o projeto. Formato:

```
# Título
@ Autoria
= Linha de apoio (gênero, formato)
## Título de capítulo
Parágrafos separados por linha em branco.
```

Para quadrinho, cada `## N` abre uma página, com `[CENA]`, `[LEGENDA]` e `[FALA] Personagem: fala`.

Os PDFs gerados têm **camada de texto real**, não imagem de texto: num projeto de acessibilidade, PDF escaneado seria contradizer a proposta.
