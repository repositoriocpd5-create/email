@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 22 ou superior e abra este arquivo novamente.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando as dependencias da Central de e-mails...
  call npm install
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)
echo Iniciando a Central de e-mails. Mantenha esta janela aberta.
call npm run dev -- --open
pause
