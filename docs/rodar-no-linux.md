# Rodar o Livrin no Linux — passo a passo

Do zero até o sistema aberto no navegador. Cada passo traz o comando e, logo abaixo, o que fazer quando ele falha — você não precisa procurar em outro arquivo.

Os erros listados aqui não são hipotéticos: são os que apareceram de verdade, em máquinas de verdade, com a explicação do que cada um significa.

---

## Do zero, em um bloco

Numa máquina Ubuntu, Debian ou Mint recém-instalada, a sequência inteira é esta:

```bash
# 1. Docker (uma única vez na vida da máquina)
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker

# 2. Conferir
docker compose version     # precisa dizer v2.x ou maior
docker info > /dev/null && echo "Docker OK"

# 3. Entrar na pasta e subir
cd ~/Documentos/livrin
chmod +x iniciar.sh parar.sh
./iniciar.sh
```

Depois abra **<http://localhost:5173>**.

Se algum comando reclamou, o passo correspondente abaixo explica por quê.

> **Dica antes de começar:** prefira **digitar** os comandos, ou colar com **Ctrl+Shift+V**. Colar com `Ctrl+V` ou com o botão do meio faz alguns terminais inserirem caracteres invisíveis de controle, e o resultado é um `^[[200~sudo: comando não encontrado` que não tem nada a ver com o projeto.

---

## 1. Instale o Docker

Só isso precisa estar instalado. Node, PostgreSQL e todas as dependências do projeto ficam dentro dos contêineres — nada é instalado na sua máquina.

**Você não precisa do Docker Desktop.** Ele existe para Windows e macOS, onde roda uma máquina virtual Linux por baixo; no Linux o motor é nativo. São duas peças, e as duas são necessárias:

| Peça | O que faz | Pacote |
| --- | --- | --- |
| **Docker Engine** | o serviço que de fato roda os contêineres | `docker.io` (ou `docker-ce`) |
| **Compose v2** | plugin do CLI que lê o `docker-compose.yml` e orquestra os três serviços | `docker-compose-plugin` |

O Compose sozinho não executa nada: ele dá as ordens, o Engine executa.

```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin     # Debian, Ubuntu, Mint
sudo systemctl enable --now docker
```

Em Fedora: `sudo dnf install docker docker-compose-plugin`. Em Arch: `sudo pacman -S docker docker-compose`.

O `enable --now` faz duas coisas: inicia o serviço agora e deixa ele subindo sozinho a cada boot. Sem o `enable`, você teria que rodar `sudo systemctl start docker` toda vez que ligasse o computador.

---

## 2. Dê a si mesmo permissão de usar o Docker

Este passo é o que mais trava gente, porque o sintoma não parece ser de permissão.

