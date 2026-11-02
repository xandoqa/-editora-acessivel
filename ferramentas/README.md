# Ferramentas

Três famílias de script, nenhuma delas parte da aplicação:

- **Conferência** — medem o que o compilador não vê. Rodam na integração contínua.
- **Prévia** — desenham em navegador headless para alguém olhar antes de publicar.
- **Geração** — refazem o conteúdo de demonstração. Rodam à mão, quando preciso.

## Conferência

Rodam na integração contínua, não precisam de dependência nenhuma além do
Python, e cada uma nasceu de um defeito que passou.

| Script | O que mede | Nasceu de | Reprova o PR? |
| --- | --- | --- | --- |
| `conferir-contraste.py` | 273 pares de cor (39 por tema) pela fórmula da WCAG | Tokens de texto discreto abaixo de 7:1 | sim |
| `conferir-formas.py` | Botão de ícone continua redondo, no CSS e na marcação | `.icon-btn` quadrado ao lado de cápsulas e avatar redondos | sim |
| `conferir-jsx.py` | Balanceamento das tags JSX de todos os componentes | Sem `node_modules` no ambiente, tag desbalanceada só aparecia no CI | sim |
| `conferir-posicionamento.py` | Classe única disputando `position`/`display`/`z-index` com o Tailwind; painel ancorado no botão | O layout quebrado da 3.6.2 e o painel fora da tela da 3.6.4 | sim |
| `conferir-traducao.py` | Quanto da interface ainda não passa pelo dicionário | Listas de texto fixo que nunca eram traduzidas | não — a cobertura é parcial e declarada |

```bash
python3 ferramentas/conferir-contraste.py
python3 ferramentas/conferir-formas.py
python3 ferramentas/conferir-jsx.py
python3 ferramentas/conferir-posicionamento.py
python3 ferramentas/conferir-traducao.py --detalhado
```

`conferir-jsx.py` responde **uma** pergunta — toda tag que abre fecha, na ordem
certa? — e não substitui o compilador. É uma rede, não um teto.

## Prévia

Renderizam desenho em navegador headless para alguém **olhar** antes de
publicar. As duas importam o módulo de geometria que o site usa de verdade:
uma prévia que reimplementasse o traço divergiria no primeiro ajuste.

| Script | Gera |
| --- | --- |
| `previa-retratos.mjs` | `docs/design/previa-retratos.png` — retratos de autoria em três temas |
| `previa-mascote.mjs` | `docs/design/previa-mascote.png` — o Pingo nos quatro humores, em três temas |

```bash
node --experimental-strip-types ferramentas/previa-retratos.mjs
node --experimental-strip-types ferramentas/previa-mascote.mjs
```

Precisam do Playwright (já instalado para os testes de ponta a ponta) e do
Node 22 ou mais novo, pela leitura direta do TypeScript.

Não é zelo teórico. Foi olhando essas prévias que apareceram três erros que
nenhum teste pegaria: um arco de ombro que engolia a cabeça do retrato, um
arco de fone invisível porque era tinta sobre tinta, e sobrancelhas que
deixavam o mascote com cara de bravo na tela de erro.

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
