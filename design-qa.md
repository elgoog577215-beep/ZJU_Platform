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
- 现场照片向左扩展并贴到视口右边缘；桌面主照片恢复效果图中上窄下宽、向右冲出的“车头”异形轮廓，与 X-field 形成一个整体，现场档案章节标题重新回到首屏底部中央。
- 桌面导航改为全站一致的扁平下划线交互；进入成果页继续保留 `拓浙AI生态` Logo、全站导航名称和全局控制，仅将 `浙客松` 标为当前项。赛事切换条收窄为局部控件，不再横贯页面。章节导航现在保留 `event` 与 hash，点击可真实滚动到对应章节。
- 修复英文模式下“比赛结果”使用错误 locale key 的问题；英语导航和按钮在 `1440px` 视口无溢出。

## 三次校正：主照片方向性

- 用户明确要求保护效果图中主照片类似“火车头”的轮廓，不再把它简化为普通大圆角矩形。
- 桌面照片左边界现在由上方 19% 位置向左下方收放，带两段缓和曲线；右边界继续冲出内容列，形成明确的向右运动感。
- 支持 CSS `shape()` 的浏览器使用曲线轮廓，不支持时退化为同方向的多边形轮廓；手机端不使用异形裁切，继续采用稳定的圆角 4:3 照片。

## 四次校正：全局导航、作品展览与共同见证

- 全站桌面导航共用透明、无胶囊容器的扁平布局，以 2px 下划线表达当前栏目；首页与浙客松页均保留同一 `拓浙AI生态` Logo 和同一组导航名称。
- 作品与荣誉从三列后台式容器重排为媒体主导的奖项展览：冠军占据主轨，亚军和季军保持整齐的并列关系；选中作品成为大幅焦点展览，完整排行收进右侧高密度索引。
- 共同见证不再使用重复卡片墙，而以真实合作方数量、学校支持 / 社团协作 / 企业生态三组角色和编号姓名矩阵收束页面，强调知识与创新网络的规模。
- 手机端冠军独占一行、亚季军两列，选中作品继续使用全屏 portal；滚动离开首屏后，赛事时间轴与页面切换条一同向上收起，不遮挡作品和阵容正文。

## 五次校正：作品详情与索引比例

- 用户截图指出桌面下半区存在明确的 P1 比例失衡：左侧详情过宽且图片过大，右侧作品索引被压成细小文字栏，两侧的信息密度不在同一尺度。
- 修复后详情与索引接近 1:1 分栏，详情的最大高度和超大名次同步收紧；索引获得接近一半页面宽度，并为每件作品加入真实封面、加大的名次、标题和作者层级。
- 当当前赛事只有 3 件可见作品时，右侧不再像悬空的微型目录；当作品增多时继续在同一高度内滚动，不把详情无限拉长。

## 六次校正：四屏概念图驱动落地

- 本轮不再直接凭代码试样式。先固定用户选定的 01 首屏概念图，再分别生成 02 现场档案、03 作品与荣誉、04 共同见证的同一视觉体系概念图，之后逐屏落地并制作同视口并排对照板。
- 01 在 `1366×768` 笔记本视口把“AI 全栈极速 / 黑客松”锁定为严格两行；标题、说明、四项数据、双操作和车头形现场照片均保持在首屏可见范围。原站 Logo、全站导航名称和全局按钮不随浙客松路由替换。
- 02 采用“左侧巨型章节编号 + 右侧单张主现场照片 + 底部四张连续辅图”的编辑式结构，照片不加门板；03 采用完整 TOP 3 奖台、近等宽作品详情与真实封面索引，消除“大物件压着小列表”的比例失衡。
- 04 使用真实 About 合作方数据构成六枚企业 Logo 单行跑道，并将学校支持与社团协作压缩为编号阵列；桌面保持横向阵容感，手机改为两列 Logo 墙和纵向知识网络。
- 手机 `390×844` 逐段实拍。02 的辅图只在自身横向轨道滑动，03 的冠军独占一行、亚季军并列，04 的“技术与产业支持”不再被挤成逐字竖排；页面正文没有文档级横向漂移。

## 对照证据

