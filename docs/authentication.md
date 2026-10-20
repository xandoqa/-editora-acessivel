# Autenticação e autorização

## Como funciona o login

1. O usuário envia e-mail e senha para `POST /api/auth/login`.
2. A API busca o usuário pelo e-mail (normalizado em minúsculas) e compara a senha com o **hash bcrypt** armazenado (`password_hash`). Quando o e-mail não existe, a comparação é feita contra um hash fictício para que o tempo de resposta não revele quais e-mails estão cadastrados; a mensagem de erro é sempre a mesma.
3. Se a senha confere e a conta está ativa, a API devolve um **JWT** assinado com `JWT_SECRET` (HS256), contendo `sub` (id do usuário) e `role`, válido por `JWT_EXPIRES_IN` (padrão 1 dia), além dos dados públicos do usuário.
4. O front-end guarda o token em `localStorage` (`livrin_token`) e o envia em todas as requisições no header `Authorization: Bearer <token>` (interceptor do axios em `web/src/lib/api.ts`).
5. Ao abrir o app, o `AuthContext` chama `GET /api/auth/me` para revalidar a sessão; se a API responder `401` (token expirado, conta desativada), a sessão é encerrada no navegador.

Cadastro (`POST /api/auth/register`) cria **sempre** um usuário `USER` — o campo `role` é rejeitado pela validação, impedindo que alguém se torne administrador pelo cadastro.

## Como o back-end valida cada requisição

`api/src/middlewares/auth.ts`:

| Middleware | Uso |
| --- | --- |
| `authenticate` | Exige token válido. Verifica assinatura/expiração **e recarrega o usuário do banco**: contas desativadas ou removidas recebem `401` imediatamente, e o papel considerado é sempre o atual do banco (rebaixar um admin tem efeito na hora). |
| `optionalAuth` | Rotas públicas que se comportam diferente para o dono/admin (ex.: ver rascunho no leitor). Token inválido é ignorado (visitante). |
| `requireAdmin` | Exige `role = ADMIN` (`403` caso contrário). Aplicado a **todo** o roteador `/api/admin`. |

Além disso, as regras de propriedade (o autor só altera as próprias obras) ficam nos serviços (`work-policy.ts`). Obras não publicadas retornam `404` para terceiros, sem revelar que existem.

> O front-end esconde menus e redireciona rotas (`RequireAuth`), mas **isso é apenas conveniência**: toda permissão é verificada na API, mesmo que alguém chame os endpoints diretamente (curl, Postman).

## Níveis de acesso

| Perfil | Pode |
| --- | --- |
| Visitante | Catálogo, leitura de obras publicadas, download de obras publicadas, cadastro/login. |
| `USER` (autor/leitor) | Tudo do visitante + submeter e gerenciar as próprias obras, audiodescrição das próprias obras (conforme status), acompanhar a análise, conversar com a curadoria, publicar obras aprovadas, avaliar obras de outros autores, editar perfil/senha. |
| `ADMIN` (curadoria) | Tudo + área `/admin`: todas as obras e transições de status, checklist e notas, audiodescrição de qualquer obra, usuários (criar, editar, papéis, ativar/desativar, redefinir senha, excluir), gêneros, moderação de avaliações, dashboard. |

## Rotas por nível

- **Públicas:** `POST /auth/register`, `POST /auth/login`, `GET /genres`, `GET /works`, `GET /works/:id/feedbacks`, `PATCH /sessions/:id`, `GET /health`, `GET /uploads/covers/*`.
- **Opcionais (👤):** `GET /works/:id`, `/file`, `/audio`, `/audio-descriptions`, `POST /works/:id/sessions`.
- **Autenticadas:** `/auth/me*`, `/me/*`, `POST/PATCH/DELETE /works*`, `/works/:id/submit|publish|review*`, escrita de audiodescrição e avaliações.
- **Administrativas:** `/api/admin/*`.

Mapa completo comentado em `api/src/routes/index.ts` e `api/src/routes/admin/index.ts`.

## Criar um administrador com segurança

1. **No primeiro start:** defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`. O seed cria a conta se o e-mail ainda não existir (e nunca altera uma conta existente).
2. **Pela linha de comando** (cria ou promove um usuário existente e o reativa):
   ```bash
   # Docker (imagem de produção)
   docker compose exec api node dist/scripts/create-admin.js --email ana@exemplo.com --password "SenhaForte123" --name "Ana"
   # Desenvolvimento
   cd api && npm run admin:create -- --email ana@exemplo.com --password "SenhaForte123"
   ```
3. **Pela interface:** um administrador cria/promove outros em **Administração → Usuários**.

Proteções: um admin não pode remover o próprio acesso nem excluir a própria conta, e o sistema sempre mantém ao menos um administrador ativo.

## Recuperação de senha

Não há envio de e-mail (nenhum serviço SMTP configurado). A tela "Esqueceu a senha?" orienta o usuário a contatar a administração, que redefine a senha em **Administração → Usuários → 🔑**. O usuário depois troca a senha em **Meu perfil**. Ver limitações no relatório final/CHANGELOG.

## Boas práticas aplicadas

- Senhas com bcrypt (custo `BCRYPT_ROUNDS`, padrão 10); nunca retornadas pela API.
- `JWT_SECRET` obrigatório com no mínimo 32 caracteres (a API não inicia sem ele).
- Rate limit em login/cadastro (20 tentativas / 15 min por IP).
- Mensagens de erro de login genéricas.
- Considerações sobre o armazenamento do token em `localStorage` estão em [decisions/003-autenticacao-jwt.md](decisions/003-autenticacao-jwt.md).
