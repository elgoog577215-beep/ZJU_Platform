# add-android-twa-apk

## 背景

用户希望把 `https://tuotuzju.com` 打包成可安装的 Android APK。当前站点已经具备 PWA 基础：HTTPS、manifest 和 service worker 可访问；但还没有 Android TWA 工程、签名材料、`assetlinks.json` 域名验证文件和可重复的 APK 构建说明。

## 目标

- 使用 Trusted Web Activity / Bubblewrap 生成 Android APK 工程。
- 绑定线上域名 `https://tuotuzju.com`。
- 使用包名 `com.tuotuzju.app`。
- 生成可复用的签名材料和 Android 构建配置。
- 添加 `/.well-known/assetlinks.json` 发布文件，使域名与 APK 签名建立可信关系。
- 尽量在本机产出可安装 APK；若本机 Android SDK 不完整，则补齐工具链或给出自动化构建路径。

## 不做范围

- 不重写原生 Android 功能。
- 不接入推送、相机、扫码、文件系统等 Capacitor/原生能力。
- 不上架应用商店。
- 不改变现有 Web 后端 API 与数据库。

## 风险

- Android SDK 可能需要下载，耗时取决于网络。
- `assetlinks.json` 必须部署到线上域名后，TWA 才能全屏可信运行。
- 签名 keystore 是发布资产，不能提交真实密码；仓库只应提交可复用配置和说明，敏感值使用本地文件或环境变量。

## 验收

- Android TWA 工程可重复构建。
- APK 文件产出，或明确说明缺少的外部工具/权限。
- `assetlinks.json` 内容包含 `com.tuotuzju.app` 和签名指纹。
- 构建说明清楚写明如何重新生成 APK、如何部署验证文件、如何真机安装。
