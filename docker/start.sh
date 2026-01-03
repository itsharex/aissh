#!/bin/sh

# 启动 Nginx (后台运行)
echo "Starting Nginx..."
nginx

# 启动后端 NestJS (前台运行)
echo "Starting Backend..."
cd /app/back
NODE_ENV=production node dist/main.js
