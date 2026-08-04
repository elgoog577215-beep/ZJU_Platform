# Homepage Hero Alignment Design

## Context

The About page now has a clearer institutional launch-page quality, but the homepage hero still uses the older visual language:

- full-bleed photography
- centered copy over image
- broader "platform" tone rather than "AI ecosystem team" tone

That creates a branding mismatch between the homepage and the newly polished About page.

## Objective

Bring the homepage hero into the same official, premium, institutional art direction as the About page without changing the rest of the home information architecture.

This pass should:

1. make the homepage immediately read as the official Zhejiang University AI ecosystem site
2. align the hero with the About page's typography, color restraint, and compositional structure
3. preserve the rest of the homepage below the fold for now

## Visual Thesis

The homepage hero should feel like the cover slide of the site:

- dark navy keynote surface
- large left-aligned institutional typography
- one polished right-side support plane
- minimal bright accent color
- no dependence on photographic atmosphere for brand identity

## Content Plan

### Hero

- eyebrow defining the institution
- large title naming the AI ecosystem team or site identity
- short supporting sentence
- two primary actions
- a right-side visual block that previews ecosystem structure and signals authority

### Handoff

The hero should visually hand off to `PlatformStats` rather than compete with it.

## Interaction Thesis

- restrained entrance only
- no continuous loops
- no strong parallax
- optional single hover refinement on CTA buttons

## Execution Prompt

> Redesign the homepage hero so it matches the refined About page art direction. Replace the old photography-led hero with a large institutional poster composition. The site should feel like the official home of the Zhejiang University AI ecosystem team: calm, dark, precise, and ambitious. Use left-aligned monumental typography, concise copy, disciplined spacing, and a right-side support panel that suggests community, knowledge, and hackathon structure. Avoid generic marketing cards and avoid decorative motion.

## Implementation Notes

- Keep the hero within the first viewport alongside the fixed header.
- Do not change `PlatformStats` in this pass.
- Preserve dark/day mode support.
- Keep the copy concise and consistent with the About page.

## Validation

- `npm run build`
- visual verification of `/` and `/about`
- confirm `/api/settings` still resolves through the dev proxy
