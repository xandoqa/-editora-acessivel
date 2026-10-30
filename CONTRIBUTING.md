# Como contribuir

Este é o trabalho do **Grupo 13**. O fluxo abaixo é o que o projeto usa de verdade — todas as mudanças da série 3.x passaram por ele.

Quem chegou agora: comece pelo [README](README.md) e pelo [guia de desenvolvimento](docs/development.md), que explica como rodar sem Docker e traz as receitas de "como adicionar uma entidade", "como adicionar um endpoint" e assim por diante.

## O fluxo

1. **Uma branch por mudança.** Nome em português, descrevendo o assunto: `janela-de-libras`, `bandeira-do-cartao`. Nada de `feature/1`.
2. **Implemente, com teste e documentação na mesma branch.** Mexeu em rota, schema ou upload? `docs/api.md` muda junto. Mexeu em comportamento? Tem teste cobrindo.
3. **Rode antes de abrir o PR:**
   ```bash
   cd api && npm test && npm run build
   cd ../web && npm run build
   ```
4. **Atualize o [CHANGELOG.md](CHANGELOG.md)** e, se a versão mudou, os três `package.json`.
5. **Abra o PR.** O modelo já traz as perguntas que precisam de resposta.
6. **Espere o CI ficar verde.** São três jobs: tipos e testes da API, tipos e build do front, e a construção das imagens Docker.
7. **Merge por squash**, para o `main` ficar com um commit por mudança.

## O que o CI não cobre

A suíte de navegador (Playwright, em `e2e/`) **não roda na integração contínua**. Ela existe e funciona, mas é executada à mão. Então um PR verde não significa que o fluxo clicado de ponta a ponta foi verificado — se você mexeu em algo que se usa clicando, clique.

Veja [docs/testing.md](docs/testing.md) para o que cada suíte cobre e o que fica de fora.

## As três regras que mais pegam gente

**Acessibilidade não é etapa final.** Todo controle precisa de nome acessível, foco visível e funcionar por teclado. Os três temas (Papel, Noite, Alto contraste) precisam continuar legíveis — e é por isso que cores fixas estão proibidas: use os tokens (`bg-surface`, `text-ink-muted`, `text-primary`). Uma cor escrita à mão quebra o alto contraste sem avisar.

**Validação do servidor é a que vale.** Esconder um botão não é proteger uma rota. Toda regra de acesso é verificada no serviço, não na interface — já tivemos uma brecha exatamente por isso ([ADR 015](docs/decisions/015-publicidade-e-plano.md)).

**Comentário explica o porquê, não o quê.** O código já diz o que faz. O comentário serve para a decisão que não é óbvia — como a ordem das regras em `web/src/lib/cartao.ts`, que alguém "simplificaria" sem perceber que quebra.

## Decisões técnicas

Mudança estrutural — trocar biblioteca, mudar modelo de dados, alterar uma regra de negócio — merece uma ADR em [docs/decisions/](docs/decisions/). São curtas: o que foi escolhido, por quê, o que foi descartado e por quê. Existem 17, e elas são o que permite entender o projeto seis meses depois sem perguntar a ninguém.

## Licença

Contribuições ao **código** entram sob a licença MIT. O conteúdo criativo tem condições próprias — ver [NOTICE.md](NOTICE.md).
