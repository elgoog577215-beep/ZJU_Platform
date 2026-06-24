# Site CPU Performance Optimization Spec

Date: 2026-04-22
Scope: Frontend runtime CPU usage optimization across homepage and global UI layers.
Constraint: Keep current visual style and brand polish; do not degrade perceived aesthetics.

## 1. Problem Statement

Recent runtime behavior indicates high CPU usage during browsing, especially on pages with:
- continuous pointer/scroll-driven animation
- high-frequency state updates on global overlays
- always-mounted visual effects on low-value contexts (mobile/background idle)

This spec targets CPU reduction without sacrificing visual quality.

## 2. Root-Cause Findings (Code-Level)

### F1. Custom cursor updates hover state too frequently
File: `src/components/CustomCursor.jsx`
- `pointermove` triggers hover target checks at very high frequency.
- `setIsHovering()` can be called repeatedly with the same value, causing unnecessary React work.

### F2. Global scroll progress bar is always mounted
Files: `src/App.jsx`, `src/components/ScrollProgress.jsx`
- Scroll progress is rendered for all non-admin contexts.
- On touch/mobile contexts, value is lower but still incurs animation/update overhead.

### F3. Hero keeps costly compositor hints/animations beyond necessary contexts
File: `src/components/Hero.jsx`
- `will-change: transform` is applied even when parallax is not active.
- Bottom arrow infinite bob animation runs regardless of viewport class where benefit is lower.

### F4. Multiple global motion surfaces run in parallel
Files: `src/App.jsx` and global overlays
- Cursor + scroll progress + hero parallax/entry transitions stack up on home route.
- Missing context-aware gating increases aggregate CPU pressure.

## 3. Optimization Goals

- Reduce unnecessary per-frame UI work in global layers.
- Keep desktop premium look (cursor, progress, hero visual richness).
- Improve mobile and reduced-motion runtime efficiency.
- Maintain behavior correctness and visual consistency.

## 4. Optimization Plan

### P0 (High Impact, Low Risk)
1. Custom cursor state dedup:
- Update hover state only when boolean value changes.
- Reduce redundant hover listener pressure while preserving interaction feel.

2. Scroll progress context gating:
- Render only in desktop/fine-pointer contexts.
- Keep style unchanged where enabled.

### P1 (Medium Impact, Low Risk)
3. Hero compositor and animation gating:
- Apply `will-change` only when parallax is active.
- Gate infinite arrow motion to desktop + motion-enabled contexts.

4. Global layer coexistence control:
- Keep current visual features on desktop.
- Prevent unnecessary stacking on low-benefit contexts.

### P2 (Optional Follow-Up)
5. Introduce adaptive performance mode flag:
- Auto-detect low-end devices (hardware concurrency / memory hint) and degrade only micro-interactions.
- Keep palette, typography, spacing, and color style unchanged.

## 5. Task Breakdown

- T1: Write and lock this spec.
- T2: Implement P0 cursor dedup.
- T3: Implement P0 scroll progress gating.
- T4: Implement P1 hero compositor/animation gating.
- T5: Run diagnostics and production build verification.
- T6: Record results and residual risks.

## 6. Acceptance Criteria

- No functional regression in navigation and interaction.
- Desktop visual quality remains premium.
- Mobile routes no longer run non-essential global animation layers.
- `GetDiagnostics` clean for edited files.
- `npm run build` passes.

## 7. Rollback Plan

If any interaction regression appears:
1. Re-enable previous `ScrollProgress` unconditional mount.
2. Revert cursor hover dedup only.
3. Revert hero gating individually.
4. Keep changes isolated to edited files for quick rollback.

## 8. Out-of-Scope

- Full animation redesign.
- Visual language replacement.
- Backend CPU/perf tuning.

