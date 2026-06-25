#!/bin/bash

# Gemini Reader 快速启动脚本 (Bash/Git Bash)

echo "========================================"
echo "  Gemini Reader 快速启动脚本"
echo "========================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js"
    echo "下载地址: https://nodejs.org/"
    read -p "按 Enter 键退出"
    exit 1
fi

echo "[信息] Node.js 版本:"
node -v
echo ""

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "[信息] 首次运行，正在安装依赖..."
    echo ""
    
    npm install
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "[错误] 依赖安装失败"
        read -p "按 Enter 键退出"
        exit 1
    fi
    
    echo ""
    echo "[成功] 依赖安装完成"
    echo ""
fi

echo "[信息] 正在启动开发服务器..."
echo ""
echo "----------------------------------------"
echo "  服务器启动后，浏览器会自动打开"
echo "  按 Ctrl+C 可以停止服务器"
echo "----------------------------------------"
echo ""

# 启动开发服务器
npm run dev
