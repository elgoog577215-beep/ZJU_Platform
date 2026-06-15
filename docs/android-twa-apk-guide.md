# Android APK 开发与打包说明

## 目标

本项目的 Android 端采用 Trusted Web Activity（TWA）封装 `https://tuotuzju.com/`，让用户从桌面图标进入后直接打开现有网页应用。网页侧原本的启动动画保留，作为 App 进入后的首屏品牌启动体验。

## 当前配置

- 域名：`tuotuzju.com`
- 启动地址：`https://tuotuzju.com/`
- Android 包名：`com.tuotuzju.app`
- App 名称：`拓途浙享`
- 显示模式：`standalone`
- 屏幕方向：`portrait`
- 通知委托：已开启
- TWA 工程目录：`android-twa/`
- 公开域名绑定文件：`public/.well-known/assetlinks.json`

## 本机工具链

当前打包依赖以下本机工具：

- Node.js / npm
- Bubblewrap CLI：通过 `npx @bubblewrap/cli@1.24.1` 使用
- JDK 17：`/Users/yq/.cache/codex-jdks/jdk-17.0.19+10`
- Android SDK：`/Users/yq/Library/Android/sdk`
- Release keystore：`/Users/yq/.tuotuzju-android/tuotuzju-release.keystore`
- Keystore 环境变量：`/Users/yq/.tuotuzju-android/keystore.env`

签名文件和密码必须保留在仓库外，不要提交到 Git。

## 域名绑定

Android TWA 必须通过 Digital Asset Links 证明 APK 和网站属于同一方。当前证书指纹已经写入：

```txt
public/.well-known/assetlinks.json
```

部署网站后，线上必须能访问：

```txt
https://tuotuzju.com/.well-known/assetlinks.json
```

如果该地址返回 HTML、404 或非 JSON，Android 会降级为 Custom Tabs，无法获得完整 TWA 体验。

## 打包命令

在项目根目录执行：

```bash
source /Users/yq/.tuotuzju-android/keystore.env
export JAVA_HOME=/Users/yq/.cache/codex-jdks/jdk-17.0.19+10/Contents/Home
export ANDROID_HOME=/Users/yq/Library/Android/sdk
export ANDROID_SDK_ROOT=/Users/yq/Library/Android/sdk
node ~/.npm/_npx/b919127f08f4c910/node_modules/@bubblewrap/cli/bin/bubblewrap.js build --directory=android-twa
```

如果 Bubblewrap 提示输入 keystore password 和 key password，使用 `keystore.env` 中对应值。

## 验证命令

构建完成后检查 APK：

```bash
find android-twa -name "*.apk" -o -name "*.aab"
/Users/yq/Library/Android/sdk/build-tools/34.0.0/apksigner verify --print-certs <apk-path>
```

本地安装测试：

```bash
/Users/yq/Library/Android/sdk/platform-tools/adb install -r <apk-path>
```

安装后重点检查：

- App 是否正常启动到 `https://tuotuzju.com/`
- 网页启动动画是否保留
- 底部导航、活动详情、AI 社区、影像页面是否能正常操作
- 推送权限弹窗或通知授权路径是否符合预期
- 线上 `assetlinks.json` 是否已生效

## 版本发布

每次准备发布新版 APK 前，需要同步更新：

- `android-twa/twa-manifest.json` 中的 `appVersionCode` 和 `appVersionName`
- `android-twa/app/build.gradle` 中的 `versionCode` 和 `versionName`

其中 `versionCode` 必须递增，否则 Android 无法覆盖安装，也无法提交到应用商店。
