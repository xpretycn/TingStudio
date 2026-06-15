# ============================================
# TingStudio Backend - Dockerfile
# 适用于 Render / Fly.io / Railway 等容器化部署
# ============================================

FROM node:20-slim

# 安装 better-sqlite3 编译依赖
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制依赖声明文件
COPY package.json package-lock.json* ./

# 安装生产依赖
RUN npm ci --omit=dev

# 复制源码并构建
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# 创建数据目录
RUN mkdir -p /app/data /app/uploads /app/exports

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_TYPE=sqlite
ENV DB_PATH=/app/data/tingstudio.db

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.js"]
