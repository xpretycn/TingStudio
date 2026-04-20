#!/bin/bash

# TingStudio 生产环境部署脚本
# 适用于腾讯云服务器 (CVM)

echo "🚀 开始部署 TingStudio 生产环境..."

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18+"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 项目构建失败"
    exit 1
fi

echo "✅ 项目构建完成"

# 检查生产环境配置文件
if [ ! -f ".env.production" ]; then
    echo "❌ 生产环境配置文件不存在"
    exit 1
fi

echo "✅ 生产环境配置检查通过"

# 启动服务（使用 PM2）
echo "🚀 启动生产服务..."

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

# 使用 PM2 启动服务
pm2 start dist/index.js --name "tingstudio-backend" --env production

if [ $? -ne 0 ]; then
    echo "❌ 服务启动失败"
    exit 1
fi

echo "✅ 服务启动成功"

# 保存 PM2 配置
pm2 save
pm2 startup

echo ""
echo "🎉 TingStudio 生产环境部署完成！"
echo "📊 服务状态: pm2 status"
echo "📋 服务日志: pm2 logs tingstudio-backend"
echo "🛑 停止服务: pm2 stop tingstudio-backend"
echo "🔄 重启服务: pm2 restart tingstudio-backend"
echo ""
echo "🌐 服务地址: http://您的服务器IP:3000"
echo "🔍 健康检查: http://您的服务器IP:3000/health"