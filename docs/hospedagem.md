# Hospedagem gratuita

Como publicar o Livrin sem pagar nada, o que funciona bem nesse arranjo e o que
**não** funciona. Escrito em 02/11/2026; camada gratuita muda, então confira os
limites antes de seguir.

> **Antes de tudo:** para uma apresentação com hora marcada, rodar localmente
> é mais confiável do que qualquer camada gratuita. Publique depois, com calma,
> para o repositório e o portfólio. O motivo está na seção "Os dois problemas
> que a camada gratuita traz".

## Se o problema é a rede do lugar, não falta de servidor

Vale conferir isto antes de hospedar coisa alguma, porque resolve o caso mais
comum e não depende de provedor nenhum.

Rede de faculdade, de evento ou de hotel costuma bloquear download de pacotes.
Como o `iniciar.sh` termina em `docker compose up --build`, e `--build` roda
`npm ci` dentro do contêiner, **é o build que falha nesses lugares, não o
Docker.** O sintoma engana: parece que o Docker não sobe.

Imagem já construída sobe sem rede nenhuma, e é o que o `apresentar.sh` faz:

```bash
./iniciar.sh        # uma vez, em casa, numa rede que funcione
./apresentar.sh     # no lugar da apresentação — sem reconstruir, sem internet
```

Nada no front busca fonte ou CDN em tempo de execução, então catálogo, leitura,
audiodescrição, temas, idiomas e Fale Conosco funcionam offline. A exceção é a
janela de Libras, que depende do VLibras e avisa na hora quando não há rede.

**Teste com o wi-fi desligado antes do dia**, em vez de descobrir na hora.

## O arranjo

O Livrin tem três partes, e cada uma vai para um lugar diferente.

| Parte | Onde | Por quê |
| --- | --- | --- |
| Front (React compilado) | Render Static Site, Cloudflare Pages ou Vercel | São arquivos servidos por CDN. Não existe servidor para dormir |
| Banco (PostgreSQL) | **Neon** | Gratuito permanente, sem cartão, 1 GB. Acorda em milissegundos |
| API (Node + Express) | Render, plano gratuito | É o elo fraco. Ver a seção dos problemas |

**Por que Neon e não o Postgres da Render:** o banco gratuito da Render
**expira 30 dias depois de criado** e depois é apagado. O da Neon é permanente
e suspende a computação após 5 minutos parado, voltando na primeira consulta.

## Passo a passo

### 1. Banco na Neon

1. Crie conta em neon.com (não pede cartão) e um projeto novo.
2. Copie a *connection string* — algo como
   `postgresql://usuario:senha@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require`.
3. Guarde: ela vira a `DATABASE_URL` da API.

Escolha a região mais perto do Brasil que estiver disponível. Banco longe da
API significa cada consulta atravessando o oceano duas vezes.

### 2. API na Render

Crie um **Web Service** apontando para o repositório, com:

| Campo | Valor |
| --- | --- |
| Runtime | Docker |
| Dockerfile Path | `api/Dockerfile` |
| Docker Context | `api` |
| Instance Type | Free |

E estas variáveis de ambiente:

```
DATABASE_URL=<a connection string da Neon>
JWT_SECRET=<48 bytes aleatórios>
CORS_ORIGINS=https://<endereco-do-front>
NODE_ENV=production
TRUST_PROXY=true
UPLOAD_DIR=/app/uploads
SEED_DEMO_DATA=true
DEMO_USER_PASSWORD=<a mesma senha do .env local>
ADMIN_EMAIL=<seu e-mail de admin>
ADMIN_PASSWORD=<a mesma senha do .env local>
```

O `JWT_SECRET` sai de:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**`CORS_ORIGINS` precisa ter a URL exata do front**, com `https://` e sem barra
no fim. Errar isso faz a API recusar todas as chamadas do navegador, e o
sintoma é um site que carrega e não mostra obra nenhuma.

O `start:prod` do projeto já roda migração, seed e verificação de integridade
antes de subir o servidor, então o banco é preparado sozinho no primeiro
arranque.

### 3. Front

Crie um **Static Site** no mesmo provedor:

| Campo | Valor |
| --- | --- |
| Build Command | `cd web && npm ci && npm run build` |
| Publish Directory | `web/dist` |

E **duas** regras de reescrita, não uma:

| Origem | Destino |
| --- | --- |
| `/api/*` | `https://<endereco-da-api>/api/*` |
| `/uploads/*` | `https://<endereco-da-api>/uploads/*` |

