@echo off
start "N Mart Backend" cmd /k "cd /d E:\Miraje\backend && npm.cmd run dev"
timeout /t 2 >nul
start "N Mart Frontend" cmd /k "cd /d E:\Miraje\frontend && npm.cmd run dev -- --host 127.0.0.1 --port 5173"
echo N Mart is starting...
echo Frontend: http://127.0.0.1:5173
echo Backend:  http://127.0.0.1:4100/api/health
pause
