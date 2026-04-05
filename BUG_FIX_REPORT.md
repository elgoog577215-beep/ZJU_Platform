# 🔧 Bug 修复报告

## 问题描述

在运行 Vite 开发服务器时遇到以下错误：

```
[plugin:vite:import-analysis] Failed to parse source for import analysis because the content contains invalid JS syntax. If you are using JSX, make sure to name the file with the .jsx or .tsx extension.
 C:/Users/Administrator/Desktop/拓途浙享/ZJU_Platform/src/utils/notify.js:46:74
```

## 问题原因

文件 `src/utils/notify.js` 包含了 **JSX 语法**（React 组件），但文件扩展名是 `.js` 而不是 `.jsx`。

Vite 在解析 `.js` 文件时不会启用 JSX 解析器，导致无法识别 JSX 语法（如 `<div>...</div>`）。

## 修复方案

### 1. 重命名文件
```bash
git mv src/utils/notify.js src/utils/notify.jsx
```

### 2. 验证导入路径
检查所有引用该文件的地方：
- `src/context/AuthContext.jsx` - ✅ 导入路径自动解析，无需修改

### 3. 重启开发服务器
```bash
npm run dev
```

## 修复结果

✅ **问题已解决**

- 文件已重命名为 `notify.jsx`
- 开发服务器正常启动（端口 5182/5183）
- 无编译错误
- 浏览器预览正常

## CSS Linter 警告说明

剩余的 CSS 警告都是**正常的**，不影响运行：

1. `Unknown at rule @tailwind` - Tailwind CSS 的特殊指令
2. `Unknown at rule @apply` - Tailwind CSS 的 @apply 指令
3. `未知属性："user-drag"` - 非标准 CSS 属性

这些警告是因为 VS Code 的 CSS linter 不认识 Tailwind CSS 的特殊语法，但 Vite 的 PostCSS 会正确处理它们。

## Git 提交

```bash
git commit -m "fix: 重命名 notify.js 为 notify.jsx 以支持 JSX 语法

- 修复 Vite 导入分析错误
- 文件包含 JSX 语法，需要使用 .jsx 扩展名"
```

## 验证清单

- [x] 文件重命名完成
- [x] 开发服务器正常启动
- [x] 无编译错误
- [x] 浏览器预览正常
- [x] 已提交修复

---

**修复时间**: 2026-04-05  
**修复状态**: ✅ 已完成  
**影响范围**: 1 个文件重命名
