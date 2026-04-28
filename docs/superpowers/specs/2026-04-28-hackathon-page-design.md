# Hackathon Page Visual Redesign

Date: 2026-04-28

## Goal

Redesign the `/hackathon` page into a cyber competition poster-style registration page for the AI full-stack speed hackathon. The page should feel urgent, technical, and event-driven while keeping the existing registration flow intact.

## Approved Direction

Use the "cyber竞技海报" direction.

Primary message:

```text
AI 全栈极速黑客松
5小时、1个人、0路演
```

The page should emphasize speed, individual execution, AI-native building, and work-first judging. It should not feel like a generic glass-card dashboard.

## Visual Thesis

A dark cyber arena with code-grid texture, electric cyan highlights, sharp event typography, and a focused registration path.

## Content Plan

### 1. Hero Poster

The first viewport should behave like an event poster:

- Large primary title: `AI 全栈极速黑客松`
- Subtitle: `5小时、1个人、0路演`
- Short supporting copy: participants independently ship a runnable AI application within a limited time.
- Primary action: `立即报名`
- Secondary action: `了解生态团队`
- Right-side event module showing `5 HOURS`, event date, location, format, and AI-native development.

### 2. Event Parameters

Replace scattered info cards with a compact numbered parameter strip:

- `01 时间`
- `02 地点`
- `03 形式`
- `04 时长`

This should read like technical event metadata on a poster, not like an admin dashboard.

### 3. Core Challenge

Show three challenge principles:

- AI 原生开发: AI tools are allowed and expected.
- 5 小时从 0 到 1: build a working application in one session.
- 0 路演: no pitch scoring; focus on product completion, experience, and innovation.

### 4. Ecosystem Partners

Group partners into:

- 学校
- 社团
- 企业

Use compact badges and section labels. Avoid large repeated cards.

### 5. Registration Form

Keep the existing form fields and submission behavior:

- 姓名
- 学号
- 专业
- 年级
- 常用 AI 工具

Restyle it as a clean competition registration panel. Fix all garbled Chinese copy in the component.

## Interaction Thesis

- Hero title, subtitle, and actions enter with a short staggered motion.
- The event module uses subtle floating or scanning-line motion.
- Buttons, event parameters, and tool chips respond with restrained hover feedback.
- Reduced-motion preferences must disable nonessential motion.

## Technical Scope

Primary implementation target:

- `src/components/HackathonRegistration.jsx`

Allowed supporting changes:

- Minimal global CSS only if needed for stable visual effects.

Out of scope:

- Routing changes
- API changes
- Authentication changes
- Admin manager changes
- Backend registration behavior changes

## Accessibility And Responsiveness

- Text must remain readable in both day and dark UI modes.
- CTA buttons need clear focus states and usable tap targets.
- Mobile layout should stack hero content, event metadata, and the form without overlap.
- Long Chinese labels must wrap cleanly without breaking buttons or inputs.
- Reduced-motion users should not receive decorative motion.

## Acceptance Criteria

- `/hackathon` has a clear cyber competition poster first impression.
- The hero shows `AI 全栈极速黑客松` and `5小时、1个人、0路演`.
- All visible Chinese copy in the page is readable and no longer garbled.
- Registration form behavior remains unchanged.
- Desktop and mobile layouts are visually stable.
- The page avoids a heavy generic card-grid look.
