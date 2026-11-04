@echo off
setlocal
cd /d "%~dp0"

rem Sobe o Livrin SEM reconstruir e SEM precisar de internet.
rem Equivalente ao apresentar.sh, onde o motivo esta explicado em detalhe:
rem o iniciar.bat termina em "docker compose up --build", e o --build roda
rem npm ci dentro do conteiner, o que precisa do registro npm. Rede de
rem faculdade costuma bloquear isso, e o sintoma parece ser "o Docker nao
rem sobe", quando na verdade e a rede que nao deixa BAIXAR.
rem
rem Use assim: em casa, rode iniciar.bat uma vez ate o site abrir. Onde for
rem apresentar, rode apresentar.bat. Teste isso antes, com o wi-fi desligado.

docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo Nao consegui falar com o Docker. Abra o Docker Desktop e espere o
  echo status "running".
  pause
  exit /b 1
)

if not exist ".env" (
  echo.
  echo Nao existe .env nesta pasta, entao este projeto nunca foi iniciado aqui.
  echo.
  echo Rode iniciar.bat uma vez, numa rede que funcione. Ele cria o .env e
  echo constroi as imagens. Depois disso o apresentar.bat funciona sem internet.
  pause
  exit /b 1
)

rem A conferencia que importa: as imagens existem em disco? Cada uma e
rem verificada por um "call", para nao depender de expansao retardada.
set FALTANDO=
for %%I in (livrin-api livrin-web postgres:16-alpine) do call :conferir %%I

if defined FALTANDO (
  echo.
  echo Faltam imagens em disco:%FALTANDO%
  echo.
  echo Sem elas, subir exigiria construir ou baixar: exatamente o que a rede
  echo daqui provavelmente nao deixa. Nao vou tentar e te deixar esperando.
  echo.
  echo Numa rede que funcione, rode iniciar.bat, espere o site abrir, pare
  echo com Ctrl+C, e entao apresentar.bat funciona aqui.
  pause
  exit /b 1
)

echo Subindo o Livrin sem reconstruir (nao precisa de internet).
echo Quando terminar, abra http://localhost:5173
echo.
docker compose up --no-build
pause
exit /b 0

:conferir
docker image inspect %1 >nul 2>&1
if errorlevel 1 set FALTANDO=%FALTANDO% %1
goto :eof
