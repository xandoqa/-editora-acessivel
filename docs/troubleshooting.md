# Problemas comuns

> **Está tentando rodar no Linux pela primeira vez?** Vá direto para o [passo a passo de Linux](rodar-no-linux.md) — ele é seguido, do zero até o navegador, e já traz a solução de cada erro no lugar onde ele aparece. Esta página aqui é por sintoma, para quando você já sabe o que deu errado.

> **Antes de tudo:** `docker compose version` (com espaço) precisa responder `v2.x` ou maior. Se só existir `docker-compose` com hífen, é a v1 descontinuada, que **não** entende este `docker-compose.yml` (ele usa `name:` no topo e `depends_on: condition: service_healthy`, da Compose Spec). Instale o plugin: `sudo apt install docker-compose-plugin` ou o equivalente da sua distribuição.

### `./iniciar.sh: Permission denied` (Linux/macOS)
O descompactador perdeu a permissão de execução — acontece com vários extratores gráficos e ao baixar o projeto por outros caminhos. **Solução:** `chmod +x iniciar.sh parar.sh`. Alternativa imediata, sem mexer em permissão: `sh iniciar.sh`.

### `./iniciar.sh: not found` ou `bad interpreter: No such file or directory`
O arquivo está com fim de linha do Windows (CRLF). **Solução:** `sed -i 's/\r$//' iniciar.sh parar.sh`. O mesmo vale para o `.env`: um `\r` invisível no fim de `POSTGRES_PASSWORD=...` entra na senha e o banco recusa a conexão. Se editou o `.env` no Bloco de Notas do Windows e o `db` parou de subir, rode `sed -i 's/\r$//' .env`.

### `permission denied while trying to connect to the Docker daemon socket` (Linux)
Seu usuário não está no grupo `docker`. **Solução recomendada:**

```bash
sudo usermod -aG docker $USER
# saia e entre na sessão de novo (ou, só para o terminal atual: newgrp docker)
```

Dá para usar `sudo ./iniciar.sh`, mas o `.env` criado pelo script fica pertencendo ao `root` e exige `sudo` para ser editado depois. Se já aconteceu: `sudo chown $USER:$USER .env`.

### `no space left on device` durante o build
A primeira subida baixa e compila cerca de 1,5 GB. `docker system df` mostra o que está ocupado; `docker system prune` remove imagens e camadas sem uso. Para apagar também os volumes do projeto (**apaga o banco e os uploads**): `docker compose down -v`.

### A primeira execução parece travada
Ela não está: o `web` espera o `api` ficar `healthy`, que por sua vez espera o `db`. Entre o download das imagens, o `npm ci` e o build do front-end, dez minutos numa conexão comum são normais. `docker compose ps` em outro terminal mostra o progresso real de cada serviço.

### `required variable JWT_SECRET is missing a value` / `POSTGRES_PASSWORD is missing a value`

Acontece ao rodar `docker compose up` direto, sem ter criado o `.env`. O Compose não inventa valores para senha e segredo, e o projeto prefere falhar a subir com uma senha em branco.

**Solução mais simples:** use o script, que cria o `.env` e gera o `JWT_SECRET` sozinho.

```bash
./iniciar.sh            # Linux/macOS — ou iniciar.bat no Windows
```

