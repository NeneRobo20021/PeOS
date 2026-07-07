@echo off
chcp 65001 >nul
title 食品仓储与饮食记录系统

cd /d "%~dp0server"

set NODE="C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2\node.exe"

if not exist %NODE% (
    echo [错误] 找不到 node.exe，请确认路径是否正确
    echo 当前查找路径：%NODE%
    pause
    exit /b 1
)

echo.
echo ========================================
echo   食品仓储与饮食记录系统
echo ========================================
echo.
echo [启动] 正在启动后端服务...
echo [访问] 浏览器打开 http://localhost:3000
echo [停止] 关闭本窗口 或 按 Ctrl+C
echo.
echo ----------------------------------------
echo.

%NODE% index.js

echo.
echo ----------------------------------------
echo [停止] 服务已关闭
pause
