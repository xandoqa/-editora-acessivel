#!/usr/bin/env sh
# Sobe o Livrin SEM reconstruir e SEM precisar de internet.
#
# Por que este script existe
# --------------------------
# O `./iniciar.sh` termina em `docker compose up --build`. O `--build` refaz as
# imagens, e refazer imagem roda `npm ci` dentro do contêiner — o que precisa do
# registro npm. Em rede de faculdade, de evento ou de hotel, essa é a parte que
# falha: portal cativo, proxy ou bloqueio de saída derrubam o download, e o
# sintoma é "o Docker não sobe", quando o Docker está ótimo e é a rede que não
# deixa BAIXAR.
#
# Imagem já construída não precisa de rede nenhuma para subir. Este script
# confere que as imagens existem e sobe sem reconstruir.
#
# Como usar
# ---------
#   1. Em casa, numa rede que funciona, rode `./iniciar.sh` uma vez até o site
#      abrir. Isso constrói as imagens e deixa tudo pronto em disco.
#   2. Onde for apresentar, rode `./apresentar.sh`.
#
# Teste isto ANTES, não na hora: depois do passo 1, desligue o wi-fi e rode o
# passo 2. Se abrir, você sabe que funciona sem rede — em vez de torcer.
#
# O que continua funcionando sem internet: catálogo, leitura, audiodescrição,
# temas, idiomas, Fale Conosco (grava a mensagem; o e-mail é a segunda etapa e
# fica registrada como não entregue). A janela de Libras depende do VLibras, que
# é externo, e avisa na hora que não há rede.
set -e
cd "$(dirname "$0")"

PROJETO=livrin
IMAGENS="${PROJETO}-api ${PROJETO}-web postgres:16-alpine"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não encontrado. Instale o Docker e rode ./iniciar.sh uma vez em casa." >&2
  exit 1
fi

if ! ERRO_DOCKER=$(docker info 2>&1 >/dev/null); then
  echo "" >&2
  echo "Não consegui falar com o Docker. Ele precisa estar rodando." >&2
  echo "(No Windows ou macOS: abra o Docker Desktop e espere o status 'running'.)" >&2
  echo "" >&2
  echo "Mensagem original do Docker:" >&2
  echo "    $ERRO_DOCKER" >&2
  echo "" >&2
  echo "Detalhes: docs/rodar-no-linux.md" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "" >&2
  echo "Não existe .env nesta pasta, então este projeto nunca foi iniciado aqui." >&2
  echo "" >&2
  echo "Rode ./iniciar.sh uma vez, numa rede que funcione. Ele cria o .env com um" >&2
  echo "JWT_SECRET próprio e constrói as imagens. Depois disso o ./apresentar.sh" >&2
  echo "funciona sem internet." >&2
  exit 1
fi

# A conferência que de fato importa: as imagens existem em disco?
FALTANDO=""
for IMAGEM in $IMAGENS; do
  if ! docker image inspect "$IMAGEM" >/dev/null 2>&1; then
    FALTANDO="$FALTANDO $IMAGEM"
  fi
done

if [ -n "$FALTANDO" ]; then
  echo "" >&2
  echo "Faltam imagens em disco:$FALTANDO" >&2
  echo "" >&2
  echo "Sem elas, subir exigiria construir ou baixar — exatamente o que a rede" >&2
  echo "daqui provavelmente não deixa. Não vou tentar e te deixar esperando." >&2
  echo "" >&2
  echo "Numa rede que funcione, rode:" >&2
  echo "" >&2
  echo "    ./iniciar.sh" >&2
  echo "" >&2
  echo "Espere o site abrir, pare com Ctrl+C, e então ./apresentar.sh funciona aqui." >&2
  exit 1
fi

PORTA=$(sed -n 's/^WEB_PORT=\([0-9][0-9]*\).*/\1/p' .env | tail -n 1)
[ -n "$PORTA" ] || PORTA=5173

echo "Subindo o Livrin sem reconstruir (não precisa de internet)."
echo "Quando terminar, abra http://localhost:${PORTA}"
echo ""
docker compose up --no-build