**Se preferir na mão:**

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# cole a saída na linha JWT_SECRET= do .env
docker compose up --build
```

Sem Node instalado, serve `openssl rand -hex 48`.

### Docker não inicia / `Cannot connect to the Docker daemon`
- Abra o Docker Desktop e espere o status "running".
- Windows: habilite WSL2 (Docker Desktop → Settings → General → *Use the WSL 2 based engine*).
- Linux: `sudo systemctl start docker`; para usar sem `sudo`, adicione seu usuário ao grupo `docker`.

### Porta já em uso (`port is already allocated` / `address already in use`)
Descubra quem usa a porta: Linux/macOS `lsof -i :5173` · Windows `netstat -ano | findstr :5173`.
Descubra quem usa a porta também com `ss -ltnp | grep -E ':(5173|3000)'` (Linux moderno, no lugar do `lsof`).
Encerre o processo ou mude a porta no `.env` (`WEB_PORT=8080`, `API_PORT=3001`) e rode `docker compose up -d`. **Se mudar `WEB_PORT`, ajuste `CORS_ORIGINS` para a nova URL**, senão o front-end sobe mas a API recusa as requisições dele.
No `docker-compose.yml` padrão o banco **não** é exposto, então a 5432 não entra em conflito; `DB_PORT` só vale no `docker-compose.dev.yml`.

### PostgreSQL não conecta
- `docker compose ps`: o `db` precisa estar `healthy`. Veja `docker compose logs db`.
- **Mudou `POSTGRES_PASSWORD` depois do primeiro start?** O PostgreSQL só usa essa variável ao criar o volume. Volte a senha original ou recrie o banco (**apaga dados**): `docker compose down -v && docker compose up --build`.
- Sem Docker: confira `DATABASE_URL` em `api/.env` (host, porta, usuário, senha, banco) e se o serviço PostgreSQL está ativo. A API tenta reconectar por ~60 s antes de desistir.

### API encerra com "Variáveis de ambiente inválidas"
A mensagem lista cada variável com problema (ex.: `JWT_SECRET deve ter pelo menos 32 caracteres`). Corrija no `.env` e reinicie.

### Migration falhou
1. `docker compose logs api` — o erro do PostgreSQL aparece logo após "Falha ao aplicar migrations".
2. Veja o que já foi aplicado: `docker compose exec db psql -U livrin_user -d livrin_db -c 'select * from drizzle.__drizzle_migrations'`.
3. Em desenvolvimento, o caminho mais simples é recriar: `docker compose down -v && docker compose up --build` (ou `npm run db:reset` sem Docker).
4. Se você alterou o schema, confira se gerou a migration (`npm run db:generate`) e se o SQL gerado está correto.

### Front-end não acessa a API ("Não foi possível conectar ao servidor")
- `docker compose ps`: a `api` está `healthy`? `curl http://localhost:3000/health` deve responder `{"status":"ok","database":"ok"}`.
- Sem Docker: a API precisa estar em `http://localhost:3000` (ou ajuste `API_PROXY_TARGET` em `web/.env`) e o front deve ser aberto pelo Vite (`npm run dev`), que faz o proxy.
- Se usar `VITE_API_URL` apontando para outra origem, inclua a origem do site em `CORS_ORIGINS`.

### Usuário administrativo não consegue acessar
- O seed **só cria** o admin quando `ADMIN_EMAIL` e `ADMIN_PASSWORD` estão definidos e o e-mail ainda não existe. Ele não sobrescreve a senha de uma conta existente: se você trocou a senha em "Meu perfil", vale a nova.
- Crie/promova manualmente: `docker compose exec api node dist/scripts/create-admin.js --email voce@exemplo.com --password "SenhaForte123"`.
- Conta desativada? Outro admin pode reativá-la em Administração → Usuários (ou use o script acima, que reativa).
- Quem não é `ADMIN` é redirecionado ao catálogo ao abrir `/admin` — saia e entre com a conta administrativa.

### "Sessão inválida ou expirada"
O token expirou (`JWT_EXPIRES_IN`) ou `JWT_SECRET` mudou. Faça login novamente.

### Upload falha
- "Arquivo muito grande": aumente `MAX_UPLOAD_MB` (API) — o Nginx aceita até 200 MB (`client_max_body_size` em `web/nginx.conf`); ajuste ambos se precisar de mais.
- "O conteúdo do arquivo não corresponde...": a extensão não bate com o conteúdo — alguém renomeou o arquivo (ex.: um `.zip` virou `.pdf`). Envie o arquivo real. Formatos aceitos: PDF, DOCX, EPUB, CBZ e CBR.

### O leitor não mostra a obra
- CBR (RAR) não é renderizado no navegador: o leitor oferece download.
- PDF protegido por senha não abre no pdf.js.
- Veja o console do navegador (F12) e `docker compose logs api`.

### A audiodescrição não fala
A narração sem faixa gravada usa a síntese de voz do navegador. Verifique se o navegador suporta (Chrome, Edge, Safari e Firefox recentes) e se há uma voz instalada; em Linux pode ser necessário instalar `speech-dispatcher`. O botão fica desativado quando não há suporte.

### Alterações no código não aparecem (modo dev em Docker)
Use o arquivo de sobrescrita: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`. Em Windows/macOS o polling já está ativado (`CHOKIDAR_USEPOLLING`). Se adicionou dependências, reconstrua: `... up --build`.

### `npm test` falha com "Recusado: o banco de testes precisa conter 'test'"
Defina `TEST_DATABASE_URL` apontando para um banco cujo nome contenha `test` (ele será apagado).
