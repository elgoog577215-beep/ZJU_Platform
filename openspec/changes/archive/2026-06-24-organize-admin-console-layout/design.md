## Design

### Visual Thesis

Use a calm operations-workbench style: fewer framed blocks, tighter rhythm, one primary action area per page, and quiet surfaces that help tables and status labels carry the interface.

### Admin Shell

The shell will separate three jobs that are currently compressed together:

- Identity and orientation: page title, active module, group, and short module description.
- Navigation tools: quick jump plus previous/next.
- Session actions: home and logout.

The top context becomes a compact horizontal workbar on desktop and a stacked but ordered workbar on mobile. The active module remains obvious, but date and module index are demoted to small metadata.

The sidebar stays grouped, but menu items become denser: icon + label are always visible; descriptions are removed from inactive items and shown only for the active item. This reduces vertical noise without losing context.

### Shared Components

Admin page sections should be calmer by default:

- `AdminPageShell` uses a smaller header radius and a lighter toolbar divider.
- `AdminPanel` uses a smaller radius and tighter padding.
- Metric cards become compact enough to scan in a row.
- Inline notes can be used as status rows, not oversized callouts.

### Overview Structure

The overview becomes a clear three-section page:

1. Today: one focus block with pending count and two actions.
2. Content: resource counts in a compact grid.
3. Operations: activity metrics and system status in a two-column layout.

Repeated bottom CTA panels are removed.

### Resource Pages

Resource pages keep the same functionality but reduce visual weight:

- Metrics remain immediately under the page header.
- Filter/query status is a compact row with “查看列表”.
- The table/list panel is the primary work surface.

### Testing

Playwright will continue to use mocked admin APIs and assert the new structural cues:

- Quick jump still works.
- Sidebar navigation is usable with reduced item descriptions.
- Overview exposes “今日优先事项” and no duplicate bottom CTA dependency is required.
- Resource filter status row and table remain reachable.
