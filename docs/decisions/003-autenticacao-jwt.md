# 003 — Autenticação JWT, bcrypt e RBAC

**Decisão.** JWT (HS256) no header `Authorization: Bearer`, emitido no login/cadastro, com `sub` e `role`; senhas com **bcryptjs**; papéis `USER` e `ADMIN`; a cada requisição autenticada o usuário é **recarregado do banco** (estado ativo e papel atuais). Rotas `/api/admin` protegidas por `authenticate` + `requireAdmin`.

**Alternativas.** Sessões no servidor com cookie `httpOnly` (mais resistente a XSS, mas exige store de sessão e proteção CSRF); cookies `httpOnly` com JWT; provedores externos (Auth0, Keycloak) — excessivo para o escopo.

**Por que.** Mantém o modelo do projeto original (JWT no header + Context API), é simples de operar sem estado no servidor e funciona igual em desenvolvimento e produção atrás do proxy. Recarregar o usuário custa uma consulta indexada por requisição, mas resolve o principal problema de JWT puro: revogação (desativar ou rebaixar tem efeito imediato).

**bcryptjs vs bcrypt.** O projeto original usava `bcrypt` (nativo), que depende de binários pré-compilados/compilação — fonte comum de falhas em Alpine, Windows e Apple Silicon. `bcryptjs` é JavaScript puro, compatível com os mesmos hashes.

**Trade-off assumido.** O token fica em `localStorage`, logo um XSS conseguiria lê-lo. Mitigações: React escapa conteúdo por padrão, não há `dangerouslySetInnerHTML`, EPUBs são renderizados sem scripts, Helmet na API e cabeçalhos no Nginx, expiração curta configurável. Evolução recomendada para produção de maior risco: cookie `httpOnly` + `SameSite=strict`.

**Outros controles.** Cadastro nunca aceita `role`; mensagens de login genéricas e tempo de resposta equalizado; rate limit em login/cadastro; segredo com mínimo de 32 caracteres validado no start.
