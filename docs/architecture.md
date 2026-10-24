# Arquitetura

## Visão geral

Três serviços em container, um banco relacional, comunicação só por HTTP.

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Navegador      │     │  web (Nginx)         │     │ api (Node)   │
│  React + Vite   │────▶│  build estático      │────▶│ Express 5    │
│                 │     │  proxy /api /uploads │     │ TypeScript   │
└─────────────────┘     └──────────────────────┘     └──────┬───────┘
                                                            │
                                                     ┌──────▼───────┐
                                                     │ db           │
                                                     │ PostgreSQL16 │
                                                     └──────────────┘
```

O navegador fala **sempre com a mesma origem**. Quem encaminha `/api` e `/uploads` para a API é o Nginx em produção e o proxy do Vite em desenvolvimento. Por isso o CORS configurado quase nunca entra em ação — ele existe para quem resolver servir o front-end de outro domínio.

---

## Camadas

```
Frontend
   ↓
API / Backend
   ↓
Services
   ↓
Database
```

| Camada | Pasta | Responsabilidade | O que NÃO faz |
| --- | --- | --- | --- |
| **Frontend** | `web/src` | Interface, experiência, consumo da API, validação de experiência, apresentação dos dados | Não contém regra de negócio; esconder um botão é conveniência, não segurança |
| **Rotas** | `api/src/routes` | Mapa de URLs e quais middlewares cada uma atravessa | Não contém lógica |
| **Controllers** | `api/src/controllers` | Lê a requisição, valida com Zod, chama o serviço, devolve a resposta | Não acessa o banco, não decide regra |
| **Services** | `api/src/services` | Regras de negócio: permissões, transições, limites, cálculos | Não conhece Express, HTTP ou `req`/`res` |
| **Database** | `api/src/db` | Schema, migrations, seed, integridade, acesso via Drizzle | Não decide regra |

A separação é literal: um serviço lança `HttpError` e nunca toca em `res`; um controller nunca escreve SQL.

---

## Autenticação e autorização

```
Frontend
   ↓  Authorization: Bearer <token>
Autenticação
   ↓  usuário recarregado do banco
Autorização
   ↓  papel: LEITOR < ESCRITOR < ADMIN
Backend
   ↓
PostgreSQL
```

1. `POST /api/auth/login` valida a senha contra o hash bcrypt e devolve um **JWT** assinado com `JWT_SECRET` (HS256), contendo `sub` (id) e `role`, válido por `JWT_EXPIRES_IN`.
2. Em cada requisição protegida, `authenticate` valida a assinatura e **recarrega o usuário do banco**.
3. `requireRole` compara o papel **do banco** com o mínimo exigido pela rota.

O papel que vai dentro do token é ignorado na decisão. Isso custa uma consulta por requisição e entrega uma propriedade que vale a pena: desativar ou rebaixar uma conta tem efeito **imediato**, sem esperar o token expirar.

Hierarquia (`api/src/middlewares/auth.ts`): `LEITOR` 0 < `ESCRITOR` 1 < `ADMIN` 2. Uma rota marcada com `requireWriter` aceita escritor e administrador.

---

## O caminho de uma requisição

`POST /api/works` com o arquivo de uma obra:

1. **Nginx** reconhece `/api/` e encaminha para `api:3000`.
2. **Helmet** aplica os cabeçalhos de segurança; **CORS** avalia a origem.
3. **Rate limit** confere o limite por IP.
4. **`authenticate`** valida o token e carrega o usuário.
5. **`requireWriter`** recusa com `403` se o papel for `LEITOR`.
6. **`workUpload` (Multer)** grava os arquivos em `uploads/tmp` com nome UUID — o nome enviado pelo usuário nunca vira caminho em disco.
7. **Controller** valida o corpo com Zod.
8. **Service** confere o gênero, valida **a assinatura binária** de cada arquivo, move de `tmp` para a pasta definitiva e grava a obra em transação.
9. **Resposta** `201` com o DTO da obra — caminhos internos de arquivo nunca saem daqui.
10. Qualquer erro no caminho cai no tratador central, que também apaga os temporários da requisição.

---

## Arquivos

Dois lugares, de propósito:

- **Banco:** apenas o caminho relativo (`cover_path`, `file_path`, `audio_path`).
- **Volume `uploads`:** os bytes, em `covers/`, `works/`, `audio/` e `tmp/`.

Nomes em disco são UUID: evita colisão e path traversal. Capas são públicas e servidas como estático; arquivos de obra e áudio passam por rota com checagem de permissão.

### Integridade entre os dois

Os volumes `pgdata` e `uploads` têm ciclos de vida independentes e **podem sair de sincronia**. `api/src/db/integrity.ts` roda a cada subida: confere cada caminho registrado, recopia de `seed-assets` o que falta e limpa as referências órfãs. Sem isso — como acontecia até a versão 2.0.0 — o banco apontava para capas inexistentes e a interface exibia imagens quebradas permanentemente, sem reparo possível a não ser apagar o banco.

---

## Pagamentos

```
PaymentService
      ↓
PaymentProvider      (interface)
      ↓
Método de pagamento  (PIX, cartão, boleto)
```

`PaymentService` tem as regras — faixa de valores, registro, confirmação, estatísticas — e **não sabe como o dinheiro é cobrado**. `PaymentProvider` é a interface que um provedor precisa implementar: `createCharge` e `confirmCharge`.

Trocar de provedor é escrever uma classe e registrá-la em `PROVEDORES`, apontando `PAYMENT_PROVIDER` no ambiente. Nenhuma rota, controller ou tela muda.

Regra que vale para qualquer implementação futura: **dados de cartão não passam por esta aplicação**. O provedor devolve uma URL de checkout ou um código; a pessoa paga do lado dele; guardamos a referência da cobrança.

O provedor padrão, `simulado`, percorre o mesmo caminho sem movimentar dinheiro, e declara isso (`isReal: false`) para que a interface avise o usuário.

---

## Front-end

- **Estado do servidor:** TanStack Query. Cache por chave, revalidação e `placeholderData` nas listas paginadas. Chaves começando com `me` e `admin` são limpas no logout.
- **Estado local:** `useState` e dois contextos — sessão (`AuthContext`) e preferências de acessibilidade (`PreferencesContext`).
- **Rotas:** React Router. `RequireAuth` aceita um papel mínimo; a API valida de novo, sempre.
- **Carregamento sob demanda:** leitor (pdf.js/epub.js) e área administrativa só são baixados por quem os usa.
- **Design:** tokens CSS em `web/src/styles/global.css`, consumidos pelo Tailwind. O modo de alto contraste redefine os tokens e troca a interface inteira de uma vez.

---

## Decisões estruturais

| Decisão | Por quê |
| --- | --- |
| Monorepo com `api/`, `web/` e `e2e/` separados | Cada um tem seu ciclo de build e suas dependências; o compose junta tudo |
| Drizzle em vez de ORM pesado | SQL explícito e tipado, migrations versionadas em SQL legível |
| Validação com Zod nas duas pontas | O mesmo esquema valida corpo, query e variáveis de ambiente |
| `bcryptjs` em vez de `bcrypt` | Sem compilação nativa: instala igual em Windows, macOS e Alpine |
| Express 5 | Trata promessa rejeitada em rota `async` automaticamente; no 4 derrubava o processo |
| Erros como `HttpError` nos serviços | Mantém HTTP fora da regra de negócio e padroniza a resposta |
| `APROVADO` como único estado público | A aprovação publica, como pede a especificação; menos estados, menos chance de a obra ficar presa |

Registros completos em [decisions/](decisions/).
