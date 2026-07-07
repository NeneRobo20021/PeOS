@echo off
chcp 65001 >nul
title 食品仓储与饮食记录系统

echo.
echo ========================================
echo   食品仓储与饮食记录系统
echo ========================================
echo.

cd /d "%~dp0server"

echo [启动] 正在启动后端服务...
start /B "" "C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2\node.exe" index.js

echo [成功] 服务已启动！
echo.
echo   本机访问: http://localhost:3000
echo   局域网访问: http://你的IP地址:3000
echo.
echo   按任意键关闭服务...
pause >nul

taskkill /F /IM node.exe /FI "WINDOWTITLE eq 食品仓储*" 2>nul
echo 服务已停止
