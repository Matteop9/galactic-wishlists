@echo off
:: Launch the dynasty draft tool — starts HTTP server then opens browser
cd /d "%~dp0.."
echo Starting HTTP server on port 8000...
start "Dynasty Draft Server" cmd /k "python -m http.server 8000"
timeout /t 2 /nobreak >nul
echo Opening browser...
start "" "http://localhost:8000/dynasty-draft/dynasty-draft.html"
