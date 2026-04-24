# About Page Polish Design

## Context

The current About page already uses a dark premium palette and a controlled layout, but it still reads more like a feature explanation surface than an official homepage-quality launch page. The main issues are:

- the first screen feels diagram-led rather than institution-led
- the page proves information, but does not project presence
- the visual hierarchy is too evenly distributed, so nothing feels monumental
- section rhythm is functional but not cinematic

The goal of this pass is to make the About page feel more official, more expansive, and more refined without turning it into a noisy concept page.

## Objective

Reframe the About page as a polished institutional launch page for the Zhejiang University AI ecosystem team:

1. The team is the unquestioned subject.
2. Community and hackathon appear as the team's flagship products and initiatives.
3. The page should feel premium, calm, large-scale, and deliberate.
4. Motion should be minimal and never become the visual story.

## Visual Thesis

Build the page like a university-tech keynote poster:

- dark navy canvas with restrained silver-blue light
- large typography, long horizontal rules, sparse labels, deep whitespace
- one dominant hero plane instead of many equal cards
- details should feel machined and editorial, not gadget-like

The page should feel expensive even with animation disabled.

## Content Plan

### Hero

One cinematic first viewport that defines the team in a single glance:

- institutional eyebrow
- monumental title
- brief definition sentence
- a right-sized visual field that suggests networked intelligence without looking like an infographic

### Proof

A support section that shows organizational backing and operating capability:

- support units
- ecosystem framing
- short quantitative proof

### Flagship Work

Two initiative rows with clear priority:

- AI community as the daily operating layer
- AI full-stack speed hackathon as the landmark external project

### Closing

A concise closing CTA that returns focus to the ecosystem team itself.

## Interaction Thesis

Use motion only where it sharpens hierarchy:

- one restrained hero reveal
- one staggered entrance for support and flagship sections
- one subtle hover treatment for links or chips

No continuous floating loops, no perpetual breathing, no heavy scroll-bound transforms.

## Execution Prompt

Use this prompt as the internal design brief for implementation:

> Redesign the About page into a premium institutional launch page for the Zhejiang University AI ecosystem team. Keep the page dark, elegant, and spacious. Make the team itself the dominant subject, with the AI community and AI full-stack speed hackathon presented as flagship initiatives rather than parallel identities. Avoid generic card grids and avoid sci-fi clutter. Use one strong hero composition, disciplined typography, long-form spacing, subtle glass or metal surfaces, restrained cyan-indigo highlights, and almost-static motion. The page should feel official, ambitious, and expensive, like a refined internet product keynote page adapted for a university AI ecosystem.

## Implementation Notes

- Keep the existing dark theme alignment with the rest of the site.
- Preserve compatibility with `uiMode === "day"` without making day mode the design driver.
- Prefer layout sections and dividers over card stacks.
- Keep copy concise and high-signal.
- Use existing settings only for contact details; do not force page copy to depend on mutable admin text.
- Ensure mobile layout keeps the hero dignified rather than compressed.

## Validation

Validation for this pass should include:

- production build success
- visual check on `/about` in the running dev server
- confirmation that `/api/settings` still resolves through the dev proxy after the recent port fix

## Scope Check

This pass covers only the About page visual and copy polish. It does not include:

- homepage redesign
- navbar or footer redesign
- CMS-backed About page editing
- new backend endpoints
