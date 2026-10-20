# 008 — Mudanças em relação ao código recebido

O pacote `livrin_projeto_completo.zip` tinha a estrutura correta, mas o relatório de transição e a análise mostraram partes simuladas, quebradas ou inseguras. Principais mudanças (todas preservando o comportamento esperado pelo usuário):

| No código recebido | Problema | O que foi feito |
| --- | --- | --- |
| `POST /auth/register` aceitava `role` do cliente | Qualquer pessoa podia se cadastrar como ADMIN | Papel sempre `USER`; schema estrito rejeita `role` |
| `JWT_SECRET` com valor fixo e fallback `'super_secret'` | Credencial no código | Obrigatório via ambiente, mínimo 32 caracteres |
| `GET /works/:id` público para qualquer status | Expunha obras em análise | Visibilidade por status/autor/admin (404 para terceiros) |
| `PATCH /admin/works/:id/status` aceitava qualquer texto | Status inválidos no banco | Enum no banco + máquina de estados validada |
| Rotas `async` sem tratamento de erro (Express 4) | Requisições travavam/derrubavam o processo | Express 5 + tratador central |
| `drizzle-kit push:pg` + seed não idempotente | Banco não reproduzível; seed duplicava dados | Migrations versionadas aplicadas no start + seed idempotente |
| Dashboard do autor com números fixos (4.850, 4.9) | Mock | Métricas reais (sessões de leitura e avaliações) |
| Upload apenas visual; leitor com conteúdo fixo | Mock | Upload real validado; leitor PDF/EPUB/CBZ; audiodescrição no banco |
| Player de áudio decorativo | Mock | Player real (faixa enviada ou voz sintetizada) |
| Fluxo de avaliação com etapas fixas | Mock | Checklist e notas reais da curadoria |
| "Cadastre-se", "Esqueceu a senha?", busca, filtros sem ação | Mock | Implementados (recuperação via administração — sem SMTP) |
| Admin só aprovava/rejeitava | Incompleto | Área administrativa completa (obras, usuários, gêneros, avaliações) |
| Layout com barra superior simples | Divergia do protótipo | Barra lateral + barra superior do protótipo, responsivo |
| Status `APROVADO` = publicado | Divergia do protótipo (que tem "Aprovado pelo Comitê" → "Publicar Definitivamente") | Separados `APROVADO` e `PUBLICADO`, mais `RASCUNHO`, `REJEITADO`, `ARQUIVADO` |
| `bcrypt` nativo | Falhas de instalação em Alpine/ARM/Windows | `bcryptjs` |
| Credenciais de login pré-preenchidas no formulário | Exposição de credenciais | Removidas |

Textos e identidade visual do protótipo foram mantidos; onde o protótipo tinha dados conflitantes (ex.: autoria de "Além das Estrelas" diferente entre telas), os dados de demonstração escolheram uma versão coerente.
