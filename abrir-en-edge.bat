@echo off
setlocal
cd /d "%~dp0"

set "URL=http://127.0.0.1:5173/"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" (
  echo No se encontro Microsoft Edge en este dispositivo.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 start "Montes Abogados - servidor local" /min cmd /c "npm run dev -- --host 127.0.0.1 --strictPort"

for /l %%I in (1,1,30) do (
  powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 goto abrir
  timeout /t 1 /nobreak >nul
)

echo No se pudo iniciar el sitio. Verifique que Node.js y npm esten instalados.
exit /b 1

:abrir
start "" "%EDGE%" "%URL%"
