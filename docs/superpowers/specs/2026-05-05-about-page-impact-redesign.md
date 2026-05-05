# About Page Impact Redesign

## Purpose

Redesign the About page so it reads as a credible, high-impact institutional front door for the Zhejiang University AI ecosystem. The primary audience is university leadership and supporting units. The page should make the team feel like a platform-level coordination mechanism, not a loose collection of activities.

## Core Message

Primary headline:

> 三大抓手，驱动一张校园 AI 网络。

Primary subheadline:

> 活动聚合、AI 社区、极速黑客松。让资源可见，让人群相连，让创造发生。

The language should be concise, elevated, and formal enough for school-facing communication while retaining the sharp technology-brand energy of the hackathon page.

## Visual Direction

Use the hackathon page as the visual intensity benchmark:

- Dark, high-contrast technology surface.
- Cyan energy accent, grid texture, large numbering, and strong block rhythm.
- Full-viewport or near-full-viewport sections with fewer small cards.
- Giant background words such as `AI ECOSYSTEM`, `RUN`, `LOOP`, and `BACK` as low-opacity spatial anchors.
- A right-side ecosystem brief panel in the hero with a large `3` and the three operating handles.
- Keep the first viewport poster-like: one thesis, one action area, and enough negative space for the headline to breathe. Proof numbers should sit in their own quiet band below the hero.

The About page should feel like an ecosystem command brief: confident, structured, and visually forceful.

## Page Structure

### 1. Hero

The hero introduces the platform thesis.

Content:

- Kicker: `ZJU AI Ecosystem`
- Headline: `三大抓手，驱动一张校园 AI 网络。`
- Subheadline: `活动聚合、AI 社区、极速黑客松。让资源可见，让人群相连，让创造发生。`
- Primary CTA: `查看生态抓手`
- Secondary CTA: `联系支持合作`
- Right-side brief panel:
  - `3`
  - `抓手联动 / 一套机制`
  - `01 / ENTRY 活动聚合`
  - `02 / LINK AI 社区`
  - `03 / BUILD 极速黑客松`

### 2. Flagship Matrix

Section headline:

> 把分散机会，组织成可运行的生态引擎。

Supporting text:

> 三大抓手分别承担入口、连接与爆发任务，共同支撑校园 AI 生态的长期运转。

Cards:

- `01 / ENTRY` 活动聚合  
  汇聚活动与机会，建立校内 AI 资源的统一入口。
- `02 / LINK` AI 社区  
  连接学习者与建设者，让交流沉淀为持续关系。
- `03 / BUILD` 极速黑客松  
  以高密度创造验证 AI 原生开发的校园势能。

### 3. Operating Loop

Section headline:

> 从入口到创造，从热度到沉淀。

Supporting text:

> 一套可持续扩展的协同闭环，让活动、人群、项目和成果不断回流。

Loop:

- `01` 发现: 活动与机会进入统一入口
- `02` 连接: 社区承接人群关系
- `03` 创造: 赛事激发真实项目
- `04` 沉淀: 成果反哺校园生态

### 4. Support Network

Section headline:

> 把支持转化为网络，把网络转化为生态。

Supporting text:

> 依托校内支持力量，持续连接资源、组织与项目，让 AI 生态建设从一次活动走向长期机制。

Support rows:

- 学校支持: 未来学习中心
- 学生组织: ZJUAI / XLab
- 生态入口: 活动聚合 / AI 社区 / 极速黑客松

### 5. Contact / Final Action

Keep the existing message form and contact behavior, but visually align it with the new darker command-brief style. It should feel like a serious cooperation channel, not a casual comment box.

## Implementation Notes

- Keep the existing `/about` route and reuse `About.jsx`.
- Preserve current settings integration where practical, but replace weak fallback copy with the approved stronger copy.
- Preserve the contact form submission behavior.
- Preserve SEO support.
- Preserve reduced-motion handling.
- Preserve day/night mode compatibility, while making the dark mode the flagship visual expression.
- Avoid introducing new dependencies.
- Do not alter unrelated pages.

## Acceptance Criteria

- The first viewport feels visually stronger than the current About page and closer in energy to the Hackathon page.
- The hero balances visual impact with breathing room, especially on mobile and mid-size screens.
- The page clearly presents 活动聚合, AI 社区, and 极速黑客松 as the three operating handles of one platform mechanism.
- The copy is concise, elevated, and school-facing.
- The mobile layout remains readable and does not crowd the first viewport with too many small chips.
- The existing contact form still works.
- The page honors reduced motion.
