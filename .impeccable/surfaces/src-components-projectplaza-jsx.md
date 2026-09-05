---
version: 1
slug: "src-components-projectplaza-jsx"
primary_target: "src/components/ProjectPlaza.jsx"
related_targets:
    [
        "src/components/projectPlaza.styles.js",
        "src/features/projects/ProjectPlazaSurface.jsx",
        "src/components/HackathonSeasonOne.jsx",
    ]
---

# Project Plaza

- Scope: project discovery and submission on the independent `/projects` page; Hackathon projects links select `/projects?competition=<slug>`, and legacy `/hackathon?...&view=projects` links redirect here.
- Mode: Operate.
- Audience: hackathon participants, builders, organizers and public visitors comparing work.
- Job: understand the current event, find projects, verify public evidence, and take the correct submission or continuation action.
- Primary action: submit to the selected competition when available; otherwise browse and publish a long-term project.
- Proof/content: real public project cards, competition works, author, major, award/rank, GitHub and deployment evidence.
- Constraints: the independent route owns its URL competition scope; event entry preselects the same competition and keeps an event return link; no fabricated evidence or ownership; zh/en and 390px support.
- Direction: preserve the independent Project Plaza's incumbent dark hackathon background, lime controls, artwork, full-width layout and card language. Retire the embedded Hackathon entry without repainting the independent surface.
- Memorable moment: the event's project entry opens the complete project center, with the current competition selected and all projects still discoverable.
- Unresolved decisions: broader cross-community project-center positioning remains outside this entry replacement.
