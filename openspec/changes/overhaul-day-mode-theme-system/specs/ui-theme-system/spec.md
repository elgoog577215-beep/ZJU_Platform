## ADDED Requirements

### Requirement: Shared semantic theme system governs public-site and admin UI
The application SHALL provide a shared semantic theme layer for both the public site and the admin UI. The theme layer SHALL define reusable tokens for backgrounds, surfaces, borders, text roles, overlays, shadows, and accents. Public-facing pages and admin surfaces SHALL consume these semantic tokens directly or through shared component classes, instead of depending on broad inverse overrides of dark-theme utility classes.

#### Scenario: Shared tokens are available to both public and admin surfaces
- **WHEN** a public page container and an admin dashboard container render in the same UI mode
- **THEN** both containers SHALL read from the same semantic token system for their background, border, text, and shadow decisions
- **THEN** neither container SHALL require new `.text-white`, `.bg-black/*`, or similar inverse compatibility overrides to appear correct in day mode

#### Scenario: Legacy compatibility overrides remain limited
- **WHEN** legacy components still rely on existing day-mode compatibility rules during migration
- **THEN** those compatibility rules MAY remain as transitional support
- **THEN** newly modified or newly added components SHALL prefer semantic tokens or shared theme classes over adding more inverse overrides

---

### Requirement: Day mode has an independent visual language on key surfaces
Day mode SHALL be allowed to diverge from dark mode on key surfaces while preserving the same information architecture and interaction model. Key surfaces include the home hero, global navigation, content cards, search and upload overlays, profile surfaces, content detail overlays, and admin dashboard containers.

#### Scenario: Hero and navigation differ between day and dark mode
- **WHEN** the user switches between dark mode and day mode on the homepage
- **THEN** the hero and navigation MAY change visual structure, contrast strategy, surface treatment, and emphasis hierarchy between the two modes
- **THEN** the same content, navigation destinations, and core interactions SHALL remain available in both modes

#### Scenario: Admin surfaces remain aligned to the same system
- **WHEN** the user views admin cards, tables, forms, or dialogs in day mode
- **THEN** those surfaces SHALL follow the same semantic theme system as the public site
- **THEN** the admin presentation SHALL prioritize clarity and scanability over decorative effects while still matching the refined day-mode art direction

---

### Requirement: Day-mode visual quality must emphasize refined artistic clarity
Day mode SHALL present a refined visual standard with strong readability, controlled contrast, clear hierarchy, and restrained effects. It SHALL not appear as a washed-out conversion of dark mode. The UI SHALL avoid large competing glows, muddy frosted surfaces, or media treatments that obscure content hierarchy.

#### Scenario: Day-mode hero remains legible and focused
- **WHEN** the homepage hero renders in day mode
- **THEN** the primary title, subtitle, and primary focal region SHALL remain clearly readable against the background at a glance
- **THEN** the hero SHALL NOT rely on near-white title text over a similarly bright background image
- **THEN** the hero SHALL NOT include obvious dark-mode residue such as deep dark edge fades intended for night presentation

#### Scenario: Day-mode cards use clear boundaries
- **WHEN** a content card or modal surface renders in day mode
- **THEN** the card boundary, text hierarchy, and interaction focus SHALL be distinguishable without depending on heavy glow or excessive blur
- **THEN** media cards SHALL NOT default to the same heavy dark overlay strategy used by dark mode unless the card intentionally requires a cover-art treatment

---

### Requirement: Background and effect intensity are constrained by theme mode
Background effects SHALL respond to the active theme mode. Day mode SHALL use reduced glow, reduced vignette, and reduced bloom relative to dark mode, prioritizing readability and focal control over immersion.

#### Scenario: Background system reduces effects in day mode
- **WHEN** `BackgroundSystem` renders in day mode
- **THEN** bloom, vignette, glow orb intensity, and similar background effects SHALL be reduced, disabled, or replaced with lighter alternatives appropriate to day mode
- **THEN** the resulting background SHALL support foreground legibility instead of flattening the hierarchy through haze or overexposure

#### Scenario: Dark mode retains immersive behavior
- **WHEN** `BackgroundSystem` renders in dark mode
- **THEN** immersive effects MAY remain stronger than in day mode
- **THEN** the day-mode constraints SHALL NOT require dark mode to lose its intended atmosphere as long as dark-mode readability remains intact

---

### Requirement: Theme regression coverage protects both modes on desktop and mobile
The application SHALL include regression validation for the shared theme system across both day mode and dark mode, covering public and admin UI at desktop and mobile breakpoints.

#### Scenario: Public day-mode regression coverage exists
- **WHEN** theme-related public UI changes are introduced
- **THEN** regression coverage SHALL include at least the homepage and one public content page in day mode

#### Scenario: Admin day-mode regression coverage exists
- **WHEN** theme-related admin UI changes are introduced
- **THEN** regression coverage SHALL include at least one admin page in day mode

#### Scenario: Both modes remain valid across breakpoints
- **WHEN** the regression suite or manual validation runs on desktop and mobile breakpoints
- **THEN** both day mode and dark mode SHALL remain usable, legible, and free of obvious theme residue or contrast regressions
