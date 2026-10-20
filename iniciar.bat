@echo off
cd /d "%~dp0"
echo Iniciando Livrin... aguarde. Quando terminar, abra http://localhost:5173
docker compose up --build
pause
