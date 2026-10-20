# 006 — Docker

**Decisão.** Três serviços (db, api, web). `docker-compose.yml` sobe a **versão de produção** (imagens multi-stage, API compilada como usuário sem privilégios, Nginx servindo o build e fazendo proxy de `/api`); `docker-compose.dev.yml` é uma sobrescrita com hot reload. Migrations + seed rodam no start da API; healthchecks encadeiam a ordem db → api → web. Segredos obrigatórios via `${VAR:?mensagem}`.

**Alternativas.** Um compose único de desenvolvimento com bind mounts (como no original) — frágil em Windows/macOS (desempenho e file watching, `node_modules` do host) e diferente do que roda em produção; entrypoint em shell script — sujeito a problemas de CRLF e permissão de execução.

**Por que.** "Clonar, copiar o `.env` e `docker compose up`" funciona em qualquer SO e reproduz o ambiente de produção. O proxy no Nginx coloca front e API na mesma origem (sem CORS no navegador). Sem scripts `.sh`, evitando problemas de fim de linha.

**Mudanças em relação ao original.** O compose original não criava o banco sozinho (exigia `db:push` e `db:seed` manuais), montava o código como volume em "produção", tinha credenciais fixas no YAML e usava `VITE_API_URL` absoluta (dependente de CORS).
