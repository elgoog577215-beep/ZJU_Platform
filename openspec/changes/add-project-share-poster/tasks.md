# Tasks: add-project-share-poster

## 1. 规格
- [x] 1.1 新增 project-plaza 分享海报 requirement。
- [x] 1.2 `openspec validate add-project-share-poster --strict` 通过。

## 2. 前端实现
- [x] 2.1 新增浏览器端二维码与 PNG 导出依赖。
- [x] 2.2 新增 `ProjectSharePoster` 组件，支持预览、下载、复制链接和系统分享。
- [x] 2.3 项目详情弹窗增加“生成海报”按钮，打开预览后再下载。
- [x] 2.4 海报样式按小红书通用项目卡落地：顶部图片、项目标题信息、发起人、底部二维码、“拓浙AI生态：项目广场”。
- [x] 2.5 新增中文与英文翻译，新增文案通过 `t(...)` 读取。

## 3. 验证
- [x] 3.1 `npm run build` 通过。
- [x] 3.2 浏览器检查 `/projects` 项目详情海报入口、预览弹窗、二维码渲染、下载按钮。
- [x] 3.3 英文模式检查新增海报文案无中文残留。
- [x] 3.4 检查页面移动端宽度下海报弹窗无明显遮挡。
