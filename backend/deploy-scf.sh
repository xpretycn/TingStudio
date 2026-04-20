#!/bin/bash

# TingStudio 云函数部署脚本
# 适用于腾讯云函数 (SCF) + 腾讯MySQL

echo "🚀 开始部署 TingStudio 云函数..."

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

# 切换到 scf 目录
cd scf

# 安装依赖
echo "📦 安装云函数依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 返回根目录并构建项目
cd ..
echo "🔨 构建云函数项目..."
npm run build:scf

if [ $? -ne 0 ]; then
    echo "❌ 项目构建失败"
    exit 1
fi

echo "✅ 项目构建完成"

# 检查构建输出
if [ ! -f "scf/dist/index.js" ]; then
    echo "❌ 构建输出文件不存在"
    exit 1
fi

echo "✅ 构建输出验证通过"

# 复制生产环境配置到 scf 目录
cp .env.production scf/.env

# 检查云函数配置
if [ ! -f "scf/.env" ]; then
    echo "❌ 云函数配置文件不存在"
    exit 1
fi

echo "✅ 云函数配置检查通过"

# 检查 cloudbaserc.json 配置
if [ ! -f "cloudbaserc.json" ]; then
    echo "❌ cloudbaserc.json 配置文件不存在"
    exit 1
fi

echo "✅ cloudbaserc.json 配置检查通过"

# 部署到云函数
echo "🚀 部署到腾讯云函数..."

# 检查是否安装了 cloudbase-cli
if ! command -v cloudbase &> /dev/null; then
    echo "📦 安装 cloudbase-cli..."
    npm install -g @cloudbase/cli
fi

# 部署云函数
echo "🔧 执行云函数部署..."
cloudbase framework deploy

if [ $? -ne 0 ]; then
    echo "❌ 云函数部署失败"
    echo "💡 如果遇到权限问题，请先执行: cloudbase login"
    exit 1
fi

echo "✅ 云函数部署成功"

echo ""
echo "🎉 TingStudio 云函数部署完成！"
echo ""
echo "🌐 云函数地址: https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com"
echo "🔍 健康检查: https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/health"
echo ""
echo "📋 部署验证步骤:"
echo "1. 等待几分钟让云函数生效"
echo "2. 访问健康检查地址验证服务状态"
echo "3. 测试前端登录功能"
echo ""
echo "🔄 如果需要重新部署，请再次运行此脚本"