# Rodar o Livrin no Linux

Esta página é um passo a passo seguido, do zero até o sistema aberto no navegador. Cada passo tem o comando e, logo abaixo, o que fazer se der errado — você não precisa procurar em outro arquivo.

Se você só quer os três comandos:

```bash
cd ~/Documentos/livrin
chmod +x iniciar.sh parar.sh
./iniciar.sh
```

Se funcionou, pule para o [passo 5](#5-entre-no-sistema).

---

## 1. Tenha o Docker rodando

Só isso precisa estar instalado. Node, PostgreSQL e todas as dependências do projeto ficam dentro dos contêineres — nada é instalado na sua máquina.

**Você não precisa do Docker Desktop.** Ele existe para Windows e macOS, onde roda uma máquina virtual Linux por baixo; no Linux o motor é nativo. São duas peças, e as duas são necessárias:

| Peça | O que faz |
| --- | --- |
| **Docker Engine** | o serviço que de fato roda os contêineres |
| **Compose v2** | plugin do CLI que lê o `docker-compose.yml` e orquestra os três serviços |

O Compose sozinho não roda nada: ele dá as ordens, o Engine executa.

```bash
docker compose version
```

Tem que responder `Docker Compose version v2.x` ou maior.

**Se disser "command not found":** instale o Docker e o plugin do Compose.

```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin     # Debian, Ubuntu, Mint
sudo systemctl enable --now docker
```

Em Fedora: `sudo dnf install docker docker-compose-plugin`. Em Arch: `sudo pacman -S docker docker-compose`.

Para confirmar que as duas peças estão no lugar:

```bash
docker compose version     # o plugin → "Docker Compose version v2.x"
docker info                # o engine → erro aqui significa daemon parado ou falta de permissão
```

**Se responder `docker-compose version 1.x`** (com hífen, versão 1): essa versão foi descontinuada e **não** entende o arquivo deste projeto — ele usa `name:` no topo e `depends_on: condition: service_healthy`, recursos da Compose Spec. Instale o plugin novo: `sudo apt install docker-compose-plugin`. O comando passa a ser `docker compose`, com espaço.

**Se disser `Cannot connect to the Docker daemon`:** o serviço está parado. `sudo systemctl start docker`.

**Se disser `permission denied ... docker.sock`:** seu usuário não está no grupo `docker`.

```bash
sudo usermod -aG docker $USER
```

Saia da sessão e entre de novo (logout e login, não só fechar o terminal). Para valer só no terminal atual, sem deslogar: `newgrp docker`.

> Dá para usar `sudo ./iniciar.sh` e pular essa parte, mas aí o `.env` criado pelo script fica pertencendo ao `root` e você vai precisar de `sudo` para editá-lo depois. Se já aconteceu: `sudo chown $USER:$USER .env`.

---

## 2. Entre na pasta do projeto

**Se você extraiu o `.zip`**, entre na pasta onde ele ficou:

```bash
cd ~/Documentos/livrin
```

Se o seu sistema estiver em inglês, é `~/Documents/livrin`. Confira que você está no lugar certo:

```bash
ls
```

Tem que aparecer `api`, `web`, `docs`, `docker-compose.yml` e `iniciar.sh`. Se aparecer só uma pasta chamada `livrin`, entre nela também (`cd livrin`) — alguns descompactadores criam uma pasta a mais.

**Se você clonou pelo Git:**

```bash
git clone https://github.com/xandoqa/-editora-acessivel.git
cd ./-editora-acessivel
```

O `./` é necessário: o nome do repositório começa com hífen, e sem ele o `cd` tenta interpretar `-editora-acessivel` como opção de comando.

---

## 3. Dê permissão de execução aos scripts

```bash
chmod +x iniciar.sh parar.sh
```

**Por que isso é preciso:** a maioria dos descompactadores gráficos descarta a permissão de execução ao extrair um `.zip`. Sem ela, `./iniciar.sh` responde `Permission denied`.

Quem clonou pelo Git pode pular este passo — o Git guarda a permissão, e os dois scripts já vêm executáveis.

Se preferir não mexer em permissão nenhuma, `sh iniciar.sh` funciona em qualquer caso.

**Se aparecer `bad interpreter: No such file or directory`:** o arquivo está com fim de linha do Windows. Corrija com `sed -i 's/\r$//' iniciar.sh parar.sh`.

---

## 4. Suba o sistema

```bash
./iniciar.sh
```

O script faz quatro conferências antes de tentar qualquer coisa (Docker instalado, plugin Compose v2, daemon acessível, pasta correta) e, se algo faltar, ele para e diz o que fazer. Depois cria o arquivo `.env` a partir do `.env.example` e gera um `JWT_SECRET` aleatório exclusivo da sua instalação — nenhum segredo vem pronto dentro do projeto.

**A primeira execução demora.** Ela baixa e compila cerca de 1,5 GB entre imagens e dependências; dez minutos numa conexão comum é normal. Nas próximas vezes são segundos.

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

## 5. Entre no sistema

Abra **<http://localhost:5173>** no navegador (ou a porta que você colocou em `WEB_PORT`).

| Perfil | E-mail | Senha | O que pode fazer |
| --- | --- | --- | --- |
| Administrador | `admin@livrin.local` | `Livrin.Dev2026` | Curadoria, usuários, gêneros, apoios |
| Escritora | `marina@livrin.com` | `Demo.Livrin2026` | Publicar e acompanhar as próprias obras |
| Leitor | `lucas@livrin.com` | `Demo.Livrin2026` | Catálogo, leitura e avaliação |

São credenciais de desenvolvimento, criadas de propósito para o projeto poder ser avaliado logo depois da instalação. Troque todas antes de qualquer uso real (veja [deployment.md](deployment.md)).

Para ver o leitor de `.docx` funcionando, entre como `caua@livrin.com` (mesma senha das demais contas de demonstração) e abra *O Alfabeto das Coisas Pequenas*, no painel. É um manuscrito em Word, em análise. Mude a tipografia, a escala e a paleta no leitor: o texto reflui de verdade, coisa que um PDF não faz.

---

## 6. Parar e voltar depois

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

## Resumo dos comandos

| Para | Comando |
| --- | --- |
| Conferir o Docker | `docker compose version` |
| Subir | `./iniciar.sh` |
| Parar | `./parar.sh` |
| Ver o estado dos contêineres | `docker compose ps` |
| Ver os logs da API | `docker compose logs api` |
| Apagar tudo e recomeçar | `docker compose down -v` |

Outros problemas, inclusive os que não são específicos de Linux, estão em [troubleshooting.md](troubleshooting.md).
