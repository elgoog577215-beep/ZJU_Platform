---
name: "拓浙AI生态"
description: "连接人才、技术与产业的公共数字底座"
colors:
    night-bg: "#020617"
    night-surface: "rgba(15, 23, 42, 0.82)"
    night-text: "#ffffff"
    night-muted: "#94a3b8"
    day-bg: "#ffffff"
    day-text: "#0f172a"
    day-muted: "#64748b"
    ecosystem-indigo: "#6366f1"
    community-ice: "#8bdcff"
    community-ice-bright: "#c9f3ff"
    community-ice-muted: "#b7c5d8"
    hackathon-lime: "#b9ff18"
typography:
    display:
        fontFamily: "HarmonyOS Sans SC, MiSans, PingFang SC, system-ui, sans-serif"
        fontSize: "clamp(2.5rem, 7vw, 6rem)"
        fontWeight: 950
        lineHeight: 0.95
        letterSpacing: "-0.04em"
    body:
        fontFamily: "Inter, HarmonyOS Sans SC, MiSans, PingFang SC, system-ui, sans-serif"
        fontSize: "1rem"
        fontWeight: 400
        lineHeight: 1.5
    label:
        fontFamily: "Inter, HarmonyOS Sans SC, MiSans, PingFang SC, system-ui, sans-serif"
        fontSize: "0.75rem"
        fontWeight: 800
        lineHeight: 1.2
rounded:
    chip: "8px"
    control: "10px"
    card: "14px"
spacing:
    xs: "4px"
    sm: "8px"
    md: "16px"
    lg: "24px"
    xl: "48px"
components:
    button-primary:
        backgroundColor: "{colors.ecosystem-indigo}"
        textColor: "{colors.night-text}"
        rounded: "{rounded.control}"
        padding: "12px 18px"
    hackathon-button-primary:
        backgroundColor: "{colors.hackathon-lime}"
        textColor: "#061006"
        rounded: "{rounded.control}"
        padding: "12px 18px"
    input:
        backgroundColor: "{colors.night-surface}"
        textColor: "{colors.night-text}"
        rounded: "{rounded.control}"
        padding: "10px 12px"
---

# Design System: 拓浙AI生态

## Overview

**Creative North Star: "公共实验场"**

界面把拓浙 AI 生态呈现为一个正在运行的公共实验场：真实机会、参与者、项目和结果处于同一套可导航系统中。品牌表达允许活动现场拥有鲜明的主题材料，但所有操作表面保持清楚、克制和可信，避免展示效果盖过用户任务。

全局以深夜蓝与白昼白两套语义主题承载内容；模块可以拥有一个明确的领域强调色。黑客松表面使用荧光青柠作为当前状态和主要行动，背景图像与舞台线条提供现场感，控件仍遵循统一的形状、焦点和状态规则。

**Key Characteristics:**

- 真实内容和当前状态优先于装饰。
- 一个表面只使用一个主要强调色。
- 操作层稳定，活动主题通过背景、图像和少量标记表达。
- 桌面与移动端共享信息顺序，响应式改变结构而不是缩小字体。

## Colors

全局主题使用冷静的深夜蓝/白昼白中性色，领域强调色只用于主要行动、当前选择和语义状态。

### Primary

- **生态靛蓝** (`#6366f1`)：全局主行动、焦点与品牌连接。
- **社区冰川蓝** (`#8bdcff`)：仅用于 AI 社区夜间模式四个大型入口的线稿与箭头；小标题使用更亮的 `#c9f3ff`，说明文字使用 `#b7c5d8`。收缩后的栏目、操作按钮和白天模式继续使用全局主题强调色。
- **黑客松青柠** (`#b9ff18`)：只用于黑客松表面的主要行动、当前范围和关键赛事状态。

### Neutral

- **深夜底色** (`#020617`)：夜间全局背景。
- **深夜表面** (`rgba(15, 23, 42, 0.82)`)：夜间导航、工具栏与操作容器。
- **白昼底色** (`#ffffff`)：日间背景和主要表面。
- **主文字** (`#ffffff` / `#0f172a`)：随主题切换。
- **次要文字** (`#94a3b8` / `#64748b`)：辅助事实和说明。

