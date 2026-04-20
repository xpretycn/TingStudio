# EdgeOne Pages 401 错误修复指南

## 🚨 问题现象

访问 `https://tingstudio-frontend-e3hnbwbu.edgeone.cool/login` 返回：
```
401: UNAUTHORIZED (Code: UNAUTHORIZED)
Access Restricted or Authentication Expired.
Site Owner: Click "Preview" in the console for a new link.
```

## 🔍 问题原因

**这不是后端API问题！** 这是 **EdgeOne Pages（腾讯云前端托管服务）的访问控制问题**。

可能的原因：
1. **预览链接过期** - EdgeOne 预览链接有时效性
2. **访问权限配置错误** - 项目访问权限设置不正确
3. **CDN 缓存问题** - CDN 节点缓存了旧的错误响应
4. **项目状态异常** - EdgeOne 项目可能处于非活跃状态

## ✅ 解决方案（按优先级排序）

### 方案一：重新生成预览链接（推荐 - 最快）

**操作步骤：**
1. 登录 [腾讯云 EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
2. 进入 **Pages 服务** → **项目列表**
3. 找到项目：`tingstudio-frontend` (ProjectId: `pages-zeg2qv2ptbrb`)
4. 点击 **"预览"** 按钮
5. 系统会生成新的预览链接
6. 使用新链接访问前端

**优点：**
- ⚡ 最快解决方案
- 🔄 自动刷新CDN缓存
- ✅ 无需重新构建代码

### 方案二：重新部署前端

**操作步骤：**

#### 1. 构建前端项目
```bash
cd frontend
npm install
npm run build:deploy
```

#### 2. 使用 EdgeOne CLI 部署
```bash
# 安装 EdgeOne CLI（如果未安装）
npm install -g @tencent/edgeone-cli

# 登录腾讯云
edgeone login

# 部署到 EdgeOne
edgeone pages deploy \
    --project-id pages-zeg2qv2ptbrb \
    --dist-dir dist \
    --env production
```

#### 3. 手动上传（备选方案）
如果CLI不可用，可以手动上传：
1. 打开 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
2. 进入项目详情页
3. 点击 **"上传文件"**
4. 选择 `frontend/dist` 目录下的所有文件
5. 上传完成

### 方案三：检查和修改访问权限

**操作步骤：**
1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
2. 找到项目 `tingstudio-frontend`
3. 进入 **"设置"** 或 **"访问控制"** 标签页
4. 检查以下配置：

#### 访问权限设置
- **公开访问**：确保设置为"允许所有人访问"
- **IP 白名单**：如果有IP限制，添加您的IP地址
- **地域限制**：检查是否有地域访问限制

#### 安全设置
- **防盗链设置**：暂时关闭测试
- **HTTPS 设置**：确保已启用
- **WAF 规则**：检查是否有误拦截规则

### 方案四：清除 CDN 缓存

**操作步骤：**
1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
2. 进入 **CDN 缓存管理**
3. 选择对应的项目域名
4. 点击 **"刷新缓存"** 或 **"清除全部缓存"**
5. 等待 2-5 分钟让缓存生效

## 🔧 快速诊断命令

### 1. 检查前端构建状态
```bash
cd frontend
ls -la dist/
```

### 2. 测试本地前端服务
```bash
cd frontend
npm run dev
# 访问 http://localhost:5174/login
```

### 3. 测试后端 API 连接
```bash
curl https://tingstudio-prod-d2f6fhumc0432c48-1318822768.ap-shanghai.app.tcloudbase.com/api/health
```

### 4. 检查 EdgeOne 项目状态
```bash
edgeone pages list
```

## 📋 部署验证清单

部署完成后，请验证以下项目：

### 前端访问验证
- [ ] 可以正常打开登录页面
- [ ] 页面样式加载正常
- [ ] JavaScript 无报错

### 后端连接验证
- [ ] 登录接口返回正确错误信息（401）
- [ ] 注册功能正常工作
- [ ] 其他 API 接口可正常调用

### 功能完整性验证
- [ ] 用户注册/登录
- [ ] 配方管理
- [ ] 材料管理
- [ ] 销售员管理
- [ ] 数据导出

## 🆘 如果仍然无法解决

### 收集以下信息以便排查：
1. **浏览器控制台错误**：F12 打开开发者工具，查看 Console 和 Network 标签
2. **EdgeOne 控制台日志**：查看项目的访问日志和错误日志
3. **网络请求详情**：使用 F12 Network 标签查看具体请求状态

### 联系支持：
- **腾讯云工单系统**：[提交工单](https://console.cloud.tencent.com/workorder/category)
- **EdgeOne 官方文档**：[EdgeOne 文档](https://cloud.tencent.com/document/product/1552)

## 💡 预防措施

### 定期维护建议：
1. **定期更新预览链接**：每月更新一次
2. **监控访问状态**：设置监控告警
3. **备份构建文件**：保留最近几次的构建版本
4. **文档化部署流程**：记录完整的部署步骤

---

**注意**：401 UNAUTHORIZED 错误通常是 EdgeOne 服务端的问题，与后端 API 无关。后端服务和 MySQL 数据库都已正常运行。