#!/usr/bin/env sh
# Para a Editora Livrin sem apagar os dados. Equivalente ao parar.bat do Windows.
cd "$(dirname "$0")"
docker compose down
