# Android APK 开发与打包说明

## 目标

本项目的 Android 端采用内置 WebView 作为主入口，直接加载 `https://tuotuzju.com/`，避免新版 Android 设备上被 Chrome/TWA 首次运行、承载浏览器状态或外部 Custom Tabs 行为卡住。网页侧原本的启动动画保留，作为 App 进入后的首屏品牌启动体验。

## 当前配置

- 域名：`tuotuzju.com`
- 启动地址：`https://tuotuzju.com/`
- Android 包名：`com.tuotuzju.app`
- App 名称：`拓途浙享`
- 显示模式：`standalone`
- 屏幕方向：`portrait`
- 通知委托：已开启
- 兼容策略：主入口固定进入 `AppWebViewActivity`，由内置 WebView 承载网页；TWA 相关元数据保留用于域名绑定和后续兼容。
- WebView 能力：支持 JS 弹窗、多窗口拦截、文件上传选择器、下载外跳、站内前进后退。
- TWA 工程目录：`android-twa/`
- 公开域名绑定文件：`public/.well-known/assetlinks.json`
- 官网下载页：`/download` 只面向浏览器用户；App/TWA/standalone 运行时访问会回到首页，避免 App 内重复下载 App。

## 本机工具链

当前打包依赖以下本机工具：

- Node.js / npm
- Gradle Wrapper：`android-twa/gradlew`
- JDK 17：`/Users/yq/.cache/codex-jdks/jdk-17.0.19+10`
- Android SDK：`/Users/yq/Library/Android/sdk`
- Release keystore：`/Users/yq/.tuotuzju-android/tuotuzju-release.keystore`
- Keystore 环境变量：`/Users/yq/.tuotuzju-android/keystore.env`

签名文件和密码必须保留在仓库外，不要提交到 Git。

## 域名绑定

Digital Asset Links 用于证明 APK 和网站属于同一方。当前证书指纹已经写入：

```txt
public/.well-known/assetlinks.json
```

部署网站后，线上必须能访问：

```txt
https://tuotuzju.com/.well-known/assetlinks.json
```

如果该地址返回 HTML、404 或非 JSON，TWA/域名验证会失败；当前 WebView 主入口仍可打开，但深链信任和后续 TWA 兼容会受影响。

线上验证命令：

```bash
curl -I -L https://tuotuzju.com/.well-known/assetlinks.json
curl -sL https://tuotuzju.com/.well-known/assetlinks.json | jq .
curl -I -L https://tuotuzju.com/manifest.json
```

如果 `content-type` 是 `text/html`，或 body 是 `index.html`，说明静态服务把 `.well-known` 路径错误地回退到了 SPA 首页，需要先修部署或 Nginx 静态文件规则。
`manifest.json` 应返回 JSON 类型；旧的 `manifest.webmanifest` 可以保留兼容，但新版 APK 使用 `manifest.json` 降低 MIME 兼容风险。

## 打包命令

在项目根目录执行：

```bash
source /Users/yq/.tuotuzju-android/keystore.env
export JAVA_HOME=/Users/yq/.cache/codex-jdks/jdk-17.0.19+10/Contents/Home
export ANDROID_HOME=/Users/yq/Library/Android/sdk
export ANDROID_SDK_ROOT=/Users/yq/Library/Android/sdk
cd android-twa
./gradlew clean assembleRelease
cd ..

BT=/Users/yq/Library/Android/sdk/build-tools/36.1.0
UNSIGNED=android-twa/app/build/outputs/apk/release/app-release-unsigned.apk
ALIGNED=android-twa/app/build/outputs/apk/release/app-release-unsigned-aligned.apk
SIGNED=output/android/apk/tuotuzju-v8-20260617-signed.apk
"$BT/zipalign" -p -f 4 "$UNSIGNED" "$ALIGNED"
"$BT/apksigner" sign \
  --ks /Users/yq/.tuotuzju-android/tuotuzju-release.keystore \
  --ks-key-alias tuotuzju \
  --ks-pass "pass:${TUOTUZJU_KEYSTORE_PASSWORD}" \
  --key-pass "pass:${TUOTUZJU_KEY_PASSWORD}" \
  --out "$SIGNED" \
  "$ALIGNED"
```

不要用 Bubblewrap 重新生成工程来覆盖 `android-twa/`，否则可能把 `AppWebViewActivity`、上传选择器和弹窗处理逻辑冲掉。

## 验证命令

构建完成后检查 APK：

```bash
find android-twa -name "*.apk" -o -name "*.aab"
/Users/yq/Library/Android/sdk/build-tools/36.1.0/aapt dump badging <apk-path>
/Users/yq/Library/Android/sdk/build-tools/36.1.0/apksigner verify --verbose --print-certs <apk-path>
```

本地安装测试：

```bash
/Users/yq/Library/Android/sdk/platform-tools/adb install -r <apk-path>
```

安装后重点检查：

- App 是否进入 `com.tuotuzju.app/.AppWebViewActivity` 并正常加载 `https://tuotuzju.com/`
- 如果外部链接尝试把 App 打开到 `/download`，应被引导回首页，而不是在 App 内显示下载页。
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

### 2. 判断是否进入 WebView 承载层

启动后执行：

```bash
/Users/yq/Library/Android/sdk/platform-tools/adb shell dumpsys activity activities | grep -E "topResumedActivity|mResumedActivity|LauncherActivity|AppWebViewActivity|AndroidRuntime"
```

- 如果顶部是 `com.tuotuzju.app/.LauncherActivity` 后立刻退出，优先看原生崩溃日志。
- 如果顶部是 `com.tuotuzju.app/.AppWebViewActivity`，说明原生入口正常，继续看网页资源、网络和 JS 日志。
- 如果顶部仍跳到 Chrome 或 Custom Tabs，说明安装的不是新版 WebView 主入口 APK，先核对 `versionCode`。

### 3. 抓取关键日志

```bash
/Users/yq/Library/Android/sdk/platform-tools/adb logcat -c
/Users/yq/Library/Android/sdk/platform-tools/adb shell am start -n com.tuotuzju.app/.LauncherActivity
sleep 8
/Users/yq/Library/Android/sdk/platform-tools/adb logcat -d | grep -Ei "tuotuzju|AppWebViewActivity|File chooser|AndroidRuntime|chromium|cr_|asset_statements"
```

排查优先级：

- `AndroidRuntime` / `FATAL EXCEPTION`：原生崩溃。
- `AppWebViewActivity` 已启动但网页空白：继续检查网络、线上首页资源、Service Worker、首屏 JS。
- `File chooser` 日志：用于判断上传按钮是否真的触发了 Android 文件选择器。
- `asset_statements` / `Digital Asset Links` 错误：不应阻止当前 WebView 主入口启动，但会影响域名验证和后续 TWA 兼容。

### 4. 启动性能重点

Android App / WebView 环境不应该加载桌面端装饰资源，例如 Three.js 背景、桌面自定义鼠标和桌面滚动进度。构建后检查：

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
- `android-twa/app/build.gradle` 中的 `fallbackType`，应保持为 `webview`，确保无 Chrome / 无 TWA 浏览器设备仍可打开
- `src/components/AppDownload.jsx` 中的 `APK_VERSION` 和 `APK_UPDATED_AT`
- `public/downloads/tuotuzju-android.apk`，应覆盖为最新 signed APK

其中 `versionCode` 必须递增，否则 Android 无法覆盖安装，也无法提交到应用商店。
