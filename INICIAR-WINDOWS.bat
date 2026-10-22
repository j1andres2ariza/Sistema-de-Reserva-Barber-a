@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js 22.13 o superior y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist "node_modules\vite\package.json" (
  echo Instalando dependencias. Esto solo se necesita la primera vez...
  call npm ci
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias. Revisa la conexion a internet.
    pause
    exit /b 1
  )
)
call npm run dev -- --open
pause