A segunda é a que todo mundo esquece. As capas das obras vêm da API como
caminho relativo (`/uploads/covers/<id>.webp`, ver `storage.service.ts`), então
sem essa regra o navegador pede a imagem ao host do front e recebe 404 — o
catálogo abre com todas as capas quebradas.

Para funcionar como aplicação de página única, acrescente também:

| Origem | Destino | Ação |
| --- | --- | --- |
| `/*` | `/index.html` | Rewrite |

Sem isso, abrir `https://seusite/autores` direto na barra de endereço dá 404:
o servidor procura um arquivo chamado `autores` que não existe.

**Alternativa às reescritas:** compilar com `VITE_API_URL=https://<api>/api`.
Resolve o `/api`, mas **não** resolve o `/uploads` — as capas continuariam
quebradas. Por isso a reescrita é o caminho recomendado.

### 4. Fale Conosco (opcional)

As mesmas variáveis do `.env` local, no painel da Render:

```
CONTATO_EMAIL_DESTINO=<seu e-mail>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<seu e-mail>
SMTP_PASS=<senha de app de 16 letras>
```

Sem elas o formulário continua funcionando: a mensagem é gravada e aparece em
Administração → Fale Conosco.

## Os dois problemas que a camada gratuita traz

### Problema 1 — a API dorme

Serviço gratuito **dorme depois de 15 minutos sem acesso** e leva cerca de **um
minuto** para acordar, mostrando uma tela de carregamento do provedor. Quem
abrir o site nesse minuto acha que está quebrado.

**O que fazer numa demonstração:** abra o site meia hora antes e deixe uma aba
recarregando de vez em quando. Não existe jeito gratuito e honesto de evitar
isso — serviços de "ping" que mantêm o serviço acordado consomem as 750 horas
mensais e violam os termos da maioria dos provedores.

### Problema 2 — os arquivos das obras somem

Este é específico do Livrin e é o mais importante de entender.

Serviço gratuito **não tem disco persistente**: o conteúdo de `uploads/` é
apagado a cada reinício, e reinício acontece sempre que o serviço acorda de um
cochilo. O banco, que está na Neon, sobrevive.

A consequência não é óbvia. O `seed` roda a cada arranque, procura o usuário de
demonstração, **encontra** (porque o banco sobreviveu) e registra no log:

```
Dados de demonstração já existem: seed de demonstração ignorado.
```

Ou seja: ele **não recopia os arquivos**. Fica um banco apontando para capas e
PDFs que não existem mais. O sintoma é catálogo com capas quebradas e "arquivo
não encontrado" ao abrir qualquer obra.

**Contorno imediato:** apagar os dados do banco e reimplantar. O seed roda do
zero e recria tudo. Mas isso volta a acontecer no cochilo seguinte.

**Correção de verdade (trabalho futuro):** guardar os arquivos fora do disco do
contêiner. A Neon inclui 5 GB de object storage no plano gratuito, e seria o
destino natural. Mexe no `storage.service.ts`, que é o módulo que controla
acesso a obra paga — então é mudança para fazer com calma e com teste, nunca na
véspera de uma apresentação.

## Resumo do que esperar

| | Local (`./iniciar.sh`) | Hospedagem gratuita |
| --- | --- | --- |
| Primeiro acesso | imediato | até 1 minuto |
| Capas e arquivos das obras | sempre | quebram no primeiro cochilo |
| Banco | persistente | persistente (Neon) |
| Fale Conosco | funciona | funciona |
| Custo | zero | zero |
| Bom para | apresentar | mostrar o projeto no portfólio |

O que faria a hospedagem gratuita virar uma opção boa de verdade é resolver o
problema 2. O problema 1 é inerente à camada gratuita e só se resolve pagando
(a partir de 7 dólares por mês, na Render).

## Fontes consultadas

- [Is Render Free? Free Tier Limits, Sleep, and the 30-Day DB](https://justinmckelvey.com/blog/is-render-free) — 15 min de inatividade, ~1 min para acordar, Postgres gratuito expirando em 30 dias, ausência de disco persistente, 750 horas e 5 GB de tráfego por mês.
- [Neon Pricing Plans](https://neon.com/pricing) — plano gratuito permanente, sem cartão, 1 GB por projeto, suspensão após 5 minutos com retorno em milissegundos.
- [Best practice for Static + API + DB? (Render Community)](https://community.render.com/t/best-practice-for-static-api-db/1654) — reescrita de site estático para outro serviço funcionando, com o custo de latência relatado.
