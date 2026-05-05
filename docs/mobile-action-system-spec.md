# Mobile Action System Spec

Date: 2026-05-04

## Goal

Mobile should feel intentionally lighter than desktop without making useful actions disappear. The interface uses four action layers:

1. Top app bar: global orientation and at most two immediate actions.
2. Content toolbar: page-local sorting, filtering, and result state.
3. Card/detail actions: actions tied to a specific item, such as favorite, play, open, close, or share.
4. More sheet / profile: low-frequency global actions and secondary destinations.

## Current Gap

Desktop exposes many controls directly: full navigation, search, weather, theme, language, notifications, upload, sort, filter, tags, player controls, download, and refresh.

Mobile already hides many of them, which is correct for density. The main issue is inconsistency: Events has a mobile content toolbar, but Gallery, Videos, Music, and the Tech feed have sort/filter drawers without a visible, consistent entry point.

## Design Principles

- Keep the top bar calm: page title centered, More on the left, Search and Publish on the right.
- Keep content actions near content: result count, Sort, Filter, and Reset live just under the page heading.
- Use bottom sheets for choices: sort and filters open focused sheets instead of expanding inline.
- Keep bottom navigation limited to primary destinations: Home, Events, AI Community, Hackathon, Profile.
- Move secondary destinations into More: Gallery, Music, Videos, About, Admin when applicable.
- Low-frequency settings belong in More/Profile: theme, language, logout.
- No mobile-only dead ends: if code has a mobile drawer, the user must have a visible way to open it.

## Implemented Scope

1. Add a mobile More sheet to the top bar.
   - Shows secondary destinations that desktop nav exposes but bottom nav omits.
   - Shows theme toggle, language switcher, auth/profile, and logout when relevant.

2. Reuse `MobileContentToolbar` across content pages.
   - Events keeps its existing toolbar.
   - Gallery, Videos, Music, and Tech feed gain the same entry pattern.

3. Preserve existing page-specific drawers.
   - Sort and filter drawers are not rewritten.
   - Existing upload routes continue through the mobile top Publish button.

## Toolbar Contract

The toolbar should render on mobile only and contain:

- Left: result count when available.
- Right: Sort button when sorting exists.
- Right: Filter button when filtering exists.
- Right: Reset button only when filters are active.

Minimum target size is 44 px. Buttons use icons plus short labels to stay scannable.

## Validation

Required checks:

- Build passes.
- Mobile viewport does not show horizontal overflow.
- Top bar has no more than three visible controls.
- Gallery, Videos, Music, Events, and Tech feed all expose sort/filter access on mobile.
- More sheet opens and closes, and secondary links are reachable.

