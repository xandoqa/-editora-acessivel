# Editora Livrin — API + Front (v1, TypeScript)

Primeira versão funcional da API e do frontend web da Editora Livrin,
seguindo as telas do protótipo (login, catálogo, detalhe da obra,
submissão de obra, acompanhamento editorial e painel do autor).

## Estrutura

```
livrin/
├── api/    # Node + Express + TypeScript (porta 3333)
└── front/  # React + TypeScript + Vite (porta 5173)
```

## Rodando a API

```bash
cd api
npm install
npm run dev        # http://localhost:3333
```

Conta de exemplo já cadastrada (seed em `src/data/store.ts`):
- `marina@livrin.app` / `livrin123` (autor)
- `lorena@livrin.app` / `livrin123` (autor)

Endpoints principais:
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastro de autor/leitor |
| POST | `/api/auth/login` | Login (retorna JWT) |
| GET  | `/api/auth/me` | Usuário autenticado |
| GET  | `/api/works` | Catálogo público (`?genre=`, `?q=`) |
| GET  | `/api/works/:id` | Detalhe de obra publicada |
| POST | `/api/works` | Enviar obra para análise (autor) |
| GET  | `/api/works/me/dashboard` | Painel do autor (stats + obras) |
| GET  | `/api/works/me/pending` | Obras em análise do autor |
| GET  | `/api/works/me/:id/review` | Status do fluxo editorial de uma obra |

Dados em memória por enquanto — reinicia ao reiniciar o processo. A troca
para um banco real (ex. Postgres + Prisma) não deve exigir mudanças nas
rotas, só em `src/data/store.ts`.

## Rodando o Front

Em outro terminal, com a API já rodando:

```bash
cd front
npm install
npm run dev         # http://localhost:5173
```

O Vite já está configurado com proxy de `/api` → `http://localhost:3333`
(`vite.config.ts`), então não é preciso configurar CORS/base URL manualmente
em desenvolvimento.

## Telas implementadas nesta v1

- **Entrar / Cadastrar** — fiel ao protótipo, incluindo o alerta de
  "Falha na autenticação".
- **Início / Catálogo** — grade de obras publicadas com filtro por gênero.
- **Detalhe da obra** — sinopse, formatos e selos de acessibilidade.
- **Meu Painel** — estatísticas do autor (obras ativas, leitores, índice
  de acessibilidade) e lista do acervo.
- **Publicar Obra** — formulário de submissão com os checkboxes de
  recursos de acessibilidade pré-existentes.
- **Em Análise** — acompanhamento das 3 etapas do fluxo editorial, com
  notas dos pareceristas.

## Próximos passos sugeridos

- Persistência real (Postgres/Prisma) no lugar do store em memória.
- Upload de arquivo (PDF/EPUB/CBZ) na submissão, hoje só os metadados.
- Tela de leitor acessível (áudio, alto contraste, Libras) — hoje é um
  placeholder de detalhe da obra.
- Testes automatizados (Vitest/Supertest na API, Testing Library no front).
