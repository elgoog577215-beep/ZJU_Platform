# Site Day Mode Refinement Spec

## Visual Thesis

Day mode should feel like a refined morning glass interface: clean ink, translucent white surfaces, soft sky/coral/lilac ambient glow, fine borders, and quiet motion. The current activity page light glow is the preferred direction.

## Audit Findings

1. Global day mode is still partly an automatic inversion of dark-mode utility classes. This makes some pages readable, but the material quality varies from page to page.
2. Several content pages use saturated dark-mode ambient glows without a day-specific base, so the background can feel flat in some places and over-fogged in others.
3. Shared chrome has too many plain white panels: desktop navigation, mobile tab bar, footer, and homepage feed blocks need finer highlights and softer depth.
4. Gallery mobile drawers still use dark surfaces in day mode, which breaks the white-mode experience.
5. Media cards and empty/error states use heavier shadows or plain white backgrounds. They need the same light glass language as the activity and articles pages.

## Design Direction

1. Add a reusable day-mode canvas:
   - fixed soft body background with sky, lilac, mint, and warm glows;
   - subtle paper/grid texture;
   - page-level translucent wash that keeps content readable.
2. Add refined day materials:
   - `day-fine-surface` for elevated panels;
   - `day-chrome-surface` for nav, footer, and bottom bars;
   - `day-card-lift` for content cards;
   - `day-quiet-button` for secondary controls.
3. Apply the materials to high-frequency surfaces first:
   - Navbar, MobileNavbar, Footer, PlatformStats;
   - Gallery, Music, Videos shells, controls, drawers, cards;
   - keep Events and Articles glow direction intact while benefiting from global canvas.
4. Interaction rules:
   - hover glow must be narrow and edge-based, not broad fog;
   - shadows stay cool and low-opacity;
   - motion stays subtle and respects reduced motion.

## Success Checks

1. Day mode looks intentionally designed, not inverted from night mode.
2. Activity and articles keep their soft colored glow mood.
3. Gallery, music, and video pages gain matching light atmosphere.
4. Mobile filter/sort sheets are light in day mode.
5. Build and lint pass.
6. Screenshots are reviewed once after the first pass, then refined again.
