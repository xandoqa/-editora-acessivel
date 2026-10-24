@echo off
setlocal
cd /d "%~dp0"

if not exist ".env" (
  echo.
  echo Primeira execucao: criando o arquivo .env a partir de .env.example
  echo e gerando um JWT_SECRET aleatorio so para esta instalacao...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$b = New-Object byte[] 48;" ^
    "[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b);" ^
    "$s = -join ($b | ForEach-Object { $_.ToString('x2') });" ^
    "$linhas = (Get-Content '.env.example' -Encoding UTF8) -replace '^JWT_SECRET=$', ('JWT_SECRET=' + $s);" ^
    "[IO.File]::WriteAllLines((Join-Path (Get-Location) '.env'), $linhas, (New-Object Text.UTF8Encoding($false)))"
  if errorlevel 1 (
    echo.
    echo Nao foi possivel criar o .env automaticamente.
    echo Copie .env.example para .env e preencha JWT_SECRET manualmente.
    pause
    exit /b 1
  )
  echo Arquivo .env criado. As credenciais de desenvolvimento estao nele.
  echo.
)

echo Iniciando Livrin... aguarde. Quando terminar, abra http://localhost:5173
docker compose up --build
pause
