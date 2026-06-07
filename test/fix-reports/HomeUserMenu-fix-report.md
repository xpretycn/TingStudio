# Home 用户菜单 Bug 修复与优化报告

## 文档信息
| 项 | 值 |
|----|-----|
| 源文档ID | TR-HM-20260606-001 |
| 源测试用例文档ID | TC-HM-20260606-001 |
| 测试结果文档 | test/test-results/HomeUserMenu-test-results.md |
| 修复时间 | 2026-06-06 |
| 问题总数 | 4 |
| 已修复 | 3 |
| 跳过 | 1 |
| 修复率 | 100%（可修复项） |

## 修复概览

| 编号 | 问题描述 | 严重程度 | 修复状态 |
|------|---------|---------|---------|
| #1 | 退出登录未清除主题偏好 | High | ✅ 已修复 |
| #2 | 切换账号与退出登录行为完全一致 | Medium | ✅ 已修复 |
| #3 | 子菜单触发器缺少 aria-expanded | Medium | ✅ 已修复 |
| #4 | 重复的 check-icon SVG | Low | ⏭ 跳过 |

## 修复详情

### #1 退出登录未清除主题偏好 ✅ 已修复
| 项 | 值 |
|----|-----|
| 严重程度 | High |
| 修复文件 | frontend/src/views/Home.vue |
| 修复内容 | `handleLogout()` 中添加 `themeStore.clearLocal()` 调用 |
| 修改行数 | +1 行 |
| 验证方式 | 代码审查 |
| 根因分析 | `authStore.logout()` 只清除 Token 和用户信息，但 themeStore 的主题偏好（mode、brandColor）存储在 localStorage 中，退出登录后未清除，导致下一个登录用户可能看到上一个用户的主题设置 |

### #2 切换账号与退出登录行为区分 ✅ 已修复
| 项 | 值 |
|----|-----|
| 严重程度 | Medium |
| 修复文件 | frontend/src/views/Home.vue |
| 修复内容 | `switchAccount` 分支不再调用 `handleLogout()`，改为仅调用 `authStore.logout()`（保留主题偏好）+ `MessagePlugin.info('请重新登录')` + 跳转登录页 |
| 修改行数 | +4 行 |
| 验证方式 | 代码审查 |
| 根因分析 | 原代码 `switchAccount` 和 `logout` 都调用 `handleLogout()`，行为完全一致。语义上"切换账号"应保留用户偏好设置，"退出登录"才清除全部数据 |

### #3 子菜单触发器缺少 aria-expanded ✅ 已修复
| 项 | 值 |
|----|-----|
| 严重程度 | Medium |
| 修复文件 | frontend/src/views/Home.vue |
| 修复内容 | 1. 新增 `themeSubmenuVisible` 和 `brandSubmenuVisible` 响应式状态 2. 为两个子菜单 t-popup 添加 `:visible` 和 `@visible-change` 绑定 3. 为子菜单触发器 div 添加 `:aria-expanded` 属性 |
| 修改行数 | +6 行 |
| 验证方式 | 代码审查 |
| 根因分析 | 外层头像触发器有 `aria-expanded`，但"切换外观"和"切换品牌色"子菜单触发器只有 `aria-haspopup`，缺少 `aria-expanded` 属性，屏幕阅读器无法判断子菜单是否展开 |

### #4 重复的 check-icon SVG ⏭ 跳过
| 项 | 值 |
|----|-----|
| 严重程度 | Low |
| 跳过原因 | 两处 SVG 仅 4 行重复，提取为组件的收益不大，保持现状更安全 |
| 建议 | 如未来有更多复用场景，可提取为 `<template>` 片段或组件 |
