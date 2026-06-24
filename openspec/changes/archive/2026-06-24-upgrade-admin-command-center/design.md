## Context

The admin console is a React + Vite + Tailwind interface mounted at `/admin`. `AdminDashboard.jsx` owns module state, URL query sync, the sidebar/drawer, quick jump, and content rendering. `Overview.jsx` is the first screen administrators see. Existing Playwright coverage already mocks admin data and checks navigation, resource operations, AI governance, and mobile drawer behavior.

## Design

### 1. Searchable Navigation

Add a search input inside the sidebar/drawer. It filters module groups by group title, module label, and module description. If no module matches, show a compact empty state with a clear "clear search" action.

This keeps the existing grouped navigation but lets administrators jump by intent, for example "用户", "活动", "治理", or "标签".

### 2. Recent Module Shortcuts

Track the last few visited modules in `sessionStorage` and render them in the top command bar. Shortcuts use existing module metadata and call the same `selectTab` path as the sidebar/quick jump, so URL sync, focus, and mobile drawer behavior stay consistent.

The recent list is a convenience layer only. If storage is empty or unavailable, the admin console still works.

### 3. Command Bar Upgrade

Keep the existing headline and module context, but make the right-side top panel act like a command bar:

- current group/module
- module position
- quick jump
- previous/next controls
- recent module shortcuts
- logout

The panel stays compact and responsive; no nested cards inside the page body.

### 4. Overview Command Center

Add a first-screen command-center section before the existing overview panels. It summarizes:

- pending work
- total content assets
- upcoming activities
- 7-day activity visits

The existing "今日待办", "快捷入口", "内容资产", "活动运营", and "系统状态" sections remain, but the page hierarchy becomes clearer: command summary first, detailed sections second.

### 5. Verification

Regression coverage will assert:

- desktop overview shows command-center metrics
- sidebar module search filters and navigates
- recent shortcuts appear after module changes
- mobile drawer search works without body scroll leakage
- no horizontal overflow is introduced

## Risks

- Search filtering could hide the active module. The current module remains visible in the command bar, so orientation is preserved.
- Recent-module storage could contain stale IDs. The implementation must filter IDs against known modules.
- New top controls can crowd small desktop widths. The design uses wrapping and compact chips rather than fixed-width controls.
