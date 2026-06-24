# Mobile Fullscreen Event Assistant Design

Date: 2026-05-05

## Goal

Turn the mobile event AI assistant into a full-screen recommendation workspace. The assistant should feel like a real activity-finding agent, while the main event list remains stable and understandable.

## Current Problem

The mobile assistant is currently nested inside the filter drawer. That makes it feel like an advanced filter instead of a primary discovery path. It also compresses a rich flow into a small sheet: prompt entry, profile preferences, understood intent, activity-library coverage, warnings, recommendations, and feedback all compete for space.

## Product Decision

Mobile uses a dedicated full-screen assistant. Desktop can keep the existing panel layout.

The event page exposes a visible mobile launcher near the top:

> 想参加什么？AI 帮你找

Tapping it opens a full-screen overlay:

> AI 活动助手

The assistant is not a generic chat page. It is a structured recommendation workspace:

- ask for the user's intent
- show quick prompt chips
- expose profile/preferences
- explain what it understood
- show activity-library coverage
- clearly mark historical fallback recommendations
- display recommendation cards
- record useful/not useful feedback
- open event details
- allow continued refinement or reset

## Scope

In scope:

- Mobile-only launcher on the events page.
- Mobile-only full-screen overlay.
- Reuse the existing recommendation panel behavior inside the full-screen shell.
- Keep desktop behavior unchanged.
- Remove the AI assistant from the mobile filter drawer.
- Preserve current backend APIs and recommendation logic.

Out of scope:

- Backend ranking changes.
- New multi-turn memory models beyond existing preference and feedback APIs.
- Replacing the desktop assistant UI.
- Building a pure chat interface.

## User Flow

1. User opens the mobile events page.
2. User sees the event title, toolbar, and a compact AI discovery launcher.
3. User taps the launcher.
4. A full-screen assistant slides in.
5. User submits a prompt or taps a quick prompt.
6. Assistant shows understood intent, profile signals, coverage, warnings, and recommendations.
7. User can open an event detail, give feedback, refine the prompt, or close the assistant.
8. Closing returns to the unchanged event list.

## UI Structure

### Mobile Launcher

Placement:

- Below the mobile toolbar and above the event grid.
- Hidden on desktop.

Content:

- Label: `AI 活动助手`
- Main text: `想参加什么？AI 帮你找`
- Supporting text: `按活动库、画像和反馈推荐`
- Icon button affordance using existing icon system.

### Full-Screen Overlay

Container:

- Fixed full viewport.
- `z-index` below the event detail modal, above filter/sort drawers.
- Uses `100svh`/safe-area padding.
- Locks body scroll while open.

Header:

- Back/close button.
- Title: `AI 活动助手`
- Subtitle: `读活动库、画像和反馈后推荐`
- Optional preference affordance remains inside the reused panel.

Body:

- Scrollable.
- Hosts the existing assistant panel content.
- Removes extra outer card feel on mobile where possible through a `variant` prop.

Behavior:

- Event detail opening should keep working through `onOpenEvent`.
- Closing the assistant should return to the event list, not reset the list.
- The assistant may keep its own state while open. Closing can discard state for the first iteration.

## Component Plan

Add:

- `MobileEventAssistantLauncher`
- `MobileEventAssistantFullscreen`

Update:

- `EventAssistantPanel`
  - Add a `variant` prop.
  - Support `variant="fullscreen"` to reduce nested card chrome and fit the mobile full-screen layout.
- `Events`
  - Add `isMobileAssistantOpen` state.
  - Render launcher on mobile.
  - Render full-screen assistant via portal.
  - Remove assistant mode from mobile filter drawer.

Keep:

- Existing desktop assistant panel.
- Existing backend endpoints.
- Existing recommendation card behavior and feedback API.

## Data Flow

No backend change is required.

The full-screen assistant calls the same APIs:

- `POST /events/assistant`
- `GET /events/assistant/preferences`
- `PUT /events/assistant/preferences`
- `POST /events/assistant/feedback`

The existing `onOpenEvent` callback opens the event detail modal.

## Error Handling

Use existing assistant error handling:

- unavailable model
- timeout
- unauthenticated preferences/feedback
- no upcoming events
- historical fallback

Mobile full-screen must keep these messages visible and not hide warnings below fixed controls.

## Accessibility

- Full-screen overlay uses `role="dialog"` and `aria-modal="true"`.
- Header close button has an accessible label.
- Launcher is a real button.
- Tap targets remain at least 44px.
- Escape/back handling should close the assistant where existing `useBackClose` can support it.

## Testing

Manual/browser smoke tests:

- Mobile events page opens.
- AI launcher is visible on mobile.
- Tapping launcher opens full-screen assistant.
- Quick prompt triggers recommendation.
- Activity-library coverage appears.
- Historical fallback warning appears when only historical events exist.
- Recommendation detail opens.
- Closing assistant returns to list.
- Desktop assistant still renders in the desktop filter section.

Build:

- `npm run build`

## Second-Pass Review Checklist

- Does mobile still have a visible path to ordinary filters?
- Does the assistant look like a workspace instead of a nested card stack?
- Does any text overflow on 390px wide mobile?
- Is there enough bottom padding for safe-area and keyboard scenarios?
- Are historical results clearly marked before the user taps a recommendation?
