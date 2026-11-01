-- Biografia da autoria, para as páginas de coleção por autor.
--
-- `users.headline` já existia e continua sendo a linha curta exibida ao lado do
-- nome em avaliações e notas (160 caracteres). Ela é boa para uma assinatura,
-- e curta demais para a página do autor, que precisa de um parágrafo: o que a
-- pessoa escreve, de onde veio, o que a interessa.
--
-- Por isso uma coluna nova em vez de esticar a existente: esticar mudaria o
-- sentido de `headline` em todos os lugares onde ela já é usada como etiqueta
-- de uma linha.
--
-- Aditivo e anulável: nenhuma linha existente é tocada, e conta sem biografia
-- continua válida — a página do autor simplesmente não mostra o parágrafo.
-- Não há retrato aqui de propósito: os retratos dos autores são desenhados em
-- SVG pelo front-end a partir do nome, sem arquivo de imagem e sem foto de
-- pessoa real. Ver ADR 021.

ALTER TABLE "users" ADD COLUMN "bio" text;
