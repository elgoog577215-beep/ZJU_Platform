# AI 全栈极速黑客松报名页面设计文档

## 概述
创建独立的黑客松报名页面，用于展示比赛基本信息、合作方，并提供在线报名功能。

## 路由
- 路径: `/hackathon`
- 组件: `HackathonRegistration.jsx`
- 在 App.jsx 中添加路由配置

## 页面结构

### 1. Hero 区域
- 大标题: "AI 全栈极速黑客松"
- 副标题: "5小时极速开发 · 纯个人参赛 · AI 原生创作"
- 背景: 科技感渐变/粒子效果
- CTA 按钮: 滚动到报名表单

### 2. 比赛信息区域
- 比赛时间
- 比赛地点
- 比赛形式（5小时、个人赛、AI原生开发）
- 参赛要求

### 3. 合作方展示
- 从 settings 读取合作方信息
- 展示支持单位 logo/名称

### 4. 报名表单
收集字段:
- 姓名（必填，文本）
- 学号（必填，文本）
- 专业（必填，文本）
- 年级（必填，下拉选择）
- 常用 AI 工具（多选：Claude、Codex、Cursor、Trae、其他）

### 5. 提交与反馈
- 提交按钮带 loading 状态
- 成功/失败 toast 提示
- 表单验证

## 技术实现

### 前端
- 新建 `src/components/HackathonRegistration.jsx`
- 使用现有样式系统（Tailwind CSS + Framer Motion）
- 复用 About.jsx 的日夜模式适配
- 表单验证逻辑

### 后端
- 新建 `server/src/controllers/hackathonController.js`
- 新建 `server/src/routes/hackathon.js`
- 数据库表: `hackathon_registrations`
- 字段: id, name, student_id, major, grade, ai_tools, created_at

### 路由配置
- 前端: App.jsx 添加 `/hackathon` 路由
- 后端: server/src/app.js 挂载路由

## 数据库迁移
在 server/src/config/db.js 中添加表创建逻辑

## 管理员界面
- 在 SettingsManager 中添加黑客松页面内容编辑
- 报名数据查看（后续扩展）
