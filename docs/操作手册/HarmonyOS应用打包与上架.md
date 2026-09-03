# HarmonyOS 应用打包与上架

## 目标

本手册用于修改鸿蒙应用图标后，生成符合华为应用市场要求的签名 `.app` 包并重新提交。`zju_app/` 是鸿蒙工程真源；AppGallery Connect 后台单独上传的应用图标不能替代包体图标。

## 图标真源与规范

- 包体图标使用分层资源：`foreground.png` 是透明 PNG 前景，`background.png` 是无透明像素的纯色背景，两层均为 1024×1024。
- `AppScope/app.json5` 与 `entry/src/main/module.json5` 都引用 `$media:layered_image`。
- 资源本身不裁圆角；圆角由 HarmonyOS 在显示时处理。
- AppGallery Connect 使用 `zju_app/AppGalleryConnect/app_icon_1024.png`：1024×1024 PNG、无透明像素、小于 3 MB，并与包体图标一致。
- 品牌图形源为 `public/newlogo.png`。修改源图后运行 `npm run generate:harmonyos-icons`，再运行 `npm run check:harmonyos-icons`。

## 修改后重新打包

1. 在 `zju_app/AppScope/app.json5` 中递增 `versionCode`，并同步调整 `versionName`。
2. 检查 release 签名。证书、Profile、P12 和密码只保存在发布电脑或平台 Secrets，不新增到 Git。
3. 在项目根目录检查图标，再进入 `zju_app/` 安装依赖并构建 release APP：

   ```bash
   npm run check:harmonyos-icons
   cd zju_app
   ohpm install
   hvigorw clean --no-daemon
   hvigorw assembleApp --mode project -p product=default -p buildMode=release --no-daemon
   ```

4. 只有命令返回 `BUILD SUCCESSFUL` 才表示签名 APP 完成。在 `zju_app/build/outputs/default/` 查找 `.app` 文件，再用签名工具核验；上架不得使用带 `unsigned` 的 `.app` 或 `.hap`。
5. 如果命令在 `SignHap` 或 `SignApp` 失败，先检查 `build-profile.json5` 中的 release 签名路径是否指向当前电脑实际存在的材料；不得为了让构建通过而伪造或更换线上应用的签名身份。
6. 用 DevEco Testing 的“上架预检”检查图标，并至少在一台 HarmonyOS 真机安装，确认桌面图标完整、清晰、没有白边或异常裁切。

### 命令行工具首次安装

从华为官方下载与项目 SDK 版本匹配的 [Command Line Tools for HarmonyOS](https://developer.huawei.com/consumer/cn/download/command-line-tools-for-hmos)。macOS 解压后配置：

```bash
export HARMONYOS_COMMANDLINE_HOME="/实际安装路径/command-line-tools"
export DEVECO_SDK_HOME="$HARMONYOS_COMMANDLINE_HOME/sdk"
export PATH="$HARMONYOS_COMMANDLINE_HOME/bin:$DEVECO_SDK_HOME/default/openharmony/toolchains:$PATH"
```

保存到 shell 配置后，用 `ohpm -v`、`hvigorw --version` 和 `hdc -v` 确认安装成功。本项目当前使用 HarmonyOS 6.0.1 / API 21，工具包必须包含对应 SDK。

## AppGallery Connect 重新提交

1. 进入对应应用的当前待提交版本，在“软件包”区域删除或替换旧包，上传新生成的签名 `.app`。
2. 如果后台要求重新上传应用图标，使用 `zju_app/AppGalleryConnect/app_icon_1024.png`；如果后台现有图标已经与该文件一致且未报素材问题，不需要仅为包体问题重复上传。
3. 保存版本信息，重新运行云测试或上架预检，再提交审核。

审核反馈如果明确写的是“应用包体内配置的图标”，只换 AppGallery Connect 页面上的图标不能解决问题，必须重新构建并上传包含新资源的 `.app`。如果反馈注明“本次问题暂不影响 APP 上架”，也可以让当前版本继续上架，在下一次版本迭代中上传修正后的 `.app`。

## 官方依据

- [上架检测 FAQ：应用图标](https://developer.huawei.com/consumer/cn/forum/topic/0203209383550841435?fid=0102104600515103427)
- [配置应用图标和名称](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/layered-image)
- [应用图标配置与开发](https://developer.huawei.com/consumer/cn/doc/best-practices/bpta-app-icon-configuration)
- [AppGallery Connect 素材规范](https://developer.huawei.com/consumer/cn/doc/app/agc-help-app-visual-asset-spec-0000002277607976)
