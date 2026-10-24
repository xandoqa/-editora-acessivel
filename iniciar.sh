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

if ! docker info >/dev/null 2>&1; then
  echo "Não consegui falar com o Docker." >&2
  echo "- O serviço está rodando? Linux: sudo systemctl start docker" >&2
  echo "  Windows/macOS: abra o Docker Desktop e espere o status 'running'." >&2
  echo "- Falta permissão? sudo usermod -aG docker \$USER e entre na sessão de novo." >&2
  exit 1
fi

if [ ! -f .env.example ]; then
  echo "Não achei o .env.example nesta pasta ($(pwd))." >&2
  echo "Rode o script de dentro da pasta do projeto, descompactada por inteiro." >&2
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
