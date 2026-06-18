## Why

项目广场已经能展示和打开项目名片，但“分享”仍停留在链接层面。项目名片天然适合在微信群、朋友圈和小红书式内容流里传播：先用项目图片吸引注意，再用标题、简介、发起人和二维码把人带回项目详情。

因此需要为项目详情增加一键生成分享海报能力，让项目从“可浏览”变成“可转发”。第一版采用固定精修模板，不接入 AI 生图，也不做多模板选择，优先保证速度、稳定性、可读性和中英文可维护性。

## What Changes

- 在项目详情弹窗增加“生成海报”入口。
- 新增项目分享海报预览弹窗，用户先预览，再下载 PNG。
- 海报采用小红书通用项目卡结构：顶部项目图片，下方展示项目标题、简介、状态、技术栈、招募需求、发起人昵称与头像、收藏/浏览数据，底部显示二维码。
- 海报必须同时宣传项目和网站：使用“拓浙AI生态：项目广场”官方标识，并展示站点 logo。
- 二维码指向 `/projects?id={projectId}`，扫码后打开该项目详情。
- 海报弹窗支持复制项目链接；浏览器支持时可使用系统分享。
- 新增中文与英文文案，新增文案从 i18n 读取。

明确不做：

- 不做多模板选择。
- 不做 AI 自动生成海报。
- 不把联系方式写入海报，避免把登录门禁信息通过图片泄露。
- 不把完整长正文塞进海报，保持传播图可读。

## Impact

- 前端：
  - `src/components/ProjectPlaza.jsx`：详情弹窗增加生成海报入口，根组件管理海报预览状态。
  - `src/components/ProjectSharePoster.jsx`：新增海报预览、二维码生成、PNG 导出、复制链接和系统分享。
  - `src/components/projectPlaza.styles.js`：新增海报弹窗与 1080×1440 海报样式。
  - `server/src/controllers/projectCardController.js`：项目列表与详情返回发起人展示名和头像，昵称为空时回退用户名。
  - `public/locales/zh/translation.json`、`public/locales/en/translation.json`：新增文案。
  - `package.json`、`package-lock.json`：新增 `html-to-image` 与 `qrcode`。
- 验证：
  - OpenSpec strict validate。
  - 前端构建。
  - 桌面与移动页面打开项目详情，检查海报预览、二维码、下载按钮、复制链接。
  - 英文模式检查新增海报相关文案。
