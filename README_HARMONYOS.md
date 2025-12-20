# HarmonyOS Next App (WebView Version)

此目录 `HarmonyOS_App` 包含了为您生成的 HarmonyOS Next (API 11/12) 应用程序代码。该应用使用 WebView 加载您的网站，并适配了手机的返回逻辑。

## 目录结构

```
HarmonyOS_App/
├── AppScope/               # 应用全局配置
├── entry/                  # 主模块
│   └── src/main/ets/
│       ├── entryability/   # 应用入口 Ability
│       └── pages/
│           └── Index.ets   # 包含 WebView 的主页面
├── build-profile.json5     # 构建配置
└── ...
```

## 核心功能

1.  **WebView 集成**: 在 `entry/src/main/ets/pages/Index.ets` 中使用了 `Web` 组件加载 `http://118.31.78.72`。
2.  **返回逻辑适配**: 实现了 `onBackPress` 接口。
    *   当用户点击物理返回键或使用手势返回时：
        *   如果网页可以后退（如进入了二级页面），则网页后退。
        *   如果网页无法后退（在首页），则退出应用。

## 如何运行

1.  下载并安装 **DevEco Studio** (HarmonyOS Next 版本)。
2.  打开 DevEco Studio，选择 **Open Project**。
3.  选择此 `HarmonyOS_App` 文件夹。
4.  等待 Gradle/Hvigor 同步完成。
5.  连接真机或启动模拟器。
6.  点击 **Run** 按钮。

## 注意事项

*   **图标资源**: 由于我是文本生成助手，无法直接生成图片文件。请确保在编译前检查 `entry/src/main/resources/base/media/icon.png` 和 `AppScope/resources/base/media/app_icon.png` 是否存在。如果报错，请手动放入任意 png 图片并重命名。
*   **网络权限**: 已在 `entry/src/main/module.json5` 中配置了 `ohos.permission.INTERNET` 权限。
