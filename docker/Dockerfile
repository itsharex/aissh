# Stage 1: Frontend Build
FROM node:20-alpine AS frontend-builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# 设置环境变量为生产模式，以便代码中可以使用 process.env.NODE_ENV
ENV NODE_ENV=production
RUN pnpm run build

# Stage 2: Backend Build
FROM node:20-alpine AS backend-builder
RUN npm install -g pnpm
WORKDIR /app
COPY back/package.json back/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY back/ .
RUN pnpm run build

# Stage 3: Final Image
FROM node:20-alpine
RUN apk add --no-cache nginx

# 安装 pnpm (为了在容器内运行)
RUN npm install -g pnpm

WORKDIR /app

# 复制前端产物
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# 复制后端产物
COPY --from=backend-builder /app/dist ./back/dist
COPY --from=backend-builder /app/node_modules ./back/node_modules
COPY --from=backend-builder /app/package.json ./back/package.json

# 复制 Nginx 配置
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# 复制启动脚本
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 暴露端口 (Nginx 监听 80，它会转发到后端 3001)
EXPOSE 80

CMD ["/app/start.sh"]