```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Por que é preciso:** o Docker conversa por um socket (`/var/run/docker.sock`) que pertence ao grupo `docker`. Quem não está no grupo recebe `permission denied` — e, dependendo do comando, uma mensagem que parece dizer que o serviço não está rodando.

O `newgrp docker` vale **só no terminal atual**. Para valer em todos, saia da sessão e entre de novo (logout e login de verdade; fechar a janela do terminal não basta).

### Confirme que as duas peças respondem

```bash
docker compose version     # o plugin → "Docker Compose version v2.29.0" ou parecido
docker info > /dev/null && echo "Docker OK"
```

Se o `docker info` falhar, este teste diz qual é o problema:

```bash
sudo docker info > /dev/null && echo "o serviço roda; o que falta é permissão"
```

- **Imprimiu a mensagem** → o serviço está no ar e o que falta é a permissão. Volte aos dois comandos do início deste passo.
- **Falhou também com `sudo`** → o serviço não está rodando. `sudo systemctl enable --now docker`.

> Dá para usar `sudo ./iniciar.sh` e pular a parte do grupo, mas aí o `.env` criado pelo script fica pertencendo ao `root`, e você vai precisar de `sudo` para editá-lo depois. Se já aconteceu: `sudo chown $USER:$USER .env`.

### Se o `docker compose version` disser `command not found`

Falta o plugin. `sudo apt install docker-compose-plugin`.

### Se responder `docker-compose version 1.x`

Isso é o `docker-compose` antigo, com hífen — versão descontinuada que **não** entende o arquivo deste projeto, porque ele usa `name:` no topo e `depends_on: condition: service_healthy`, recursos da Compose Spec. Instale o plugin novo e use `docker compose`, com espaço.

---

## 3. Entre na pasta certa

**Se você extraiu o `.zip`:**

```bash
cd ~/Documentos/livrin
ls
```

Se o seu sistema estiver em inglês, é `~/Documents/livrin`.

O `ls` tem que mostrar, **no mesmo nível**: `api`, `web`, `docs`, `docker-compose.yml`, `iniciar.sh`.

> **Extraia sempre numa pasta vazia e nova.** Descompactar por cima de uma pasta que já tinha outra versão do projeto deixa arquivos antigos no meio dos novos — e o build quebra com erros de TypeScript em arquivos que nem deveriam existir. Para checar uma pasta de que você desconfia: `ls api/src/*.ts` tem que mostrar **só** `app.ts` e `server.ts`.

**Se aparecer uma pasta `livrin` dentro da pasta `livrin`**, o descompactador criou um nível a mais — ou o arquivo foi extraído duas vezes. Entre na de dentro:

```bash
cd livrin
ls            # agora sim: api, web, docs, docker-compose.yml, iniciar.sh
```

Rodar o `./iniciar.sh` do nível errado faz o script parar dizendo que não achou o `.env.example`.

**Se você clonou pelo Git:**

```bash
git clone https://github.com/xandoqa/-editora-acessivel.git
cd ./-editora-acessivel
```

O `./` é necessário: o nome do repositório começa com hífen, e sem ele o `cd` tenta ler `-editora-acessivel` como opção de comando. O mesmo vale para qualquer outro comando que receba esse nome.

---

## 4. Dê permissão de execução aos scripts

```bash
chmod +x iniciar.sh parar.sh
```

**Por que:** a maioria dos descompactadores gráficos descarta a permissão de execução ao extrair um `.zip`. Sem ela, `./iniciar.sh` responde `Permission denied`.

Quem clonou pelo Git pode pular — o Git guarda a permissão, e os dois scripts já vêm executáveis.

Se preferir não mexer em permissão nenhuma, `sh iniciar.sh` funciona nos dois casos.

**Se aparecer `bad interpreter: No such file or directory`:** o arquivo está com fim de linha do Windows. `sed -i 's/\r$//' iniciar.sh parar.sh`.

---

## 5. Suba o sistema

```bash
./iniciar.sh
```

> **Use o script, não `docker compose up` direto.** O `docker compose up` sozinho falha com `required variable JWT_SECRET is missing a value`, porque o `.env` ainda não existe — e o Compose não inventa senha nem segredo. É o `iniciar.sh` que cria esse arquivo e gera um `JWT_SECRET` aleatório exclusivo da sua instalação. Nenhum segredo vem pronto dentro do projeto.

O script confere quatro coisas antes de tentar qualquer coisa — Docker instalado, plugin Compose v2, daemon acessível, pasta correta — e, se algo faltar, ele para, **nomeia o motivo** e dá só os comandos daquele caso.

**A primeira execução demora.** Baixa e compila cerca de 1,5 GB entre imagens e dependências; dez minutos numa conexão comum é normal. Nas próximas vezes são segundos.

**Parece travado, mas não está.** O contêiner `web` espera o `api` ficar saudável, que por sua vez espera o banco responder. Enquanto isso a tela fica parada. Para ver o progresso de verdade, abra outro terminal:

```bash
cd ~/Documentos/livrin
docker compose ps
```

**Se aparecer `port is already allocated`:** outra coisa já ocupa a porta 5173 ou a 3000.

```bash
ss -ltnp | grep -E ':(5173|3000)'     # descobre quem está usando
```

Encerre esse processo, ou mude as portas no arquivo `.env`:

```bash
WEB_PORT=8080
API_PORT=3001
CORS_ORIGINS=http://localhost:8080    # precisa acompanhar o WEB_PORT
```

O PostgreSQL **não** é exposto, então a porta 5432 nunca entra em conflito.

**Se aparecer `no space left on device`:** `docker system df` mostra o que está ocupado e `docker system prune` libera o que não é mais usado.

---

## 6. Entre no sistema

Abra **<http://localhost:5173>** (ou a porta que você colocou em `WEB_PORT`).

| Perfil | E-mail | Senha | O que pode fazer |
| --- | --- | --- | --- |
| Administrador | `admin@livrin.local` | `Livrin.Dev2026` | Curadoria, usuários, gêneros, apoios |
| Escritora | `marina@livrin.com` | `Demo.Livrin2026` | Publicar e acompanhar as próprias obras |
| Leitor | `lucas@livrin.com` | `Demo.Livrin2026` | Catálogo, leitura e avaliação |

São credenciais de desenvolvimento, criadas de propósito para o projeto poder ser avaliado logo depois da instalação. Troque todas antes de qualquer uso real (veja [deployment.md](deployment.md)).

Para ver o leitor de `.docx` funcionando, entre como `caua@livrin.com` (mesma senha das demais contas de demonstração) e abra *O Alfabeto das Coisas Pequenas*, no painel. É um manuscrito em Word, em análise. Mude a tipografia, a escala e a paleta no leitor: o texto reflui de verdade, coisa que um PDF não faz.

---

## 7. Parar e voltar depois

```bash
./parar.sh
```

Ou `Ctrl+C` no terminal onde o sistema está rodando. Nenhum dado é perdido: o banco e os arquivos enviados ficam em volumes do Docker. Para subir de novo, `./iniciar.sh` — desta vez em segundos.

Para apagar tudo e começar do zero (**apaga o banco e os uploads**):

```bash
docker compose down -v
./iniciar.sh
```

---

## Erros que já apareceram, e o que cada um quer dizer

| O que aparece na tela | O que é | O que fazer |
| --- | --- | --- |
| `required variable JWT_SECRET is missing a value` | você rodou `docker compose up` direto; o `.env` não existe | `./iniciar.sh` |
| `POSTGRES_PASSWORD variable is not set. Defaulting to a blank string` | o mesmo caso acima | `./iniciar.sh` |
| `Não consegui falar com o Docker` (do próprio script) | o script já diz na linha seguinte se é serviço parado ou permissão | siga os comandos que ele imprime |
| `permission denied ... /var/run/docker.sock` | seu usuário não está no grupo `docker` | `sudo usermod -aG docker $USER` + `newgrp docker` |
| `Cannot connect to the Docker daemon` | o serviço não está rodando | `sudo systemctl enable --now docker` |
| `./iniciar.sh: Permission denied` | o `.zip` perdeu a permissão de execução | `chmod +x iniciar.sh parar.sh` |
| `bad interpreter: No such file or directory` | fim de linha do Windows no script | `sed -i 's/\r$//' iniciar.sh parar.sh` |
| `Não achei o .env.example nesta pasta` | você está um nível acima ou abaixo do projeto | `ls` e `cd` até ver `api`, `web` e `docker-compose.yml` juntos |
| `port is already allocated` | 5173 ou 3000 ocupada | mude `WEB_PORT`/`API_PORT` no `.env` (e o `CORS_ORIGINS` junto) |
| `no space left on device` | disco cheio durante o build | `docker system prune` |
| `^[[200~sudo: comando não encontrado` | o terminal colou caracteres de controle junto | digite o comando, ou cole com `Ctrl+Shift+V` |
| `sudo: system: comando não encontrado` | erro de digitação: é `systemctl`, tudo junto | `sudo systemctl start docker` |

---

## Resumo dos comandos

| Para | Comando |
| --- | --- |
| Conferir o plugin do Compose | `docker compose version` |
| Conferir o serviço do Docker | `docker info > /dev/null && echo OK` |
| Descobrir se é falta de permissão | `sudo docker info > /dev/null && echo "é permissão"` |
| Subir | `./iniciar.sh` |
| Parar | `./parar.sh` |
| Ver o estado dos contêineres | `docker compose ps` |
| Ver os logs da API | `docker compose logs api` |
| Apagar tudo e recomeçar | `docker compose down -v` |

Problemas que não são específicos de Linux estão em [troubleshooting.md](troubleshooting.md).
