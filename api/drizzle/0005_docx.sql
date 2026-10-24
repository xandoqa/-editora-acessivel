-- Aceitar .docx no envio de obras.
--
-- O BMC promete "upload PDF/.docx", e com razão: autor independente escreve no
-- Word. Até aqui o sistema aceitava PDF, EPUB, CBZ e CBR — todos formatos de
-- publicação, nenhum formato de escrita.
--
-- `ALTER TYPE ... ADD VALUE` pode rodar dentro de transação no PostgreSQL 12+
-- desde que o valor novo não seja USADO na mesma transação. Esta migration só
-- acrescenta o valor, então é segura no migrator do Drizzle.
ALTER TYPE "public"."file_type" ADD VALUE IF NOT EXISTS 'DOCX';
