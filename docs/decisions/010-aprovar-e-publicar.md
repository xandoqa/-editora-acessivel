# 010 — Aprovar é publicar

**Decisão.** `PUBLICADO` deixa de existir. `APROVADO` passa a ser o único estado visível no catálogo, e a aprovação da curadoria coloca a obra lá na mesma transação. `ARQUIVADO` continua sendo o caminho para despublicar.

**Problema.** O catálogo filtrava `status = 'PUBLICADO'`, mas a decisão do administrador parava em `APROVADO`. Quem publicava era o **autor**, por um botão "Lançar Agora" em outra tela. Na prática: a curadoria aprovava, via "Aprovado pelo Comitê" na interface, e a obra continuava invisível — sem nenhum aviso de que faltava um passo. Era a causa principal do "catálogo vazio" relatado na seção 11 da especificação.

**O conflito na especificação.** A seção 8 diz que aprovar deve disponibilizar a obra no catálogo automaticamente, e a seção 9 lista **quatro** estados, sem um "publicado" separado. Já a seção 2 manda não remover funcionalidade existente só porque há outra maneira de fazer. As duas coisas não cabem juntas aqui.

**Alternativas consideradas.**

| Opção | Efeito | Por que não |
| --- | --- | --- |
| Catálogo aceitar `APROVADO` **e** `PUBLICADO` | Menor alteração possível | Deixa dois estados com o mesmo significado e um botão "Lançar Agora" sem efeito prático — conserta o sintoma, mantém a confusão |
| Aprovar publica, com um "aprovar sem publicar" opcional | Preserva tudo | Acrescenta uma opção que a especificação não pediu, para um caso de uso que ninguém descreveu |

**Escolha.** Aposentar `PUBLICADO`. É o que a seção 9 descreve, simplifica a máquina de estados de seis para cinco e elimina a classe inteira de defeito "a obra ficou presa entre a aprovação e o catálogo". O que se perde — o autor escolher o momento do lançamento — nunca foi pedido e não estava documentado como requisito.

**O que foi preservado.** `ARQUIVADO` permanece, e com ele a capacidade de despublicar e republicar: é a funcionalidade útil entre as que existiam a mais, e a seção 2 pesa a favor de mantê-la.

**Migração.** `0002_aprovado_publica.sql` move as obras `PUBLICADO` para `APROVADO` antes de recriar o tipo, e preenche `published_at` nas obras aprovadas que nunca tinham sido lançadas — exatamente as que estavam presas no limbo.
