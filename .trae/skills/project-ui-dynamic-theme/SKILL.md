---
name: project-ui-dynamic-theme
description: 项目专属UI交互规范，基于动态CSS主题变量驱动，自动跟随主题色切换所有组件配色，交互与布局固定不变。
---

# 项目UI交互规范（动态主题色版）
## 适用页面
index.html、formulas、配方列表、看板、版本管理、详情、弹窗

## 一、全局样式（动态主题驱动，禁止写死色值）
### 1. 主题变量定义（由系统主题动态注入）
- --theme-primary：主题主色（按钮、选中、强调）
- --theme-primary-light：主色浅色背景（hover、选中态）
- --theme-primary-dark：主色深色（按下、强调文字）
- --success：成功色
- --warning：警告色
- --danger：删除/错误色
- --gray-100 ~ --gray-900：中性色阶

### 2. 全局色彩规则
- 背景：--gray-100
- 卡片/面板：#ffffff
- 边框：--gray-300
- 文字主色：--gray-800
- 文字次要：--gray-600
- 文字辅助：--gray-500

### 3. 字体
- 字体族：无衬线字体
- 标题：16–20px / font-bold
- 正文：14px / normal
- 辅助文字：12px

### 4. 布局
- 侧边栏：fixed left-0 top-0 h-full w-64 z-50
- 内容区：margin-left: 64px 自适应
- 卡片内边距：16px
- 模块间距：12px / 16px / 24px
- 响应式：1/2/4列自适应

### 5. 圆角与阴影
- 卡片：rounded-2xl
- 按钮：rounded-lg
- 输入框：rounded-lg
- 弹窗：rounded-2xl
- 阴影：0 10px 30px -5px rgba(0,0,0,0.05)

---

## 二、组件样式（全部动态主题色，禁止写死颜色）
### 1. 按钮（自动跟随主题）
- 主按钮：background: var(--theme-primary); color: #fff
- 次按钮：background: #fff; border: 1px solid var(--gray-300)
- 文字按钮：color: var(--theme-primary)
- 悬浮主按钮：background: var(--theme-primary-dark)
- 悬浮文字按钮：background: var(--theme-primary-light)
- 禁用：opacity: 0.6; pointer-events: none

### 2. 输入框 / 搜索框
- 高度：36–40px
- 边框：1px solid var(--gray-300)
- 圆角：rounded-lg
- 聚焦：border-color: var(--theme-primary); box-shadow: 0 0 0 2px var(--theme-primary-light)
- 错误：border-color: var(--danger)

### 3. 卡片
- 背景：#fff
- 圆角：rounded-2xl
- 悬浮：border-color: var(--theme-primary-light)
- 内边距：16px

### 4. 表格
- 表头：background: var(--gray-100)
- 行悬浮：background: var(--theme-primary-light)
- 分割线：border-bottom: 1px solid var(--gray-200)
- 操作按钮：small、图标、主题色文字

### 5. 标签 / 状态
- 成功：background: var(--success); color: #fff
- 警告：background: var(--warning); color: #fff
- 错误/删除：background: var(--danger); color: #fff
- 默认标签：background: var(--theme-primary-light); color: var(--theme-primary-dark)

### 6. 侧边菜单项
- 默认：color: var(--gray-600)
- 选中：background: var(--theme-primary-light); color: var(--theme-primary-dark)
- 悬浮：向右微动 + 背景变浅

---

## 三、交互规范（统一、不随主题变化）
### 1. 动画
- 页面加载：淡入上滑 opacity 0→1，translateY 10px→0
- 卡片依次延迟：0.1s / 0.2s / 0.3s
- 时长：0.5s ease-out

### 2. 表单交互
- 失焦校验
- 提交按钮 loading
- 错误提示在输入框下方
- 禁止重复提交

### 3. 表格交互
- 支持排序、全选、批量操作
- 选中显示批量操作栏
- 空数据展示空状态

### 4. 反馈交互
- 成功：绿色提示 2s
- 失败：红色提示 2.5s
- 删除：二次确认
- 加载：骨架屏 / 按钮 loading

### 5. 顶部导航
- 后退/前进/刷新固定
- 用户菜单悬浮展开
- 退出登录标红

---

## 四、响应式规则
- 移动端：1列，表格横向滚动
- 平板：2列
- 桌面：4列
- 小屏自动换行

---

## 五、强制约束（SOLO必须遵守）
1. 所有颜色**必须使用 CSS 变量**，禁止写死十六进制色值
2. 主题色变化时，按钮/选中/悬浮/边框/文字强调**自动同步变色**
3. 交互、圆角、阴影、间距、字体**固定不变**
4. 所有页面视觉与交互必须与 index.html 保持一致
5. 如需修改风格，必须先更新本 Skill 再编码