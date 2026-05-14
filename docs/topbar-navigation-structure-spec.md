# Spec: Topbar Navigation Structure

## Why
The current top navigation exposes too many peer-level entries. Users need a clearer structure based on the product meaning already confirmed: activity, competition, and community.

## Goals
- Reduce the desktop primary navigation to three categories: 活动, 比赛, 社区.
- Use one full-width floating navigation panel under the topbar, not separate per-item dropdowns.
- Keep search, theme, language, notifications, login/profile, and admin access as tools, outside the content categories.
- Align mobile navigation with the same three-category model.

## Non-goals
- Do not redesign page content, routes, or backend data.
- Do not add new navigation categories or new pages.
- Do not move picture, video, or results content outside 比赛.

## Scenarios
### Scenario: Desktop navigation expands as one panel
GIVEN the user hovers or focuses 活动, 比赛, or 社区
WHEN the topbar expands
THEN the panel shows all three columns together, with the active column highlighted.

### Scenario: Current route highlights the parent category
GIVEN the user is on /future-learning, /gallery, /videos, or /hackathon/showcase
WHEN they look at the topbar
THEN 比赛 is highlighted as the active category.

### Scenario: Mobile navigation remains compact
GIVEN the user is on mobile
WHEN they use the bottom navigation or the top more sheet
THEN the primary choices follow 首页, 活动, 比赛, 社区, 我的, and detailed links are grouped by the same categories.

## Impact
- Frontend: Navbar and MobileNavbar only.
- Backend: none.
- Database: none.
- AI / standard data: none.
- Deployment: regular frontend build.

## Risks
- The floating panel may overlap page hero content; mitigate with a constrained panel width and high z-index.
- Desktop hover interactions can be fragile; mitigate with focus support and a panel that remains open while the pointer is inside the topbar/panel.
- Mobile labels can overflow; mitigate by keeping short category labels.

## Tasks
- [ ] Create the three navigation groups and route matching rules.
- [ ] Replace the desktop long link list with the grouped topbar and full floating panel.
- [ ] Move admin access into the tool/account area.
- [ ] Update mobile bottom navigation to 首页 / 活动 / 比赛 / 社区 / 我的.
- [ ] Group mobile more-sheet links by 活动 / 比赛 / 社区.
- [ ] Run lint/build checks and inspect desktop/mobile layouts.
- [ ] Iterate once after inspection.

## Acceptance
- [ ] Desktop topbar only exposes 活动, 比赛, 社区 as content categories.
- [ ] The expanded desktop panel shows 活动, 比赛, 社区 together in one panel.
- [ ] 比赛 contains 黑客松, 未来学习中心, 比赛成果, 图片直播, 视频.
- [ ] 社区 contains AI 社区 and 播客.
- [ ] 活动 contains 活动聚合.
- [ ] Search/theme/language/auth/admin remain outside the category structure.
- [ ] Mobile navigation uses the same category model and does not expose 未来学习中心 as a top-level tab.
- [ ] Desktop and mobile layouts have no obvious text overflow or incoherent overlap.
