## 1. Theme Foundation

- [ ] 1.1 Inventory the current day-mode overrides in `src/index.css` and shared UI classes, then define the semantic token set for background, surface, border, text, overlay, shadow, and accent roles.
- [ ] 1.2 Refactor the root theme variables so public-site and admin UI can consume the same semantic tokens without expanding `.text-white` / `.bg-black/*` compatibility overrides.
- [ ] 1.3 Add or update shared utility classes for panels, elevated surfaces, form controls, buttons, and overlays so they consume theme tokens instead of page-local hardcoded day-mode colors.

## 2. Public-Site Day Mode Overhaul

- [ ] 2.1 Rework `BackgroundSystem`, `Hero`, and `Navbar` so day mode uses distinct focal hierarchy, reduced glow, and no night-mode residue while preserving dark mode behavior.
- [ ] 2.2 Update high-frequency public components such as home cards, content cards, search palette, upload/detail overlays, and profile surfaces to consume the new theme layer and follow the approved refined day-mode art direction.
- [ ] 2.3 Review key public pages end-to-end in day mode and remove the most visible legacy patches that still rely on inverse dark-theme utility overrides.

## 3. Admin Day Mode Overhaul

- [ ] 3.1 Apply the semantic theme layer to admin dashboard shells, cards, tables, filters, dialogs, and forms.
- [ ] 3.2 Ensure admin day mode favors clarity and scanability while still matching the refined visual standard required by the new theme system.

## 4. Verification

- [ ] 4.1 Run targeted lint/build validation for the touched theme and UI files.
- [ ] 4.2 Add or update Playwright regression coverage for at least one public home flow, one public content page, and one admin page in day mode.
- [ ] 4.3 Verify that day mode and dark mode both render correctly on desktop and mobile breakpoints, with no obvious contrast regressions or night-mode styling remnants in day mode.

## 5. 验证记录

- 2026-06-29：`npm run cap:sync:ios` 通过，覆盖生产 Web build。
- 2026-06-29：`NO_PROXY=localhost,127.0.0.1,::1 npx playwright test e2e/mobile-community-shell.spec.js --project=chromium` 通过，覆盖移动端底部导航、登录弹窗和社区详情返回关闭。
- 2026-06-29：`NO_PROXY=localhost,127.0.0.1,::1 npx playwright test e2e/admin-console.spec.js --project=chromium` 与 `e2e/admin-ecosystem-partners.spec.js` 通过，覆盖后台桌面、移动抽屉和生态伙伴编辑流程。
- 2026-06-29：当前记录只证明本轮迭代未破坏关键移动/后台主题面；1-3 章的主题系统重构仍保留为后续独立执行项。
