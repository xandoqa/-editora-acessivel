# 015 — Publicidade na leitura e plano do leitor

> Complementa a [014](014-monetizacao-e-aquisicao.md). Aqui se decide **onde** a publicidade aparece e **o que** o plano premium faz — e, principalmente, o que ele não faz.

## A brecha que motivou esta rodada

`GET /works/:id/audio-descriptions` verificava apenas a visibilidade por status (`canView`), não a aquisição.

A audiodescrição não é um extra: ela traz a descrição de cada quadro e as falas de cada personagem. Num quadrinho, **é a obra em texto**. O endpoint do arquivo recusava corretamente, e este entregava o mesmo conteúdo em outro formato.

Pior do que o vazamento em si: era uma porta dos fundos que atingia exatamente o público que mais depende da audiodescrição. A verificação agora é a mesma dos outros dois caminhos de conteúdo.

**Lição que fica registrada:** ao proteger conteúdo, a pergunta não é "quais endpoints servem arquivos", e sim **"por quais caminhos o conteúdo pode sair"**. Num projeto de acessibilidade, o mesmo conteúdo existe de propósito em mais de uma forma.

## O que não era brecha

Obra paga abre para a **autoria** e para a **administração**, sem compra. Isso é desenho, não falha: uma precisa abrir a própria obra, a outra precisa abrir qualquer uma para revisar — a curadoria não teria como funcionar de outro jeito.

O problema era que isso ficava invisível: testar com a conta de administração dava a impressão de que o bloqueio não funcionava.

A correção não foi remover o acesso, e sim **declarar o motivo**. O detalhe da obra devolve `access.reason` — `LIVRE`, `COMPRADA`, `AUTORIA`, `ADMINISTRACAO` ou `NEGADO` — e o leitor exibe um aviso quando a obra paga foi aberta sem compra.

É a diferença entre um sistema que parece falhar e um que se explica. Numa apresentação, essa linha vale mais que o bloqueio em si: ela mostra que a regra existe **e** que quem a contorna está declarado.

## Onde a publicidade aparece

Regra única, da qual todo o resto decorre: **a publicidade não pode atrapalhar a leitura.**

| Decisão | Por quê |
| --- | --- |
| Entre unidades de leitura, nunca dentro delas | O bloco só aparece **depois** que a página terminou, então não parte frase, parágrafo ou diálogo |
| Abertura + a cada 4 páginas + fim | A página é a unidade natural deste leitor. Em texto corrido, "entre páginas" equivale a "entre trechos" |
| Sem pop-up, sem sobreposição, sem movimento | Bloco estático que ocupa espaço próprio. Nada aparece sozinho depois de alguns segundos |
| Segue a paleta do leitor | Um anúncio que ignorasse o tema de alto contraste seria, ele próprio, uma barreira de acessibilidade |
| Anúncio escolhido pela posição, não por sorteio | Sorteio a cada render trocaria o anúncio a cada rolagem — a inquietação que o componente existe para evitar |
| Sem script de terceiro, pixel, cookie ou chamada de rede | Não há rastreamento. Os anúncios são componentes desta aplicação |

Os anunciantes — Tipografia Aurora, Oficina Braille Sul, Estúdio Voz Clara, Papel & Lupa — são **fictícios**, coerentes com o contexto de uma livraria acessível, e cada bloco diz que é demonstração e que nenhuma receita é gerada. Não existe rede publicitária integrada, e inventar uma seria simular receita inexistente.

A publicidade aparece **somente** em obra cuja autoria escolheu a modalidade `PUBLICIDADE`. Obra gratuita comum não exibe anúncio; obra paga também não. A modalidade é de cada obra, não da plataforma.

## O plano do leitor

| Plano | O que muda |
| --- | --- |
| `GRATUITO` (padrão) | Tudo o que a plataforma oferece, com anúncios nas obras monetizadas por publicidade |
| `PREMIUM` | As mesmas obras, sem anúncios |

**O premium não desbloqueia obra paga.** Essa é a decisão que mais importa aqui.

Quem define o preço de uma obra é a autoria, e o dinheiro de uma assinatura da plataforma não é dela. Transformar o plano num passe livre sobre obras pagas seria a plataforma vendendo o trabalho de terceiros e ficando com a receita — uma regra de negócio que contraria a proposta editorial do projeto. Se um dia isso fizesse sentido, exigiria um acordo de repasse com cada autoria, e é outra decisão.

**Implementação deliberadamente pequena:** uma coluna em `users`, ativada pela administração em Administração → Usuários. Não há cobrança, não há fluxo de assinatura e não há tela de upgrade. A especificação pedia para não transformar o projeto num sistema de assinatura, e um campo com um seletor é o menor desenho que entrega o benefício descrito.

Nada é destrutivo: todas as contas existentes ficam `GRATUITO`.

## Como demonstrar

1. **Obra paga bloqueada:** entre com uma conta de leitor comum (não a administração) e abra uma obra paga. Leitura, download e audiodescrição ficam indisponíveis; capa, sinopse, ficha e preço continuam visíveis.
2. **O bloqueio é do servidor:** peça `GET /api/works/<id>/file?download=1` sem ter comprado. Responde 403 com ou sem token.
3. **Publicidade:** abra *Vozes do Mar* e avance as páginas. O bloco aparece na abertura e nos intervalos.
4. **Premium:** em Administração → Usuários, mude o plano daquela conta para Premium e recarregue a leitura. Os anúncios somem; a obra paga continua pedindo aquisição.
