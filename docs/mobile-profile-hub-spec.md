# Mature Mobile Profile Spec

Date: 2026-05-04

## Goal

The mobile owner profile should feel like a mature app account center, not a compressed public profile. It should make identity, personal assets, notifications, saved content, and settings easy to understand within the first screen.

## Product Benchmark

Reference mature consumer apps such as WeChat, Xiaohongshu, Instagram, Notion, and Apple account surfaces. The common pattern is:

- A compact identity area at the top.
- A small set of high-signal stats.
- Obvious owner-only shortcuts.
- Content tabs that are thumb-friendly and persistently understandable.
- Settings separated from social/content browsing.
- No dense desktop chips competing for attention on mobile.

## Current Issues

- Mobile uses the public profile layout almost directly, so owner workflows feel buried.
- The top card is visually large but not action-oriented enough.
- Tabs are long pill buttons in a horizontal row, causing scanning friction.
- Owner-only needs such as messages, saved items, appearance, install, and logout are spread across deep tabs.
- The page lacks a mobile information architecture that distinguishes public identity from private account management.

## Design Direction

Use a mobile-first account hub for owners:

1. Account summary
   - Avatar, display name, role, organization.
   - Compact member meta instead of oversized hero treatment.
   - One primary edit action and optional follow action for visitors.

2. Signal stats
   - Works, likes, followers, following.
   - Tappable social counts switch to relations where relevant.

3. Quick actions
   - Owner: edit profile, messages, favorites, settings.
   - Visitor: follow and view works/relations.
   - Actions use icons, 44px touch targets, concise labels.

4. Content navigation
   - Owner: Works, Favorites, Messages, Settings.
   - Visitor: Works, Relations.
   - On mobile, use a segmented control with even-width buttons instead of long overflowing chips.

5. Section presentation
   - Works remain image/content cards.
   - Favorites use list cards because saved content is a utility workflow.
   - Messages embed the notification center but get a clean section header.
   - Settings become grouped account/security/preferences cards with stable spacing.

## Scope

- Modify `PublicProfile.jsx` for mobile-first owner account hub and better responsive tab layout.
- Keep desktop behavior recognizable and avoid backend/API changes.
- Preserve existing content cards, favorites data, notification center, profile update, password update, theme, language, PWA install, and logout behavior.
- Do not change routes.

## Acceptance Checks

- Build passes.
- Mobile `/user/:id` has no horizontal overflow at 390px and 375px.
- Owner mobile first viewport shows identity, stats, and useful shortcuts without requiring horizontal scrolling.
- Main tabs are clean and thumb-friendly.
- Works, favorites, messages, settings remain reachable.
- Public visitor profile does not expose owner-only shortcuts.
- Bottom nav does not cover important content.

## Iteration Checklist

Compare against mature app standards:

- Does the first screen answer: who am I, what is mine, what needs attention?
- Are private account actions separated from public profile browsing?
- Are tap targets at least 44px?
- Is there only one primary action per area?
- Is there zero horizontal overflow?
- Are long labels wrapped or shortened cleanly?
