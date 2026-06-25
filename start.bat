@echo off
chcp 65001 >nul
echo ========================================
echo   Gemini Reader 快速启动脚本
echo ========================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [信息] Node.js 版本:
node -v
echo.

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [信息] 首次运行，正在安装依赖...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
    echo [成功] 依赖安装完成
    echo.
)

echo [信息] 正在启动开发服务器...
echo.
echo ----------------------------------------
echo   服务器启动后，浏览器会自动打开
echo   按 Ctrl+C 可以停止服务器
echo ----------------------------------------
echo.

REM 启动开发服务器
npm run dev

pause
