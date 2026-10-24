#!/usr/bin/env sh
# Sobe a Editora Livrin em Linux ou macOS. Equivalente ao iniciar.bat do Windows.
set -e
cd "$(dirname "$0")"

# ---------------------------------------------------------------------------
# Conferências antes de tentar subir. Cada uma delas já parou alguém na
# primeira execução, e o erro que o Docker devolve sozinho não diz o que fazer.
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não encontrado." >&2
  echo "Instale o Docker Engine (Linux) ou o Docker Desktop (Windows/macOS) e rode de novo." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "O plugin 'docker compose' (v2) não está instalado." >&2
  if command -v docker-compose >/dev/null 2>&1; then
    echo "Encontrei o 'docker-compose' antigo (v1), que não entende este projeto:" >&2
    echo "ele usa 'name:' e 'depends_on: condition: service_healthy', da Compose Spec." >&2
  fi
  echo "Instale o plugin: sudo apt install docker-compose-plugin (Debian/Ubuntu)" >&2
  echo "ou o pacote equivalente da sua distribuição." >&2
  exit 1
fi

# "Não consegui falar com o Docker" tem duas causas muito diferentes, e dizer
# as duas de uma vez obriga quem está começando a adivinhar qual é a sua. O
# próprio erro do Docker distingue: falta de permissão fala em "permission
# denied", serviço parado fala em não achar o socket.
if ! ERRO_DOCKER=$(docker info 2>&1 >/dev/null); then
  USUARIO=${USER:-$(id -un)}
  echo "" >&2
  echo "Não consegui falar com o Docker." >&2
  echo "" >&2
  case "$ERRO_DOCKER" in
    *[Pp]ermission\ denied*)
      echo "Motivo: o serviço está rodando, mas o seu usuário não tem permissão" >&2
      echo "para usá-lo. Rode estes dois comandos:" >&2
      echo "" >&2
      echo "    sudo usermod -aG docker $USUARIO" >&2
      echo "    newgrp docker" >&2
      echo "" >&2
      echo "E então ./iniciar.sh de novo. O 'newgrp' vale só neste terminal;" >&2
      echo "para valer em todos, saia da sessão e entre novamente." >&2
      ;;
    *)
      echo "Motivo: o serviço do Docker não está rodando." >&2
      echo "" >&2
      echo "    sudo systemctl enable --now docker" >&2
      echo "" >&2
      echo "E então ./iniciar.sh de novo. (No Windows ou macOS: abra o Docker" >&2
      echo "Desktop e espere o status 'running'.)" >&2
      echo "" >&2
      echo "Se o serviço já estava rodando, o que falta é permissão:" >&2
      echo "    sudo usermod -aG docker $USUARIO" >&2
      echo "    newgrp docker" >&2
      ;;
  esac
  echo "" >&2
  echo "Mensagem original do Docker, para referência:" >&2
  echo "    $ERRO_DOCKER" >&2
  echo "" >&2
  echo "Passo a passo completo: docs/rodar-no-linux.md" >&2
  exit 1
fi

if [ ! -f .env.example ]; then
  echo "Não achei o .env.example nesta pasta ($(pwd))." >&2
  # Caso comum: o descompactador criou um nível a mais, ou o .zip foi extraído
  # duas vezes. Em vez de só reclamar, aponta onde o projeto realmente está.
  if [ -f livrin/.env.example ]; then
    echo "" >&2
    echo "Mas encontrei o projeto um nível abaixo. Rode:" >&2
    echo "" >&2
    echo "    cd livrin && ./iniciar.sh" >&2
  else
    echo "Rode o script de dentro da pasta do projeto, descompactada por inteiro." >&2
    echo "Um 'ls' ali deve mostrar api, web, docs e docker-compose.yml juntos." >&2
  fi
  exit 1
fi

if [ ! -f .env ]; then
  echo ""
  echo "Primeira execução: criando o arquivo .env a partir de .env.example"
  echo "e gerando um JWT_SECRET aleatório só para esta instalação..."
  if command -v openssl >/dev/null 2>&1; then
    SECRET=$(openssl rand -hex 48)
  elif [ -r /dev/urandom ]; then
    SECRET=$(od -An -tx1 -N48 /dev/urandom | tr -d ' \n')
  else
    echo "Não encontrei openssl nem /dev/urandom para gerar o segredo." >&2
    echo "Copie .env.example para .env e preencha JWT_SECRET manualmente." >&2
    exit 1
  fi
  sed "s|^JWT_SECRET=\$|JWT_SECRET=${SECRET}|" .env.example > .env
  echo "Arquivo .env criado. As credenciais de desenvolvimento estão nele."
  echo ""
fi

# Respeita um WEB_PORT trocado no .env, para não mandar você para a porta errada.
PORTA=$(sed -n 's/^WEB_PORT=\([0-9][0-9]*\).*/\1/p' .env | tail -n 1)
[ -n "$PORTA" ] || PORTA=5173

echo "Iniciando Livrin... aguarde. Quando terminar, abra http://localhost:${PORTA}"
echo "(a primeira vez baixa e compila cerca de 1,5 GB; dez minutos é normal)"
docker compose up --build
