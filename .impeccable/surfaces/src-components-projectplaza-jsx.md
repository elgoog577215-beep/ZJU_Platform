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

- Scope: project discovery and submission as the `/hackathon?...&view=projects` stage, with `/projects` preserved as the all-projects and legacy compatibility route.
- Mode: Operate.
- Audience: hackathon participants, builders, organizers and public visitors comparing work.
- Job: understand the current event, find projects, verify public evidence, and take the correct submission or continuation action.
- Primary action: submit to the selected competition when available; otherwise browse and publish a long-term project.
- Proof/content: real public project cards, competition works, author, major, award/rank, GitHub and deployment evidence.
- Constraints: the Hackathon shell owns event selection in embedded mode; the independent route still owns its URL competition scope; no fabricated evidence or ownership; zh/en and 390px support.
- Direction: preserve the Project Plaza's incumbent dark hackathon background, lime controls, artwork and card language in both independent and embedded modes. The Hackathon shell may remove the duplicate event selector, but must not repaint this surface.
- Memorable moment: selecting an event once updates the project catalog without introducing another competition selector inside the stage.
- Unresolved decisions: none for the workspace integration.
