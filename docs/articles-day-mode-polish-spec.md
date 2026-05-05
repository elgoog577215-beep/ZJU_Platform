# Articles Day Mode Polish Spec

## Goal

Upgrade `/articles` day mode from plain white panels to a refined, airy interface while keeping night mode unchanged.

## Visual Direction

Use a "morning glass" treatment: cool off-white surfaces, very soft amber and indigo accents, translucent panels, fine borders, and restrained lift on hover. The page should feel lighter and more deliberate, not busier.

## Scope

- `/articles` page shell in `AICommunity.jsx`
- main feed controls in `CommunityFeedPanel.jsx`
- article cards and featured article in `CommunityTech.jsx`
- left news rail in `CommunityNewsRail.jsx`
- shared community day-theme tokens in `communityUtils.js`
- tag filter card in `TagFilter.jsx`

Night mode class paths should stay visually unchanged.

## Design Requirements

1. Page background
   - Replace the plain day backdrop with layered warm/cool translucent glow.
   - Keep the background subtle enough that text panels remain calm and readable.

2. Top tab switcher
   - Use a glass surface with finer borders and a softer shadow.
   - Active tab remains orange, with a more premium gradient and restrained glow.
   - Inactive tabs should feel tappable without becoming white blocks.

3. Main content shell
   - Use translucent white with a faint gradient, not flat white.
   - Keep border radius stable and avoid nested heavy card feeling.

4. Filter/search panel
   - Make the control panel more compact and glassy.
   - Search input should look embedded and refined.
   - Tag filter should integrate with the panel rather than reading as a separate white block.

5. Article cards
   - Reduce heavy white-card weight with gradient glass, fine border, and subtle top highlight.
   - Hover should use a soft lift, amber edge, and gentle shadow.
   - Text hierarchy remains unchanged and readable.

6. Left news rail
   - Convert plain white rail/cards into a compact editorial rail.
   - Use softer blue accent for sorting chips, subtle rank emphasis, and translucent cards.

7. Mobile
   - Keep spacing tight and avoid oversized shadows.
   - Mobile news drawer should inherit the refined day surface.

## Non-Goals

- Do not redesign routes other than `/articles`.
- Do not change API calls, filters, tab behavior, upload behavior, or modal data flow.
- Do not change night mode intentionally.

## Verification

- Run lint for touched files.
- Build the app.
- Capture `/articles` in day mode at desktop and mobile viewports.
- Check for unreadable text, layout overlap, excessive whiteness, and obvious visual regressions.
