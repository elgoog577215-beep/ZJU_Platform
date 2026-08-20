---
version: 1
slug: "src-components-hackathonseasonone-jsx"
primary_target: "src/components/HackathonSeasonOne.jsx"
related_targets:
    [
        "src/components/HackathonOutcomeShowcase.jsx",
        "src/components/MediaEventArchive.jsx",
        "src/components/ProjectPlaza.jsx",
        "src/components/Navbar.jsx",
        "src/components/MobileNavbar.jsx",
    ]
---

# Hackathon Event Workspace

- Scope: `/hackathon` cross-event workspace, including event selection, registration, projects, media and showcase stages.
- Mode: Operate.
- Audience: participants, organizers, photographers, judges and visitors returning to current or past hackathons.
- Job: choose one event, understand its lifecycle, and move through registration, project submission, live/featured media and final outcomes without losing context.
- Primary action: continue the task owned by the selected stage while keeping the selected event stable.
- Proof/content: published event schedule, registration state, public project evidence, canonical photos and featured media, awards and outcome records.
- Constraints: the outer workspace is the only event selector; four stages remain stable while scrolling; URL owns event and stage; legacy project, media, works and showcase links stay compatible; zh/en, coherent day/night shells and 390px support; stage content keeps its own theme rather than inheriting shell overrides; no fabricated event data.
- Direction: use the About page's restrained site-level surface language for the cross-event shell: deep neutral with cyan at night, white with teal and minimal shadow by day. The event context, four-stage control, and desktop event index are compact typographic navigation rather than cards or glowing timelines; registration, project, media and showcase surfaces retain their incumbent backgrounds and visual identity.
- Memorable moment: the left event index and top four-stage rail remain one calm command surface while each event reveals its own visual world below.
- Unresolved decisions: production currently exposes only one scheduled event, so the multi-event layout is code-verified but still needs real multi-event production data.
