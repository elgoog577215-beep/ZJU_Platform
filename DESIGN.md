# DESIGN.md - ZJU_Platform AI 数字化科研全息设计总纲

This `DESIGN.md` is the official design token and visual guidelines blueprint for **ZJU_Platform (拓涂浙享)**, custom-designed to instruct AI coding agents to generate pixel-accurate, premium, and unified User Interfaces matching the **"Holographic Science Cockpit"** digital research aesthetic.

---

## 🌌 1. Brand Identity & Visual DNA
- **Brand Personality**: Academic-grade, high-end scientific instrument, digital telemetry console, zero-clutter minimalism.
- **Core Aesthetic**: Void-black canvas, extremely thin laser glowing boundaries, custom monospace telemetry text, and slow-pulsing matrix indicators.
- **Aesthetic Vibe**: Deep tech console designed for the Vice President of the Tea Club (周子涵) - marrying digital research rigor with elite UI craftsmanship.

---

## 🎨 2. Visual Tokens & Color Palette

### Base Canvas
- `Void Black` (`#020308`): 95% deep void black for card surfaces and base container background. Emits zero ambient glare.
- `Neon Space` (`#05060b`): 90% space background with rectilinear grid alignments.

### Accent Glowing Signals
- `Hologram Cyan` (`rgba(6, 182, 212, 0.45)`): Used for ultra-thin laser bounds, active icons, and telemetry focus states. Represents clean scientific flow.
- `Matrix Emerald` (`#34d399`): Used exclusively for live online status and AI sensor pulsing lights. Slowly beats in 2s cycles.
- `Amber Caution` (`#f59e0b`): Used for upcoming event notices and warnings. Beats in 2.5s cycles.
- `Hyper Purple` (`#a855f7`): Represents academic honors, second-class score rewards (`SECOND_CLASS`).

---

## 📐 3. Typography & Spacing
- **Primary Font**: Premium sans-serif (`Inter`, `Outfit`, or system-default) with tight tracking (`tracking-tight`) for high density data.
- **Telemetry Indicators**: Zero-margin `monospace` (Uniline monospace font), uppercase, prefixed with `✦ ` (e.g., `✦ FIT_CONFIDENCE 92%`).
- **Heading Rule**: Bold, thick white headings, minimal bottom margin, accompanied by thin cyan glowing shadows but never over-glowing.

---

## 🍱 4. Component Blueprints

### A. EventCard (全息玻璃卡片)
- **Background**: Semi-transparent void black `bg-[#030409]/65 border-white/[0.04]` with a deep blur filter.
- **Boundary**: Wrap inside `.laser-border-glow` with double-layered `-webkit-mask` composite. Glowing strength goes from `opacity: 0.4` to `opacity: 0.95` on hover.
- **Rounding**: Consistent SaaS-standard roundness `rounded-2xl`. No straight raw corners.
- **Hover Motion**: Moves upward smoothly (`-translate-y-1.5`) over `duration-300` transition. SmartImage inside zooms slightly to `scale-[1.03]`.

### B. Telemetry Microchip (数码微晶片标签)
- Refuse boring rounded colorful chips.
- Format all metadata score badges as **Electronic Microchips**:
  - Border: thin semi-transparent colored outline.
  - Prefix: `✦ `
  - Fonts: all-uppercase monospace `font-mono text-[10px] font-black tracking-wider`.

### C. Flight Telemetry Grid (飞行遥测数码参数格)
- Modal detail properties (Date, Location, Score, Volunteer hours) must be structured as parallel rectangular slots inside a dense grid.
- Border: `border-white/[0.04]` or `border-slate-200/80`.
- Includes a copy action with a micro-scale transition (`active:scale-95`).

---

## ⚡ 5. Micro-Interactions & Animation Heartbeat

### A. Holographic Pulse Lights (全息脉冲灯)
- Online and live status dots must pulse organically using `@keyframes pulse-glow-green` and `@keyframes pulse-glow-amber` to expand glowing shadows:
  ```css
  @keyframes pulse-glow-green {
    0%, 100% { box-shadow: 0 0 5px rgba(52, 211, 153, 0.4), inset 0 0 2px rgba(52, 211, 153, 0.2); opacity: 0.75; }
    50% { box-shadow: 0 0 15px rgba(52, 211, 153, 0.95), inset 0 0 6px rgba(52, 211, 153, 0.4); opacity: 1; }
  }
  ```

### B. Escape Capsule (返回顶部悬浮钮)
- Shaped as a pure circle hologram container.
- Equipped with a horizontal and vertical cross-aligned reticle for telemetry calibration.
- Glows in 4s infinite cycles matching the pace of the main AI holographic search ring.