- 01 概念图 / 最终实现并排：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-concept-build/hero-concept-vs-local-final.jpg`
- 02 概念图 / 最终实现并排：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-concept-build/archive-concept-vs-local-final.jpg`
- 03 概念图 / 最终实现并排：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-concept-build/works-concept-vs-local-final.jpg`
- 04 概念图 / 最终实现并排：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-concept-build/support-concept-vs-local-final.jpg`
- 笔记本两行标题验收：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-concept-build/laptop-1366x768-final.jpg`
- 手机四段验收：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-concept-build/mobile-hero-final.jpg`、`mobile-archive-final.jpg`、`mobile-works-final.jpg`、`mobile-support-final.jpg`
- 英文首屏与共同见证：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-concept-build/english-final.jpg`、`english-support-final.jpg`
- 参考图与二次校正实现并排：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/refine-reference-vs-final-v2.jpg`
- 二次校正桌面首屏：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/refine-desktop-final.jpg`
- 二次校正手机首屏：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/refine-mobile-final.jpg`
- 英文桌面首屏：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/refine-desktop-en.jpg`
- 车头轮廓桌面复核：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/train-nose-desktop-v2.jpg`
- 车头轮廓手机版复核：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/train-nose-mobile.jpg`
- 成果页手机滚动与照片横滑：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/impact-mobile-scroll-final.jpg`
- 影像库桌面首屏：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/media-desktop-v1.jpg`
- 影像库手机首屏：`/Users/yq/.codex/visualizations/2026/08/11/hackathon-redesign-impact/media-mobile-v1.jpg`
- 原站导航基线：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/home-nav-baseline.jpg`
- 全站导航实现：首页 `/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/home-nav-after.jpg`；成果页 `/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/hackathon-nav-after.jpg`
- 作品与荣誉桌面实现：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/works-honors-desktop-v1.jpg`
- 共同见证桌面实现：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/credits-desktop-v1.jpg`
- 作品与荣誉手机实现：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/works-honors-mobile-v1.jpg`
- 共同见证手机实现：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/credits-mobile-v1.jpg`
- 比例问题来源图：`/var/folders/5z/ysrw5tcd3fngb509jyxr533c0000gn/T/codex-clipboard-a44fac10-8cdc-49eb-b529-7eba7e2545a8.png`（`1742×1006`）
- 比例校正后同尺寸实现：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/works-balance-live-1742x1006-final.jpg`（真实赛事数据；CSS 视口与输出均为 `1742×1006`，`deviceScaleFactor=1`）
- 最终桌面作品区：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/works-honors-balanced-desktop-final.jpg`
- 最终桌面共同见证：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/credits-desktop-final.jpg`
- 最终手机作品区：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/works-honors-mobile-final.jpg`
- 最终手机共同见证：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/credits-mobile-final.jpg`
- 真实数据桌面作品区：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/works-live-desktop-final.jpg`
- 真实数据桌面共同见证：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/credits-live-desktop-final.jpg`
- 真实数据手机作品区：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/works-live-mobile-final.jpg`
- 真实数据手机共同见证：`/Users/yq/.codex/visualizations/2026/08/11/navbar-and-works/credits-live-mobile-final-v2.jpg`

## 交互与响应式

- 成果页与影像库在桌面均满足 `scrollWidth === innerWidth === 1440`。
- 成果页与影像库在手机均满足 `scrollWidth === innerWidth === 390`，页面纵向滑动没有横向漂移。
- 手机照片条拥有独立横向滚动与 `scroll-snap`，实测内容宽度大于视口但文档宽度始终保持 `390`。
- 页面开始滚动后，成果页的报名/结果切换面板会收起，不再长期遮挡现场档案和作品章节。
- 桌面赛事总览、现场档案导航分别实测回到 `scrollY=0` 和滚动至现场档案，URL 保留赛事参数与章节 hash。
- 手机作品详情仍使用 body portal、`100dvh` 和滚动锁；打开时 `body` 为 `overflow: hidden`，关闭后弹层消失并恢复页面滚动。
- 手机深滚动时赛事时间轴和页面切换条均离开视口，作品与共同见证内容不再被固定浮层遮挡。
- 用户反馈截图尺寸 `1742×1006` 下，作品详情与索引宽度分别约为 `741px / 698px`；真实 20 件作品数据下两列高度约为 `680px / 754px`，右侧每项包含真实封面，不再是窄小文字列表。
- 笔记本 `1366×768` 与桌面 `1440×1024` 均保持首屏标题严格两行；中文、英文桌面和手机四段均使用真实本地页面完成截图验收。
- 本地后端健康启动后使用新标签页复测，浏览器 `warn / error` 日志为空。

## 工程检查

### 最终视觉判断

- 字体与层级：章节编号、奖项名次和作品标题维持清晰的三级尺度；索引标题与作者从原图中的微型辅助信息提升到可读正文尺度，没有与主标题竞争。
- 间距与布局：同尺寸重点对照覆盖作品详情 / 索引区域；两列宽度与高度均已归一到相近量级。没有另做局部裁切，因为 `1742×1006` 全视图已经能清楚读取两列边界、缩略图、标题和行高。
- 色彩与 token：继续使用黑绿基底、酸性荧光绿选择态和白色正文，未引入新的紫色渐变或无关强调色。
- 图片质量：奖台、详情和索引均使用同一真实赛事作品封面来源；没有 CSS 图形、占位框或拉伸缩略图替代真实资产。
- 文案与语言：中文真实作品名保持原样；英文 UI 标签、fallback 标题与作者均已实测，不再残留硬编码中文占位文案。
- 对比历史：来源图中的 P1 问题是“大详情 + 微型目录”；修复后在相同 `1742×1006` 状态下变为近等宽、媒体化索引，复测没有剩余 P0 / P1 / P2 问题。

- 目标组件 ESLint 通过。
- Impeccable anti-pattern detector 对最终组件与中英文词典返回空问题集 `[]`。
- 中英文 locale 均可被 `JSON.parse`。
- `npm run build` 通过。
- `git diff --check` 通过。
- 严格 OpenSpec 校验通过。

未发现剩余 P0、P1、P2 视觉或交互问题。

final result: passed
