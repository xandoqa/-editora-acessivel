# Aviso de licença e autoria

O [LICENSE](LICENSE) deste repositório é a **licença MIT**, e ela vale para o **código**. O conteúdo criativo tem condições diferentes, e é isso que esta página esclarece.

## O que a licença MIT cobre

Todo o código: os pacotes `api/`, `web/` e `e2e/`, os scripts em `ferramentas/`, os arquivos de configuração e de Docker, e a documentação técnica em `docs/`.

Pode usar, estudar, modificar e redistribuir, inclusive comercialmente, mantendo o aviso de copyright. É a razão de o projeto estar público: um TCC que ninguém pode ler nem reaproveitar ensina menos.

## O que a licença MIT **não** cobre

As obras literárias e as peças visuais são autorais do Grupo 13 e seguem com **todos os direitos reservados**, protegidas pela Lei 9.610/98:

| O quê | Onde |
| --- | --- |
| Contos, poemas e roteiros escritos para o projeto | `ferramentas/historias/` |
| Os arquivos gerados a partir deles (PDF, EPUB, DOCX) | `api/seed-assets/works/` |
| As capas | `api/seed-assets/covers/` |
| Peças visuais e telas do protótipo | `docs/design/` |

A distinção é mais simples do que parece: `ferramentas/gerar-obras.py` e `ferramentas/gerar-capas.py` são **código**, e estão sob MIT — qualquer pessoa pode usar os scripts para gerar as próprias obras e as próprias capas. O que eles produzem **a partir dos textos do grupo** é obra autoral, e não está.

Para usar qualquer um desses itens fora deste projeto, peça autorização.

## Conteúdo de terceiros

*Rimas*, de Gustavo Adolfo Bécquer, está no acervo de demonstração por ser **domínio público**: o autor morreu em 1870, muito além do prazo do art. 41 da Lei 9.610/98. É a única obra de terceiro no repositório, e entrou por esse motivo e nenhum outro.

Nenhum material protegido por direitos autorais de terceiros foi incorporado. Os critérios usados para decidir o que pode entrar no acervo — inclusive as armadilhas de tradução e de edição crítica, que têm direitos próprios mesmo quando o original é livre — estão em [docs/obras-dominio-publico.md](docs/obras-dominio-publico.md).

As dependências (React, Express, Drizzle, pdf.js, VLibras e as demais listadas nos `package.json`) mantêm cada uma a sua própria licença.

## Natureza acadêmica

Trabalho de conclusão de curso. Os pagamentos são **simulados**: não há provedor, não há cobrança, nenhum valor é movimentado — ver [README-PAGAMENTO.md](README-PAGAMENTO.md).

As credenciais em `.env.example` são de **desenvolvimento**. Existem para que o projeto suba e possa ser avaliado logo após a instalação, estão marcadas como tal no próprio arquivo e não servem a nenhum sistema em produção. O segredo de assinatura dos tokens (`JWT_SECRET`) vem vazio e é gerado aleatoriamente na primeira execução.
