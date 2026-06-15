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

线上验证命令：

```bash
curl -I -L https://tuotuzju.com/.well-known/assetlinks.json
curl -sL https://tuotuzju.com/.well-known/assetlinks.json | jq .
```

如果 `content-type` 是 `text/html`，或 body 是 `index.html`，说明静态服务把 `.well-known` 路径错误地回退到了 SPA 首页，需要先修部署或 Nginx 静态文件规则。

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

## 真机黑屏或启动页卡住排查

如果最新 Android 系统安装后出现黑屏、启动页卡住或点击图标没有进入首页，先不要继续猜性能问题，按下面顺序判断卡在哪一层。

### 1. 确认 APK 已安装且入口存在

```bash
/Users/yq/Library/Android/sdk/platform-tools/adb devices -l
/Users/yq/Library/Android/sdk/platform-tools/adb shell pm list packages | grep tuotuzju
/Users/yq/Library/Android/sdk/platform-tools/adb shell cmd package resolve-activity --brief com.tuotuzju.app
/Users/yq/Library/Android/sdk/platform-tools/adb shell am start -n com.tuotuzju.app/.LauncherActivity
```

如果 `resolve-activity` 找不到 `com.tuotuzju.app/.LauncherActivity`，说明安装包或启动入口异常，需要重新构建 APK。

### 2. 判断是否进入 TWA / Chrome 承载层

启动后执行：

```bash
/Users/yq/Library/Android/sdk/platform-tools/adb shell dumpsys activity activities | grep -E "topResumedActivity|mResumedActivity|LauncherActivity|CustomTab|Trusted"
```

- 如果顶部是 `com.tuotuzju.app/.LauncherActivity` 后立刻退出，优先看原生崩溃日志。
- 如果顶部是 `com.android.chrome/...FirstRunActivity`，说明 Chrome 首次运行页挡住了 TWA，需要在设备上完成 Chrome 初始化。
- 如果顶部是 `com.android.chrome/...CustomTabActivity`，说明 APK 已进入承载层，但可能因为 `assetlinks.json` 未生效而降级为 Custom Tabs。

### 3. 抓取关键日志

```bash
/Users/yq/Library/Android/sdk/platform-tools/adb logcat -c
/Users/yq/Library/Android/sdk/platform-tools/adb shell am start -n com.tuotuzju.app/.LauncherActivity
sleep 8
/Users/yq/Library/Android/sdk/platform-tools/adb logcat -d | grep -Ei "tuotuzju|TrustedWeb|CustomTabs|Chrome|cr_|asset_statements|FirstRun|AndroidRuntime"
```

排查优先级：

- `AndroidRuntime` / `FATAL EXCEPTION`：原生崩溃。
- `FirstRunActivity`：Chrome 首次运行阻塞。
- `asset_statements` / `Digital Asset Links` / `TrustedWeb` 相关错误：域名绑定未通过。
- Chrome 已打开但网页空白：继续检查线上首页资源、Service Worker、首屏 JS 和网络请求。

### 4. 启动性能重点

Android App / TWA 环境不应该加载桌面端装饰资源，例如 Three.js 背景、桌面自定义鼠标和桌面滚动进度。构建后检查：

```bash
npm run build
grep -n "three-vendor" dist/index.html || true
grep -n "mammoth\\|pdf-\\|three-vendor\\|AdminDashboard" dist/sw.js || true
```

`dist/index.html` 不应主动 preload `three-vendor`。大页面 chunk 可以存在于 `dist/assets`，但不应进入首轮 precache。

## 版本发布

每次准备发布新版 APK 前，需要同步更新：

- `android-twa/twa-manifest.json` 中的 `appVersionCode` 和 `appVersionName`
- `android-twa/app/build.gradle` 中的 `versionCode` 和 `versionName`

其中 `versionCode` 必须递增，否则 Android 无法覆盖安装，也无法提交到应用商店。
