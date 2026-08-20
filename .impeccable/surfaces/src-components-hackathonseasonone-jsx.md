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
- Constraints: the outer workspace is the only event selector; four stages remain stable while scrolling; URL owns event and stage; legacy project, media, works and showcase links stay compatible; zh/en, day/night and 390px support; no fabricated event data.
- Direction: use the About page's site-level dark glass, cyan grid, crisp rectangular panels and restrained glow. A single event's poster, colors and visual assets belong only to that event's content body and never define the cross-event workspace shell.
- Memorable moment: the left event timeline and top four-stage rail remain one calm command surface while each event reveals its own visual world below.
- Unresolved decisions: production currently exposes only one scheduled event, so the multi-event layout is code-verified but still needs real multi-event production data.
