# 004 — Upload e armazenamento de arquivos

**Decisão.** `multer` (multipart) grava em `UPLOAD_DIR/tmp`; `storage.service` valida extensão, tamanho e **assinatura binária** e move para `covers/`, `works/` ou `audio/` com nome UUID. O banco guarda caminhos relativos. Capas são estáticas e públicas; arquivos de obras e áudios são servidos por rotas com checagem de permissão. Em Docker, a pasta é um **volume nomeado**.

**Alternativas.** S3/MinIO (escalável, mas adiciona serviço e credenciais — sugerido pelo relatório de transição como opção); guardar binários no PostgreSQL (`bytea`, piora backup e desempenho); servir tudo como estático (exporia obras não publicadas).

**Por que.** Funciona em qualquer máquina sem contas externas, mantém o `docker compose up` autossuficiente e respeita a regra de que obras não publicadas não podem ser acessadas por terceiros. A troca para S3 no futuro fica isolada em `storage.service.ts` (funções `commitUpload`, `absolutePath`, `removeFile`).

**Segurança.** Nomes originais nunca viram caminho (sem path traversal); `absolutePath` impede sair do diretório; limite de tamanho no multer e no Nginx; arquivos temporários removidos quando a requisição falha; arquivos antigos só são apagados após o banco confirmar a substituição.