**The One Accent Rule.** 同一任务表面只有一个领域强调色；它表达行动和状态，不作为无意义装饰散落。

## Typography

**Display Font:** HarmonyOS Sans SC / MiSans（系统无衬线回退）

**Body Font:** Inter / HarmonyOS Sans SC / MiSans（系统无衬线回退）

**Character:** 标题紧凑、有现场识别度；正文与控件保持高可读性，不用展示字体承担操作标签。

### Hierarchy

- **Display**（950，`clamp(2.5rem, 7vw, 6rem)`，0.95）：品牌或活动主标题，字距不低于 `-0.04em`。
- **Headline**（850–950，1.5–2rem，1.1）：页面模块与上下文标题。
- **Title**（800–900，1–1.25rem，1.25）：卡片和列表对象名称。
- **Body**（400–700，0.875–1rem，1.5–1.7）：说明和正文，长段落控制在 65–75ch。
- **Label**（800–900，0.68–0.78rem）：控件、状态与小型数据标签。

## Layout

公开页面使用居中内容容器和 24px 桌面边距，移动端改为 14–16px。任务型页面按“身份/范围 → 上下文 → 控件 → 内容”的固定顺序组织；移动端允许工具栏和导航横向滚动，但不得造成文档级溢出。主要断点遵循 820px 和 980px 的现有实现。

## Elevation & Depth

夜间主题通过半透明表面、结构性阴影和背景层建立深度；日间主题以边界和留白为主，默认无阴影。阴影必须同时具有偏移和柔和扩散，仅用于浮层、悬停或明确抬升的表面。

### Shadow Vocabulary

- **Ambient Small** (`0 14px 32px rgba(2, 6, 23, 0.18)`)：轻量浮层和可交互表面。
- **Overlay** (`0 38px 90px rgba(2, 6, 23, 0.46)`)：对话框和分享预览。

**The Flat-By-Default Rule.** 常规内容在静止状态依靠层次和边界，不为每个容器同时叠加边框与阴影。

## Shapes

控件以 8–10px 圆角保持紧凑，卡片使用 14px。小型计数和状态可以使用胶囊形；大型按钮、面板和卡片不得使用全胶囊轮廓。图片通过容器裁切，不额外添加装饰边框。

## Components

### Buttons

- **Shape:** 10px 圆角，最小高度 42–48px。
- **Primary:** 领域强调色背景、高对比文字，单个操作组只保留一个主要按钮。
- **Hover / Focus:** 180–240ms 状态过渡；键盘焦点使用清晰的强调色轮廓。
- **Secondary / Ghost:** 透明或中性表面配 1px 语义边界，不与主要行动争夺权重。

### Chips

- **Style:** 8px 圆角，中性表面与清楚边界。
- **State:** 当前选择同时改变背景、文字和 `aria-current`/`aria-pressed`，不只依靠颜色。

### Cards / Containers

- **Corner Style:** 14px。
- **Background:** 主题表面或领域背景的稳定层。
- **Shadow Strategy:** 默认平面；悬停或覆盖层才抬升。
- **Internal Padding:** 12–24px，按内容密度选择。

### Inputs / Fields

- **Style:** 10px 圆角、1px 语义边界、16px 移动端字号。
- **Focus:** 边界转为当前领域强调色并保留浏览器可见焦点。
- **Error / Disabled:** 同时用文字说明和视觉状态表达原因。

### Navigation

导航使用稳定位置、明确当前项和标准按钮/链接语义；移动端保留可返回入口，不因选中内容而移除导航本身。

## Do's and Don'ts

### Do:

- **Do** 让当前对象、当前状态和下一步行动在五秒内可见。
- **Do** 让切换范围只更新从属内容，保留导航与撤销路径。
- **Do** 使用现有主题 token、全局导航和真实品牌资产。
- **Do** 为 hover、focus、disabled、loading、error 和 empty 提供完整状态。

### Don't:

- **Don't** 为同一任务维护两套互斥页面骨架。
- **Don't** 用随机卡片尺寸、重复面板和装饰徽章替代信息层级。
- **Don't** 在公开界面编造合作、所有权、部署或效果证据。
- **Don't** 用只在桌面成立的间距和工具栏结构挤压移动端。
