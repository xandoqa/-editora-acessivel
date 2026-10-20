# Deploy e produção

## O que já está pronto

- Imagens de produção multi-stage: API compilada (Node 22 Alpine, usuário sem privilégios, só dependências de runtime, healthcheck) e front-end estático no Nginx (gzip, cache de assets, cabeçalhos de segurança, proxy para a API).
- Migrations e seed idempotente executados automaticamente a cada start.
- Configuração 100% por variáveis de ambiente; segredos obrigatórios validados na inicialização.
- Logs em stdout/stderr (coletados pelo Docker).
- Volumes nomeados para banco e uploads.

## O que **não** está incluído (deixar claro)

- **HTTPS/TLS**: o Nginx do projeto escuta em HTTP (porta 80 do container). Em produção coloque um proxy com TLS na frente (Traefik, Caddy, Nginx do servidor, load balancer do provedor) ou adicione certificados ao `web/nginx.conf`.
- **Armazenamento em nuvem** (S3 etc.): os arquivos ficam no volume local `uploads`. Para múltiplas instâncias da API é preciso um storage compartilhado — a troca fica isolada em `api/src/services/storage.service.ts`.
- **Envio de e-mails** (recuperação de senha self-service, notificações).
- **Orquestração** (Kubernetes) e CI/CD — não configurados.

## Passo a passo (servidor com Docker)

```bash
git clone <repo> livrin && cd livrin
cp .env.example .env
# Edite o .env:
#   POSTGRES_PASSWORD=<senha forte>
#   JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
#   ADMIN_EMAIL=<seu e-mail>  ADMIN_PASSWORD=<senha forte>
#   SEED_DEMO_DATA=false
#   CORS_ORIGINS=https://seu-dominio.com.br
#   WEB_PORT=8080 (porta interna que o proxy TLS vai acessar)
docker compose up -d --build
docker compose ps        # aguarde api e web "healthy"
```

Recomendações:
- Remova o mapeamento de porta da API (`ports` do serviço `api` no `docker-compose.yml`) — o acesso passa pelo `web`.
- Depois do primeiro acesso, troque a senha do administrador em "Meu perfil" e, se quiser, remova `ADMIN_PASSWORD` do `.env` (o seed não altera admins existentes).
- Ajuste `JWT_EXPIRES_IN` conforme a política de sessão.

## Atualizando para uma nova versão

```bash
git pull
docker compose up -d --build     # migrations novas são aplicadas no start da API
```

## Backup

```bash
# Banco
docker compose exec -T db pg_dump -U livrin_user -d livrin_db -Fc > backup-$(date +%F).dump
# Restaurar (banco vazio)
docker compose exec -T db pg_restore -U livrin_user -d livrin_db --clean --if-exists < backup-AAAA-MM-DD.dump

# Uploads (capas, obras, áudios)
docker run --rm -v livrin_uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

(O nome real do volume aparece em `docker volume ls`; com o `name: livrin` do compose ele é `livrin_uploads`.)

Faça backup do banco **e** dos uploads juntos: o banco guarda apenas o caminho dos arquivos.

## Logs e monitoramento

- `docker compose logs -f api` — cada requisição (`LOG_REQUESTS=true`) e erros com stack trace (somente no log; o cliente recebe mensagem genérica).
- `GET /health` responde `503` se o banco estiver fora — use em monitoramento externo.

## Checklist de segurança

- [ ] `POSTGRES_PASSWORD`, `JWT_SECRET` e `ADMIN_PASSWORD` fortes e exclusivos.
- [ ] `SEED_DEMO_DATA=false`.
- [ ] HTTPS na frente do `web`.
- [ ] `CORS_ORIGINS` com o domínio real.
- [ ] Porta da API e do banco não expostas publicamente.
- [ ] Backups automáticos agendados.
- [ ] `npm audit --omit=dev` sem vulnerabilidades (verificado nesta versão).

## Sem Docker

API: `npm ci && npm run build && npm run start:prod` com as variáveis de ambiente definidas (Node 20+). Front: `npm ci && npm run build` e sirva `web/dist` com qualquer servidor estático, fazendo proxy de `/api` e `/uploads` para a API e fallback de rotas para `index.html` (use `web/nginx.conf` como referência).
