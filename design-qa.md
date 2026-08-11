# 黑客松成果系统设计 QA

## 验收对象

- 视觉参考：`/Users/yq/.codex/generated_images/019fecd9-aba7-7680-a80d-85cfd63f68e0/exec-d99f03bb-38f7-4afd-ab32-d3e8335e6023.png`
- 成果展示页：`http://localhost:5180/hackathon?view=showcase`
- 活动影像库：`http://localhost:5180/media?event=ai-full-stack-hackathon-outcome`
- 桌面视口：`1440 × 1024 CSS px`
- 手机视口：`390 × 844 CSS px`
- 参考图像素：`1030 × 1527 px`
- 桌面实拍像素：`1440 × 1024 px`
- 状态：中文、黑夜模式、2026-05-10 已归档赛事、真实照片与作品数据。

参考图是整页长图，实现截图是浏览器固定视口，因此对照图按等高面板归一化密度；不把不同纵横比误报为像素级一致。

## 对照证据

- 全流程并排对照：`/Users/yq/.codex/visualizations/2026/08/10/019fecd9-aba7-7680-a80d-85cfd63f68e0/hackathon-system-build/design-comparison-full-v2.jpg`
- 首屏聚焦对照：`/Users/yq/.codex/visualizations/2026/08/10/019fecd9-aba7-7680-a80d-85cfd63f68e0/hackathon-system-build/design-comparison-top-v2.jpg`
- 桌面成果首屏：`/Users/yq/.codex/visualizations/2026/08/10/019fecd9-aba7-7680-a80d-85cfd63f68e0/hackathon-system-build/showcase-desktop-v2.jpg`
- 桌面现场档案：`/Users/yq/.codex/visualizations/2026/08/10/019fecd9-aba7-7680-a80d-85cfd63f68e0/hackathon-system-build/showcase-archive-desktop-v2.jpg`
- 桌面作品与荣誉：`/Users/yq/.codex/visualizations/2026/08/10/019fecd9-aba7-7680-a80d-85cfd63f68e0/hackathon-system-build/showcase-works-desktop-v2.jpg`
- 桌面影像库：`/Users/yq/.codex/visualizations/2026/08/10/019fecd9-aba7-7680-a80d-85cfd63f68e0/hackathon-system-build/media-desktop-v2.jpg`
- 手机成果页：`/Users/yq/.codex/visualizations/2026/08/10/019fecd9-aba7-7680-a80d-85cfd63f68e0/hackathon-system-build/showcase-mobile-v2.jpg`
- 手机影像库：`/Users/yq/.codex/visualizations/2026/08/10/019fecd9-aba7-7680-a80d-85cfd63f68e0/hackathon-system-build/media-mobile-v2.jpg`

## 迭代记录

### 第 1 轮

- P2：赛事总览只有 3 项指标，四列网格空一格。已补入奖金池，桌面与手机均显示 4 项。
- P2：桌面作品经验全文导致详情栏与页面被异常拉长。已限制详情栏为 `720px` 并在栏内滚动。
- P2：影像库赛事日期只读到旧比赛记录，显示不完整。已用赛事日程按 `competitionSlug` 补齐标题、说明和日期。
- P2：影像库手机标题断成三行，首屏失衡。已降低移动字号并启用平衡换行；实拍为单行。
- P2：照片灯箱关闭后被深链状态立即重新打开。已加入 URL 与本地选择状态同步门，复测关闭后 `photo` 参数消失。

### 第 2 轮

- 参考图与实现的直角、低容器化、青色技术线框、超大标题和三段信息架构一致。
- 现场图片均保留完整视觉，没有文字遮罩或门板；标题和说明统一放在图片下方。
- 动态背景在影像库首屏保持可见，页面只使用半透明底色，没有重新加入遮罩层。
- 桌面成果页、作品区和影像库的 `scrollWidth === clientWidth === 1440`。
- 手机成果页和影像库的 `scrollWidth === clientWidth === 390`，页面纵向滑动无横向漂移。
- 未发现剩余 P0、P1、P2 视觉问题。

## 表面检查

- 字体：标题层级、数字等宽字体、正文行高与参考图一致；无异常字重或乱码。
- 间距：三章节间距清楚，内容密度高但不拥堵；手机首屏按钮和指标不重叠。
- 颜色：沿用现有黑夜模式与青色品牌色；没有新增圆角卡片语言。
- 图像：使用项目真实宣传片、现场照片和获奖作品图；裁切比例稳定，无拉伸。
- 文案：中文和英文 locale 均已维护，JSON 可解析。

## 核心交互

- 赛事成果页作品切换会更新 `work` 深链。
- 手机作品详情使用 body portal、`100dvh` 和滚动锁；关闭后恢复页面滚动并移除 `work` 参数。
- 影像库照片打开会写入 `photo` 深链；关闭后灯箱消失并移除参数。
- `/gallery` 自动兼容到 `/media`；`/hackathon/works` 自动兼容到成果页作品区。
- 浏览器控制台无 error 或 warning，仅有 Vite 连接和 React DevTools 开发提示。

final result: passed
