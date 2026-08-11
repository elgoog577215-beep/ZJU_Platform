# 黑客松成果系统设计 QA

## 验收对象

- 唯一视觉目标：`/var/folders/5z/ysrw5tcd3fngb509jyxr533c0000gn/T/codex-clipboard-d280aac5-b96e-4970-917d-9d6e3a391918.png`
- 成果展示页：`http://localhost:5180/hackathon?view=showcase&event=zhekesong-current`
- 活动影像库：`http://localhost:5180/media?event=zhekesong-current`
- 桌面视口：`1440 × 1024 CSS px`
- 手机视口：`390 × 844 CSS px`
- 状态：中文、已归档赛事、真实现场照片与作品数据。

## 视觉落地

- 以真实栅格 X-field 作为成果页与影像库首屏的空间骨架，没有使用 CSS 图形替代，也没有重新加入遮住背景的整页蒙层。
- 首屏保持“左上超大标题、右下现场照片”的错位关系；白色承担标题，酸性荧光绿只用于标题重音、数字、章节编号、选择态和主操作。
- 圆角只出现在现场照片、视频、按钮、赛事切换器和作品详情；统计、排名、标题与章节仍采用开放式线性布局，避免过度容器化。
- 现场照片没有文字门板或持久遮罩；视频只保留必要的播放控制，图注和元数据位于照片下方。
- 赛事成果保持三章：赛事总览、现场档案、作品与荣誉；影像库按赛事切换并展示该场全部公开照片与视频。

## 二次校正

- 首轮实现虽然使用了相同背景与色彩，但全站导航、宽赛事条和额外 `01 OVERVIEW` 把首屏切成多层，标题、照片和主操作也明显小于效果图，构图忠实度未达标。
- 本轮删除首屏重复章节标签，恢复“标题 → 日期 → 赛事总览 → 描述 → 数据”的效果图顺序，并把标题、数据和按钮放大到同一视觉尺度。
- 现场照片向左扩展并贴到视口右边缘，使用大左侧圆角与 X-field 形成一个整体；现场档案章节标题重新回到首屏底部中央。
- 桌面导航切换为浙客松专属锁定标识和六项赛事导航，赛事切换条收窄为局部控件，不再横贯页面。章节导航现在保留 `event` 与 hash，点击可真实滚动到对应章节。
- 修复英文模式下“比赛结果”使用错误 locale key 的问题；英语导航和按钮在 `1440px` 视口无溢出。

## 对照证据

- 参考图与二次校正实现并排：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/refine-reference-vs-final-v2.jpg`
- 二次校正桌面首屏：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/refine-desktop-final.jpg`
- 二次校正手机首屏：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/refine-mobile-final.jpg`
- 英文桌面首屏：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/refine-desktop-en.jpg`
- 成果页手机滚动与照片横滑：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/impact-mobile-scroll-final.jpg`
- 影像库桌面首屏：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/media-desktop-v1.jpg`
- 影像库手机首屏：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/media-mobile-v1.jpg`

## 交互与响应式

- 成果页与影像库在桌面均满足 `scrollWidth === innerWidth === 1440`。
- 成果页与影像库在手机均满足 `scrollWidth === innerWidth === 390`，页面纵向滑动没有横向漂移。
- 手机照片条拥有独立横向滚动与 `scroll-snap`，实测内容宽度大于视口但文档宽度始终保持 `390`。
- 页面开始滚动后，成果页的报名/结果切换面板会收起，不再长期遮挡现场档案和作品章节。
- 桌面赛事总览、现场档案导航分别实测回到 `scrollY=0` 和滚动至现场档案，URL 保留赛事参数与章节 hash。
- 手机作品详情仍使用 body portal、`100dvh` 和滚动锁；打开时 `body` 为 `overflow: hidden`，关闭后弹层消失并恢复页面滚动。
- 浏览器日志无 error 或 warning；只有 Vite 连接与 React DevTools 开发提示。

## 工程检查

- 目标组件 ESLint 通过。
- Impeccable anti-pattern detector 对本轮成果页样式未发现新增问题；它报告的 8 项 warning 均来自 `Navbar.jsx` 中本轮未触及的天气、壁纸与移动菜单旧配色分支。
- 中英文 locale 均可被 `JSON.parse`。
- `npm run build` 通过。
- `git diff --check` 通过。
- 严格 OpenSpec 校验通过。

未发现剩余 P0、P1、P2 视觉或交互问题。

final result: passed
