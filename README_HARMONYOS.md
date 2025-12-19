# HarmonyOS 版网站 (HarmonyOS App Version)

这是一个基于 HarmonyOS SDK 5.0 (API 12) 开发的鸿蒙应用项目，它使用 ArkTS 和 ArkWeb 组件直接加载你的网站。

## 📁 项目结构 (Project Structure)

项目位于根目录下的 `harmonyos_app` 文件夹中：

- `AppScope/`: 全局应用配置
- `entry/`: 主要模块
  - `src/main/ets/pages/Index.ets`: **核心代码**，WebView 组件在这里定义，指向 `http://118.31.78.72`
  - `src/main/ets/entryability/EntryAbility.ets`: 应用入口
  - `src/main/module.json5`: 权限配置 (已添加 ohos.permission.INTERNET)

## 🛠️ 如何使用 (How to Use)

### 1. 准备环境
你需要下载并安装 **DevEco Studio** (华为鸿蒙开发工具)，并下载 HarmonyOS NEXT SDK (API 12/5.0.0)。

### 2. 导入项目
1. 打开 DevEco Studio。
2. 选择 **Open Project**。
3. 导航到 `harmonyos_app` 文件夹并打开。

### 3. 运行应用
1. 连接鸿蒙真机或启动模拟器 (API 12)。
2. 点击顶部的 **Run** 按钮 (绿色三角形)。
3. 应用启动后，会自动全屏加载 `http://118.31.78.72`。

## ⚙️ 修改配置

如果你想修改加载的网址，请打开：
`harmonyos_app/entry/src/main/ets/pages/Index.ets`

找到以下代码并修改：
```typescript
private readonly targetUrl: string = 'http://118.31.78.72'; // 修改为你想要的网址
```

## 📱 功能特性
- **全屏浏览**: 隐藏了默认标题栏，提供沉浸式体验。
- **返回键处理**: 按下物理返回键或手势返回时，如果是网页内部跳转，会优先网页后退；如果网页无法后退，则退出应用。
- **权限**: 已申请网络访问权限。

---
**注意**: 如果你在本地测试 (localhost)，鸿蒙模拟器可能无法直接访问电脑的 localhost。建议使用局域网 IP 或部署到公网服务器后测试。
