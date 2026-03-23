# TingStudio

个人工作数据管理平台 - 基于Vue3 + TypeScript开发的现代化Web应用

## 项目简介

TingStudio是一个专业的个人工作数据管理应用，帮助用户高效管理客户信息、配方信息和原料信息。应用支持用户注册登录、数据的增删改查、数据关联查询等功能。

## 技术栈

- **前端框架**: Vue 3.4+ (Composition API)
- **开发语言**: TypeScript 5.3+
- **构建工具**: Vite 5.0+
- **路由管理**: Vue Router 4.2+
- **状态管理**: Pinia 2.1+
- **UI组件库**: TDesign Vue 3 Next
- **样式方案**: SCSS + CSS Modules
- **数据持久化**: LocalStorage

## 功能特性

### 用户管理
- 用户注册和登录
- 多用户数据隔离
- 会话管理

### 客户管理
- 客户信息的增删改查
- 客户列表搜索和分页
- 查看客户关联的配方

### 配方管理
- 配方信息的增删改查
- 关联客户和原料
- 配方列表搜索和过滤
- 支持配方包含多种原料

### 原料管理
- 原料信息的增删改查
- 原料列表搜索和分页
- 查看原料使用统计
- 库存管理

## 项目结构

```
ts-demo01/
├── public/                    # 静态资源
│   └── logo.svg               # 应用Logo
├── src/
│   ├── api/                   # API接口层
│   │   └── storage.ts        # LocalStorage封装服务
│   ├── assets/               # 资源文件
│   │   └── styles/           # 样式文件
│   ├── components/           # 公共组件
│   │   └── Layout/          # 布局组件
│   ├── router/              # 路由配置
│   │   └── index.ts
│   ├── stores/              # Pinia状态管理
│   │   ├── auth.ts         # 认证Store
│   │   ├── customer.ts     # 客户Store
│   │   ├── formula.ts      # 配方Store
│   │   └── material.ts     # 原料Store
│   ├── types/               # TypeScript类型定义
│   │   ├── user.ts
│   │   ├── customer.ts
│   │   ├── formula.ts
│   │   └── material.ts
│   ├── views/               # 页面组件
│   │   ├── auth/           # 认证页面
│   │   ├── customers/      # 客户管理页面
│   │   ├── formulas/       # 配方管理页面
│   │   └── materials/      # 原料管理页面
│   ├── App.vue             # 根组件
│   └── main.ts             # 应用入口
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 示例数据初始化

### 方法一: 使用可视化工具(推荐)

访问 `http://localhost:3000/data-init.html` 打开数据初始化工具页面，点击按钮即可完成数据操作。

### 方法二: 浏览器控制台

1. 在应用页面按F12打开开发者工具
2. 切换到"Console"(控制台)标签
3. 输入以下命令:

```javascript
// 初始化示例数据(20个用户,每个用户20个客户、20个原料、20个配方)
initTingStudioData()

// 验证数据完整性
validateTingStudioData()

// 清除所有数据
clearTingStudioData()
```

### 方法三: 命令行脚本

```bash
npm run init:sample-data
```

**⚠️ 注意**: 初始化会清除所有现有数据，请谨慎使用。

**💡 登录提示**: 使用生成的用户名登录，密码与用户名相同(如user001的密码是user001)

详细使用说明请查看 [DATA_INIT_GUIDE.md](./DATA_INIT_GUIDE.md)

## 使用说明

### 首次使用

1. 访问应用，点击"立即注册"
2. 填写用户名和密码（密码至少6位）
3. 注册成功后自动登录

### 管理客户

1. 点击左侧菜单"客户管理"
2. 点击"新增客户"按钮
3. 填写客户信息并保存

### 管理原料

1. 点击左侧菜单"原料管理"
2. 点击"新增原料"按钮
3. 填写原料编码、名称、单位和库存

### 管理配方

1. 点击左侧菜单"配方管理"
2. 点击"新增配方"按钮
3. 选择客户和添加原料
4. 填写配方描述并保存

## 数据存储

应用使用LocalStorage进行数据持久化，数据存储在浏览器本地。不同用户的数据相互隔离，确保数据安全。

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 设计特色

- **科技感Logo**: 采用六边形分子结构设计，象征数据的连接与融合
- **渐变主题**: 使用蓝色到绿色的渐变色，体现现代科技感
- **响应式布局**: 适配不同屏幕尺寸
- **流畅交互**: 平滑的过渡动画和即时反馈

## 开发团队

TingStudio开发团队

## 许可证

MIT License
