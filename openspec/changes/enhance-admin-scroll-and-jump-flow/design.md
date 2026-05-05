## Design

### Navigation Model

The admin shell keeps the existing grouped sidebar as the primary navigation. This change adds compact secondary controls in the top context panel:

- A grouped `select` for direct module jumps.
- Previous and next module buttons based on the flattened menu order.
- Shared selection logic so sidebar, quick jump, overview cards, and mobile drawer all close the drawer and return focus to the current content anchor.

### Scroll And Focus Behavior

The admin content root becomes a focusable anchor. On module changes, the shell scrolls this anchor into view and focuses it with `preventScroll` after animation setup. This gives keyboard and screen-reader users a clear context transition while preserving smooth visual movement.

A floating back-to-top action is shown only after the window scroll position passes a practical threshold. It scrolls to the same content anchor rather than the document root, keeping the fixed site navbar and admin header spacing predictable.

### Resource List Behavior

Resource pages add a list anchor around the table/card panel. Search submit, clear search, status filter changes, and pagination requests all scroll to the list anchor. This keeps the result of an action immediately visible without altering backend requests.

The table shell gains optional `maxHeight` and sticky-header support. Desktop tables can scroll inside the panel while keeping column labels visible; mobile continues to use cards.

### Accessibility

- Quick jump has an explicit accessible label.
- Back-to-top uses `aria-label`.
- Main content anchor is keyboard focusable but visually unobtrusive.
- Table sticky behavior is CSS-only and does not change table semantics.

### Testing

The existing mocked admin e2e is extended instead of adding network-dependent tests. It verifies:

- Quick jump renders and changes modules.
- Back-to-top appears after scrolling and returns the page near the content top.
- Resource search/filter controls keep the list reachable.
- Mobile drawer continues to lock and release body scrolling.
