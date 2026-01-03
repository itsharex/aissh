#!/bin/bash

# 设置错误即停止
set -e

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

echo "🚀 开始打包 Gemini SSH 助手..."

# 进入脚本所在目录
cd "$SCRIPT_DIR"

# 检查是否安装了 docker
if ! command -v docker &> /dev/null
then
    echo "❌ 错误: 未检测到 Docker，请先安装 Docker。"
    exit 1
fi

# 检查是否安装了 docker-compose
if ! command -v docker-compose &> /dev/null
then
    echo "❌ 错误: 未检测到 docker-compose，请先安装 docker-compose。"
    exit 1
fi

# 检查是否存在 .env 文件，如果没有则提醒用户
if [ ! -f "$PROJECT_ROOT/.env" ] && [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    echo "⚠️ 警告: 未在根目录发现 .env 或 .env.local 文件。请确保环境变量已正确配置。"
fi

echo "📦 正在构建全栈镜像并启动单容器..."
docker-compose up -d --build

echo "✅ 打包并启动完成！"
echo "🌐 访问地址: http://localhost"
echo "📝 查看日志命令: docker-compose logs -f"
