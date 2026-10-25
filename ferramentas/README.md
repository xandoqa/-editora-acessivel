# Ferramentas

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
