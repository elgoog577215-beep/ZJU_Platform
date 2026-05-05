# 全站动效系统升级 Spec

日期：2026-05-04

## 目标

把网站动效从“各组件各写各的”升级为成熟应用常见的统一动效系统：更轻、更稳、更有层次，移动端触感更像原生 App，桌面端保留高级感但避免炫技。

## 设计原则

1. 优先使用 `transform` 和 `opacity`，避免频繁动画化尺寸、位置流、阴影扩散、模糊等昂贵属性。
2. 动效分层：页面切换、首屏入场、列表入场、卡片悬停、按钮按压、弹层打开各有不同节奏。
3. 移动端更克制：按压反馈清楚但幅度小，底部导航用滑动高亮表达当前位置，不用大面积弹跳。
4. 桌面端更精致：导航指示器、卡片 hover、滚动提示保留轻微高级动效。
5. 尊重用户设置：`prefers-reduced-motion` 下关闭长循环动画、平滑滚动和入场位移。
6. 所有新增动画必须能被复用，不能继续散落硬编码。

## 动效语言

- 页面切换：轻微上浮 + 透明度，使用短弹簧，切页不拖泥带水。
- 首屏：标题、说明、标签按顺序进入，首屏图片只在桌面做视差。
- 列表/内容块：滚入视口时小幅上浮，stagger 间隔控制在 45ms 左右。
- 操作按钮：按压缩放约 0.965，移动端避免 0.9 以下的夸张压缩。
- 底部导航：当前 tab 的图标底板使用共享布局动画移动，形成成熟 App 的连续性。
- 弹层：遮罩淡入，面板小幅位移/缩放进入；移动端更多菜单从底部 sheet 进入。

## 实现范围

- `src/utils/animations.js`：建立统一 motion tokens、variants、hooks。
- `src/index.css`：建立 CSS motion utilities，统一按压、悬停、图片缩放、GPU 合成、减弱动效。
- `src/App.jsx`：统一页面切换。
- `src/components/Hero.jsx`：首屏入场和滚动提示优化。
- `src/components/PlatformStats.jsx`：首页精选区/关注区入场、卡片和按钮反馈优化。
- `src/components/Navbar.jsx`：顶部导航、移动端更多菜单、弹层动效统一。
- `src/components/MobileNavbar.jsx`：底部 tabbar 入口和 active 指示器升级。
- `src/components/HomeCategories.jsx`：分类卡片动效接入统一系统。
- `src/components/LoadingScreen.jsx`：加载动效降重。

## 验收标准

1. 桌面和移动端页面打开、切换、弹层展示没有明显卡顿。
2. 底部导航 active 状态变化有连续滑动感，不跳闪。
3. 首页首屏动效有层次，但不遮挡内容、不影响阅读。
4. `prefers-reduced-motion: reduce` 时长循环和位移动效被压制。
5. 构建通过，浏览器检查无明显控制台错误。

## 迭代规则

后续新增组件必须优先复用 `src/utils/animations.js` 和 `src/index.css` 的 motion utilities。只有当组件需要表达全新的交互语义时，才新增动效参数。
