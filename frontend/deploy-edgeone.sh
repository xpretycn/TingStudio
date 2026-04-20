#!/bin/bash

# TingStudio 前端 EdgeOne 部署脚本
# 解决 401 UNAUTHORIZED 访问错误

echo "🚀 开始部署 TingStudio 前端到 EdgeOne..."

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 构建生产版本
echo "🔨 构建生产版本..."
npm run build:deploy

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

# 检查构建输出
if [ ! -d "dist" ]; then
    echo "❌ 构建输出目录不存在"
    exit 1
fi

echo "✅ 构建完成"

# 检查 EdgeOne CLI
if ! command -v edgeone &> /dev/null; then
    echo "📦 安装 EdgeOne CLI..."
    npm install -g @tencent/edgeone-cli
fi

# 部署到 EdgeOne
echo "🚀 部署到 EdgeOne..."

edgeone pages deploy \
    --project-id pages-zeg2qv2ptbrb \
    --dist-dir dist \
    --env production

if [ $? -ne 0 ]; then
    echo "❌ EdgeOne 部署失败"
    echo "💡 请尝试手动部署或检查 EdgeOne 控制台"
    exit 1
fi

echo ""
echo "🎉 EdgeOne 部署完成！"
echo ""
echo "🌐 前端地址: https://tingstudio-frontend-e3hnbwbu.edgeone.cool/login"
echo ""
echo "⏳ 等待2-3分钟让 CDN 生效..."
echo "🔄 如果仍然显示401，请执行以下操作:"
echo "   1. 登录 EdgeOne 控制台"
echo "   2. 找到项目: tingstudio-frontend"
echo "   3. 点击'预览'获取新的预览链接"
echo "   4. 或检查项目的访问权限设置"