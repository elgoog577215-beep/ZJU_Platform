---
version: 1
slug: "src-components-hackathonseasonone-jsx"
primary_target: "src/components/HackathonSeasonOne.jsx"
related_targets:
    [
        "src/components/HackathonWorkspace.jsx",
        "src/components/HackathonWorkspace.css",
        "src/components/HackathonEventRouter.jsx",
        "src/components/HackathonOutcomeShowcase.jsx",
        "src/components/MediaEventArchive.jsx",
        "src/components/HackathonEventPicker.jsx",
    ]
---

# First-edition event workspace

- Scope: first edition, AI全栈极速黑客松. Second-edition UI is explicitly deferred by the user on 2026-09-29.
- Mode: Operate.
- Job: browse this historical event's introduction, rules, media and results; view selected works inside its results.
- Confirmed direction: neat alignment and the original angular cyan technology style. The original registration body is the accepted visual reference. Later X-themed media/results do not define the first-edition identity.
- Structure: preserve the existing global website navigation and mobile bottom navigation. The event toolbar is a secondary tab row below the global header, with a custom event picker and registration action; no duplicated brand, language control or footer, and no left sidebar. Four fixed tabs: 介绍 / 赛题 / 图片视频 / 成果. The independent project center is retired; legacy links lead to event results. Archived signup is closed.
- Identity: event key and canonical competition scope own the data. Never move first-edition photos or awards to the second edition because their old presentation used X imagery.
- Visual rules: deep blue-black background, cyan accents, square corners, 1280px maximum content width; desktop gutters 20–56px; 42px maximum content-page title, 24px section title, 16px body, 14px navigation/detail. Original registration composition stays intact.
- Routing: preserve register, showcase, works, project, photo and work deep links; keep zh/en navigation, keyboard focus, and 390px viewport usability.
- Validation: local preview uses existing public read-only APIs. Build/route checks are separate from user acceptance; no push or deploy.

- Publication: public works require approval, consent, operator selection and published event results. Selection order never assigns an award or rank.
- Responsive acceptance: 320/390/768/1440px event views, mobile work detail, registration fields, keyboard event switching and reduced motion.
